import { NotificationModel, toNotification, type Notification, type NotificationMetadata, type NotificationType } from './notification.model'

export type CreateNotificationInput = {
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
}

type NotificationQueryOptions = {
  unreadOnly?: boolean
  page?: number
  limit?: number
}

export const notificationRepository = {
  async create(input: CreateNotificationInput): Promise<Notification> {
    const doc = await NotificationModel.create(input)
    return toNotification(doc)
  },

  async findByUserId(
    userId: string,
    options: NotificationQueryOptions = {}
  ): Promise<{ notifications: Notification[]; total: number }> {
    const filter: any = { userId }
    if (options.unreadOnly) {
      filter.read = false
    }
    const page = options.page && options.page > 0 ? options.page : 1
    const limit = options.limit && options.limit > 0 ? options.limit : 100
    const skip = (page - 1) * limit
    const [docs, total] = await Promise.all([
      NotificationModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      NotificationModel.countDocuments(filter).exec(),
    ])
    return {
      notifications: docs.map(toNotification),
      total,
    }
  },

  async findById(id: string): Promise<Notification | undefined> {
    const doc = await NotificationModel.findById(id).exec()
    return doc ? toNotification(doc) : undefined
  },

  async markAsRead(id: string, userId: string): Promise<Notification | undefined> {
    const doc = await NotificationModel.findOneAndUpdate(
      { _id: id, userId },
      { read: true },
      { new: true }
    ).exec()
    return doc ? toNotification(doc) : undefined
  },

  async markAllAsRead(userId: string): Promise<number> {
    const result = await NotificationModel.updateMany(
      { userId, read: false },
      { read: true }
    ).exec()
    return result.modifiedCount || 0
  },

  async getUnreadCount(userId: string): Promise<number> {
    return NotificationModel.countDocuments({ userId, read: false }).exec()
  },

  async delete(id: string): Promise<boolean> {
    const result = await NotificationModel.findByIdAndDelete(id).exec()
    return !!result
  },
}

