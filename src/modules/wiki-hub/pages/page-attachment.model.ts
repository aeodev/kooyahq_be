import { Schema, model, models, type Document } from 'mongoose'

export interface PageAttachmentDocument extends Document {
  pageId: string
  type: 'image' | 'video' | 'pdf' | 'other'
  fileUrl: string
  name: string
  size: number
  uploadedBy: string
  uploadedAt: Date
}

const pageAttachmentSchema = new Schema<PageAttachmentDocument>(
  {
    pageId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['image', 'video', 'pdf', 'other'],
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    size: {
      type: Number,
      required: true,
    },
    uploadedBy: {
      type: String,
      required: true,
      index: true,
    },
    uploadedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: false, // Only uploadedAt
  },
)

pageAttachmentSchema.index({ pageId: 1, uploadedAt: -1 })

export const PageAttachmentModel =
  models.PageAttachment ?? model<PageAttachmentDocument>('PageAttachment', pageAttachmentSchema)

export type PageAttachment = {
  id: string
  pageId: string
  type: 'image' | 'video' | 'pdf' | 'other'
  fileUrl: string
  name: string
  size: number
  uploadedBy: string
  uploadedAt: string
}

export function toPageAttachment(doc: PageAttachmentDocument): PageAttachment {
  return {
    id: doc.id,
    pageId: doc.pageId,
    type: doc.type as 'image' | 'video' | 'pdf' | 'other',
    fileUrl: doc.fileUrl,
    name: doc.name,
    size: doc.size,
    uploadedBy: doc.uploadedBy,
    uploadedAt: doc.uploadedAt?.toISOString() || new Date().toISOString(),
  }
}
