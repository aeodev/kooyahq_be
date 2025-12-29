import { randomUUID } from 'node:crypto'
import { env } from '../../config/env'
import { SocketEmitter } from '../../utils/socket-emitter'
import { getJson, setJson, deleteKeys } from '../../lib/redis'
import type { AuthUser } from '../auth/rbac/permissions'
import {
  AIAssistantSocketEvents,
  type AIResponsePayload,
  type AIToolStartPayload,
  type AIToolCompletePayload,
  type AIErrorPayload,
  type OpenAIMessage,
  type OpenAIToolCall,
} from './ai-assistant.types'
import { getAvailableTools, toOpenAITools, findTool, canUseTool } from './tools'
import {
  ConfigurationError,
  APIError,
  ToolExecutionError,
  PermissionError,
  TimeoutError,
  errorToPayload,
} from './ai-assistant.errors'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'google/gemini-2.0-flash-001'

// System prompt for Kooya AI
const SYSTEM_PROMPT = `You are Kooya, the AI assistant for KooyaHQ - a team productivity and project management platform.

Capabilities:
- Start, stop, pause, resume timers
- Create tickets, assign users
- Check active timers, list boards

Guidelines:
- Be direct and concise
- For timer setup: Call get_projects_for_timer, show ONLY bullet points, wait for selection
- When starting timers, extract project names from user messages (e.g., "start timer for TalentTap" → projects: ["TalentTap"])
- For tickets: Get boards first, never ask for IDs
- Use "me" for self-assignment
- Confirm destructive actions
- Never show internal IDs to users

Response format:
- Timer projects: ONLY bullet points (no text before/after)
- Lists: "Here are your boards:\n• Board Name (PREFIX) - kanban\nWhich one?"

Remember: You can only perform actions the user has permission for.`

interface ConversationContext {
  history: OpenAIMessage[]
  lastActivity: string // ISO string for Redis serialization
}

// Fallback in-memory storage if Redis unavailable
const fallbackConversations = new Map<string, ConversationContext>()

const CONVERSATION_TTL_SECONDS = 30 * 60 // 30 minutes
const CONVERSATION_KEY_PREFIX = 'ai:conversation:'

function getConversationKey(conversationId: string): string {
  return `${CONVERSATION_KEY_PREFIX}${conversationId}`
}

async function getConversation(conversationId: string): Promise<ConversationContext | null> {
  try {
    const context = await getJson<ConversationContext>(getConversationKey(conversationId))
    return context
  } catch (error) {
    console.error(`[AI Assistant] Failed to get conversation from Redis, using fallback:`, error)
    // Fallback to in-memory
    return fallbackConversations.get(conversationId) || null
  }
}

async function saveConversation(conversationId: string, context: ConversationContext): Promise<void> {
  try {
    await setJson(getConversationKey(conversationId), context, CONVERSATION_TTL_SECONDS)
    // Also update fallback for redundancy
    fallbackConversations.set(conversationId, context)
  } catch (error) {
    console.error(`[AI Assistant] Failed to save conversation to Redis, using fallback:`, error)
    // Fallback to in-memory
    fallbackConversations.set(conversationId, context)
  }
}

async function deleteConversation(conversationId: string): Promise<void> {
  try {
    await deleteKeys(getConversationKey(conversationId))
    fallbackConversations.delete(conversationId)
  } catch (error) {
    console.error(`[AI Assistant] Failed to delete conversation from Redis:`, error)
    // Still try to delete from fallback
    fallbackConversations.delete(conversationId)
  }
}

