import { env } from '../config/env'

const CHAT_COMPLETIONS_PATH = '/chat/completions'
const DEFAULT_TIMEOUT_MS = 30000

export class OpenRouterError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly retryable: boolean = false
  ) {
    super(message)
    this.name = 'OpenRouterError'
  }
}

export class OpenRouterTimeoutError extends OpenRouterError {
  constructor(message: string = 'OpenRouter request timed out') {
    super(message, 504, true)
    this.name = 'OpenRouterTimeoutError'
  }
}

export class OpenRouterConfigError extends OpenRouterError {
  constructor(message: string) {
    super(message, 503, false)
    this.name = 'OpenRouterConfigError'
  }
}

export interface OpenRouterToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: OpenRouterToolCall[]
  tool_call_id?: string
}

export interface OpenRouterChatCompletionResponse<TToolCall = OpenRouterToolCall> {
  choices?: Array<{
    message?: {
      content?: string | null
      tool_calls?: TToolCall[]
    }
  }>
}

export interface OpenRouterChatCompletionOptions<TMessage = OpenRouterMessage, TTool = unknown> {
  messages: TMessage[]
  tools?: TTool[]
  model?: string
  timeoutMs?: number
  headers?: Record<string, string>
}

export interface OpenRouterChatCompletionResult<TToolCall = OpenRouterToolCall> {
  content: string | null
  toolCalls?: TToolCall[]
  raw: OpenRouterChatCompletionResponse<TToolCall>
}

function buildChatCompletionsUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, '')}${CHAT_COMPLETIONS_PATH}`
}

export const openRouterService = {
  async createChatCompletion<TMessage = OpenRouterMessage, TTool = unknown, TToolCall = OpenRouterToolCall>(
    options: OpenRouterChatCompletionOptions<TMessage, TTool>
  ): Promise<OpenRouterChatCompletionResult<TToolCall>> {
    if (!env.openRouter.apiKey) {
      throw new OpenRouterConfigError('OpenRouter API key is not configured.')
    }

    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(buildChatCompletionsUrl(env.openRouter.baseUrl), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.openRouter.apiKey}`,
          'HTTP-Referer': 'https://kooyahq.com',
          'X-Title': 'KooyaHQ',
          ...options.headers,
        },
        body: JSON.stringify({
          model: options.model ?? env.openRouter.defaultModel,
          messages: options.messages,
          tools: options.tools && options.tools.length > 0 ? options.tools : undefined,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        const retryable = response.status >= 500 || response.status === 429
        throw new OpenRouterError(
          `OpenRouter API error: ${response.status} - ${errorText}`,
          response.status,
          retryable
        )
      }

      const data = await response.json() as OpenRouterChatCompletionResponse<TToolCall>
      const choice = data.choices?.[0]?.message

      return {
        content: choice?.content ?? null,
        toolCalls: choice?.tool_calls,
        raw: data,
      }
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof OpenRouterError) {
        throw error
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new OpenRouterTimeoutError()
      }

      throw new OpenRouterError(
        error instanceof Error ? error.message : 'Unknown OpenRouter error',
        500,
        true
      )
    }
  },
}
