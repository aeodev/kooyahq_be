import type { NextFunction, Request, Response } from 'express'
import { userService } from './user.service'
import { createHttpError } from '../../utils/http-error'
import { adminActivityService } from '../admin-activity/admin-activity.service'
import { authRepository } from '../auth/auth.repository'
import { hashPassword } from '../../utils/password'
import { buildAuthUser, DEFAULT_NEW_USER_PERMISSIONS, PERMISSIONS } from '../auth/rbac/permissions'

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
    const { page, limit, search } = req.query

    // If pagination/search params provided, use searchUsers
    if (page || limit || search) {
      const result = await userService.searchUsers({
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        search: search as string | undefined,
      })

      res.json({
        status: 'success',
        data: result.data,
        pagination: result.pagination,
      })
    } else {
      // Otherwise, return all users (backward compatibility)
      const users = await userService.findAll()
      res.json({
        status: 'success',
        data: users,
      })
    }
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
    const userProfile = await userService.getPublicProfile(userId)
    if (!userProfile) {
      return next(createHttpError(404, 'User not found'))
    }
    const user = buildAuthUser(userProfile)
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
    const updates: { profilePic?: string; banner?: string; bio?: string; status?: string } = {}
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined
    const { bio, status } = req.body

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

    if (status !== undefined) {
      if (['online', 'busy', 'away', 'offline'].includes(status)) {
        updates.status = status
      }
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

export async function createUser(req: Request, res: Response, next: NextFunction) {
  const { name, email, password, position, birthday, status, permissions, bio } = req.body
  const validStatuses = ['online', 'busy', 'away', 'offline']
  const validPermissions = new Set(Object.values(PERMISSIONS))

  try {
    if (!name || !name.trim()) {
      return next(createHttpError(400, 'Name is required'))
    }
    if (!email || !email.trim()) {
      return next(createHttpError(400, 'Email is required'))
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      return next(createHttpError(400, 'Invalid email format'))
    }
    if (!password || password.length < 8) {
      return next(createHttpError(400, 'Password must be at least 8 characters long'))
    }

    const birthdayStr = typeof birthday === 'string' ? birthday.trim() : ''
    if (birthdayStr) {
      const birthdayDate = new Date(birthdayStr)
      const today = new Date()
      if (birthdayDate > today) {
        return next(createHttpError(400, 'Birthday cannot be in the future'))
      }
    }

    const sanitizedPermissions = Array.isArray(permissions)
      ? (permissions.filter((p: unknown) => typeof p === 'string' && validPermissions.has(p as any)) as string[])
      : DEFAULT_NEW_USER_PERMISSIONS

    if (status && !validStatuses.includes(status)) {
      return next(createHttpError(400, 'Invalid status value'))
    }

    const existingAuth = await authRepository.findByEmail(email.trim().toLowerCase())
    if (existingAuth) {
      return next(createHttpError(409, 'Email already in use'))
    }

    const user = await userService.create({
      email: email.trim(),
      name: name.trim(),
      position: typeof position === 'string' ? position.trim() : undefined,
      birthday: birthdayStr || undefined,
      status: status || 'online',
      permissions: sanitizedPermissions,
      bio: typeof bio === 'string' ? bio.trim() : undefined,
    })

    const passwordHash = await hashPassword(password)
    await authRepository.create({
      email: email.trim().toLowerCase(),
      passwordHash,
      userId: user.id,
    })

    if (req.user?.id) {
      try {
        await adminActivityService.logActivity({
          adminId: req.user.id,
          action: 'create_user',
          targetType: 'user',
          targetId: user.id,
          changes: { name: user.name, email: user.email },
        })
      } catch (logError) {
        console.error('Failed to log admin activity:', logError)
      }
    }

    res.status(201).json({
      status: 'success',
      data: user,
      message: 'User created successfully',
    })
  } catch (error) {
    next(error)
  }
}

export async function updateEmployee(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params
  const { name, email, position, birthday, status, permissions, bio } = req.body

  const validStatuses = ['online', 'busy', 'away', 'offline']
  const validPermissions = new Set(Object.values(PERMISSIONS))

  try {
    const updates: {
      name?: string
      email?: string
      position?: string
      birthday?: string
      status?: string
      permissions?: string[]
      bio?: string
    } = {}

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
      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email.trim())) {
        return next(createHttpError(400, 'Invalid email format'))
      }
      updates.email = email.trim()
    }

    if (position !== undefined) {
      updates.position = position.trim() || undefined
    }

    if (birthday !== undefined) {
      if (birthday && birthday.trim()) {
        const birthdayDate = new Date(birthday)
        const today = new Date()
        if (birthdayDate > today) {
          return next(createHttpError(400, 'Birthday cannot be in the future'))
        }
      }
      updates.birthday = birthday?.trim() || undefined
    }

    if (status !== undefined) {
      if (!validStatuses.includes(status)) {
        return next(createHttpError(400, 'Invalid status value'))
      }
      updates.status = status
    }

    if (bio !== undefined) {
      updates.bio = typeof bio === 'string' ? bio.trim() : ''
    }

    if (permissions !== undefined) {
      if (!Array.isArray(permissions)) {
        return next(createHttpError(400, 'Permissions must be an array'))
      }
      const sanitized = permissions.filter((p: unknown) => typeof p === 'string' && validPermissions.has(p as any))
      updates.permissions = Array.from(new Set(sanitized))
    }

    if (Object.keys(updates).length === 0) {
      return next(createHttpError(400, 'No updates provided'))
    }

    const updated = await userService.updateEmployee(id, updates)
    if (!updated) {
      return next(createHttpError(404, 'User not found'))
    }

    // Log admin activity
    if (req.user?.id) {
      try {
        await adminActivityService.logActivity({
          adminId: req.user.id,
          action: 'update_user',
          targetType: 'user',
          targetId: id,
          changes: updates,
        })
      } catch (logError) {
        // Don't fail the request if logging fails
        console.error('Failed to log admin activity:', logError)
      }
    }

    res.json({
      status: 'success',
      data: updated,
    })
  } catch (error) {
    next(error)
  }
}

