import { randomUUID } from 'node:crypto'
import { env } from '../../config/env'
import { SocketEmitter } from '../../utils/socket-emitter'
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
import { getAvailableTools, toOpenAITools, findTool, canUseTool } from './ai-assistant.tools'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'google/gemini-2.0-flash-001'

// System prompt for Kooya AI
const SYSTEM_PROMPT = `You are Kooya, the AI assistant for KooyaHQ - a team productivity and project management platform.

Your capabilities include:
- Time tracking: Start, stop, pause, and resume timers
- Tickets: Create tasks, bugs, stories, and epics on boards
- Ticket management: Assign tickets to users
- Information: Check active timers, list boards, get board members

Guidelines:
- Be helpful, friendly, and concise
- When starting a timer, confirm which project(s) the user wants to track
- For creating tickets: if the board is not specified, AUTOMATICALLY call get_my_boards first to fetch the available boards, then present them nicely and ask which one to use
- For assigning tickets: if the user says "assign to me", use "me" as the assigneeId. Otherwise, call get_board_members to show available team members
- Always confirm destructive actions before executing
- If you don't have a tool to do something, explain what you can do instead

Response formatting:
- Keep responses clean and readable
- For lists of items (like boards or members), present them in a nice format like:
  "Here are your boards:
   • Board Name (PREFIX) - kanban
   Which one would you like to use?"
- Don't show raw IDs to the user unless they specifically ask
- Use names when referring to boards and users, not IDs
- After creating a ticket, mention that you can assign it if the user wants

Remember: You can only perform actions the user has permission for.`

interface ConversationContext {
  history: OpenAIMessage[]
  lastActivity: Date
}

// Simple in-memory conversation storage (could be Redis for production)
const conversations = new Map<string, ConversationContext>()

// Cleanup old conversations every 30 minutes
setInterval(() => {
  const now = new Date()
  const maxAge = 30 * 60 * 1000 // 30 minutes
  for (const [id, ctx] of conversations) {
    if (now.getTime() - ctx.lastActivity.getTime() > maxAge) {
      conversations.delete(id)
    }
  }
}, 30 * 60 * 1000)

async function callOpenRouter(
  messages: OpenAIMessage[],
  tools?: ReturnType<typeof toOpenAITools>
): Promise<{ content: string | null; tool_calls?: OpenAIToolCall[] }> {
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
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  const choice = data.choices?.[0]?.message

  return {
    content: choice?.content || null,
    tool_calls: choice?.tool_calls,
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
      SocketEmitter.emitToUser(userId, AIAssistantSocketEvents.ERROR, {
        conversationId,
        message: 'AI assistant is not configured. Please set up the OpenRouter API key.',
        code: 'NOT_CONFIGURED',
      } as AIErrorPayload)
      return
    }

    try {
      // Get tools available to this user
      const availableTools = getAvailableTools(user)
      const openAITools = toOpenAITools(availableTools)

      // Get or create conversation context
      let context = conversations.get(conversationId)
      if (!context) {
        context = {
          history: [{ role: 'system', content: SYSTEM_PROMPT }],
          lastActivity: new Date(),
        }
        conversations.set(conversationId, context)
      }
      context.lastActivity = new Date()

      // Add user message to history
      context.history.push({ role: 'user', content: message })

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
            const errorResult = {
              success: false,
              error: `Permission denied for tool: ${toolName}`,
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
              error: 'Permission denied',
            } as AIToolCompletePayload)
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
            const toolResult = await tool.execute(toolParams, user)

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
            const errorMessage = error instanceof Error ? error.message : 'Tool execution failed'
            const errorResult = { success: false, error: errorMessage }
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
              error: errorMessage,
            } as AIToolCompletePayload)
          }
        }

        // Send tool results back to the model for final response
        const finalResponse = await callOpenRouter(context.history, openAITools)
        const responseText = finalResponse.content || ''

        // Add assistant response to history
        context.history.push({ role: 'assistant', content: responseText })

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
      console.error('AI Assistant error:', error)

      const errorMessage = error instanceof Error ? error.message : 'An error occurred'
      SocketEmitter.emitToUser(userId, AIAssistantSocketEvents.ERROR, {
        conversationId,
        message: errorMessage,
        code: 'PROCESSING_ERROR',
      } as AIErrorPayload)
    }
  },

  /**
   * Clear conversation history
   */
  clearConversation(conversationId: string): void {
    conversations.delete(conversationId)
  },
}
