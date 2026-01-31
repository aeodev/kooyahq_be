import { Schema, model, models, type Document } from 'mongoose'

export interface ConversationDocument extends Document {
  type: 'direct' | 'group'
  participants: string[]
  name?: string
  description?: string
  avatar?: string
  createdBy: string
  admins: string[]
  lastMessageAt?: Date
  lastMessageId?: string
  createdAt: Date
  updatedAt: Date
}

export interface MessageDocument extends Document {
  conversationId: string
  senderId: string
  content: string
  type: 'text' | 'image' | 'file' | 'system'
  attachments: Array<{
    url: string
    type: string
    name: string
    size: number
  }>
  replyTo?: string
  readBy: Array<{
    userId: string
    readAt: Date
  }>
  editedAt?: Date
  deletedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const conversationSchema = new Schema<ConversationDocument>(
  {
    type: {
      type: String,
      enum: ['direct', 'group'],
      required: true,
      index: true,
    },
    participants: {
      type: [String],
      required: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    avatar: {
      type: String,
    },
    createdBy: {
      type: String,
      required: true,
      index: true,
    },
    admins: {
      type: [String],
      default: [],
    },
    lastMessageAt: {
      type: Date,
      index: true,
    },
    lastMessageId: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
)

const messageSchema = new Schema<MessageDocument>(
  {
    conversationId: {
      type: String,
      required: true,
      index: true,
    },
    senderId: {
      type: String,
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 5000,
      trim: true,
    },
    type: {
      type: String,
      enum: ['text', 'image', 'file', 'system'],
      default: 'text',
    },
    attachments: {
      type: [
        {
          url: { type: String, required: true },
          type: { type: String, required: true },
          name: { type: String, required: true },
          size: { type: Number, required: true },
        },
      ],
      default: [],
    },
    replyTo: {
      type: String,
      index: true,
    },
    readBy: {
      type: [
        {
          userId: { type: String, required: true },
          readAt: { type: Date, required: true, default: Date.now },
        },
      ],
      default: [],
    },
    editedAt: {
      type: Date,
    },
    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
)

// Indexes
conversationSchema.index({ participants: 1, type: 1 })
conversationSchema.index({ lastMessageAt: -1 })
messageSchema.index({ conversationId: 1, createdAt: -1 })
messageSchema.index({ senderId: 1 })

export const ConversationModel =
  models.Conversation ?? model<ConversationDocument>('Conversation', conversationSchema)

export const MessageModel = models.Message ?? model<MessageDocument>('Message', messageSchema)

export type Conversation = {
  id: string
  type: 'direct' | 'group'
  participants: string[]
  name?: string
  description?: string
  avatar?: string
  createdBy: string
  admins: string[]
  lastMessageAt?: string
  lastMessageId?: string
  createdAt: string
  updatedAt: string
}

export type Message = {
  id: string
  conversationId: string
  senderId: string
  content: string
  type: 'text' | 'image' | 'file' | 'system'
  attachments: Array<{
    url: string
    type: string
    name: string
    size: number
  }>
  replyTo?: string
  readBy: Array<{
    userId: string
    readAt: string
  }>
  editedAt?: string
  deletedAt?: string
  createdAt: string
  updatedAt: string
}

export function toConversation(doc: ConversationDocument): Conversation {
  return {
    id: doc.id,
    type: doc.type,
    participants: doc.participants || [],
    name: doc.name,
    description: doc.description,
    avatar: doc.avatar,
    createdBy: doc.createdBy,
    admins: doc.admins || [],
    lastMessageAt: doc.lastMessageAt?.toISOString(),
    lastMessageId: doc.lastMessageId,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}

export function toMessage(doc: MessageDocument): Message {
  return {
    id: doc.id,
    conversationId: doc.conversationId,
    senderId: doc.senderId,
    content: doc.content,
    type: doc.type,
    attachments: doc.attachments || [],
    replyTo: doc.replyTo,
    readBy: (doc.readBy || []).map((r) => ({
      userId: r.userId,
      readAt: r.readAt.toISOString(),
    })),
    editedAt: doc.editedAt?.toISOString(),
    deletedAt: doc.deletedAt?.toISOString(),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}
