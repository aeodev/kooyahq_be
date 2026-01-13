import type { NextFunction, Request, Response } from 'express'
import { userService } from './user.service'
import { createHttpError } from '../../utils/http-error'
import { adminActivityService } from '../admin-activity/admin-activity.service'
import { authRepository } from '../auth/auth.repository'
import { buildAuthUser, DEFAULT_NEW_USER_PERMISSIONS, PERMISSIONS, hasPermission, type Permission } from '../auth/rbac/permissions'

function canViewSalary(user?: { permissions?: Permission[] }) {
  return !!user && hasPermission(user, PERMISSIONS.USERS_MANAGE)
}

export async function getUserById(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params

  try {
    const includeSalary = canViewSalary(req.user)
    const user = await userService.getPublicProfile(id, { includeSalary })

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
    const includeSalary = canViewSalary(req.user)

    // If pagination/search params provided, use searchUsers
    if (page || limit || search) {
      const result = await userService.searchUsers({
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        search: search as string | undefined,
      }, { includeSalary })

      res.json({
        status: 'success',
        data: result.data,
        pagination: result.pagination,
      })
    } else {
      // Otherwise, return all users (backward compatibility)
      const users = await userService.findAll({ includeSalary })
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
    const includeSalary = canViewSalary(req.user)
    const userProfile = await userService.getPublicProfile(userId, { includeSalary })
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

    if (profilePicFile && (profilePicFile as any).storagePath) {
      updates.profilePic = (profilePicFile as any).storagePath
    }

    if (bannerFile && (bannerFile as any).storagePath) {
      updates.banner = (bannerFile as any).storagePath
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

    const includeSalary = canViewSalary(req.user)
    const updated = await userService.updateProfile(userId, updates, { includeSalary })
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
  const { name, email, position, birthday, status, permissions, bio } = req.body
  const validStatuses = ['online', 'busy', 'away', 'offline']
  const validPermissions = new Set(Object.values(PERMISSIONS))

  try {
    const nameValue = typeof name === 'string' ? name.trim() : ''
    if (!nameValue) {
      return next(createHttpError(400, 'Name is required'))
    }
    const emailValue = typeof email === 'string' ? email.trim() : ''
    if (!emailValue) {
      return next(createHttpError(400, 'Email is required'))
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailValue)) {
      return next(createHttpError(400, 'Invalid email format'))
    }
    const normalizedEmail = emailValue.toLowerCase()

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

    const existingUser = await userService.findByEmail(normalizedEmail)
    if (existingUser) {
      return next(createHttpError(409, 'Email already in use'))
    }

    const existingAuth = await authRepository.findByEmail(normalizedEmail)
    if (existingAuth) {
      return next(createHttpError(409, 'Email already in use'))
    }

    const includeSalary = canViewSalary(req.user)
    const user = await userService.create({
      email: normalizedEmail,
      name: nameValue,
      position: typeof position === 'string' ? position.trim() : undefined,
      birthday: birthdayStr || undefined,
      status: status || 'online',
      permissions: sanitizedPermissions,
      bio: typeof bio === 'string' ? bio.trim() : undefined,
    }, { includeSalary })

    if (req.user?.id) {
      try {
        await adminActivityService.logActivity({
          adminId: req.user.id,
          action: 'create_user',
          targetType: 'user',
          targetId: user.id,
          targetLabel: user.name,
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
  const { name, email, position, birthday, status, permissions, bio, monthlySalary } = req.body

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
      monthlySalary?: number
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

    if (monthlySalary !== undefined) {
      const salary = typeof monthlySalary === 'string' ? parseFloat(monthlySalary) : monthlySalary
      if (isNaN(salary) || salary < 0) {
        return next(createHttpError(400, 'Monthly salary must be a valid positive number'))
      }
      updates.monthlySalary = salary
    }

    if (Object.keys(updates).length === 0) {
      return next(createHttpError(400, 'No updates provided'))
    }

    const existingUser = await userService.findById(id)
    if (!existingUser) {
      return next(createHttpError(404, 'User not found'))
    }

    const includeSalary = canViewSalary(req.user)
    const updated = await userService.updateEmployee(id, updates, { includeSalary })
    if (!updated) {
      return next(createHttpError(404, 'User not found'))
    }

    // Log admin activity
    if (req.user?.id) {
      try {
        const changes: Record<string, unknown> = {}
        const normalizeValue = (value: unknown) =>
          Array.isArray(value) ? [...value].map(String).sort() : value

        Object.entries(updates).forEach(([key, value]) => {
          const beforeValue = (existingUser as Record<string, unknown>)[key]
          const afterValue = (updated as Record<string, unknown>)[key] ?? value
          const beforeNormalized = normalizeValue(beforeValue)
          const afterNormalized = normalizeValue(afterValue)
          if (JSON.stringify(beforeNormalized) !== JSON.stringify(afterNormalized)) {
            changes[key] = { from: beforeValue ?? null, to: afterValue ?? null }
          }
        })

        await adminActivityService.logActivity({
          adminId: req.user.id,
          action: 'update_user',
          targetType: 'user',
          targetId: id,
          targetLabel: updated.name,
          changes: Object.keys(changes).length ? changes : undefined,
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
    const existingUser = await userService.findById(id)
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
          targetLabel: existingUser?.name,
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
  const { name, email } = req.body
  const permissions = Array.isArray(req.body.permissions)
    ? (req.body.permissions.filter((p: unknown) => typeof p === 'string') as string[])
    : []

  try {
    // Validate required fields
    const nameValue = typeof name === 'string' ? name.trim() : ''
    if (!nameValue) {
      return next(createHttpError(400, 'Name is required'))
    }

    const emailValue = typeof email === 'string' ? email.trim() : ''
    if (!emailValue) {
      return next(createHttpError(400, 'Email is required'))
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailValue)) {
      return next(createHttpError(400, 'Invalid email format'))
    }

    // Check if email already exists
    const normalizedEmail = emailValue.toLowerCase()
    const existingUser = await userService.findByEmail(normalizedEmail)
    if (existingUser) {
      return next(createHttpError(409, 'Email already in use'))
    }

    const existingAuth = await authRepository.findByEmail(normalizedEmail)
    if (existingAuth) {
      return next(createHttpError(409, 'Email already in use'))
    }

    // Create client user
    const includeSalary = canViewSalary(req.user)
    const user = await userService.create({
      email: normalizedEmail,
      name: nameValue,
      permissions,
    }, { includeSalary })

    // Log admin activity
    if (req.user?.id) {
      try {
        await adminActivityService.logActivity({
          adminId: req.user.id,
          action: 'create_client',
          targetType: 'user',
          targetId: user.id,
          targetLabel: user.name,
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
