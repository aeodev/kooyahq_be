import { Schema, model, models, type Document } from 'mongoose'
import type { RichTextDoc } from './page.model'

export interface PageVersionDocument extends Document {
  pageId: string
  versionNumber: string
  content: RichTextDoc
  editorId: string
  changeSummary?: string
  createdAt: Date
}

const pageVersionSchema = new Schema<PageVersionDocument>(
  {
    pageId: {
      type: String,
      required: true,
      index: true,
    },
    versionNumber: {
      type: String,
      required: true,
    },
    content: {
      type: Schema.Types.Mixed,
      required: true,
    },
    editorId: {
      type: String,
      required: true,
    },
    changeSummary: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: false, // We only want createdAt, not updatedAt
  },
)

// Compound index for version lookup
pageVersionSchema.index({ pageId: 1, versionNumber: 1 }, { unique: true })
pageVersionSchema.index({ pageId: 1, createdAt: -1 })

export const PageVersionModel =
  models.PageVersion ?? model<PageVersionDocument>('PageVersion', pageVersionSchema)

export type PageVersion = {
  id: string
  pageId: string
  versionNumber: string
  content: RichTextDoc
  editorId: string
  changeSummary?: string
  createdAt: string
}

export function toPageVersion(doc: PageVersionDocument): PageVersion {
  return {
    id: doc.id,
    pageId: doc.pageId,
    versionNumber: doc.versionNumber,
    content: doc.content as RichTextDoc,
    editorId: doc.editorId,
    changeSummary: doc.changeSummary,
    createdAt: doc.createdAt.toISOString(),
  }
}
