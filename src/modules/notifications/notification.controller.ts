import type { NextFunction, Request, Response } from 'express'
import { notificationService } from './notification.service'
import { createHttpError } from '../../utils/http-error'
import { SocketEmitter } from '../../utils/socket-emitter'

const DEFAULT_PAGE_LIMIT = 20
const MAX_PAGE_LIMIT = 100

const parsePositiveInt = (value: unknown) => {
  if (value === undefined || value === null) return undefined
  const parsed = Number.parseInt(String(value), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

export async function getNotifications(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id
  const unreadOnly = req.query.unreadOnly === 'true'
  const pageParam = parsePositiveInt(req.query.page)
  const limitParam = parsePositiveInt(req.query.limit)
  const page = pageParam ?? 1
  const limit = Math.min(limitParam ?? DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT)

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const { notifications, total } = await notificationService.findByUserId(userId, {
      unreadOnly,
      page,
      limit,
    })
    const unreadCount = await notificationService.getUnreadCount(userId)
    
    res.json({
      status: 'success',
      data: {
        notifications,
        unreadCount,
        page,
        limit,
        total,
        hasMore: page * limit < total,
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
    
    const unreadCount = await notificationService.getUnreadCount(userId)
    SocketEmitter.emitToUser(userId, 'notification:read', {
      notificationId: id,
      unreadCount,
    })
    
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
    const unreadCount = await notificationService.getUnreadCount(userId)
    
    SocketEmitter.emitToUser(userId, 'notification:all-read', {
      unreadCount,
    })
    
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





