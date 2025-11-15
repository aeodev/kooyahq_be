import { Schema, model, models, type Document } from 'mongoose'

export interface CardAttachment {
  filename: string
  originalName: string
  mimetype: string
  size: number
  url: string
  uploadedBy: string
  uploadedAt: Date | string
}

export interface CardDocument extends Document {
  title: string
  description?: string
  boardId: string
  columnId: string
  issueType: 'task' | 'bug' | 'story' | 'epic'
  assigneeId?: string
  priority: 'lowest' | 'low' | 'medium' | 'high' | 'highest'
  labels: string[]
  dueDate?: Date
  storyPoints?: number
  attachments?: CardAttachment[]
  completed: boolean
  epicId?: string
  rank?: number
  flagged?: boolean
  createdAt: Date
  updatedAt: Date
}

const cardSchema = new Schema<CardDocument>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    boardId: {
      type: String,
      required: true,
    },
    columnId: {
      type: String,
      required: true,
    },
    issueType: {
      type: String,
      enum: ['task', 'bug', 'story', 'epic'],
      default: 'task',
    },
    assigneeId: {
      type: String,
    },
    priority: {
      type: String,
      enum: ['lowest', 'low', 'medium', 'high', 'highest'],
      default: 'medium',
    },
    labels: {
      type: [String],
      default: [],
    },
    dueDate: {
      type: Date,
    },
    storyPoints: {
      type: Number,
      min: 0,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    epicId: {
      type: String,
    },
    rank: {
      type: Number,
    },
    flagged: {
      type: Boolean,
      default: false,
    },
    attachments: {
      type: [
        {
          filename: String,
          originalName: String,
          mimetype: String,
          size: Number,
          url: String,
          uploadedBy: String,
          uploadedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  },
)

export const CardModel = models.Card ?? model<CardDocument>('Card', cardSchema)

export type Card = {
  id: string
  title: string
  description?: string
  boardId: string
  columnId: string
  issueType: 'task' | 'bug' | 'story' | 'epic'
  assigneeId?: string
  priority: 'lowest' | 'low' | 'medium' | 'high' | 'highest'
  labels: string[]
  dueDate?: string
  storyPoints?: number
  attachments?: CardAttachment[]
  completed: boolean
  epicId?: string
  rank?: number
  flagged?: boolean
  createdAt: string
  updatedAt: string
}

export function toCard(doc: CardDocument): Card {
  return {
    id: doc.id,
    title: doc.title,
    description: doc.description,
    boardId: doc.boardId,
    columnId: doc.columnId,
    issueType: (doc.issueType as 'task' | 'bug' | 'story' | 'epic') || 'task',
    assigneeId: doc.assigneeId,
    priority: (doc.priority as 'lowest' | 'low' | 'medium' | 'high' | 'highest') || 'medium',
    labels: doc.labels || [],
    dueDate: doc.dueDate?.toISOString(),
    storyPoints: doc.storyPoints,
    attachments: doc.attachments?.map((att) => ({
      filename: att.filename,
      originalName: att.originalName,
      mimetype: att.mimetype,
      size: att.size,
      url: att.url,
      uploadedBy: att.uploadedBy,
      uploadedAt: att.uploadedAt 
        ? (typeof att.uploadedAt === 'string' ? att.uploadedAt : att.uploadedAt.toISOString())
        : new Date().toISOString(),
    })),
    completed: doc.completed ?? false,
    epicId: doc.epicId,
    rank: doc.rank,
    flagged: doc.flagged ?? false,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}

