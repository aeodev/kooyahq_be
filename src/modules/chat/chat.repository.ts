import {
  ConversationModel,
  MessageModel,
  toConversation,
  toMessage,
  type Conversation,
  type Message,
} from './chat.model'

export type CreateConversationInput = {
  type: 'direct' | 'group'
  participants: string[]
  name?: string
  description?: string
  avatar?: string
  createdBy: string
  admins?: string[]
}

export type UpdateConversationInput = {
  name?: string
  description?: string
  avatar?: string
  admins?: string[]
}

export type CreateMessageInput = {
  conversationId: string
  senderId: string
  content: string
  type?: 'text' | 'image' | 'file' | 'system'
  attachments?: Array<{
    url: string
    type: string
    name: string
    size: number
    image?: string
    description?: string
    siteName?: string
    [key: string]: any // Allow additional metadata
  }>
  replyTo?: string
  cid?: string // Client Correlation ID for idempotency
}

export type UpdateMessageInput = {
  content?: string
}

export type ConversationQueryOptions = {
  page?: number
  limit?: number
}

export type MessageQueryOptions = {
  page?: number
  limit?: number
  before?: string // Message ID to fetch messages before
}

export const chatRepository = {
  async createConversation(input: CreateConversationInput): Promise<Conversation> {
    const doc = await ConversationModel.create({
      type: input.type,
      participants: input.participants,
      name: input.name,
      description: input.description,
      avatar: input.avatar,
      createdBy: input.createdBy,
      admins: input.admins || (input.type === 'group' ? [input.createdBy] : []),
    })
    return toConversation(doc)
  },

  async findConversationById(id: string, userId?: string): Promise<Conversation | undefined> {
    const doc = await ConversationModel.findById(id).exec()
    if (!doc) return undefined

    if (userId && !doc.participants.includes(userId)) {
      return undefined
    }

    return toConversation(doc)
  },

  async findByUserId(
    userId: string,
    options: ConversationQueryOptions = {}
  ): Promise<{ conversations: Conversation[]; total: number }> {
    const page = options.page && options.page > 0 ? options.page : 1
    const limit = options.limit && options.limit > 0 ? options.limit : 50
    const skip = (page - 1) * limit

    const filter = {
      participants: userId,
      [`archivedBy.${userId}`]: { $exists: false },
      [`deletedBy.${userId}`]: { $exists: false },
    }

    const [docs, total] = await Promise.all([
      ConversationModel.find(filter)
        .sort({ lastMessageAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      ConversationModel.countDocuments(filter).exec(),
    ])

    return {
      conversations: docs.map(toConversation),
      total,
    }
  },

  async findDirectConversation(userId1: string, userId2: string): Promise<Conversation | undefined> {
    const doc = await ConversationModel.findOne({
      type: 'direct',
      participants: { $all: [userId1, userId2], $size: 2 },
    }).exec()

    return doc ? toConversation(doc) : undefined
  },

  async addParticipant(conversationId: string, userId: string): Promise<Conversation | undefined> {
    const doc = await ConversationModel.findByIdAndUpdate(
      conversationId,
      { $addToSet: { participants: userId } },
      { new: true }
    ).exec()
    return doc ? toConversation(doc) : undefined
  },

  async removeParticipant(conversationId: string, userId: string): Promise<Conversation | undefined> {
    const doc = await ConversationModel.findByIdAndUpdate(
      conversationId,
      { $pull: { participants: userId, admins: userId } },
      { new: true }
    ).exec()
    return doc ? toConversation(doc) : undefined
  },

  async updateConversation(
    conversationId: string,
    userId: string,
    updates: UpdateConversationInput
  ): Promise<Conversation | undefined> {
    const doc = await ConversationModel.findById(conversationId).exec()
    if (!doc) return undefined

    if (doc.type === 'group' && !doc.admins.includes(userId)) {
      return undefined
    }

    const updateData: any = {}
    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.avatar !== undefined) updateData.avatar = updates.avatar
    if (updates.admins !== undefined) updateData.admins = updates.admins

    const updated = await ConversationModel.findByIdAndUpdate(conversationId, updateData, {
      new: true,
    }).exec()
    return updated ? toConversation(updated) : undefined
  },

  async updateLastMessage(
    conversationId: string,
    messageId: string,
    timestamp: Date,
    senderName?: string
  ): Promise<Conversation | undefined> {
    const message = await MessageModel.findById(messageId).exec()
    if (!message) return undefined

    const resolvedSenderName = senderName || 'Unknown User'

    const updateData = {
      lastMessageId: messageId,
      lastMessageAt: timestamp,
      lastMessage: {
        content: message.content.substring(0, 200), // Truncate for preview
        senderId: message.senderId,
        senderName: resolvedSenderName,
        createdAt: message.createdAt,
      }
    }

    const doc = await ConversationModel.findByIdAndUpdate(
      conversationId,
      updateData,
      { new: true }
    ).exec()
    return doc ? toConversation(doc) : undefined
  },

  async createMessage(input: CreateMessageInput): Promise<Message> {
    const doc = await MessageModel.create({
      conversationId: input.conversationId,
      senderId: input.senderId,
      content: input.content,
      type: input.type || 'text',
      attachments: input.attachments || [],
      replyTo: input.replyTo,
    })
    return toMessage(doc)
  },

  async findByConversationId(
    conversationId: string,
    options: MessageQueryOptions = {}
  ): Promise<{ messages: Message[]; total: number; hasMore: boolean }> {
    const page = options.page && options.page > 0 ? options.page : 1
    const limit = options.limit && options.limit > 0 ? options.limit : 50
    const skip = (page - 1) * limit

    const filter: any = { conversationId, deletedAt: { $exists: false } }

    if (options.before) {
      const beforeMessage = await MessageModel.findById(options.before).exec()
      if (beforeMessage) {
        filter.createdAt = { $lt: beforeMessage.createdAt }
      }
    }

    const [docs, total] = await Promise.all([
      MessageModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit + 1)
        .exec(),
      MessageModel.countDocuments({ conversationId, deletedAt: { $exists: false } }).exec(),
    ])

    const hasMore = docs.length > limit
    const messages = (hasMore ? docs.slice(0, limit) : docs)
      .reverse()
      .map(toMessage)

    return {
      messages,
      total,
      hasMore,
    }
  },

  async findMessagesSince(
    conversationId: string,
    lastMessageId?: string,
    lastSyncTimestamp?: string
  ): Promise<Message[]> {
    const filter: any = {
      conversationId,
      deletedAt: { $exists: false }
    }

    if (lastMessageId) {
      const lastMessage = await MessageModel.findById(lastMessageId).exec()
      if (lastMessage) {
        filter.createdAt = { $gt: lastMessage.createdAt }
      }
    } else if (lastSyncTimestamp) {
      filter.createdAt = { $gt: new Date(lastSyncTimestamp) }
    }

    const docs = await MessageModel.find(filter)
      .sort({ createdAt: 1 })
      .limit(100)
      .exec()

    return docs.map(toMessage)
  },

  async findMessageById(id: string): Promise<Message | undefined> {
    const doc = await MessageModel.findById(id).exec()
    return doc ? toMessage(doc) : undefined
  },

  async findMessageByCid(cid: string): Promise<Message | undefined> {
    const doc = await MessageModel.findOne({ cid }).exec()
    return doc ? toMessage(doc) : undefined
  },

  async markAsRead(messageId: string, userId: string): Promise<Message | undefined> {
    const doc = await MessageModel.findById(messageId).exec()
    if (!doc) return undefined

    // Check if already read
    const alreadyRead = doc.readBy.some((r: { userId: string }) => r.userId === userId)
    if (alreadyRead) {
      return toMessage(doc)
    }

    doc.readBy.push({ userId, readAt: new Date() })
    doc.markModified('readBy')
    const saved = await doc.save()
    return toMessage(saved)
  },

  async markConversationAsRead(conversationId: string, userId: string): Promise<number> {
    const result = await MessageModel.updateMany(
      {
        conversationId,
        deletedAt: { $exists: false },
        'readBy.userId': { $ne: userId },
      },
      {
        $push: {
          readBy: {
            userId,
            readAt: new Date(),
          },
        },
      }
    ).exec()

    return result.modifiedCount || 0
  },

  async updateMessage(
    messageId: string,
    senderId: string,
    conversationId: string,
    updates: UpdateMessageInput
  ): Promise<Message | undefined> {
    const doc = await MessageModel.findOne({
      _id: messageId,
      senderId,
      conversationId,
      deletedAt: { $exists: false },
    }).exec()
    
    if (!doc) return undefined

    const updateData: any = {}
    if (updates.content !== undefined) {
      updateData.content = updates.content
      updateData.editedAt = new Date()
    }

    const updated = await MessageModel.findByIdAndUpdate(messageId, updateData, { new: true }).exec()
    return updated ? toMessage(updated) : undefined
  },

  async delete(messageId: string, senderId: string, conversationId: string): Promise<boolean> {
    const doc = await MessageModel.findOne({
      _id: messageId,
      senderId,
      conversationId,
      deletedAt: { $exists: false },
    }).exec()
    
    if (!doc) return false

    doc.deletedAt = new Date()
    await doc.save()
    return true
  },

  async getUnreadCount(conversationId: string, userId: string): Promise<number> {
    return MessageModel.countDocuments({
      conversationId,
      deletedAt: { $exists: false },
      senderId: { $ne: userId }, // Don't count own messages
      'readBy.userId': { $ne: userId },
    }).exec()
  },

  async archiveConversation(conversationId: string, userId: string): Promise<Conversation | undefined> {
    const doc = await ConversationModel.findByIdAndUpdate(
      conversationId,
      { $set: { [`archivedBy.${userId}`]: new Date() } },
      { new: true }
    ).exec()
    return doc ? toConversation(doc) : undefined
  },

  async unarchiveConversation(conversationId: string, userId: string): Promise<Conversation | undefined> {
    const doc = await ConversationModel.findByIdAndUpdate(
      conversationId,
      { $unset: { [`archivedBy.${userId}`]: '' } },
      { new: true }
    ).exec()
    return doc ? toConversation(doc) : undefined
  },

  async deleteConversation(conversationId: string, userId: string): Promise<Conversation | undefined> {
    const doc = await ConversationModel.findByIdAndUpdate(
      conversationId,
      { $set: { [`deletedBy.${userId}`]: new Date() } },
      { new: true }
    ).exec()
    return doc ? toConversation(doc) : undefined
  },

  async findArchivedByUserId(
    userId: string,
    options: ConversationQueryOptions = {}
  ): Promise<{ conversations: Conversation[]; total: number }> {
    const page = options.page && options.page > 0 ? options.page : 1
    const limit = options.limit && options.limit > 0 ? options.limit : 50
    const skip = (page - 1) * limit

    const filter = {
      participants: userId,
      [`archivedBy.${userId}`]: { $exists: true },
      [`deletedBy.${userId}`]: { $exists: false },
    }

    const [docs, total] = await Promise.all([
      ConversationModel.find(filter)
        .sort({ [`archivedBy.${userId}`]: -1, lastMessageAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      ConversationModel.countDocuments(filter).exec(),
    ])

    return {
      conversations: docs.map(toConversation),
      total,
    }
  },
}
