import { Schema, model, models, type Document } from 'mongoose'

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

export interface TicketDetailsSettingsDocument extends Document {
  userId: string
  boardId?: string // Optional: if null, applies to all boards
  fieldConfigs: TicketDetailsFieldConfig[]
  createdAt: Date
  updatedAt: Date
}

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

const ticketDetailsSettingsSchema = new Schema<TicketDetailsSettingsDocument>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    boardId: {
      type: String,
      index: true,
    },
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
  {
    timestamps: true,
  },
)

// Compound index: one settings per user per board (or global if boardId is null)
ticketDetailsSettingsSchema.index({ userId: 1, boardId: 1 }, { unique: true, sparse: true })
ticketDetailsSettingsSchema.index({ userId: 1, boardId: null }, { unique: true, sparse: true })

export const TicketDetailsSettingsModel =
  models.TicketDetailsSettings ?? model<TicketDetailsSettingsDocument>('TicketDetailsSettings', ticketDetailsSettingsSchema)

export type TicketDetailsSettings = {
  id: string
  userId: string
  boardId?: string
  fieldConfigs: Array<{
    fieldName: DetailFieldName
    isVisible: boolean
    order: number
  }>
  createdAt: string
  updatedAt: string
}

export function toTicketDetailsSettings(doc: TicketDetailsSettingsDocument): TicketDetailsSettings {
  return {
    id: doc.id,
    userId: doc.userId,
    boardId: doc.boardId,
    fieldConfigs: doc.fieldConfigs.map((config) => ({
      fieldName: config.fieldName as DetailFieldName,
      isVisible: config.isVisible,
      order: config.order,
    })),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}

