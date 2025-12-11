import { Schema, model, models, type Document } from 'mongoose'

export type AdminAction =
  | 'update_user'
  | 'delete_user'
  | 'create_client'
  | 'create_project'
  | 'update_project'
  | 'delete_project'

export type TargetType = 'user' | 'project'

export interface AdminActivityDocument extends Document {
  adminId: string
  action: AdminAction
  targetType: TargetType
  targetId: string
  changes?: Record<string, unknown>
  timestamp: Date
  createdAt: Date
  updatedAt: Date
}

const adminActivitySchema = new Schema<AdminActivityDocument>(
  {
    adminId: {
      type: String,
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: ['update_user', 'delete_user', 'create_client', 'create_project', 'update_project', 'delete_project'],
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ['user', 'project'],
      required: true,
      index: true,
    },
    targetId: {
      type: String,
      required: true,
      index: true,
    },
    changes: {
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

// Compound indexes for efficient queries
adminActivitySchema.index({ adminId: 1, timestamp: -1 })
adminActivitySchema.index({ action: 1, timestamp: -1 })
adminActivitySchema.index({ targetType: 1, targetId: 1 })
adminActivitySchema.index({ timestamp: -1 })

export const AdminActivityModel =
  models.AdminActivity ?? model<AdminActivityDocument>('AdminActivity', adminActivitySchema)

export type AdminActivity = {
  id: string
  adminId: string
  action: AdminAction
  targetType: TargetType
  targetId: string
  changes?: Record<string, unknown>
  timestamp: string
  createdAt: string
  updatedAt: string
}

export function toAdminActivity(doc: AdminActivityDocument): AdminActivity {
  return {
    id: doc.id,
    adminId: doc.adminId,
    action: doc.action as AdminAction,
    targetType: doc.targetType as TargetType,
    targetId: doc.targetId,
    changes: doc.changes as Record<string, unknown> | undefined,
    timestamp: doc.timestamp.toISOString(),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}






