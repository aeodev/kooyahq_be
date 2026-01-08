import { Schema, model, models, type Document } from 'mongoose'

export type AdminAction =
  | 'create_user'
  | 'update_user'
  | 'delete_user'
  | 'create_client'
  | 'create_project'
  | 'update_project'
  | 'delete_project'
  | 'create_server_project'
  | 'update_server_project'
  | 'delete_server_project'
  | 'create_server'
  | 'update_server'
  | 'delete_server'
  | 'create_server_action'
  | 'update_server_action'
  | 'delete_server_action'
  | 'trigger_server_action'
  | 'update_system_settings'

export type TargetType = 'user' | 'project' | 'server_project' | 'server' | 'server_action' | 'system'

export interface AdminActivityDocument extends Document {
  adminId: string
  action: AdminAction
  targetType: TargetType
  targetId: string
  title: string
  summary?: string
  targetLabel?: string
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
      enum: [
        'create_user',
        'update_user',
        'delete_user',
        'create_client',
        'create_project',
        'update_project',
        'delete_project',
        'create_server_project',
        'update_server_project',
        'delete_server_project',
        'create_server',
        'update_server',
        'delete_server',
        'create_server_action',
        'update_server_action',
        'delete_server_action',
        'trigger_server_action',
        'update_system_settings',
      ],
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ['user', 'project', 'server_project', 'server', 'server_action', 'system'],
      required: true,
      index: true,
    },
    targetId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    summary: {
      type: String,
    },
    targetLabel: {
      type: String,
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
  title: string
  summary?: string
  targetLabel?: string
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
    title: doc.title,
    summary: doc.summary,
    targetLabel: doc.targetLabel,
    changes: doc.changes as Record<string, unknown> | undefined,
    timestamp: doc.timestamp.toISOString(),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}




