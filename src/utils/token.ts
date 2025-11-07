import jwt, { type JwtPayload, type Secret, type SignOptions } from 'jsonwebtoken'
import { env } from '../config/env'

export type AccessTokenPayload = {
  sub: string
  email: string
  name: string
  iat: number
  exp: number
}

type SignableUser = {
  id: string
  email: string
  name: string
}

export function createAccessToken(user: SignableUser) {
  const options: SignOptions = {
    expiresIn: env.jwtExpiresIn,
  }

  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name },
    env.jwtSecret as Secret,
    options,
  )
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, env.jwtSecret as Secret)

  if (typeof payload === 'string') {
    throw new Error('Invalid token payload')
  }

  const { sub, email, name, iat, exp } = payload as JwtPayload & {
    sub: string
    email: string
    name: string
  }

  if (!sub || !email) {
    throw new Error('Invalid token payload')
  }

  return {
    sub,
    email,
    name: name ?? '',
    iat: iat ?? 0,
    exp: exp ?? 0,
  }
}
