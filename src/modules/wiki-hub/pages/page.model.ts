import { Schema, model, models, type Document } from 'mongoose'

export type RichTextDoc = Record<string, any>

export interface PageFavorite {
  userId: string
  favoritedAt: Date
}

export interface PageDocument extends Document {
  workspaceId: string
  title: string
  content: RichTextDoc
  authorId: string
  parentPageId?: string
  status: 'draft' | 'published'
  templateId?: string
  tags: string[]
  category?: string
  isPinned: boolean
  favorites: PageFavorite[]
  linkedTicketIds: string[]
  linkedProjectIds: string[]
  deletedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const pageFavoriteSchema = new Schema<PageFavorite>(
  {
    userId: { type: String, required: true },
    favoritedAt: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
)

const pageSchema = new Schema<PageDocument>(
  {
    workspaceId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    authorId: {
      type: String,
      required: true,
      index: true,
    },
    parentPageId: {
      type: String,
      index: true,
    },
    status: {
      type: String,
      enum: ['draft', 'published'],
      required: true,
      default: 'published',
      index: true,
    },
    templateId: {
      type: String,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    category: {
      type: String,
      trim: true,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    favorites: {
      type: [pageFavoriteSchema],
      default: [],
    },
    linkedTicketIds: {
      type: [String],
      default: [],
    },
    linkedProjectIds: {
      type: [String],
      default: [],
    },
    deletedAt: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: true,
  },
)

// Compound indexes for common queries
pageSchema.index({ workspaceId: 1, status: 1, deletedAt: 1 })
pageSchema.index({ workspaceId: 1, parentPageId: 1 })
pageSchema.index({ workspaceId: 1, authorId: 1 })
pageSchema.index({ workspaceId: 1, tags: 1 })
pageSchema.index({ createdAt: -1 })

export const PageModel = models.Page ?? model<PageDocument>('Page', pageSchema)

export type Page = {
  id: string
  workspaceId: string
  title: string
  content: RichTextDoc
  authorId: string
  parentPageId?: string
  status: 'draft' | 'published'
  templateId?: string
  tags: string[]
  category?: string
  isPinned: boolean
  favorites: Array<{
    userId: string
    favoritedAt: string
  }>
  linkedTicketIds: string[]
  linkedProjectIds: string[]
  deletedAt?: string
  createdAt: string
  updatedAt: string
}

export function toPage(doc: PageDocument): Page {
  return {
    id: doc.id,
    workspaceId: doc.workspaceId,
    title: doc.title,
    content: doc.content as RichTextDoc,
    authorId: doc.authorId,
    parentPageId: doc.parentPageId,
    status: doc.status as 'draft' | 'published',
    templateId: doc.templateId,
    tags: doc.tags || [],
    category: doc.category,
    isPinned: doc.isPinned || false,
    favorites: (doc.favorites || []).map((fav) => ({
      userId: fav.userId,
      favoritedAt: fav.favoritedAt?.toISOString() || new Date().toISOString(),
    })),
    linkedTicketIds: doc.linkedTicketIds || [],
    linkedProjectIds: doc.linkedProjectIds || [],
    deletedAt: doc.deletedAt?.toISOString(),
    createdAt: doc.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: doc.updatedAt?.toISOString() || new Date().toISOString(),
  }
}
