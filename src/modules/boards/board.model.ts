import { Schema, model, models, type Document } from 'mongoose'

export interface BoardDocument extends Document {
  name: string
  type: 'kanban' | 'sprint'
  ownerId: string
  memberIds: string[]
  columns: string[]
  columnLimits?: Record<string, number>
  sprintStartDate?: Date
  sprintEndDate?: Date
  sprintGoal?: string
  createdAt: Date
  updatedAt: Date
}

const boardSchema = new Schema<BoardDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['kanban', 'sprint'],
    },
    ownerId: {
      type: String,
      required: true,
    },
    memberIds: {
      type: [String],
      default: [],
    },
    columns: {
      type: [String],
      required: true,
    },
    columnLimits: {
      type: Map,
      of: Number,
      default: {},
    },
    sprintStartDate: {
      type: Date,
    },
    sprintEndDate: {
      type: Date,
    },
    sprintGoal: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
)

export const BoardModel = models.Board ?? model<BoardDocument>('Board', boardSchema)

export type Board = {
  id: string
  name: string
  type: 'kanban' | 'sprint'
  ownerId: string
  memberIds: string[]
  columns: string[]
  columnLimits?: Record<string, number>
  sprintStartDate?: string
  sprintEndDate?: string
  sprintGoal?: string
  createdAt: string
  updatedAt: string
}

export function toBoard(doc: BoardDocument): Board {
  let columnLimits: Record<string, number> | undefined = undefined
  if (doc.columnLimits && doc.columnLimits instanceof Map) {
    columnLimits = {}
    for (const [key, value] of doc.columnLimits.entries()) {
      columnLimits[key] = Number(value)
    }
  }

  return {
    id: doc.id,
    name: doc.name,
    type: doc.type as 'kanban' | 'sprint',
    ownerId: doc.ownerId,
    memberIds: doc.memberIds || [],
    columns: doc.columns,
    columnLimits,
    sprintStartDate: doc.sprintStartDate?.toISOString(),
    sprintEndDate: doc.sprintEndDate?.toISOString(),
    sprintGoal: doc.sprintGoal,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}

