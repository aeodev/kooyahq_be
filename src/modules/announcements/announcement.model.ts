import { Schema, model, models, type Document } from 'mongoose'

export interface AnnouncementDocument extends Document {
  title: string
  content: string
  authorId: string
  isActive: boolean
  expiresAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

const announcementSchema = new Schema<AnnouncementDocument>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    authorId: {
      type: String,
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  },
)

export const AnnouncementModel =
  models.Announcement ?? model<AnnouncementDocument>('Announcement', announcementSchema)

export type Announcement = {
  id: string
  title: string
  content: string
  authorId: string
  isActive: boolean
  expiresAt: string | null
  createdAt: string
  updatedAt: string
}

export function toAnnouncement(doc: AnnouncementDocument): Announcement {
  return {
    id: doc.id,
    title: doc.title,
    content: doc.content,
    authorId: doc.authorId,
    isActive: doc.isActive,
    expiresAt: doc.expiresAt ? doc.expiresAt.toISOString() : null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}
