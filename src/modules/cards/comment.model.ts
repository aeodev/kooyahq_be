import { Schema, model, models, type Document } from 'mongoose'

export interface CommentDocument extends Document {
  cardId: string
  userId: string
  content: string
  createdAt: Date
  updatedAt: Date
}

const commentSchema = new Schema<CommentDocument>(
  {
    cardId: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
)

export const CommentModel = models.Comment ?? model<CommentDocument>('Comment', commentSchema)

export type Comment = {
  id: string
  cardId: string
  userId: string
  content: string
  createdAt: string
  updatedAt: string
}

export function toComment(doc: CommentDocument): Comment {
  return {
    id: doc.id,
    cardId: doc.cardId,
    userId: doc.userId,
    content: doc.content,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}










