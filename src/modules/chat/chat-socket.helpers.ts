import type { AuthenticatedSocket } from '../../lib/socket'
import { PERMISSIONS } from '../auth/rbac/permissions'
import { socketHasPermission } from '../auth/rbac/socket-permissions'
import { chatRepository } from './chat.repository'
import type { MessageWithSender } from './chat.service'

export async function validateConversationAccess(
  socket: AuthenticatedSocket,
  conversationId: string
): Promise<{ valid: boolean; conversation?: any }> {
  if (!socketHasPermission(socket, PERMISSIONS.CHAT_READ, PERMISSIONS.CHAT_FULL_ACCESS)) {
    return { valid: false }
  }

  if (!conversationId || typeof conversationId !== 'string') {
    return { valid: false }
  }

  const userId = socket.userId
  if (!userId) {
    return { valid: false }
  }

  try {
    const conversation = await chatRepository.findConversationById(conversationId, userId)
    if (!conversation) {
      return { valid: false }
    }

    return { valid: true, conversation }
  } catch (error) {
    console.error('Error validating conversation access:', error)
    return { valid: false }
  }
}

export function createMessageEvent(message: MessageWithSender, conversationId: string) {
  return {
    message,
    conversationId,
    timestamp: new Date().toISOString(),
  }
}
