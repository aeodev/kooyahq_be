import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { requirePermission } from '../../middleware/require-permission'
import { PERMISSIONS } from '../auth/rbac/permissions'
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, getUnreadCount } from './notification.controller'

export const notificationRouter = Router()

notificationRouter.use(authenticate)
notificationRouter.get(
  '/',
  requirePermission(PERMISSIONS.NOTIFICATION_READ, PERMISSIONS.NOTIFICATION_FULL_ACCESS),
  getNotifications
)
notificationRouter.get(
  '/unread-count',
  requirePermission(PERMISSIONS.NOTIFICATION_COUNT, PERMISSIONS.NOTIFICATION_FULL_ACCESS),
  getUnreadCount
)
notificationRouter.put(
  '/:id/read',
  requirePermission(PERMISSIONS.NOTIFICATION_UPDATE, PERMISSIONS.NOTIFICATION_FULL_ACCESS),
  markNotificationAsRead
)
notificationRouter.put(
  '/read-all',
  requirePermission(PERMISSIONS.NOTIFICATION_UPDATE, PERMISSIONS.NOTIFICATION_FULL_ACCESS),
  markAllNotificationsAsRead
)






