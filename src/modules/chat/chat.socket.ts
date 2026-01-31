import type { AuthenticatedSocket } from '../../lib/socket'
import { chatRoom, chatUserRoom } from '../../utils/socket-rooms'
import { SocketEmitter } from '../../utils/socket-emitter'
import { PERMISSIONS } from '../auth/rbac/permissions'
import { socketHasPermission } from '../auth/rbac/socket-permissions'
import { chatService } from './chat.service'
import { chatRepository } from './chat.repository'

// Track typing users per conversation
const typingUsers = new Map<string, Map<string, NodeJS.Timeout>>()

/**
 * Register socket handlers for chat module
 * Handles real-time messaging, typing indicators, and read receipts
 */
export function registerChatHandlers(socket: AuthenticatedSocket): void {
  const userId = socket.userId
  if (!userId) {
    return
  }

  // Join a conversation room
  socket.on('chat:join', async (conversationId: string) => {
    if (!socketHasPermission(socket, PERMISSIONS.CHAT_READ, PERMISSIONS.CHAT_FULL_ACCESS)) return

    if (!conversationId || typeof conversationId !== 'string') return

    try {
      // Verify user has access to conversation
      const conversation = await chatRepository.findConversationById(conversationId, userId)
      if (!conversation) {
        socket.emit('chat:error', { message: 'Conversation not found or access denied' })
        return
      }

      const room = chatRoom(conversationId)
      socket.join(room)

      // Also join user's personal chat room for notifications
      socket.join(chatUserRoom(userId))

      console.log(`User ${userId} joined chat conversation ${conversationId}`)
    } catch (error) {
      console.error('Error joining chat room:', error)
      socket.emit('chat:error', { message: 'Failed to join conversation' })
    }
  })

  // Leave a conversation room
  socket.on('chat:leave', (conversationId: string) => {
    if (!conversationId || typeof conversationId !== 'string') return

    const room = chatRoom(conversationId)
    socket.leave(room)

    // Clear typing indicator
    const conversationTyping = typingUsers.get(conversationId)
    if (conversationTyping) {
      const timeout = conversationTyping.get(userId)
      if (timeout) {
        clearTimeout(timeout)
        conversationTyping.delete(userId)
      }
    }

    console.log(`User ${userId} left chat conversation ${conversationId}`)
  })

  // Send a message
  socket.on('chat:send-message', async (data: { conversationId: string; content: string; type?: string; attachments?: any[]; replyTo?: string }) => {
    if (!socketHasPermission(socket, PERMISSIONS.CHAT_SEND, PERMISSIONS.CHAT_FULL_ACCESS)) return

    const { conversationId, content, type, attachments, replyTo } = data

    // Validate inputs
    if (!conversationId || typeof conversationId !== 'string') return
    if (!content || typeof content !== 'string' || !content.trim()) return
    if (content.length > 5000) return

    try {
      // Send message via service
      const message = await chatService.sendMessage(conversationId, userId, {
        conversationId,
        senderId: userId,
        content: content.trim(),
        type: (type as any) || 'text',
        attachments,
        replyTo,
      })

      // Broadcast to all participants in the conversation room
      SocketEmitter.emitToRoom(chatRoom(conversationId), 'chat:message-received', {
        message,
        conversationId,
        timestamp: new Date().toISOString(),
      })

      // Clear typing indicator
      const conversationTyping = typingUsers.get(conversationId)
      if (conversationTyping) {
        const timeout = conversationTyping.get(userId)
        if (timeout) {
          clearTimeout(timeout)
          conversationTyping.delete(userId)
        }
      }
    } catch (error: any) {
      console.error('Error sending message:', error)
      socket.emit('chat:error', { message: error.message || 'Failed to send message' })
    }
  })

  // Typing indicator - start
  socket.on('chat:typing-start', (data: { conversationId: string }) => {
    if (!socketHasPermission(socket, PERMISSIONS.CHAT_SEND, PERMISSIONS.CHAT_FULL_ACCESS)) return

    const { conversationId } = data
    if (!conversationId || typeof conversationId !== 'string') return

    // Clear existing timeout
    let conversationTyping = typingUsers.get(conversationId)
    if (!conversationTyping) {
      conversationTyping = new Map()
      typingUsers.set(conversationId, conversationTyping)
    }

    const existingTimeout = conversationTyping.get(userId)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // Broadcast typing indicator to others in the room
    socket.to(chatRoom(conversationId)).emit('chat:typing', {
      conversationId,
      userId,
      userName: socket.user?.name,
      isTyping: true,
      timestamp: new Date().toISOString(),
    })

    // Set timeout to auto-stop typing after 3 seconds
    const timeout = setTimeout(() => {
      socket.to(chatRoom(conversationId)).emit('chat:typing', {
        conversationId,
        userId,
        isTyping: false,
        timestamp: new Date().toISOString(),
      })
      conversationTyping.delete(userId)
    }, 3000)

    conversationTyping.set(userId, timeout)
  })

  // Typing indicator - stop
  socket.on('chat:typing-stop', (data: { conversationId: string }) => {
    const { conversationId } = data
    if (!conversationId || typeof conversationId !== 'string') return

    const conversationTyping = typingUsers.get(conversationId)
    if (conversationTyping) {
      const timeout = conversationTyping.get(userId)
      if (timeout) {
        clearTimeout(timeout)
        conversationTyping.delete(userId)
      }
    }

    // Broadcast typing stopped
    socket.to(chatRoom(conversationId)).emit('chat:typing', {
      conversationId,
      userId,
      isTyping: false,
      timestamp: new Date().toISOString(),
    })
  })

  // Read receipt
  socket.on('chat:read-receipt', async (data: { conversationId: string; messageId?: string }) => {
    if (!socketHasPermission(socket, PERMISSIONS.CHAT_READ, PERMISSIONS.CHAT_FULL_ACCESS)) return

    const { conversationId, messageId } = data
    if (!conversationId || typeof conversationId !== 'string') return

    try {
      if (messageId) {
        // Mark specific message as read
        await chatRepository.markAsRead(messageId, userId)
      } else {
        // Mark entire conversation as read
        await chatService.markAsRead(conversationId, userId)
      }

      // Broadcast read receipt to conversation room
      SocketEmitter.emitToRoom(chatRoom(conversationId), 'chat:read', {
        conversationId,
        messageId,
        userId,
        userName: socket.user?.name,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  })

  // Message edited
  socket.on('chat:message-edited', async (data: { messageId: string; content: string }) => {
    if (!socketHasPermission(socket, PERMISSIONS.CHAT_SEND, PERMISSIONS.CHAT_FULL_ACCESS)) return

    const { messageId, content } = data
    if (!messageId || typeof messageId !== 'string') return
    if (!content || typeof content !== 'string' || !content.trim()) return

    try {
      const updated = await chatRepository.update(messageId, userId, { content: content.trim() })
      if (updated) {
        // Broadcast to conversation room
        const conversation = await chatRepository.findConversationById(updated.conversationId, userId)
        if (conversation) {
          SocketEmitter.emitToRoom(chatRoom(updated.conversationId), 'chat:message-edited', {
            message: updated,
            timestamp: new Date().toISOString(),
          })
        }
      }
    } catch (error) {
      console.error('Error editing message:', error)
      socket.emit('chat:error', { message: 'Failed to edit message' })
    }
  })

  // Message deleted
  socket.on('chat:message-deleted', async (data: { messageId: string }) => {
    if (!socketHasPermission(socket, PERMISSIONS.CHAT_SEND, PERMISSIONS.CHAT_FULL_ACCESS)) return

    const { messageId } = data
    if (!messageId || typeof messageId !== 'string') return

    try {
      const message = await chatRepository.findMessageById(messageId)
      if (!message || message.senderId !== userId) {
        socket.emit('chat:error', { message: 'Message not found or unauthorized' })
        return
      }

      const deleted = await chatRepository.delete(messageId, userId)
      if (deleted) {
        // Broadcast to conversation room
        SocketEmitter.emitToRoom(chatRoom(message.conversationId), 'chat:message-deleted', {
          messageId,
          conversationId: message.conversationId,
          timestamp: new Date().toISOString(),
        })
      }
    } catch (error) {
      console.error('Error deleting message:', error)
      socket.emit('chat:error', { message: 'Failed to delete message' })
    }
  })

  // Cleanup on disconnect
  socket.on('disconnect', () => {
    // Clear all typing indicators for this user
    typingUsers.forEach((conversationTyping) => {
      const timeout = conversationTyping.get(userId)
      if (timeout) {
        clearTimeout(timeout)
        conversationTyping.delete(userId)
      }
    })
  })
}
