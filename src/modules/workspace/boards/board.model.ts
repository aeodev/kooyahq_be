import { Schema, model, models, type Document } from 'mongoose'

export interface BoardColumn {
  id: string
  name: string
  order: number
  hexColor?: string
  wipLimit?: number
  isDoneColumn: boolean
}

export interface BoardMember {
  userId: string
  role: 'admin' | 'member' | 'viewer'
  joinedAt: Date
}

export interface BoardSettings {
  defaultView: 'board' | 'list' | 'timeline'
  showSwimlanes: boolean
}

export interface CreateBoardInput {
  name: string
  type: 'kanban' | 'sprint'
  workspaceId: string
  prefix?: string
  description?: string
  emoji?: string
  columns?: BoardColumn[]
  members?: BoardMember[]
  settings?: BoardSettings
  createdBy: string
}

export interface BoardDocument extends Document {
  workspaceId: string
  name: string
  description?: string
  prefix: string
  emoji?: string
  type: 'kanban' | 'sprint'
  settings: BoardSettings
  columns: BoardColumn[]
  members: BoardMember[]
  createdBy: string
  deletedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const boardColumnSchema = new Schema<BoardColumn>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    order: { type: Number, required: true },
    hexColor: { type: String },
    wipLimit: { type: Number },
    isDoneColumn: { type: Boolean, required: true, default: false },
  },
  { _id: false },
)

const boardMemberSchema = new Schema<BoardMember>(
  {
    userId: { type: String, required: true },
    role: {
      type: String,
      enum: ['admin', 'member', 'viewer'],
      required: true,
    },
    joinedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
)

const boardSettingsSchema = new Schema<BoardSettings>(
  {
    defaultView: {
      type: String,
      enum: ['board', 'list', 'timeline'],
      required: true,
      default: 'board',
    },
    showSwimlanes: { type: Boolean, required: true, default: false },
  },
  { _id: false },
)

const boardSchema = new Schema<BoardDocument>(
  {
    workspaceId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    prefix: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    emoji: {
      type: String,
    },
    type: {
      type: String,
      required: true,
      enum: ['kanban', 'sprint'],
    },
    settings: {
      type: boardSettingsSchema,
      required: true,
      default: () => ({
        defaultView: 'board',
        showSwimlanes: false,
      }),
    },
    columns: {
      type: [boardColumnSchema],
      required: true,
    },
    members: {
      type: [boardMemberSchema],
      required: true,
      default: [],
    },
    createdBy: {
      type: String,
      required: true,
    },
    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
)

// Compound index for unique prefix within workspace
boardSchema.index({ workspaceId: 1, prefix: 1 }, { unique: true })

export const BoardModel = models.Board ?? model<BoardDocument>('Board', boardSchema)

export type Board = {
  id: string
  workspaceId: string
  name: string
  description?: string
  prefix: string
  emoji?: string
  type: 'kanban' | 'sprint'
  settings: {
    defaultView: 'board' | 'list' | 'timeline'
    showSwimlanes: boolean
  }
  columns: Array<{
    id: string
    name: string
    order: number
    hexColor?: string
    wipLimit?: number
    isDoneColumn: boolean
  }>
  members: Array<{
    userId: string
    role: 'admin' | 'member' | 'viewer'
    joinedAt: string
  }>
  createdBy: string
  deletedAt?: string
  createdAt: string
  updatedAt: string
}

export function toBoard(doc: BoardDocument): Board {
  return {
    id: doc.id,
    workspaceId: doc.workspaceId,
    name: doc.name,
    description: doc.description,
    prefix: doc.prefix,
    emoji: doc.emoji,
    type: doc.type as 'kanban' | 'sprint',
    settings: {
      defaultView: doc.settings.defaultView as 'board' | 'list' | 'timeline',
      showSwimlanes: doc.settings.showSwimlanes,
    },
    columns: doc.columns.map((col) => ({
      id: col.id,
      name: col.name,
      order: col.order,
      hexColor: col.hexColor,
      wipLimit: col.wipLimit,
      isDoneColumn: col.isDoneColumn,
    })),
    members: doc.members.map((m) => ({
      userId: m.userId,
      role: m.role as 'admin' | 'member' | 'viewer',
      joinedAt: m.joinedAt.toISOString(),
    })),
    createdBy: doc.createdBy,
    deletedAt: doc.deletedAt?.toISOString(),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}

