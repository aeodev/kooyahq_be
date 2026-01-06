import { OAuth2Client } from 'google-auth-library'
import { createHash, randomBytes } from 'node:crypto'
import { env } from '../../config/env'
import { createHttpError } from '../../utils/http-error'
import { createAccessToken } from '../../utils/token'
import { userService } from '../users/user.service'
import { refreshTokenRepository } from './refresh-token.repository'
import { buildAuthUser, DEFAULT_NEW_USER_PERMISSIONS, type AuthUser } from './rbac/permissions'

const googleClient = new OAuth2Client(env.googleOAuth.clientId, env.googleOAuth.clientSecret)
const REFRESH_TOKEN_BYTES = 48

type GoogleProfile = {
  email: string
  name: string
  picture?: string
}

function hashRefreshToken(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function buildRefreshTokenValue(): string {
  return randomBytes(REFRESH_TOKEN_BYTES).toString('hex')
}

function buildRefreshExpiry(): Date {
  const ttlMs = env.refreshToken.expiresInDays * 24 * 60 * 60 * 1000
  return new Date(Date.now() + ttlMs)
}

async function issueRefreshToken(userId: string) {
  const token = buildRefreshTokenValue()
  const tokenHash = hashRefreshToken(token)
  const expiresAt = buildRefreshExpiry()

  await refreshTokenRepository.create({
    userId,
    tokenHash,
    expiresAt,
  })

  return { token, expiresAt }
}

async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
  if (!idToken) {
    throw createHttpError(400, 'Google credential is required')
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: env.googleOAuth.clientId,
    })

    const payload = ticket.getPayload()

    if (!payload || !payload.email) {
      throw createHttpError(400, 'Google account email is required')
    }

    if (payload.email_verified === false) {
      throw createHttpError(401, 'Google email is not verified')
    }

    return {
      email: payload.email.toLowerCase(),
      name: payload.name || payload.given_name || payload.family_name || payload.email,
      picture: payload.picture,
    }
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      throw error
    }
    throw createHttpError(401, 'Invalid Google credential')
  }
}

export async function authenticateWithGoogle(idToken: string): Promise<{
  user: AuthUser
  accessToken: string
  refreshToken: string
  refreshExpiresAt: Date
}> {
  const profile = await verifyGoogleIdToken(idToken)
  const name = profile.name?.trim() || profile.email.split('@')[0]

  let user = await userService.findByEmail(profile.email)

  if (!user) {
    user = await userService.create({
      email: profile.email,
      name,
      permissions: DEFAULT_NEW_USER_PERMISSIONS,
    })
  } else {
    if (profile.name && profile.name.trim() && profile.name !== user.name) {
      user = (await userService.updateEmployee(user.id, { name: profile.name })) ?? user
    }
  }

  if (profile.picture && profile.picture !== user.profilePic) {
    user = (await userService.updateProfile(user.id, { profilePic: profile.picture })) ?? user
  }

  const authUser = buildAuthUser(user)
  const accessToken = createAccessToken(authUser)
  const { token: refreshToken, expiresAt: refreshExpiresAt } = await issueRefreshToken(authUser.id)

  return {
    user: authUser,
    accessToken,
    refreshToken,
    refreshExpiresAt,
  }
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  user: AuthUser
  accessToken: string
  refreshToken: string
  refreshExpiresAt: Date
}> {
  const tokenHash = hashRefreshToken(refreshToken)
  const stored = await refreshTokenRepository.findByTokenHash(tokenHash)

  if (!stored || stored.revokedAt) {
    throw createHttpError(401, 'Invalid refresh token')
  }

  if (stored.expiresAt.getTime() <= Date.now()) {
    await refreshTokenRepository.revokeById(stored.id)
    throw createHttpError(401, 'Refresh token expired')
  }

  const user = await userService.getPublicProfile(stored.userId)
  if (!user) {
    await refreshTokenRepository.revokeById(stored.id)
    throw createHttpError(401, 'User not found')
  }

  await refreshTokenRepository.revokeById(stored.id)

  const authUser = buildAuthUser(user)
  const accessToken = createAccessToken(authUser)
  const nextRefresh = await issueRefreshToken(authUser.id)

  return {
    user: authUser,
    accessToken,
    refreshToken: nextRefresh.token,
    refreshExpiresAt: nextRefresh.expiresAt,
  }
}

export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  const tokenHash = hashRefreshToken(refreshToken)
  await refreshTokenRepository.revokeByTokenHash(tokenHash)
}
