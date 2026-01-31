import type { AuthenticatedSocket } from '../../lib/socket'
import { chatRoom, chatUserRoom } from '../../utils/socket-rooms'
import { SocketEmitter } from '../../utils/socket-emitter'
import { PERMISSIONS } from '../auth/rbac/permissions'
import { socketHasPermission } from '../auth/rbac/socket-permissions'
import { chatService } from './chat.service'
import { chatRepository } from './chat.repository'
import { getRedisClient } from '../../lib/redis'

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

  // Send a message with CID-based idempotency
  socket.on('send_message', async (data: {
    cid: string
    content: string
    type?: string
    attachments?: any[]
    replyTo?: string
    conversationId: string
  }) => {
    if (!socketHasPermission(socket, PERMISSIONS.CHAT_SEND, PERMISSIONS.CHAT_FULL_ACCESS)) return

    const { cid, conversationId, content, type, attachments, replyTo } = data

    // Validate inputs
    if (!conversationId || typeof conversationId !== 'string') return
    if (!cid || typeof cid !== 'string') return
    
    // Allow empty content if attachments exist
    const hasAttachments = attachments && attachments.length > 0
    const hasContent = content && typeof content === 'string' && content.trim()
    
    if (!hasContent && !hasAttachments) {
      console.log('❌ Socket: No content and no attachments')
      socket.emit('message_ack', {
        cid,
        status: 'error',
        error: 'Message content or attachments are required'
      })
      return
    }
    
    if (hasContent && content.length > 5000) return
    
    console.log('📤 Socket received message:', {
      cid,
      content: hasContent ? content.substring(0, 50) : '(empty)',
      hasContent,
      hasAttachments,
      attachmentsCount: attachments?.length || 0
    })

    const cacheKey = `msg:${conversationId}:${cid}`

    try {
      // Get Redis client
      const redisClient = await getRedisClient()

      // Idempotency check: Has this CID been processed before?
      const existingMessageId = await redisClient.get(cacheKey)
      if (existingMessageId) {
        // Message already processed, send ACK with existing ID
        socket.emit('message_ack', {
          cid,
          id: existingMessageId,
          status: 'duplicate'
        })
        return
      }

      // Use service to save and distribute message
      const messageContent = hasContent ? content.trim() : ''
      const messageType = hasAttachments && !hasContent ? 'image' : (type || 'text')
      
      console.log('📤 Calling saveAndDistribute:', {
        content: messageContent || '(empty)',
        type: messageType,
        attachmentsCount: attachments?.length || 0
      })
      
      const message = await chatService.saveAndDistribute(conversationId, userId, {
        conversationId,
        senderId: userId,
        content: messageContent,
        type: messageType as any,
        attachments,
        replyTo,
        cid,
      })

      // Cache the message ID for idempotency (24 hour TTL)
      await redisClient.setEx(cacheKey, 24 * 60 * 60, message.id)

      // Acknowledge to sender
      socket.emit('message_ack', {
        cid,
        id: message.id,
        status: 'success'
      })

      // Broadcast to all participants in the conversation room
      SocketEmitter.emitToRoom(chatRoom(conversationId), 'new_message', {
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

      // Send failure ACK
      socket.emit('message_ack', {
        cid,
        status: 'error',
        error: error.message || 'Failed to send message'
      })
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
      const updated = await chatRepository.updateMessage(messageId, userId, { content: content.trim() })
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

  // Delta sync for reconnection gaps
  socket.on('get_delta_messages', async (data: {
    conversationId: string
    lastMessageId?: string
    lastSyncTimestamp?: string
  }) => {
    const { conversationId, lastMessageId, lastSyncTimestamp } = data

    if (!conversationId || typeof conversationId !== 'string') return

    try {
      const messages = await chatService.getMessagesSince(
        conversationId,
        userId,
        lastMessageId,
        lastSyncTimestamp
      )

      socket.emit('delta_messages', {
        conversationId,
        messages,
        timestamp: new Date().toISOString()
      })
    } catch (error: any) {
      console.error('Error syncing delta messages:', error)
      socket.emit('sync_error', {
        conversationId,
        error: error.message || 'Failed to sync messages'
      })
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
