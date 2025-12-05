import { Schema, model, models, type Document } from 'mongoose'

// Task item with timestamp for per-task duration tracking
export interface TaskItem {
  text: string
  addedAt: Date
  duration: number // in minutes, calculated when task changes or timer stops
}

export interface TimeEntryDocument extends Document {
  userId: string
  projects: string[]
  tasks: TaskItem[]
  duration: number // in minutes
  startTime: Date
  endTime?: Date
  isActive: boolean
  isPaused: boolean
  pausedDuration: number // total paused time in milliseconds
  lastPausedAt?: Date
  isOvertime: boolean
  createdAt: Date
  updatedAt: Date
}

const taskItemSchema = new Schema<TaskItem>(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },
    addedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    duration: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
)

const timeEntrySchema = new Schema<TimeEntryDocument>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    projects: {
      type: [String],
      required: true,
      default: [],
    },
    tasks: {
      type: [taskItemSchema],
      default: [],
    },
    duration: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: false,
      index: true,
    },
    isPaused: {
      type: Boolean,
      default: false,
    },
    pausedDuration: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastPausedAt: {
      type: Date,
    },
    isOvertime: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
)

export const TimeEntryModel = models.TimeEntry ?? model<TimeEntryDocument>('TimeEntry', timeEntrySchema)

// API response types
export type TaskItemResponse = {
  text: string
  addedAt: string
  duration: number
}

export type TimeEntry = {
  id: string
  userId: string
  projects: string[]
  tasks: TaskItemResponse[]
  duration: number
  startTime: string | null
  endTime: string | null
  isActive: boolean
  isPaused: boolean
  pausedDuration: number
  lastPausedAt: string | null
  isOvertime: boolean
  createdAt: string
  updatedAt: string
}

export function toTimeEntry(doc: TimeEntryDocument): TimeEntry {
  // Convert tasks array
  const tasks: TaskItemResponse[] = (doc.tasks || []).map(t => ({
    text: t.text,
    addedAt: t.addedAt.toISOString(),
    duration: t.duration || 0,
  }))

  return {
    id: doc.id,
    userId: doc.userId,
    projects: doc.projects || [],
    tasks,
    duration: doc.duration,
    startTime: doc.startTime?.toISOString() || null,
    endTime: doc.endTime?.toISOString() || null,
    isActive: doc.isActive ?? false,
    isPaused: doc.isPaused ?? false,
    pausedDuration: doc.pausedDuration ?? 0,
    lastPausedAt: doc.lastPausedAt?.toISOString() || null,
    isOvertime: doc.isOvertime ?? false,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}