export async function deleteEmployee(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params
  const { hardDelete } = req.query

  try {
    const deleted = await userService.deleteUser(id, hardDelete !== 'true')
    if (!deleted) {
      return next(createHttpError(404, 'User not found'))
    }

    // Log admin activity
    if (req.user?.id) {
      try {
        await adminActivityService.logActivity({
          adminId: req.user.id,
          action: 'delete_user',
          targetType: 'user',
          targetId: id,
          changes: { hardDelete: hardDelete === 'true' },
        })
      } catch (logError) {
        // Don't fail the request if logging fails
        console.error('Failed to log admin activity:', logError)
      }
    }

    res.json({
      status: 'success',
      message: 'User deleted successfully',
    })
  } catch (error) {
    next(error)
  }
}

export async function createClient(req: Request, res: Response, next: NextFunction) {
  const { name, email, password } = req.body
  const permissions = Array.isArray(req.body.permissions)
    ? (req.body.permissions.filter((p: unknown) => typeof p === 'string') as string[])
    : []

  try {
    // Validate required fields
    if (!name || !name.trim()) {
      return next(createHttpError(400, 'Name is required'))
    }

    if (!email || !email.trim()) {
      return next(createHttpError(400, 'Email is required'))
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      return next(createHttpError(400, 'Invalid email format'))
    }

    if (!password || password.length < 8) {
      return next(createHttpError(400, 'Password must be at least 8 characters long'))
    }

    // Check if email already exists
    const existingAuth = await authRepository.findByEmail(email.trim().toLowerCase())
    if (existingAuth) {
      return next(createHttpError(409, 'Email already in use'))
    }

    // Create client user
    const user = await userService.create({
      email: email.trim(),
      name: name.trim(),
      permissions,
    })

    // Create auth credentials
    const passwordHash = await hashPassword(password)
    await authRepository.create({
      email: email.trim().toLowerCase(),
      passwordHash,
      userId: user.id,
    })

    // Log admin activity
    if (req.user?.id) {
      try {
        await adminActivityService.logActivity({
          adminId: req.user.id,
          action: 'create_client',
          targetType: 'user',
          targetId: user.id,
          changes: { name: user.name, email: user.email },
        })
      } catch (logError) {
        console.error('Failed to log admin activity:', logError)
      }
    }

    res.status(201).json({
      status: 'success',
      data: user,
      message: 'Client created successfully',
    })
  } catch (error) {
    next(error)
  }
}
