/**
 * Base error class for AI Assistant errors
 */
export class AIAssistantError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false,
    public readonly statusCode: number = 500
  ) {
    super(message)
    this.name = 'AIAssistantError'
  }
}

/**
 * Validation error
 */
export class ValidationError extends AIAssistantError {
  constructor(message: string, public readonly field?: string) {
    super(message, 'VALIDATION_ERROR', false, 400)
    this.name = 'ValidationError'
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends AIAssistantError {
  constructor(message: string, public readonly retryAfter?: number) {
    super(message, 'RATE_LIMIT_EXCEEDED', true, 429)
    this.name = 'RateLimitError'
  }
}

/**
 * Tool execution error
 */
export class ToolExecutionError extends AIAssistantError {
  constructor(
    message: string,
    public readonly toolName?: string,
    retryable: boolean = false
  ) {
    super(message, 'TOOL_EXECUTION_ERROR', retryable, 500)
    this.name = 'ToolExecutionError'
  }
}

/**
 * Permission error
 */
export class PermissionError extends AIAssistantError {
  constructor(message: string, public readonly permission?: string) {
    super(message, 'PERMISSION_DENIED', false, 403)
    this.name = 'PermissionError'
  }
}

/**
 * Configuration error
 */
export class ConfigurationError extends AIAssistantError {
  constructor(message: string) {
    super(message, 'NOT_CONFIGURED', false, 503)
    this.name = 'ConfigurationError'
  }
}

/**
 * API error (OpenRouter)
 */
export class APIError extends AIAssistantError {
  constructor(
    message: string,
    public readonly statusCode: number,
    retryable: boolean = false
  ) {
    super(message, 'API_ERROR', retryable, statusCode)
    this.name = 'APIError'
  }
}

/**
 * Timeout error
 */
export class TimeoutError extends AIAssistantError {
  constructor(message: string = 'Operation timed out') {
    super(message, 'TIMEOUT_ERROR', true, 504)
    this.name = 'TimeoutError'
  }
}

/**
 * Convert error to AIErrorPayload format
 */
export function errorToPayload(
  error: unknown,
  conversationId?: string
): { message: string; code: string; retryable?: boolean; errors?: unknown[] } {
  if (error instanceof AIAssistantError) {
    return {
      message: error.message,
      code: error.code,
      retryable: error.retryable,
    }
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      code: 'UNKNOWN_ERROR',
      retryable: false,
    }
  }

  return {
    message: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
    retryable: false,
  }
}

