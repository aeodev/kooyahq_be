import type { NextFunction, Request, Response } from 'express'
import { authenticateUser, registerUser } from './auth.service'

type AuthRequestBody = {
  email?: unknown
  password?: unknown
  name?: unknown
}

function parseString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export async function register(req: Request, res: Response, next: NextFunction) {
  const body = req.body as AuthRequestBody
  const email = parseString(body.email)
  const password = parseString(body.password)
  const name = parseString(body.name)

  try {
    const { user, token } = await registerUser({
      email,
      name,
      password,
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

export function currentUser(req: Request, res: Response) {
  res.json({
    status: 'success',
    data: {
      user: req.user ?? null,
    },
  })
}
