import { Schema, model, models, type Document } from 'mongoose'

export interface PageTagDocument extends Document {
  pageId: string
  tagName: string
  workspaceId: string
  createdAt: Date
}

const pageTagSchema = new Schema<PageTagDocument>(
  {
    pageId: {
      type: String,
      required: true,
      index: true,
    },
    tagName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
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

// Compound indexes for common queries
pageTagSchema.index({ workspaceId: 1, tagName: 1 })
pageTagSchema.index({ pageId: 1, tagName: 1 }, { unique: true })

export const PageTagModel = models.PageTag ?? model<PageTagDocument>('PageTag', pageTagSchema)

export type PageTag = {
  id: string
  pageId: string
  tagName: string
  workspaceId: string
  createdAt: string
}

export function toPageTag(doc: PageTagDocument): PageTag {
  return {
    id: doc.id,
    pageId: doc.pageId,
    tagName: doc.tagName,
    workspaceId: doc.workspaceId,
    createdAt: doc.createdAt?.toISOString() || new Date().toISOString(),
  }
}
