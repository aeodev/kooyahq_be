import { Schema, model, models, type Document } from 'mongoose'

export type NotificationType = 'post_created' | 'comment' | 'reaction' | 'mention' | 'system' | 'card_assigned' | 'card_comment' | 'card_moved' | 'board_member_added' | 'game_invitation'

export type NotificationMetadata = Record<string, unknown>

export interface NotificationDocument extends Document {
  userId: string
  type: NotificationType
  postId?: string
  commentId?: string
  reactionId?: string
  mentionId?: string
  cardId?: string
  boardId?: string
  title?: string
  url?: string
  metadata?: NotificationMetadata
  read: boolean
  createdAt: Date
  updatedAt: Date
}

const notificationSchema = new Schema<NotificationDocument>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['post_created', 'comment', 'reaction', 'mention', 'system', 'card_assigned', 'card_comment', 'card_moved', 'board_member_added', 'game_invitation'],
      required: true,
    },
    postId: {
      type: String,
      index: true,
    },
    commentId: {
      type: String,
    },
    reactionId: {
      type: String,
    },
    mentionId: {
      type: String,
    },
    cardId: {
      type: String,
      index: true,
    },
    boardId: {
      type: String,
      index: true,
    },
    title: {
      type: String,
    },
    url: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  },
)

export const NotificationModel = models.Notification ?? model<NotificationDocument>('Notification', notificationSchema)

export type Notification = {
  id: string
  userId: string
  type: NotificationType
  postId?: string
  commentId?: string
  reactionId?: string
  mentionId?: string
  cardId?: string
  boardId?: string
  title?: string
  url?: string
  metadata?: NotificationMetadata
  read: boolean
  createdAt: string
  updatedAt: string
}

export function toNotification(doc: NotificationDocument): Notification {
  return {
    id: doc.id,
    userId: doc.userId,
    type: doc.type as NotificationType,
    postId: doc.postId,
    commentId: doc.commentId,
    reactionId: doc.reactionId,
    mentionId: doc.mentionId,
    cardId: doc.cardId,
    boardId: doc.boardId,
    title: doc.title,
    url: doc.url,
    metadata: doc.metadata,
    read: doc.read ?? false,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}


