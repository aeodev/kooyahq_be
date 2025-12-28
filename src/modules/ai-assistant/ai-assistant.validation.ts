import { randomUUID } from 'node:crypto'
import type { AIMessagePayload } from './ai-assistant.types'

const MIN_MESSAGE_LENGTH = 1
const MAX_MESSAGE_LENGTH = 5000
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface ValidationError {
  field: string
  message: string
  code: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  sanitized?: AIMessagePayload
}

/**
 * Validate UUID format
 */
function isValidUUID(uuid: string): boolean {
  return UUID_REGEX.test(uuid)
}

/**
 * Sanitize message content
 */
function sanitizeMessage(message: string): string {
  // Remove control characters except newlines and tabs
  return message
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
    .trim()
}

/**
 * Validate AI assistant message payload
 */
export function validateMessagePayload(data: unknown): ValidationResult {
  const errors: ValidationError[] = []

  // Check if data is an object
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return {
      valid: false,
      errors: [
        {
          field: 'payload',
          message: 'Payload must be an object',
          code: 'INVALID_PAYLOAD_TYPE',
        },
      ],
    }
  }

  const payload = data as Record<string, unknown>

  // Validate message
  if (!('message' in payload)) {
    errors.push({
      field: 'message',
      message: 'Message is required',
      code: 'MISSING_MESSAGE',
    })
  } else {
    const message = payload.message

    if (typeof message !== 'string') {
      errors.push({
        field: 'message',
        message: 'Message must be a string',
        code: 'INVALID_MESSAGE_TYPE',
      })
    } else {
      const sanitized = sanitizeMessage(message)

      if (sanitized.length < MIN_MESSAGE_LENGTH) {
        errors.push({
          field: 'message',
          message: `Message must be at least ${MIN_MESSAGE_LENGTH} character(s)`,
          code: 'MESSAGE_TOO_SHORT',
        })
      } else if (sanitized.length > MAX_MESSAGE_LENGTH) {
        errors.push({
          field: 'message',
          message: `Message must be at most ${MAX_MESSAGE_LENGTH} characters`,
          code: 'MESSAGE_TOO_LONG',
        })
      }

      // Update payload with sanitized message
      if (errors.length === 0) {
        payload.message = sanitized
      }
    }
  }

  // Validate conversationId (optional)
  if ('conversationId' in payload && payload.conversationId !== undefined) {
    const conversationId = payload.conversationId

    if (typeof conversationId !== 'string') {
      errors.push({
        field: 'conversationId',
        message: 'Conversation ID must be a string',
        code: 'INVALID_CONVERSATION_ID_TYPE',
      })
    } else if (conversationId.length > 0 && !isValidUUID(conversationId)) {
      errors.push({
        field: 'conversationId',
        message: 'Conversation ID must be a valid UUID',
        code: 'INVALID_CONVERSATION_ID_FORMAT',
      })
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: errors.length === 0
      ? {
          message: payload.message as string,
          conversationId: payload.conversationId as string | undefined,
        }
      : undefined,
  }
}

/**
 * Validate conversation clear payload
 */
export function validateClearConversationPayload(data: unknown): ValidationResult {
  const errors: ValidationError[] = []

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return {
      valid: false,
      errors: [
        {
          field: 'payload',
          message: 'Payload must be an object',
          code: 'INVALID_PAYLOAD_TYPE',
        },
      ],
    }
  }

  const payload = data as Record<string, unknown>

  if (!('conversationId' in payload)) {
    errors.push({
      field: 'conversationId',
      message: 'Conversation ID is required',
      code: 'MISSING_CONVERSATION_ID',
    })
  } else {
    const conversationId = payload.conversationId

    if (typeof conversationId !== 'string') {
      errors.push({
        field: 'conversationId',
        message: 'Conversation ID must be a string',
        code: 'INVALID_CONVERSATION_ID_TYPE',
      })
    } else if (!isValidUUID(conversationId)) {
      errors.push({
        field: 'conversationId',
        message: 'Conversation ID must be a valid UUID',
        code: 'INVALID_CONVERSATION_ID_FORMAT',
      })
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

