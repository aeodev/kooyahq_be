import jwt, { type JwtPayload, type Secret, type SignOptions } from 'jsonwebtoken'
import { env } from '../config/env'

export type AccessTokenPayload = {
  sub: string
  email: string
  name: string
  permissions: string[]
  iat: number
  exp: number
}

type SignableUser = {
  id: string
  email: string
  name: string
  permissions: string[]
}

export function createAccessToken(user: SignableUser) {
  const options: SignOptions = {
    expiresIn: env.jwt.expiresIn,
  }

  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name, permissions: user.permissions },
    env.jwt.secret as Secret,
    options,
  )
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, env.jwt.secret as Secret)

  if (typeof payload === 'string') {
    throw new Error('Invalid token payload')
  }

  const { sub, email, name, permissions, iat, exp } = payload as JwtPayload & {
    sub: string
    email: string
    name: string
    permissions?: string[]
  }

  if (!sub || !email) {
    throw new Error('Invalid token payload')
  }

  return {
    sub,
    email,
    name: name ?? '',
    permissions: permissions ?? [],
    iat: iat ?? 0,
    exp: exp ?? 0,
  }
}
