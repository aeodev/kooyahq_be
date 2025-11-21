import { Schema, model, models, type Document, Types } from 'mongoose'

export interface Sprint {
  _id: Types.ObjectId
  name: string
  goal?: string
  startDate?: Date
  endDate?: Date
  state: 'future' | 'active' | 'closed'
  createdAt: Date
  updatedAt: Date
}

export interface BoardDocument extends Document {
  name: string
  type: 'kanban' | 'sprint'
  ownerId: string
  memberIds: string[]
  columns: string[]
  columnLimits?: Record<string, number>
  sprints: Sprint[]
  // Deprecated single-sprint fields
  sprintStartDate?: Date
  sprintEndDate?: Date
  sprintGoal?: string
  createdAt: Date
  updatedAt: Date
}

const sprintSchema = new Schema<Sprint>(
  {
    name: { type: String, required: true, trim: true },
    goal: { type: String, trim: true },
    startDate: { type: Date },
    endDate: { type: Date },
    state: {
      type: String,
      enum: ['future', 'active', 'closed'],
      default: 'future',
      required: true,
    },
  },
  { timestamps: true },
)

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
    sprints: {
      type: [sprintSchema],
      default: [],
    },
    // Deprecated fields kept for backward compatibility
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

export type SprintType = {
  id: string
  name: string
  goal?: string
  startDate?: string
  endDate?: string
  state: 'future' | 'active' | 'closed'
  createdAt: string
  updatedAt: string
}

export type Board = {
  id: string
  name: string
  type: 'kanban' | 'sprint'
  ownerId: string
  memberIds: string[]
  columns: string[]
  columnLimits?: Record<string, number>
  sprints: SprintType[]
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
    sprints: (doc.sprints || []).map((s) => ({
      id: s._id.toString(),
      name: s.name,
      goal: s.goal,
      startDate: s.startDate?.toISOString(),
      endDate: s.endDate?.toISOString(),
      state: s.state,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
    sprintStartDate: doc.sprintStartDate?.toISOString(),
    sprintEndDate: doc.sprintEndDate?.toISOString(),
    sprintGoal: doc.sprintGoal,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}

