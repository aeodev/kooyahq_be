import type { AuthenticatedSocket } from '../../lib/socket'
import { hasPermission, PERMISSIONS } from '../auth/rbac/permissions'
import { checkAIAssistantRateLimit } from '../../middleware/socket-rate-limit'
import { aiAssistantService } from './ai-assistant.service'
import { AIAssistantSocketEvents, type AIMessagePayload } from './ai-assistant.types'
import { validateMessagePayload, validateClearConversationPayload } from './ai-assistant.validation'
import { RateLimitError, errorToPayload } from './ai-assistant.errors'

export function registerAIAssistantHandlers(socket: AuthenticatedSocket): void {
  // Check if user has AI assistant access
  if (!socket.user || !hasPermission(socket.user, PERMISSIONS.AI_ASSISTANT_ACCESS)) {
    // User doesn't have AI access - don't register handlers
    return
  }

  const userId = socket.userId!
  const user = socket.user

  // Handle AI message
  socket.on(AIAssistantSocketEvents.MESSAGE, async (data: unknown) => {
    // Check rate limit
    const rateLimit = await checkAIAssistantRateLimit(userId)
    if (!rateLimit.allowed) {
      const rateLimitError = new RateLimitError(
        `Rate limit exceeded. Please try again in ${rateLimit.retryAfter || 1} second(s).`,
        rateLimit.retryAfter
      )
      socket.emit(AIAssistantSocketEvents.ERROR, {
        ...errorToPayload(rateLimitError),
      })
      return
    }

    // Validate input
    const validation = validateMessagePayload(data)
    
    if (!validation.valid) {
      const errorMessages = validation.errors.map(e => `${e.field}: ${e.message}`).join(', ')
      socket.emit(AIAssistantSocketEvents.ERROR, {
        message: `Validation failed: ${errorMessages}`,
        code: 'VALIDATION_ERROR',
        errors: validation.errors,
      })
      return
    }

    const { message, conversationId } = validation.sanitized!

    console.log(`[AI Assistant] Received message from ${userId}:`, message.substring(0, 100))

    try {
      await aiAssistantService.processMessage({
        userId,
        user,
        message,
        conversationId,
      })
    } catch (error) {
      console.error(`[AI Assistant] Error processing message for user ${userId}:`, error)
      const errorPayload = errorToPayload(error)
      socket.emit(AIAssistantSocketEvents.ERROR, errorPayload)
    }
  })

  // Handle conversation clear
  socket.on('ai:clear-conversation', async (data: unknown) => {
    // Validate input
    const validation = validateClearConversationPayload(data)
    
    if (!validation.valid) {
      const errorMessages = validation.errors.map(e => `${e.field}: ${e.message}`).join(', ')
      socket.emit(AIAssistantSocketEvents.ERROR, {
        message: `Validation failed: ${errorMessages}`,
        code: 'VALIDATION_ERROR',
        errors: validation.errors,
      })
      return
    }

    const payload = data as { conversationId: string }
    await aiAssistantService.clearConversation(payload.conversationId)
  })

  console.log(`[AI Assistant] Registered handlers for user ${userId}`)
}

