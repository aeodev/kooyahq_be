import { Schema, model, models, type Document } from 'mongoose'
import type { TicketGithubStatus } from '../tickets/ticket.model'

export const DEFAULT_WORKSPACE_ID = 'global'

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

export type DetailFieldName =
  | 'priority'
  | 'assignee'
  | 'tags'
  | 'parent'
  | 'dueDate'
  | 'startDate'
  | 'endDate'

export interface TicketDetailsFieldConfig {
  fieldName: DetailFieldName
  isVisible: boolean
  order: number // Lower numbers appear first (top to bottom)
}

export interface GithubAutomationRule {
  id: string
  enabled: boolean
  status: TicketGithubStatus
  targetBranch?: string
  columnId: string
  description?: string
}

export interface BoardSettings {
  defaultView: 'board' | 'list' | 'timeline'
  showSwimlanes: boolean
  ticketDetailsSettings: {
    fieldConfigs: TicketDetailsFieldConfig[]
  }
  githubAutomation: {
    rules: GithubAutomationRule[]
  }
}

export interface CreateBoardInput {
  name: string
  type: 'kanban' | 'sprint'
  workspaceId?: string
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

const ticketDetailsFieldConfigSchema = new Schema<TicketDetailsFieldConfig>(
  {
    fieldName: {
      type: String,
      required: true,
      enum: ['priority', 'assignee', 'tags', 'parent', 'dueDate', 'startDate', 'endDate'],
    },
    isVisible: {
      type: Boolean,
      required: true,
      default: true,
    },
    order: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false },
)

const githubAutomationRuleSchema = new Schema<GithubAutomationRule>(
  {
    id: { type: String, required: true },
    enabled: { type: Boolean, required: true, default: true },
    status: { type: String, required: true },
    targetBranch: { type: String },
    columnId: { type: String, required: true },
    description: { type: String },
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
    ticketDetailsSettings: {
      type: new Schema(
        {
          fieldConfigs: {
            type: [ticketDetailsFieldConfigSchema],
            required: true,
            default: () => [
              { fieldName: 'priority', isVisible: true, order: 0 },
              { fieldName: 'assignee', isVisible: true, order: 1 },
              { fieldName: 'tags', isVisible: true, order: 2 },
              { fieldName: 'parent', isVisible: true, order: 3 },
              { fieldName: 'dueDate', isVisible: true, order: 4 },
              { fieldName: 'startDate', isVisible: true, order: 5 },
              { fieldName: 'endDate', isVisible: true, order: 6 },
            ],
          },
        },
        { _id: false },
      ),
      required: true,
      default: () => ({
        fieldConfigs: [
          { fieldName: 'priority', isVisible: true, order: 0 },
          { fieldName: 'assignee', isVisible: true, order: 1 },
          { fieldName: 'tags', isVisible: true, order: 2 },
          { fieldName: 'parent', isVisible: true, order: 3 },
          { fieldName: 'dueDate', isVisible: true, order: 4 },
          { fieldName: 'startDate', isVisible: true, order: 5 },
          { fieldName: 'endDate', isVisible: true, order: 6 },
        ],
      }),
    },
    githubAutomation: {
      type: new Schema(
        {
          rules: {
            type: [githubAutomationRuleSchema],
            required: true,
            default: [],
          },
        },
        { _id: false },
      ),
      required: true,
      default: () => ({
        rules: [],
      }),
    },
  },
  { _id: false },
)

const boardSchema = new Schema<BoardDocument>(
  {
    workspaceId: {
      type: String,
      required: false,
      default: DEFAULT_WORKSPACE_ID,
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
        ticketDetailsSettings: {
          fieldConfigs: [
            { fieldName: 'priority', isVisible: true, order: 0 },
            { fieldName: 'assignee', isVisible: true, order: 1 },
            { fieldName: 'tags', isVisible: true, order: 2 },
            { fieldName: 'parent', isVisible: true, order: 3 },
            { fieldName: 'dueDate', isVisible: true, order: 4 },
            { fieldName: 'startDate', isVisible: true, order: 5 },
            { fieldName: 'endDate', isVisible: true, order: 6 },
          ],
        },
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
    ticketDetailsSettings: {
      fieldConfigs: Array<{
        fieldName: DetailFieldName
        isVisible: boolean
        order: number
      }>
    }
    githubAutomation: {
      rules: Array<{
        id: string
        enabled: boolean
        status: TicketGithubStatus
        targetBranch?: string
        columnId: string
        description?: string
      }>
    }
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
      ticketDetailsSettings: {
        fieldConfigs: doc.settings.ticketDetailsSettings?.fieldConfigs?.map((config) => ({
          fieldName: config.fieldName as DetailFieldName,
          isVisible: config.isVisible,
          order: config.order,
        })) || [
          { fieldName: 'priority', isVisible: true, order: 0 },
          { fieldName: 'assignee', isVisible: true, order: 1 },
          { fieldName: 'tags', isVisible: true, order: 2 },
          { fieldName: 'parent', isVisible: true, order: 3 },
          { fieldName: 'dueDate', isVisible: true, order: 4 },
          { fieldName: 'startDate', isVisible: true, order: 5 },
          { fieldName: 'endDate', isVisible: true, order: 6 },
        ],
      },
      githubAutomation: {
        rules: doc.settings.githubAutomation?.rules?.map((rule) => ({
          id: rule.id,
          enabled: rule.enabled,
          status: rule.status as TicketGithubStatus,
          targetBranch: rule.targetBranch,
          columnId: rule.columnId,
          description: rule.description,
        })) || [],
      },
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
