import type { AuthenticatedSocket } from '../../lib/socket'
import { hasPermission, PERMISSIONS } from '../auth/rbac/permissions'
import { aiAssistantService } from './ai-assistant.service'
import { AIAssistantSocketEvents, type AIMessagePayload } from './ai-assistant.types'

export function registerAIAssistantHandlers(socket: AuthenticatedSocket): void {
  // Check if user has AI assistant access
  if (!socket.user || !hasPermission(socket.user, PERMISSIONS.AI_ASSISTANT_ACCESS)) {
    // User doesn't have AI access - don't register handlers
    return
  }

  const userId = socket.userId!
  const user = socket.user

  // Handle AI message
  socket.on(AIAssistantSocketEvents.MESSAGE, async (data: AIMessagePayload) => {
    const { message, conversationId } = data

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      socket.emit(AIAssistantSocketEvents.ERROR, {
        message: 'Message is required',
        code: 'INVALID_INPUT',
      })
      return
    }

    console.log(`[AI Assistant] Received message from ${userId}:`, message.substring(0, 100))

    try {
      await aiAssistantService.processMessage({
        userId,
        user,
        message: message.trim(),
        conversationId,
      })
    } catch (error) {
      console.error('[AI Assistant] Error processing message:', error)
      socket.emit(AIAssistantSocketEvents.ERROR, {
        message: 'Failed to process message',
        code: 'PROCESSING_ERROR',
      })
    }
  })

  // Handle conversation clear
  socket.on('ai:clear-conversation', (data: { conversationId: string }) => {
    if (data.conversationId) {
      aiAssistantService.clearConversation(data.conversationId)
    }
  })

  console.log(`[AI Assistant] Registered handlers for user ${userId}`)
}

