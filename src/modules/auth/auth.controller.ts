import type { NextFunction, Request, Response } from 'express'
import { authenticateWithGoogle, refreshAccessToken, revokeRefreshToken } from './auth.service'
import { createHttpError } from '../../utils/http-error'
import { env } from '../../config/env'

type AuthRequestBody = {
  credential?: unknown
}

const REFRESH_COOKIE_NAME = 'kooyahq_refresh'
const REFRESH_COOKIE_PATH = '/api/auth'

function parseString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function setRefreshCookie(res: Response, token: string, expiresAt: Date) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: 'lax',
    path: REFRESH_COOKIE_PATH,
    expires: expiresAt,
  })
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: 'lax',
    path: REFRESH_COOKIE_PATH,
  })
}

export async function loginWithGoogle(req: Request, res: Response, next: NextFunction) {
  const body = req.body as AuthRequestBody
  const credential = parseString(body.credential)

  try {
    const { user, accessToken, refreshToken, refreshExpiresAt } = await authenticateWithGoogle(credential)

    setRefreshCookie(res, refreshToken, refreshExpiresAt)

    res.json({
      status: 'success',
      data: {
        user,
        token: accessToken,
      },
    })
  } catch (error) {
    next(error)
  }
}

export async function refreshSession(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[REFRESH_COOKIE_NAME]
    if (!token) {
      return next(createHttpError(401, 'Refresh token missing'))
    }

    const { user, accessToken, refreshToken, refreshExpiresAt } = await refreshAccessToken(token)

    setRefreshCookie(res, refreshToken, refreshExpiresAt)

    res.json({
      status: 'success',
      data: {
        user,
        token: accessToken,
      },
    })
  } catch (error) {
    next(error)
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[REFRESH_COOKIE_NAME]
    if (token) {
      await revokeRefreshToken(token)
    }
    clearRefreshCookie(res)
    res.json({ status: 'success' })
  } catch (error) {
    next(error)
  }
}

export function currentUser(req: Request, res: Response) {
  res.json({
    status: 'success',
    data: {
      user: req.user ?? null,
    },
  })
}
