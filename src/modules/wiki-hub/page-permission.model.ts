import { Schema, model, models, type Document } from 'mongoose'

export interface PagePermissionDocument extends Document {
  pageId: string
  userId: string
  role: 'view' | 'edit' | 'comment' | 'admin'
  workspaceId: string
  createdAt: Date
  updatedAt: Date
}

const pagePermissionSchema = new Schema<PagePermissionDocument>(
  {
    pageId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['view', 'edit', 'comment', 'admin'],
      required: true,
    },
    workspaceId: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
)

// Compound indexes for permission checks
pagePermissionSchema.index({ pageId: 1, userId: 1 }, { unique: true })
pagePermissionSchema.index({ workspaceId: 1, userId: 1 })
pagePermissionSchema.index({ pageId: 1, role: 1 })

export const PagePermissionModel =
  models.PagePermission ?? model<PagePermissionDocument>('PagePermission', pagePermissionSchema)

export type PagePermission = {
  id: string
  pageId: string
  userId: string
  role: 'view' | 'edit' | 'comment' | 'admin'
  workspaceId: string
  createdAt: string
  updatedAt: string
}

export function toPagePermission(doc: PagePermissionDocument): PagePermission {
  return {
    id: doc.id,
    pageId: doc.pageId,
    userId: doc.userId,
    role: doc.role as 'view' | 'edit' | 'comment' | 'admin',
    workspaceId: doc.workspaceId,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}
