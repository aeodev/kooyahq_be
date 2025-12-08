import { Schema, model, models, type Document } from 'mongoose'

export type AuditAction = 
  | 'start_timer'
  | 'pause_timer'
  | 'resume_timer'
  | 'stop_timer'
  | 'add_task'
  | 'create_entry'
  | 'update_entry'
  | 'delete_entry'
  | 'log_manual'

export interface TimeEntryAuditDocument extends Document {
  userId: string
  entryId?: string
  action: AuditAction
  metadata: {
    projects?: string[]
    task?: string
    duration?: number
    oldValue?: Record<string, unknown>
    newValue?: Record<string, unknown>
  }
  timestamp: Date
}

const auditSchema = new Schema<TimeEntryAuditDocument>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    entryId: {
      type: String,
      index: true,
    },
    action: {
      type: String,
      enum: ['start_timer', 'pause_timer', 'resume_timer', 'stop_timer', 'add_task', 'create_entry', 'update_entry', 'delete_entry', 'log_manual'],
      required: true,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  },
)

// Compound index for date range queries
auditSchema.index({ userId: 1, timestamp: -1 })
auditSchema.index({ timestamp: -1 })

export const TimeEntryAuditModel = models.TimeEntryAudit ?? model<TimeEntryAuditDocument>('TimeEntryAudit', auditSchema)

export type TimeEntryAudit = {
  id: string
  userId: string
  entryId?: string
  action: AuditAction
  metadata: TimeEntryAuditDocument['metadata']
  timestamp: string
  createdAt: string
  updatedAt: string
}

export function toAuditLog(doc: TimeEntryAuditDocument & { createdAt?: Date; updatedAt?: Date }): TimeEntryAudit {
  return {
    id: doc.id,
    userId: doc.userId,
    entryId: doc.entryId,
    action: doc.action as AuditAction,
    metadata: doc.metadata || {},
    timestamp: doc.timestamp.toISOString(),
    createdAt: doc.createdAt?.toISOString() || doc.timestamp.toISOString(),
    updatedAt: doc.updatedAt?.toISOString() || doc.timestamp.toISOString(),
  }
}

