import type { NextFunction, Request, Response } from 'express'
import { authenticateUser, authenticateWithGoogle, registerUser } from './auth.service'

type AuthRequestBody = {
  email?: unknown
  password?: unknown
  name?: unknown
  permissions?: unknown
  credential?: unknown
}

function parseString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function parsePermissions(value: unknown): import('./rbac/permissions').Permission[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean) as import('./rbac/permissions').Permission[]
  }
  return []
}

export async function register(req: Request, res: Response, next: NextFunction) {
  const body = req.body as AuthRequestBody
  const email = parseString(body.email)
  const password = parseString(body.password)
  const name = parseString(body.name)
  const permissions = parsePermissions(body.permissions)

  try {
    const { user, token } = await registerUser({
      email,
      name,
      password,
      permissions,
    })

    res.status(201).json({
      status: 'success',
      data: {
        user,
        token,
      },
    })
  } catch (error) {
    next(error)
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  const body = req.body as AuthRequestBody
  const email = parseString(body.email)
  const password = parseString(body.password)

  try {
    const { user, token } = await authenticateUser({
      email,
      password,
    })

    res.json({
      status: 'success',
      data: {
        user,
        token,
      },
    })
  } catch (error) {
    next(error)
  }
}

export async function loginWithGoogle(req: Request, res: Response, next: NextFunction) {
  const body = req.body as AuthRequestBody
  const credential = parseString(body.credential)

  try {
    const { user, token } = await authenticateWithGoogle(credential)

    res.json({
      status: 'success',
      data: {
        user,
        token,
      },
    })
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
