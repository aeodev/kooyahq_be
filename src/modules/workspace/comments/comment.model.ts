import { Schema, model, models, type Document } from 'mongoose'

export interface CommentDocument extends Document {
  ticketId: string
  userId: string
  content: Record<string, any> // RichTextDoc
  createdAt: Date
  updatedAt: Date
}

const commentSchema = new Schema<CommentDocument>(
  {
    ticketId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
    },
    content: {
      type: Schema.Types.Mixed,
      required: true,
    },
  },
  {
    timestamps: true,
  },
)

export const CommentModel = models.TicketComment ?? model<CommentDocument>('TicketComment', commentSchema)

export type Comment = {
  id: string
  ticketId: string
  userId: string
  content: Record<string, any>
  createdAt: string
  updatedAt: string
}

export function toComment(doc: CommentDocument): Comment {
  return {
    id: doc.id,
    ticketId: doc.ticketId,
    userId: doc.userId,
    content: doc.content as Record<string, any>,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}