async function callOpenRouter(
  messages: OpenAIMessage[],
  tools?: ReturnType<typeof toOpenAITools>,
  timeoutMs: number = 30000
): Promise<{ content: string | null; tool_calls?: OpenAIToolCall[] }> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.openRouterApiKey}`,
        'HTTP-Referer': 'https://kooyahq.com',
        'X-Title': 'KooyaHQ',
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        tools: tools && tools.length > 0 ? tools : undefined,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      const isRetryable = response.status >= 500 || response.status === 429
      throw new APIError(
        `OpenRouter API error: ${response.status} - ${errorText}`,
        response.status,
        isRetryable
      )
    }

    const data = await response.json() as { choices?: { message?: { content?: string; tool_calls?: any[] } }[] }
    const choice = data.choices?.[0]?.message

    return {
      content: choice?.content || null,
      tool_calls: choice?.tool_calls,
    }
  } catch (error) {
    clearTimeout(timeoutId)
    
    if (error instanceof APIError) {
      throw error
    }
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new TimeoutError('OpenRouter API request timed out')
    }
    
    throw new APIError(
      error instanceof Error ? error.message : 'Unknown API error',
      500,
      true
    )
  }
}

export const aiAssistantService = {
  async processMessage(params: {
    userId: string
    user: AuthUser
    message: string
    conversationId?: string
  }): Promise<void> {
    const { userId, user, message, conversationId: existingConversationId } = params
    const conversationId = existingConversationId || randomUUID()

    // Check if OpenRouter is configured
    if (!env.openRouterApiKey) {
      const error = new ConfigurationError('AI assistant is not configured. Please set up the OpenRouter API key.')
      SocketEmitter.emitToUser(userId, AIAssistantSocketEvents.ERROR, {
        conversationId,
        ...errorToPayload(error, conversationId),
      } as AIErrorPayload)
      return
    }

    try {
      // Get tools available to this user
      const availableTools = getAvailableTools(user)
      const openAITools = toOpenAITools(availableTools)

      // Get or create conversation context
      let context = await getConversation(conversationId)
      if (!context) {
        context = {
          history: [{ role: 'system', content: SYSTEM_PROMPT }],
          lastActivity: new Date().toISOString(),
        }
      }
      context.lastActivity = new Date().toISOString()

      // Add user message to history
      context.history.push({ role: 'user', content: message })
      
      // Save conversation context after user message
      await saveConversation(conversationId, context)

      // Send message and get response
      const response = await callOpenRouter(context.history, openAITools)

      // Process function calls if any
      if (response.tool_calls && response.tool_calls.length > 0) {
        // Add assistant message with tool calls to history
        context.history.push({
          role: 'assistant',
          content: response.content,
          tool_calls: response.tool_calls,
        })
        
        // Save conversation context after assistant tool call decision
        await saveConversation(conversationId, context)

        // Execute each function call
        for (const tc of response.tool_calls) {
          const toolId = tc.id
          const toolName = tc.function.name
          let toolParams: Record<string, unknown> = {}

          try {
            toolParams = JSON.parse(tc.function.arguments)
          } catch {
            toolParams = {}
          }

          // Emit tool start event
          SocketEmitter.emitToUser(userId, AIAssistantSocketEvents.TOOL_START, {
            conversationId,
            toolName,
            toolId,
            params: toolParams,
          } as AIToolStartPayload)

          // Double-check permission before execution
          if (!canUseTool(user, toolName)) {
            const permissionError = new PermissionError(
              `Permission denied for tool: ${toolName}`,
              toolName
            )
            const errorResult = {
              success: false,
              error: permissionError.message,
              code: permissionError.code,
            }
            context.history.push({
              role: 'tool',
              content: JSON.stringify(errorResult),
              tool_call_id: toolId,
            })
            SocketEmitter.emitToUser(userId, AIAssistantSocketEvents.TOOL_COMPLETE, {
              conversationId,
              toolId,
              toolName,
              result: errorResult,
              success: false,
              error: permissionError.message,
            } as AIToolCompletePayload)
            console.warn(`[AI Assistant] Permission denied for user ${userId}, tool ${toolName}`)
            continue
          }

          // Execute the tool
          const tool = findTool(toolName)
          if (!tool) {
            const errorResult = { success: false, error: `Tool not found: ${toolName}` }
            context.history.push({
              role: 'tool',
              content: JSON.stringify(errorResult),
              tool_call_id: toolId,
            })
            SocketEmitter.emitToUser(userId, AIAssistantSocketEvents.TOOL_COMPLETE, {
              conversationId,
              toolId,
              toolName,
              result: errorResult,
              success: false,
              error: 'Tool not found',
            } as AIToolCompletePayload)
            continue
          }

          try {
            // Set timeout for tool execution (30 seconds)
            const toolExecutionPromise = tool.execute(toolParams, user)
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new TimeoutError(`Tool ${toolName} execution timed out`)), 30000)
            })
            
            const toolResult = await Promise.race([toolExecutionPromise, timeoutPromise]) as unknown

            // Log AI tool execution
            console.log(`[AI Assistant] User ${userId} executed tool ${toolName}:`, {
              params: toolParams,
              result: toolResult,
            })

            context.history.push({
              role: 'tool',
              content: JSON.stringify(toolResult),
              tool_call_id: toolId,
            })

            SocketEmitter.emitToUser(userId, AIAssistantSocketEvents.TOOL_COMPLETE, {
              conversationId,
              toolId,
              toolName,
              result: toolResult,
              success: true,
            } as AIToolCompletePayload)
          } catch (error) {
            const toolError = error instanceof ToolExecutionError 
              ? error 
              : new ToolExecutionError(
                  error instanceof Error ? error.message : 'Tool execution failed',
                  toolName,
                  false
                )
            
            const errorResult = { 
              success: false, 
              error: toolError.message,
              code: toolError.code,
            }
            
            context.history.push({
              role: 'tool',
              content: JSON.stringify(errorResult),
              tool_call_id: toolId,
            })

            SocketEmitter.emitToUser(userId, AIAssistantSocketEvents.TOOL_COMPLETE, {
              conversationId,
              toolId,
              toolName,
              result: errorResult,
              success: false,
              error: toolError.message,
            } as AIToolCompletePayload)
            
            console.error(`[AI Assistant] Tool execution error for user ${userId}, tool ${toolName}:`, toolError)
          }
        }

        // Send tool results back to the model for final response
        const finalResponse = await callOpenRouter(context.history, openAITools)
        const responseText = finalResponse.content || ''

        // Add assistant response to history
        context.history.push({ role: 'assistant', content: responseText })

        // Save conversation context
        await saveConversation(conversationId, context)

        // Emit final response
        SocketEmitter.emitToUser(userId, AIAssistantSocketEvents.RESPONSE, {
          conversationId,
          content: responseText,
          isComplete: true,
        } as AIResponsePayload)
      } else {
        // No function calls - just a text response
        const responseText = response.content || ''

        // Add assistant response to history
        context.history.push({ role: 'assistant', content: responseText })

        // Save conversation context
        await saveConversation(conversationId, context)

        // Emit response
        SocketEmitter.emitToUser(userId, AIAssistantSocketEvents.RESPONSE, {
          conversationId,
          content: responseText,
          isComplete: true,
        } as AIResponsePayload)
      }

      // Emit stream end
      SocketEmitter.emitToUser(userId, AIAssistantSocketEvents.STREAM_END, {
        conversationId,
      })
    } catch (error) {
      const errorPayload = errorToPayload(error, conversationId)
      
      console.error(`[AI Assistant] Error processing message for user ${userId}, conversation ${conversationId}:`, {
        error,
        code: errorPayload.code,
        retryable: errorPayload.retryable,
      })

      SocketEmitter.emitToUser(userId, AIAssistantSocketEvents.ERROR, {
        conversationId,
        ...errorPayload,
      } as AIErrorPayload)
    }
  },

  /**
   * Clear conversation history
   */
  async clearConversation(conversationId: string): Promise<void> {
    await deleteConversation(conversationId)
  },
}
