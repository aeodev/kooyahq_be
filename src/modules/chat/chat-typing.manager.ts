import type { AuthenticatedSocket } from '../../lib/socket'
import { chatRoom } from '../../utils/socket-rooms'

const typingUsers = new Map<string, Map<string, NodeJS.Timeout>>()

function cleanupConversation(conversationId: string): void {
  const conversationTyping = typingUsers.get(conversationId)
  if (conversationTyping && conversationTyping.size === 0) {
    typingUsers.delete(conversationId)
  }
}

export function startTyping(conversationId: string, userId: string, socket: AuthenticatedSocket, userName?: string): void {
  let conversationTyping = typingUsers.get(conversationId)
  if (!conversationTyping) {
    conversationTyping = new Map()
    typingUsers.set(conversationId, conversationTyping)
  }

  const existingTimeout = conversationTyping.get(userId)
  if (existingTimeout) {
    clearTimeout(existingTimeout)
  }

  socket.to(chatRoom(conversationId)).emit('chat:typing', {
    conversationId,
    userId,
    userName,
    isTyping: true,
    timestamp: new Date().toISOString(),
  })

  const timeout = setTimeout(() => {
    socket.to(chatRoom(conversationId)).emit('chat:typing', {
      conversationId,
      userId,
      isTyping: false,
      timestamp: new Date().toISOString(),
    })
    
    const conversationTyping = typingUsers.get(conversationId)
    if (conversationTyping) {
      conversationTyping.delete(userId)
      cleanupConversation(conversationId)
    }
  }, 3000)

  conversationTyping.set(userId, timeout)
}

export function stopTyping(conversationId: string, userId: string, socket: AuthenticatedSocket): void {
  const conversationTyping = typingUsers.get(conversationId)
  if (conversationTyping) {
    const timeout = conversationTyping.get(userId)
    if (timeout) {
      clearTimeout(timeout)
      conversationTyping.delete(userId)
      cleanupConversation(conversationId)
    }
  }

  socket.to(chatRoom(conversationId)).emit('chat:typing', {
    conversationId,
    userId,
    isTyping: false,
    timestamp: new Date().toISOString(),
  })
}

export function clearUserTyping(userId: string): void {
  typingUsers.forEach((conversationTyping, conversationId) => {
    const timeout = conversationTyping.get(userId)
    if (timeout) {
      clearTimeout(timeout)
      conversationTyping.delete(userId)
      cleanupConversation(conversationId)
    }
  })
}
