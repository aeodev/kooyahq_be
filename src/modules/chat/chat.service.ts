import { chatRepository, type CreateConversationInput, type CreateMessageInput } from './chat.repository'
import { ConversationModel, MessageModel } from './chat.model'
import { userService } from '../users/user.service'
import { fetchLinkPreview } from '../link-preview/link-preview.service'
import type { Conversation, Message } from './chat.model'

type ParticipantSummary = {
  id: string
  name: string
  email: string
  profilePic?: string
}

export type ConversationWithParticipants = Omit<Conversation, 'participants' | 'lastMessage'> & {
  participants: ParticipantSummary[]
  lastMessage?: Message
}

export type MessageWithSender = Message & {
  sender: {
    id: string
    name: string
    email: string
    profilePic?: string
  }
}

export const chatService = {
  async createDirectConversation(userId1: string, userId2: string): Promise<ConversationWithParticipants> {
    const existing = await chatRepository.findDirectConversation(userId1, userId2)
    if (existing) {
      return this.getConversation(existing.id, userId1)
    }

    const [user1, user2] = await Promise.all([
      userService.getPublicProfile(userId1),
      userService.getPublicProfile(userId2),
    ])

    if (!user1 || !user2) {
      throw new Error('One or both users not found')
    }

    const conversation = await chatRepository.createConversation({
      type: 'direct',
      participants: [userId1, userId2],
      createdBy: userId1,
    })

    return this.getConversation(conversation.id, userId1)
  },

  async createGroupConversation(creatorId: string, input: CreateConversationInput): Promise<ConversationWithParticipants> {
    if (input.type !== 'group') {
      throw new Error('Invalid conversation type')
    }

    if (!input.name || !input.name.trim()) {
      throw new Error('Group name is required')
    }

    if (input.participants.length < 2) {
      throw new Error('Group must have at least 2 participants')
    }

    const participants = await Promise.all(
      input.participants.map((id) => userService.getPublicProfile(id))
    )

    const invalidParticipants = participants.filter((p) => !p)
    if (invalidParticipants.length > 0) {
      throw new Error('One or more participants not found')
    }

    const participantsList = [...new Set([creatorId, ...input.participants])]
    const admins = input.admins || [creatorId]
    const adminsList = [...new Set([creatorId, ...admins])].filter((id) => participantsList.includes(id))

    const conversation = await chatRepository.createConversation({
      type: 'group',
      participants: participantsList,
      name: input.name.trim(),
      description: input.description?.trim(),
      avatar: input.avatar,
      createdBy: creatorId,
      admins: adminsList,
    })

    return this.getConversation(conversation.id, creatorId)
  },

  async getConversations(
    userId: string,
    options: { page?: number; limit?: number } = {}
  ): Promise<{ conversations: ConversationWithParticipants[]; total: number }> {
    const { conversations, total } = await chatRepository.findByUserId(userId, options)

    const conversationsWithData = await Promise.all(
      conversations.map(async (conv) => {
        const participants = await Promise.all(
          conv.participants.map((id) => userService.getPublicProfile(id))
        )

        let lastMessage: Message | undefined
        if (conv.lastMessageId) {
          lastMessage = await chatRepository.findMessageById(conv.lastMessageId)
        }

        return {
          ...conv,
          participants: participants.filter((p): p is NonNullable<typeof p> => p !== undefined).map((p) => ({
            id: p.id,
            name: p.name,
            email: p.email,
            profilePic: p.profilePic,
          })),
          lastMessage,
        }
      })
    )

    return {
      conversations: conversationsWithData,
      total,
    }
  },

  async getArchivedConversations(
    userId: string,
    options: { page?: number; limit?: number } = {}
  ): Promise<{ conversations: ConversationWithParticipants[]; total: number }> {
    const { conversations, total } = await chatRepository.findArchivedByUserId(userId, options)

    // Fetch participants and last messages
    const conversationsWithData = await Promise.all(
      conversations.map(async (conv) => {
        const participants = await Promise.all(
          conv.participants.map((id) => userService.getPublicProfile(id))
        )

        let lastMessage: Message | undefined
        if (conv.lastMessageId) {
          lastMessage = await chatRepository.findMessageById(conv.lastMessageId)
        }

        return {
          ...conv,
          participants: participants.filter((p): p is NonNullable<typeof p> => p !== undefined).map((p) => ({
            id: p.id,
            name: p.name,
            email: p.email,
            profilePic: p.profilePic,
          })),
          lastMessage,
        }
      })
    )

    return {
      conversations: conversationsWithData,
      total,
    }
  },

  async getConversation(conversationId: string, userId: string): Promise<ConversationWithParticipants> {
    const conversation = await chatRepository.findConversationById(conversationId, userId)
    if (!conversation) {
      throw new Error('Conversation not found')
    }

    const participants = await Promise.all(
      conversation.participants.map((id) => userService.getPublicProfile(id))
    )

    let lastMessage: Message | undefined
    if (conversation.lastMessageId) {
      lastMessage = await chatRepository.findMessageById(conversation.lastMessageId)
    }

    return {
      ...conversation,
      participants: participants.filter((p): p is NonNullable<typeof p> => p !== undefined).map((p) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        profilePic: p.profilePic,
      })),
      lastMessage,
    }
  },

  async sendMessage(
    conversationId: string,
    senderId: string,
    input: CreateMessageInput
  ): Promise<MessageWithSender> {
    const conversation = await chatRepository.findConversationById(conversationId, senderId)
    if (!conversation) {
      throw new Error('Conversation not found or access denied')
    }

    const hasAttachments = input.attachments && input.attachments.length > 0
    const hasContent = input.content && typeof input.content === 'string' && input.content.trim()
    
    if (!hasContent && !hasAttachments) {
      throw new Error('Message content or attachments are required')
    }

    if (hasContent && input.content.length > 5000) {
      throw new Error('Message content too long (max 5000 characters)')
    }
    

    const sender = await userService.getPublicProfile(senderId)
    if (!sender) {
      throw new Error('Sender not found')
    }

    const urlRegex = /(https?:\/\/[^\s]+)/g
    const urls = input.content.match(urlRegex) || []

    const attachments = [...(input.attachments || [])]

    if (urls.length > 0) {
      Promise.all(
        urls.slice(0, 3).map(async (url) => {
          try {
            const preview = await fetchLinkPreview(url, { timeout: 3000 })
            if (preview.title || preview.image) {
            }
          } catch (error) {
            console.warn('Failed to fetch link preview:', error)
          }
        })
      ).catch(() => {
      })
    }

    const messageContent = hasContent ? input.content.trim() : ''
    const messageType = hasAttachments && !hasContent ? 'image' : (input.type || 'text')
    
    const message = await chatRepository.createMessage({
      conversationId,
      senderId,
      content: messageContent,
      type: messageType,
      attachments,
      replyTo: input.replyTo,
    })

    await chatRepository.updateLastMessage(conversationId, message.id, new Date(message.createdAt), sender.name)

    return {
      ...message,
      sender: {
        id: sender.id,
        name: sender.name,
        email: sender.email,
        profilePic: sender.profilePic,
      },
    }
  },

  async saveAndDistribute(
    conversationId: string,
    senderId: string,
    input: CreateMessageInput & { cid: string }
  ): Promise<{ message: MessageWithSender; participantIds: string[] }> {
    const conversation = await chatRepository.findConversationById(conversationId, senderId)
    if (!conversation) {
      throw new Error('Conversation not found or access denied')
    }

    // Check for existing message by cid (idempotency)
    if (input.cid) {
      const existingMessage = await chatRepository.findMessageByCid(input.cid)
      if (existingMessage) {
        const sender = await userService.getPublicProfile(senderId)
        if (!sender) {
          throw new Error('Sender not found')
        }
        return {
          message: {
            ...existingMessage,
            sender: {
              id: sender.id,
              name: sender.name,
              email: sender.email,
              profilePic: sender.profilePic,
            },
          },
          participantIds: conversation.participants,
        }
      }
    }

    // Validate message input
    const hasAttachments = input.attachments && input.attachments.length > 0
    const hasContent = input.content && typeof input.content === 'string' && input.content.trim()
    
    if (!hasContent && !hasAttachments) {
      throw new Error('Message content or attachments are required')
    }

    if (hasContent && input.content.length > 5000) {
      throw new Error('Message content too long (max 5000 characters)')
    }

    if (!input.cid || typeof input.cid !== 'string') {
      throw new Error('Client ID (cid) is required')
    }

    const sender = await userService.getPublicProfile(senderId)
    if (!sender) {
      throw new Error('Sender not found')
    }

    // Create message with CID
    const message = await chatRepository.createMessage({
      conversationId,
      senderId,
      content: hasContent ? input.content.trim() : '',
      type: hasAttachments && !hasContent ? 'image' : (input.type || 'text'),
      attachments: input.attachments,
      replyTo: input.replyTo,
      cid: input.cid,
    })

    await chatRepository.updateLastMessage(conversationId, message.id, new Date(message.createdAt), sender.name)

    return {
      message: {
        ...message,
        sender: {
          id: sender.id,
          name: sender.name,
          email: sender.email,
          profilePic: sender.profilePic,
        },
      },
      participantIds: conversation.participants,
    }
  },

  async createSystemMessage(
    conversationId: string,
    actorId: string,
    content: string
  ): Promise<MessageWithSender> {
    const conversation = await chatRepository.findConversationById(conversationId, actorId)
    if (!conversation) {
      throw new Error('Conversation not found or access denied')
    }

    if (!content || typeof content !== 'string' || !content.trim()) {
      throw new Error('System message content is required')
    }

    const sender = await userService.getPublicProfile(actorId)
    if (!sender) {
      throw new Error('Sender not found')
    }

    const message = await chatRepository.createMessage({
      conversationId,
      senderId: actorId,
      content: content.trim(),
      type: 'system',
    })

    await chatRepository.updateLastMessage(conversationId, message.id, new Date(message.createdAt), sender.name)

    return {
      ...message,
      sender: {
        id: sender.id,
        name: sender.name,
        email: sender.email,
        profilePic: sender.profilePic,
      },
    }
  },

  async getMessagesSince(
    conversationId: string,
    userId: string,
    lastMessageId?: string,
    lastSyncTimestamp?: string
  ): Promise<MessageWithSender[]> {
    const conversation = await chatRepository.findConversationById(conversationId, userId)
    if (!conversation) {
      throw new Error('Conversation not found or access denied')
    }

    const messages = await chatRepository.findMessagesSince(conversationId, lastMessageId, lastSyncTimestamp)

    const senderIds = [...new Set(messages.map((m) => m.senderId))]
    const senders = await Promise.all(senderIds.map((id) => userService.getPublicProfile(id)))

    const senderMap = new Map(
      senders.filter((s): s is NonNullable<typeof s> => s !== undefined).map((s) => [s.id, s])
    )

    return messages.map((msg) => {
      const sender = senderMap.get(msg.senderId)
      if (!sender) {
        throw new Error(`Sender ${msg.senderId} not found`)
      }
      return {
        ...msg,
        sender: {
          id: sender.id,
          name: sender.name,
          email: sender.email,
          profilePic: sender.profilePic,
        },
      }
    })
  },

  async getMessages(
    conversationId: string,
    userId: string,
    options: { page?: number; limit?: number; before?: string } = {}
  ): Promise<{ messages: MessageWithSender[]; total: number; hasMore: boolean }> {
    const conversation = await chatRepository.findConversationById(conversationId, userId)
    if (!conversation) {
      throw new Error('Conversation not found or access denied')
    }

    const { messages, total, hasMore } = await chatRepository.findByConversationId(conversationId, options)

    const senderIds = [...new Set(messages.map((m) => m.senderId))]
    const senders = await Promise.all(senderIds.map((id) => userService.getPublicProfile(id)))

    const senderMap = new Map(
      senders.filter((s): s is NonNullable<typeof s> => s !== undefined).map((s) => [s.id, s])
    )

    return {
      messages: messages.map((msg) => {
        const sender = senderMap.get(msg.senderId)
        if (!sender) {
          throw new Error(`Sender ${msg.senderId} not found`)
        }
        return {
          ...msg,
          sender: {
            id: sender.id,
            name: sender.name,
            email: sender.email,
            profilePic: sender.profilePic,
          },
        }
      }),
      total,
      hasMore,
    }
  },

  async markAsRead(conversationId: string, userId: string): Promise<void> {
    const conversation = await chatRepository.findConversationById(conversationId, userId)
    if (!conversation) {
      throw new Error('Conversation not found or access denied')
    }

    await chatRepository.markConversationAsRead(conversationId, userId)
  },

  async updateGroup(
    conversationId: string,
    userId: string,
    updates: { name?: string; description?: string; avatar?: string; admins?: string[] }
  ): Promise<ConversationWithParticipants> {
    const conversation = await chatRepository.findConversationById(conversationId, userId)
    if (!conversation) {
      throw new Error('Conversation not found or access denied')
    }

    if (conversation.type !== 'group') {
      throw new Error('Only group conversations can be updated')
    }

    const updated = await chatRepository.updateConversation(conversationId, userId, updates)
    if (!updated) {
      throw new Error('Failed to update conversation or insufficient permissions')
    }

    return this.getConversation(updated.id, userId)
  },

  async addGroupMember(conversationId: string, adminId: string, userId: string): Promise<ConversationWithParticipants> {
    const conversation = await chatRepository.findConversationById(conversationId, adminId)
    if (!conversation) {
      throw new Error('Conversation not found or access denied')
    }

    if (conversation.type !== 'group') {
      throw new Error('Only group conversations can have members added')
    }

    if (!conversation.admins.includes(adminId)) {
      throw new Error('Only admins can add members')
    }

    const user = await userService.getPublicProfile(userId)
    if (!user) {
      throw new Error('User not found')
    }

    // Check if already a participant
    if (conversation.participants.includes(userId)) {
      return this.getConversation(conversationId, adminId)
    }

    const updated = await chatRepository.addParticipant(conversationId, userId)
    if (!updated) {
      throw new Error('Failed to add member')
    }

    return this.getConversation(updated.id, adminId)
  },

  async removeGroupMember(conversationId: string, adminId: string, userId: string): Promise<ConversationWithParticipants> {
    const conversation = await chatRepository.findConversationById(conversationId, adminId)
    if (!conversation) {
      throw new Error('Conversation not found or access denied')
    }

    if (conversation.type !== 'group') {
      throw new Error('Only group conversations can have members removed')
    }

    if (!conversation.admins.includes(adminId)) {
      throw new Error('Only admins can remove members')
    }

    if (userId === adminId) {
      throw new Error('Cannot remove yourself')
    }

    const updated = await chatRepository.removeParticipant(conversationId, userId)
    if (!updated) {
      throw new Error('Failed to remove member')
    }

    return this.getConversation(updated.id, adminId)
  },

  async leaveGroup(conversationId: string, userId: string): Promise<void> {
    const conversation = await chatRepository.findConversationById(conversationId, userId)
    if (!conversation) {
      throw new Error('Conversation not found or access denied')
    }

    if (conversation.type !== 'group') {
      throw new Error('Only group conversations can be left')
    }

    if (conversation.admins.length === 1 && conversation.admins[0] === userId) {
      throw new Error('Cannot leave group as the only admin')
    }

    await chatRepository.removeParticipant(conversationId, userId)
  },

  async getUnreadCount(conversationId: string, userId: string): Promise<number> {
    const conversation = await chatRepository.findConversationById(conversationId, userId)
    if (!conversation) {
      return 0
    }

    return chatRepository.getUnreadCount(conversationId, userId)
  },

  async getTeamContacts(userId: string, userEmail: string): Promise<Array<{
    id: string
    name: string
    email: string
    profilePic?: string
    status?: string
  }>> {
    const allUsers = await userService.findAll()
    
    const teamMembers = allUsers
      .filter((user) => user.id !== userId)
      .map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        profilePic: user.profilePic,
        status: user.status,
      }))

    return teamMembers
  },

  async archiveConversation(conversationId: string, userId: string): Promise<ConversationWithParticipants> {
    const conversation = await chatRepository.findConversationById(conversationId, userId)
    if (!conversation) {
      throw new Error('Conversation not found or access denied')
    }

    const archived = await chatRepository.archiveConversation(conversationId, userId)
    if (!archived) {
      throw new Error('Failed to archive conversation')
    }

    return this.getConversation(conversationId, userId)
  },

  async unarchiveConversation(conversationId: string, userId: string): Promise<ConversationWithParticipants> {
    const conversation = await chatRepository.findConversationById(conversationId, userId)
    if (!conversation) {
      throw new Error('Conversation not found or access denied')
    }

    const unarchived = await chatRepository.unarchiveConversation(conversationId, userId)
    if (!unarchived) {
      throw new Error('Failed to unarchive conversation')
    }

    return this.getConversation(conversationId, userId)
  },

  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    const conversation = await chatRepository.findConversationById(conversationId, userId)
    if (!conversation) {
      throw new Error('Conversation not found or access denied')
    }

    const deleted = await chatRepository.deleteConversation(conversationId, userId)
    if (!deleted) {
      throw new Error('Failed to delete conversation')
    }
  },
}
