import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, getUnreadCount } from './notification.controller'

export const notificationRouter = Router()

notificationRouter.use(authenticate)
notificationRouter.get('/', getNotifications)
notificationRouter.get('/unread-count', getUnreadCount)
notificationRouter.put('/:id/read', markNotificationAsRead)
notificationRouter.put('/read-all', markAllNotificationsAsRead)







