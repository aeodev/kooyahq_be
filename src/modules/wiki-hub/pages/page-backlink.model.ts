import { Schema, model, models, type Document } from 'mongoose'

export interface PageBacklinkDocument extends Document {
  pageId: string
  linkedPageId: string
  workspaceId: string
  createdAt: Date
}

const pageBacklinkSchema = new Schema<PageBacklinkDocument>(
  {
    pageId: {
      type: String,
      required: true,
      index: true,
    },
    linkedPageId: {
      type: String,
      required: true,
      index: true,
    },
    workspaceId: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: false, // Only createdAt
  },
)

// Compound indexes for bidirectional lookups
pageBacklinkSchema.index({ pageId: 1, linkedPageId: 1 }, { unique: true })
pageBacklinkSchema.index({ linkedPageId: 1 }) // For finding backlinks
pageBacklinkSchema.index({ workspaceId: 1, pageId: 1 })

export const PageBacklinkModel =
  models.PageBacklink ?? model<PageBacklinkDocument>('PageBacklink', pageBacklinkSchema)

export type PageBacklink = {
  id: string
  pageId: string
  linkedPageId: string
  workspaceId: string
  createdAt: string
}

export function toPageBacklink(doc: PageBacklinkDocument): PageBacklink {
  return {
    id: doc.id,
    pageId: doc.pageId,
    linkedPageId: doc.linkedPageId,
    workspaceId: doc.workspaceId,
    createdAt: doc.createdAt?.toISOString() || new Date().toISOString(),
  }
}
