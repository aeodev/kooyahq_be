import { Schema, model, models, type Document } from 'mongoose'

export type ReactionType = 'heart' | 'wow' | 'haha'

export type { ReactionType as PostReactionType }

export interface PostReactionDocument extends Document {
  postId: string
  userId: string
  type: ReactionType
  createdAt: Date
  updatedAt: Date
}

const postReactionSchema = new Schema<PostReactionDocument>(
  {
    postId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['heart', 'wow', 'haha'],
      required: true,
    },
  },
  {
    timestamps: true,
  },
)

// Unique constraint on postId + userId
postReactionSchema.index({ postId: 1, userId: 1 }, { unique: true })

export const PostReactionModel = models.PostReaction ?? model<PostReactionDocument>('PostReaction', postReactionSchema)

export type PostReaction = {
  id: string
  postId: string
  userId: string
  type: ReactionType
  createdAt: string
  updatedAt: string
}

export function toPostReaction(doc: PostReactionDocument): PostReaction {
  return {
    id: doc.id,
    postId: doc.postId,
    userId: doc.userId,
    type: doc.type as ReactionType,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}

