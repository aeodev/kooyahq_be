import type { Permission } from '../auth/rbac/permissions'
import type { AuthUser } from '../auth/rbac/permissions'

// Socket event names
export const AIAssistantSocketEvents = {
  MESSAGE: 'ai:message',
  RESPONSE: 'ai:response',
  TOOL_START: 'ai:tool-start',
  TOOL_COMPLETE: 'ai:tool-complete',
  ERROR: 'ai:error',
  STREAM_END: 'ai:stream-end',
} as const

export type AIAssistantSocketEvent = (typeof AIAssistantSocketEvents)[keyof typeof AIAssistantSocketEvents]

// Message types
export type MessageRole = 'user' | 'assistant' | 'system'

export interface AIMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: string
  toolCalls?: AIToolCall[]
}

export interface AIToolCall {
  id: string
  name: string
  params: Record<string, unknown>
  status: 'pending' | 'running' | 'complete' | 'error'
  result?: unknown
  error?: string
}

// Tool definition
export interface AIToolProperty {
  type: string
  description: string
  enum?: string[]
  items?: { type: string }  // Required for array types
}

export interface AITool {
  name: string
  description: string
  requiredPermission: Permission | Permission[]
  parameters: {
    type: 'object'
    properties: Record<string, AIToolProperty>
    required?: string[]
  }
  execute: (params: Record<string, unknown>, user: AuthUser) => Promise<unknown>
}

// Socket payloads
export interface AIMessagePayload {
  message: string
  conversationId?: string
}

export interface AIResponsePayload {
  conversationId: string
  content: string
  isComplete: boolean
}

export interface AIToolStartPayload {
  conversationId: string
  toolName: string
  toolId: string
  params: Record<string, unknown>
}

export interface AIToolCompletePayload {
  conversationId: string
  toolId: string
  toolName: string
  result: unknown
  success: boolean
  error?: string
}

export interface AIErrorPayload {
  conversationId?: string
  message: string
  code?: string
}

// OpenAI function format (used by OpenRouter)
export interface OpenAITool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: string
      properties: Record<string, AIToolProperty>
      required?: string[]
    }
  }
}

// OpenAI message format
export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: OpenAIToolCall[]
  tool_call_id?: string
}

export interface OpenAIToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

