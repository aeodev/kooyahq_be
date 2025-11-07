import { Schema, model, models, type Document } from 'mongoose'

export interface PostDocument extends Document {
  content: string
  authorId: string
  imageUrl?: string
  category?: string
  tags: string[]
  draft: boolean
  editedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const postSchema = new Schema<PostDocument>(
  {
    content: {
      type: String,
      required: true,
    },
    authorId: {
      type: String,
      required: true,
      index: true,
    },
    imageUrl: {
      type: String,
    },
    category: {
      type: String,
    },
    tags: {
      type: [String],
      default: [],
    },
    draft: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
)

export const PostModel = models.Post ?? model<PostDocument>('Post', postSchema)

export type Post = {
  id: string
  content: string
  authorId: string
  imageUrl?: string
  category?: string
  tags: string[]
  draft: boolean
  editedAt?: string
  createdAt: string
  updatedAt: string
}

export function toPost(doc: PostDocument): Post {
  return {
    id: doc.id,
    content: doc.content,
    authorId: doc.authorId,
    imageUrl: doc.imageUrl,
    category: doc.category,
    tags: doc.tags || [],
    draft: doc.draft ?? false,
    editedAt: doc.editedAt?.toISOString(),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}

