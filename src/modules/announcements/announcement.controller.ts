import type { Request, Response, NextFunction } from 'express'
import { createHttpError } from '../../utils/http-error'
import { announcementService } from './announcement.service'
import { notificationService } from '../notifications/notification.service'

export async function createAnnouncement(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id
  const { title, content, isActive, expiresAt } = req.body

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  if (!title || !title.trim()) {
    return next(createHttpError(400, 'Title is required'))
  }

  if (!content || !content.trim()) {
    return next(createHttpError(400, 'Content is required'))
  }

  let parsedExpiresAt: Date | null | undefined
  if (expiresAt !== undefined && expiresAt !== null && expiresAt !== '') {
    const parsed = new Date(expiresAt)
    if (Number.isNaN(parsed.getTime())) {
      return next(createHttpError(400, 'Invalid expiration date'))
    }
    if (parsed.getTime() <= Date.now()) {
      return next(createHttpError(400, 'Expiration date must be in the future'))
    }
    parsedExpiresAt = parsed
  } else if (expiresAt === null || expiresAt === '') {
    parsedExpiresAt = null
  }

  try {
    const announcement = await announcementService.create({
      title: title.trim(),
      content: content.trim(),
      authorId: userId,
      isActive: isActive !== false,
      expiresAt: parsedExpiresAt ?? null,
    })

    // Broadcast system notification if announcement is active
    if (announcement.isActive) {
      try {
        await notificationService.createSystemNotificationBroadcast(announcement.title)
      } catch (notifError) {
        console.error('Failed to create system notification broadcast:', notifError)
      }
    }

    res.status(201).json({
      status: 'success',
      data: announcement,
    })
  } catch (error) {
    next(error)
  }
}

export async function getAnnouncements(req: Request, res: Response, next: NextFunction) {
  try {
    const onlyActive = req.query.onlyActive !== 'false'
    const announcements = await announcementService.findAll(onlyActive)

    res.json({
      status: 'success',
      data: announcements,
    })
  } catch (error) {
    next(error)
  }
}

export async function getAnnouncement(req: Request, res: Response, next: NextFunction) {
  const id = req.params.id

  try {
    const announcement = await announcementService.findById(id)

    if (!announcement) {
      return next(createHttpError(404, 'Announcement not found'))
    }

    res.json({
      status: 'success',
      data: announcement,
    })
  } catch (error) {
    next(error)
  }
}

export async function updateAnnouncement(req: Request, res: Response, next: NextFunction) {
  const id = req.params.id
  const { title, content, isActive, expiresAt } = req.body

  try {
    const updates: any = {}
    if (title !== undefined) updates.title = title.trim()
    if (content !== undefined) updates.content = content.trim()
    if (isActive !== undefined) updates.isActive = isActive
    if (expiresAt !== undefined) {
      if (expiresAt === null || expiresAt === '') {
        updates.expiresAt = null
      } else {
        const parsed = new Date(expiresAt)
        if (Number.isNaN(parsed.getTime())) {
          return next(createHttpError(400, 'Invalid expiration date'))
        }
        if (parsed.getTime() <= Date.now()) {
          return next(createHttpError(400, 'Expiration date must be in the future'))
        }
        updates.expiresAt = parsed
      }
    }

    const announcement = await announcementService.update(id, updates)

    if (!announcement) {
      return next(createHttpError(404, 'Announcement not found'))
    }

    res.json({
      status: 'success',
      data: announcement,
    })
  } catch (error) {
    next(error)
  }
}

export async function deleteAnnouncement(req: Request, res: Response, next: NextFunction) {
  const id = req.params.id

  try {
    const deleted = await announcementService.delete(id)

    if (!deleted) {
      return next(createHttpError(404, 'Announcement not found'))
    }

    res.json({
      status: 'success',
      message: 'Announcement deleted',
    })
  } catch (error) {
    next(error)
  }
}
