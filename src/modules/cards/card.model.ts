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

export interface ChecklistItem {
  id: string
  text: string
  completed: boolean
  order: number
}

export interface Checklist {
  id: string
  title: string
  items: ChecklistItem[]
}

export interface CardCoverImage {
  url?: string
  color?: string
  brightness?: 'dark' | 'light'
}

export interface CardDocument extends Document {
  title: string
  description?: string
  boardId: string
  columnId: string
  sprintId?: string
  issueType: 'task' | 'bug' | 'story' | 'epic'
  assigneeId?: string
  priority: 'lowest' | 'low' | 'medium' | 'high' | 'highest'
  labels: string[]
  dueDate?: Date
  storyPoints?: number
  attachments?: CardAttachment[]
  checklists?: Checklist[]
  coverImage?: CardCoverImage
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
    sprintId: {
      type: String,
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
    checklists: {
      type: [
        {
          id: { type: String, required: true },
          title: { type: String, required: true, trim: true },
          items: {
            type: [
              {
                id: { type: String, required: true },
                text: { type: String, required: true, trim: true },
                completed: { type: Boolean, default: false },
                order: { type: Number, default: 0 },
              },
            ],
            default: [],
          },
        },
      ],
      default: [],
    },
    coverImage: {
      type: {
        url: String,
        color: String,
        brightness: { type: String, enum: ['dark', 'light'] },
      },
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
  sprintId?: string
  issueType: 'task' | 'bug' | 'story' | 'epic'
  assigneeId?: string
  priority: 'lowest' | 'low' | 'medium' | 'high' | 'highest'
  labels: string[]
  dueDate?: string
  storyPoints?: number
  attachments?: CardAttachment[]
  checklists?: Checklist[]
  coverImage?: CardCoverImage
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
    sprintId: doc.sprintId,
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
    checklists: doc.checklists?.map((checklist) => ({
      id: checklist.id,
      title: checklist.title,
      items: checklist.items?.map((item) => ({
        id: item.id,
        text: item.text,
        completed: item.completed ?? false,
        order: item.order ?? 0,
      })) || [],
    })) || [],
    coverImage: doc.coverImage
      ? {
          url: doc.coverImage.url,
          color: doc.coverImage.color,
          brightness: doc.coverImage.brightness,
        }
      : undefined,
    completed: doc.completed ?? false,
    epicId: doc.epicId,
    rank: doc.rank,
    flagged: doc.flagged ?? false,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}

