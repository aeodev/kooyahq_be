import type { NextFunction, Request, Response } from 'express'
import { userService } from './user.service'
import { createHttpError } from '../../utils/http-error'
import { resolve } from 'path'
import { existsSync, statSync } from 'fs'
import { env } from '../../config/env'

function getBaseUrl(req: Request): string {
  const protocol = req.protocol
  const host = req.get('host')
  return `${protocol}://${host}/api`
}

export function serveProfileFile(req: Request, res: Response, next: NextFunction) {
  const { filename } = req.params
  const filePath = resolve(env.uploadDir, filename)

  if (!existsSync(filePath)) {
    return res.status(404).json({ status: 'error', message: 'File not found' })
  }

  try {
    const stats = statSync(filePath)
    
    // Get mimetype from filename
    const ext = filename.split('.').pop()?.toLowerCase()
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    }
    
    const contentType = mimeTypes[ext || ''] || 'application/octet-stream'
    
    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Length', stats.size)
    res.sendFile(filePath)
  } catch (error) {
    return next(createHttpError(500, 'Error serving file'))
  }
}

export async function getUserById(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params

  try {
    const user = await userService.getPublicProfile(id)

    if (!user) {
      return next(createHttpError(404, 'User not found'))
    }

    res.json({
      status: 'success',
      data: user,
    })
  } catch (error) {
    next(error)
  }
}

export async function getAllUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const users = await userService.findAll()
    res.json({
      status: 'success',
      data: users,
    })
  } catch (error) {
    next(error)
  }
}

export async function getProfile(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const user = await userService.getPublicProfile(userId)
    if (!user) {
      return next(createHttpError(404, 'User not found'))
    }
    res.json({
      status: 'success',
      data: user,
    })
  } catch (error) {
    next(error)
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const updates: { profilePic?: string; banner?: string; bio?: string } = {}
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined
    const { bio } = req.body
    
    const profilePicFiles = files?.['profilePic']
    const bannerFiles = files?.['banner']
    
    const profilePicFile = profilePicFiles && profilePicFiles.length > 0 ? profilePicFiles[0] : undefined
    const bannerFile = bannerFiles && bannerFiles.length > 0 ? bannerFiles[0] : undefined

    if (profilePicFile && profilePicFile.filename) {
      const baseUrl = getBaseUrl(req)
      updates.profilePic = `${baseUrl}/users/files/${profilePicFile.filename}`
    }

    if (bannerFile && bannerFile.filename) {
      const baseUrl = getBaseUrl(req)
      updates.banner = `${baseUrl}/users/files/${bannerFile.filename}`
    }

    if (bio !== undefined) {
      updates.bio = bio?.trim() || undefined
    }

    // Only update if there are actual changes
    if (Object.keys(updates).length === 0) {
      return next(createHttpError(400, 'No updates provided'))
    }

    const updated = await userService.updateProfile(userId, updates)
    if (!updated) {
      return next(createHttpError(404, 'User not found'))
    }

    res.json({
      status: 'success',
      data: updated,
    })
  } catch (error) {
    next(error)
  }
}

export async function updateEmployee(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params
  const { name, email, position, birthday, isAdmin } = req.body

  try {
    const updates: { name?: string; email?: string; position?: string; birthday?: string; isAdmin?: boolean } = {}

    if (name !== undefined) {
      if (!name.trim()) {
        return next(createHttpError(400, 'Name cannot be empty'))
      }
      updates.name = name.trim()
    }

    if (email !== undefined) {
      if (!email.trim()) {
        return next(createHttpError(400, 'Email cannot be empty'))
      }
      updates.email = email.trim()
    }

    if (position !== undefined) {
      updates.position = position.trim() || undefined
    }

    if (birthday !== undefined) {
      updates.birthday = birthday?.trim() || undefined
    }

    if (isAdmin !== undefined) {
      updates.isAdmin = Boolean(isAdmin)
    }

    if (Object.keys(updates).length === 0) {
      return next(createHttpError(400, 'No updates provided'))
    }

    const updated = await userService.updateEmployee(id, updates)
    if (!updated) {
      return next(createHttpError(404, 'User not found'))
    }

    res.json({
      status: 'success',
      data: updated,
    })
  } catch (error) {
    next(error)
  }
}
