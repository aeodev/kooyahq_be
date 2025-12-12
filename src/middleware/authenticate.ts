import type { NextFunction, Request, Response } from 'express'
import { userService } from '../modules/users/user.service'
import { createHttpError } from '../utils/http-error'
import { verifyAccessToken } from '../utils/token'
import { buildAuthUser } from '../modules/auth/rbac/permissions'

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(createHttpError(401, 'Authorization token missing'))
  }

  const token = authHeader.slice('Bearer '.length).trim()

  try {
    const payload = verifyAccessToken(token)
    const user = await userService.getPublicProfile(payload.sub)

    if (!user) {
      return next(createHttpError(401, 'User not found'))
    }

    const authUser = buildAuthUser(user)

    req.user = authUser
    req.auth = {
      user: authUser,
      permissions: authUser.permissions,
    }
    return next()
  } catch (error) {
    return next(createHttpError(401, 'Invalid or expired token'))
  }
}
