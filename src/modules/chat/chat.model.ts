import { Schema, model, models, type Document } from 'mongoose'

export interface ConversationDocument extends Document {
  type: 'direct' | 'group'
  participants: string[]
  name?: string
  description?: string
  avatar?: string
  createdBy: string
  admins: string[]

  // Denormalized fields for performance
  lastMessageAt?: Date
  lastMessageId?: string
  lastMessage?: {
    content: string
    senderId: string
    senderName: string
    createdAt: Date
  }
  unreadCounts: Map<string, number> // userId -> count

  // Archive/Delete tracking per user
  archivedBy: Map<string, Date> // userId -> archivedAt
  deletedBy: Map<string, Date> // userId -> deletedAt

  createdAt: Date
  updatedAt: Date
}

export interface MessageDocument extends Document {
  conversationId: string
  senderId: string
  content: string
  type: 'text' | 'image' | 'file' | 'system'
  cid?: string // Client Correlation ID for idempotency
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

    // Denormalized last message for performance
    lastMessage: {
      content: { type: String, maxlength: 200 }, // Truncated preview
      senderId: String,
      senderName: String,
      createdAt: Date,
    },

    // Denormalized unread counts (userId -> count)
    unreadCounts: {
      type: Map,
      of: Number,
      default: new Map(),
    },
    // Archive/Delete tracking per user
    archivedBy: {
      type: Map,
      of: Date,
      default: new Map(),
    },
    deletedBy: {
      type: Map,
      of: Date,
      default: new Map(),
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
      required: false, // Allow empty if attachments exist (validated in service)
      maxlength: 5000,
      trim: true,
      default: '',
    },
    type: {
      type: String,
      enum: ['text', 'image', 'file', 'system'],
      default: 'text',
    },
    cid: {
      type: String,
      index: true,
      sparse: true, // Only index non-null values
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
  lastMessage?: {
    content: string
    senderId: string
    senderName: string
    createdAt: string
  }
  unreadCounts: Record<string, number>
  archivedBy?: Record<string, string> // userId -> archivedAt ISO string
  deletedBy?: Record<string, string> // userId -> deletedAt ISO string
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
    lastMessageAt: doc.lastMessageAt?.toISOString() || undefined,
    lastMessageId: doc.lastMessageId,
    lastMessage: doc.lastMessage ? {
      content: doc.lastMessage.content,
      senderId: doc.lastMessage.senderId,
      senderName: doc.lastMessage.senderName,
      createdAt: doc.lastMessage.createdAt?.toISOString() || new Date().toISOString(),
    } : undefined,
    unreadCounts: Object.fromEntries(doc.unreadCounts || new Map()),
    archivedBy: doc.archivedBy ? Object.fromEntries(
      Array.from(doc.archivedBy.entries()).map(([k, v]) => [k, v.toISOString()])
    ) : undefined,
    deletedBy: doc.deletedBy ? Object.fromEntries(
      Array.from(doc.deletedBy.entries()).map(([k, v]) => [k, v.toISOString()])
    ) : undefined,
    createdAt: doc.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: doc.updatedAt?.toISOString() || new Date().toISOString(),
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
      readAt: r.readAt?.toISOString() || new Date().toISOString(),
    })),
    editedAt: doc.editedAt?.toISOString(),
    deletedAt: doc.deletedAt?.toISOString(),
    createdAt: doc.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: doc.updatedAt?.toISOString() || new Date().toISOString(),
  }
}
