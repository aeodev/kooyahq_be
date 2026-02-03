import type { AuthenticatedSocket } from '../../lib/socket'
import { chatRoom, chatUserRoom } from '../../utils/socket-rooms'
import { SocketEmitter } from '../../utils/socket-emitter'
import { PERMISSIONS } from '../auth/rbac/permissions'
import { socketHasPermission } from '../auth/rbac/socket-permissions'
import { chatService } from './chat.service'
import { chatRepository } from './chat.repository'
import { startTyping, stopTyping, clearUserTyping } from './chat-typing.manager'
import { validateConversationAccess, createMessageEvent } from './chat-socket.helpers'

export function registerChatHandlers(socket: AuthenticatedSocket): void {
  const userId = socket.userId
  if (!userId) {
    return
  }

  socket.on('chat:join', async (conversationId: string) => {
    if (!socketHasPermission(socket, PERMISSIONS.CHAT_READ, PERMISSIONS.CHAT_FULL_ACCESS)) return

    if (!conversationId || typeof conversationId !== 'string') return

    try {
      const conversation = await chatRepository.findConversationById(conversationId, userId)
      if (!conversation) {
        socket.emit('chat:error', { message: 'Conversation not found or access denied' })
        return
      }

      const room = chatRoom(conversationId)
      socket.join(room)

      socket.join(chatUserRoom(userId))

    } catch (error) {
      console.error('Error joining chat room:', error)
      socket.emit('chat:error', { message: 'Failed to join conversation' })
    }
  })

  socket.on('chat:leave', (conversationId: string) => {
    if (!conversationId || typeof conversationId !== 'string') return

    const room = chatRoom(conversationId)
    socket.leave(room)

    stopTyping(conversationId, userId, socket)

  })

  socket.on('send_message', async (data: {
    cid: string
    content: string
    type?: 'text' | 'image' | 'file' | 'system'
    attachments?: any[]
    replyTo?: string
    conversationId: string
  }) => {
    if (!socketHasPermission(socket, PERMISSIONS.CHAT_SEND, PERMISSIONS.CHAT_FULL_ACCESS)) return

    const { cid, conversationId, content, type, attachments, replyTo } = data

    // Basic type checks only - validation happens in service
    if (!conversationId || typeof conversationId !== 'string') {
      socket.emit('message_ack', {
        cid,
        status: 'error',
        error: 'Invalid conversation ID'
      })
      return
    }

    if (!cid || typeof cid !== 'string') {
      socket.emit('message_ack', {
        cid: cid || '',
        status: 'error',
        error: 'Invalid client ID'
      })
      return
    }

    try {
      const { message, participantIds } = await chatService.saveAndDistribute(conversationId, userId, {
        conversationId,
        senderId: userId,
        content,
        type: type as 'text' | 'image' | 'file' | 'system' | undefined,
        attachments,
        replyTo,
        cid,
      })

      socket.emit('message_ack', {
        cid,
        id: message.id,
        status: 'success'
      })

      const messageEvent = createMessageEvent(message, conversationId)
      SocketEmitter.emitToRoom(chatRoom(conversationId), 'new_message', messageEvent)
      participantIds.forEach((participantId) => {
        SocketEmitter.emitToRoom(chatUserRoom(participantId), 'new_message', messageEvent)
      })

      stopTyping(conversationId, userId, socket)
    } catch (error: any) {
      console.error('Error sending message:', error)
      socket.emit('message_ack', {
        cid,
        status: 'error',
        error: error.message || 'Failed to send message'
      })
    }
  })

  socket.on('chat:typing-start', (data: { conversationId: string }) => {
    if (!socketHasPermission(socket, PERMISSIONS.CHAT_SEND, PERMISSIONS.CHAT_FULL_ACCESS)) return

    const { conversationId } = data
    if (!conversationId || typeof conversationId !== 'string') return

    startTyping(conversationId, userId, socket, socket.user?.name)
  })

  socket.on('chat:typing-stop', (data: { conversationId: string }) => {
    const { conversationId } = data
    if (!conversationId || typeof conversationId !== 'string') return

    stopTyping(conversationId, userId, socket)
  })

  socket.on('chat:read-receipt', async (data: { conversationId: string; messageId?: string }) => {
    if (!socketHasPermission(socket, PERMISSIONS.CHAT_READ, PERMISSIONS.CHAT_FULL_ACCESS)) return

    const { conversationId, messageId } = data
    if (!conversationId || typeof conversationId !== 'string') return

    try {
      if (messageId) {
        await chatRepository.markAsRead(messageId, userId)
      } else {
        await chatService.markAsRead(conversationId, userId)
      }

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

  socket.on('chat:message-edited', async (data: { messageId: string; conversationId?: string; content: string }) => {
    if (!socketHasPermission(socket, PERMISSIONS.CHAT_SEND, PERMISSIONS.CHAT_FULL_ACCESS)) return

    const { messageId, conversationId, content } = data
    if (!messageId || typeof messageId !== 'string') return
    if (!content || typeof content !== 'string' || !content.trim()) return

    try {
      const message = await chatRepository.findMessageById(messageId)
      if (!message || message.senderId !== userId) {
        socket.emit('chat:error', { message: 'Message not found or unauthorized' })
        return
      }

      const resolvedConversationId = conversationId || message.conversationId
      
      const accessCheck = await validateConversationAccess(socket, resolvedConversationId)
      if (!accessCheck.valid) {
        socket.emit('chat:error', { message: 'Conversation not found or access denied' })
        return
      }

      if (message.conversationId !== resolvedConversationId) {
        socket.emit('chat:error', { message: 'Message does not belong to conversation' })
        return
      }

      const updated = await chatRepository.updateMessage(messageId, userId, resolvedConversationId, {
        content: content.trim(),
      })
      
      if (updated) {
        SocketEmitter.emitToRoom(chatRoom(resolvedConversationId), 'chat:message-edited', {
          message: updated,
          timestamp: new Date().toISOString(),
        })
      } else {
        socket.emit('chat:error', { message: 'Message not found or unauthorized' })
      }
    } catch (error) {
      console.error('Error editing message:', error)
      socket.emit('chat:error', { message: 'Failed to edit message' })
    }
  })

  socket.on('chat:message-deleted', async (data: { messageId: string; conversationId?: string }) => {
    if (!socketHasPermission(socket, PERMISSIONS.CHAT_SEND, PERMISSIONS.CHAT_FULL_ACCESS)) return

    const { messageId, conversationId } = data
    if (!messageId || typeof messageId !== 'string') return

    try {
      const message = await chatRepository.findMessageById(messageId)
      if (!message || message.senderId !== userId) {
        socket.emit('chat:error', { message: 'Message not found or unauthorized' })
        return
      }

      const resolvedConversationId = conversationId || message.conversationId
      
      const accessCheck = await validateConversationAccess(socket, resolvedConversationId)
      if (!accessCheck.valid) {
        socket.emit('chat:error', { message: 'Conversation not found or access denied' })
        return
      }

      if (message.conversationId !== resolvedConversationId) {
        socket.emit('chat:error', { message: 'Message does not belong to conversation' })
        return
      }

      const deleted = await chatRepository.delete(messageId, userId, resolvedConversationId)
      if (deleted) {
        SocketEmitter.emitToRoom(chatRoom(resolvedConversationId), 'chat:message-deleted', {
          messageId,
          conversationId: resolvedConversationId,
          timestamp: new Date().toISOString(),
        })
      } else {
        socket.emit('chat:error', { message: 'Failed to delete message' })
      }
    } catch (error) {
      console.error('Error deleting message:', error)
      socket.emit('chat:error', { message: 'Failed to delete message' })
    }
  })

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

  socket.on('disconnect', () => {
    clearUserTyping(userId)
  })
}
