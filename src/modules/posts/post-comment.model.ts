import { Schema, model, models, type Document } from 'mongoose'

export interface PostCommentDocument extends Document {
  postId: string
  userId: string
  content: string
  mentions: string[]
  createdAt: Date
  updatedAt: Date
}

const postCommentSchema = new Schema<PostCommentDocument>(
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
    content: {
      type: String,
      required: true,
      trim: true,
    },
    mentions: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  },
)

export const PostCommentModel = models.PostComment ?? model<PostCommentDocument>('PostComment', postCommentSchema)

export type PostComment = {
  id: string
  postId: string
  userId: string
  content: string
  mentions: string[]
  createdAt: string
  updatedAt: string
}

export function toPostComment(doc: PostCommentDocument): PostComment {
  return {
    id: doc.id,
    postId: doc.postId,
    userId: doc.userId,
    content: doc.content,
    mentions: doc.mentions || [],
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}







