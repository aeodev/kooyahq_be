import { Schema, model, models, type Document } from 'mongoose'
import { resolveMediaUrl } from '../../utils/media-url'

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
  poll?: {
    question: string
    options: {
      text: string
      votes: string[]
    }[]
    endDate?: Date
  }
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
    poll: {
      question: { type: String },
      options: [{
        text: { type: String, required: true },
        votes: [{ type: String }] // Array of userIds
      }],
      endDate: { type: Date }
    }
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
  poll?: {
    question: string
    options: {
      text: string
      votes: string[]
    }[]
    endDate?: string
  }
}

export function toPost(doc: PostDocument): Post {
  return {
    id: doc.id,
    content: doc.content,
    authorId: doc.authorId,
    imageUrl: resolveMediaUrl(doc.imageUrl),
    category: doc.category,
    tags: doc.tags || [],
    draft: doc.draft ?? false,
    editedAt: doc.editedAt?.toISOString(),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    poll: doc.poll ? {
      question: doc.poll.question,
      options: doc.poll.options.map(opt => ({
        text: opt.text,
        votes: opt.votes || []
      })),
      endDate: doc.poll.endDate?.toISOString()
    } : undefined
  }
}
