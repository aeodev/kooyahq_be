import type { NextFunction, Request, Response } from 'express'
import { userService } from './user.service'
import { createHttpError } from '../../utils/http-error'

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

    if (profilePicFile && (profilePicFile as any).cloudinaryUrl) {
      updates.profilePic = (profilePicFile as any).cloudinaryUrl
    }

    if (bannerFile && (bannerFile as any).cloudinaryUrl) {
      updates.banner = (bannerFile as any).cloudinaryUrl
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
