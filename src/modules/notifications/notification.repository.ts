import { NotificationModel, toNotification, type Notification, type NotificationType } from './notification.model'

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
}

export const notificationRepository = {
  async create(input: CreateNotificationInput): Promise<Notification> {
    const doc = await NotificationModel.create(input)
    return toNotification(doc)
  },

  async findByUserId(userId: string, unreadOnly?: boolean): Promise<Notification[]> {
    const filter: any = { userId }
    if (unreadOnly) {
      filter.read = false
    }
    const docs = await NotificationModel.find(filter).sort({ createdAt: -1 }).limit(100).exec()
    return docs.map(toNotification)
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



