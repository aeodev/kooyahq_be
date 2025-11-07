import type { NextFunction, Request, Response } from 'express'
import { notificationService } from './notification.service'
import { createHttpError } from '../../utils/http-error'

export async function getNotifications(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id
  const { unreadOnly } = req.query

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const notifications = await notificationService.findByUserId(userId, unreadOnly === 'true')
    const unreadCount = await notificationService.getUnreadCount(userId)
    
    res.json({
      status: 'success',
      data: {
        notifications,
        unreadCount,
      },
    })
  } catch (error) {
    next(error)
  }
}

export async function markNotificationAsRead(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id
  const { id } = req.params

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const notification = await notificationService.markAsRead(id, userId)
    if (!notification) {
      return next(createHttpError(404, 'Notification not found'))
    }
    res.json({
      status: 'success',
      data: notification,
    })
  } catch (error) {
    next(error)
  }
}

export async function markAllNotificationsAsRead(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const count = await notificationService.markAllAsRead(userId)
    res.json({
      status: 'success',
      data: { count },
    })
  } catch (error) {
    next(error)
  }
}

export async function getUnreadCount(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const count = await notificationService.getUnreadCount(userId)
    res.json({
      status: 'success',
      data: { count },
    })
  } catch (error) {
    next(error)
  }
}







