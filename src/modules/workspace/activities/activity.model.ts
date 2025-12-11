import { Schema, model, models, type Document } from 'mongoose'
import type { RichTextDoc } from '../tickets/ticket.model'

export interface ChangeLog {
  field: string
  oldValue: any
  newValue: any
  text: string
}

export interface CommentPayload {
  content: RichTextDoc
  textPreview: string
  mentions: string[]
  isEdit: boolean
  originalCommentId?: string
}

export interface ActivityDocument extends Document {
  workspaceId: string
  boardId: string
  ticketId?: string
  actorId: string
  actionType: 'create' | 'update' | 'delete' | 'comment' | 'transition' | 'upload'
  changes?: ChangeLog[]
  comment?: CommentPayload
  createdAt: Date
}

const changeLogSchema = new Schema<ChangeLog>(
  {
    field: { type: String, required: true },
    oldValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
    text: { type: String, required: true },
  },
  { _id: false },
)

const commentPayloadSchema = new Schema<CommentPayload>(
  {
    content: { type: Schema.Types.Mixed, required: true },
    textPreview: { type: String, required: true },
    mentions: { type: [String], default: [] },
    isEdit: { type: Boolean, default: false },
    originalCommentId: { type: String },
  },
  { _id: false },
)

const activitySchema = new Schema<ActivityDocument>(
  {
    workspaceId: {
      type: String,
      required: true,
      index: true,
    },
    boardId: {
      type: String,
      required: true,
      index: true,
    },
    ticketId: {
      type: String,
      index: true,
    },
    actorId: {
      type: String,
      required: true,
    },
    actionType: {
      type: String,
      enum: ['create', 'update', 'delete', 'comment', 'transition', 'upload'],
      required: true,
    },
    changes: {
      type: [changeLogSchema],
    },
    comment: {
      type: commentPayloadSchema,
    },
  },
  {
    timestamps: true,
  },
)

// Indexes for efficient queries
activitySchema.index({ ticketId: 1 })
activitySchema.index({ boardId: 1 })
activitySchema.index({ createdAt: -1 })

export const ActivityModel = models.Activity ?? model<ActivityDocument>('Activity', activitySchema)

export type Activity = {
  id: string
  workspaceId: string
  boardId: string
  ticketId?: string
  actorId: string
  actionType: 'create' | 'update' | 'delete' | 'comment' | 'transition' | 'upload'
  changes?: Array<{
    field: string
    oldValue: any
    newValue: any
    text: string
  }>
  comment?: {
    content: RichTextDoc
    textPreview: string
    mentions: string[]
    isEdit: boolean
    originalCommentId?: string
  }
  createdAt: string
}

export function toActivity(doc: ActivityDocument): Activity {
  return {
    id: doc.id,
    workspaceId: doc.workspaceId,
    boardId: doc.boardId,
    ticketId: doc.ticketId,
    actorId: doc.actorId,
    actionType: doc.actionType as 'create' | 'update' | 'delete' | 'comment' | 'transition' | 'upload',
    changes: doc.changes?.map((change) => ({
      field: change.field,
      oldValue: change.oldValue,
      newValue: change.newValue,
      text: change.text,
    })),
    comment: doc.comment
      ? {
          content: doc.comment.content as RichTextDoc,
          textPreview: doc.comment.textPreview,
          mentions: doc.comment.mentions || [],
          isEdit: doc.comment.isEdit || false,
          originalCommentId: doc.comment.originalCommentId,
        }
      : undefined,
    createdAt: doc.createdAt.toISOString(),
  }
}

