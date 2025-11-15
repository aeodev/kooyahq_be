import { Schema, model, models, type Document } from 'mongoose'

export interface TimeEntryDocument extends Document {
  userId: string
  projects: string[] // Changed from single project to array for multi-select
  task: string
  duration: number // in minutes
  startTime: Date
  endTime?: Date
  isActive: boolean
  isPaused: boolean
  pausedDuration: number // total paused time in minutes
  lastPausedAt?: Date
  createdAt: Date
  updatedAt: Date
}

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
    task: {
      type: String,
      required: false, // Allow empty strings - we'll always provide a value (even if empty)
      trim: true,
      default: '', // Default to empty string
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
  },
  {
    timestamps: true,
  },
)

export const TimeEntryModel = models.TimeEntry ?? model<TimeEntryDocument>('TimeEntry', timeEntrySchema)

export type TimeEntry = {
  id: string
  userId: string
  projects: string[]
  task: string
  duration: number
  startTime: string | null
  endTime: string | null
  isActive: boolean
  isPaused: boolean
  pausedDuration: number
  lastPausedAt: string | null
  createdAt: string
  updatedAt: string
}

export function toTimeEntry(doc: TimeEntryDocument): TimeEntry {
  return {
    id: doc.id,
    userId: doc.userId,
    projects: doc.projects || [],
    task: doc.task,
    duration: doc.duration,
    startTime: doc.startTime?.toISOString() || null,
    endTime: doc.endTime?.toISOString() || null,
    isActive: doc.isActive ?? false,
    isPaused: doc.isPaused ?? false,
    pausedDuration: doc.pausedDuration ?? 0,
    lastPausedAt: doc.lastPausedAt?.toISOString() || null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}

