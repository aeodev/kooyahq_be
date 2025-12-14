import { OAuth2Client } from 'google-auth-library'
import { env } from '../../config/env'
import { createHttpError } from '../../utils/http-error'
import { hashPassword, verifyPassword } from '../../utils/password'
import { createAccessToken } from '../../utils/token'
import { userService } from '../users/user.service'
import { authRepository } from './auth.repository'
import { buildAuthUser, PERMISSIONS, type AuthUser, type Permission } from './rbac/permissions'

const MIN_PASSWORD_LENGTH = 8
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const googleClient = new OAuth2Client(env.googleOAuth.clientId, env.googleOAuth.clientSecret)
const DEFAULT_GOOGLE_PERMISSIONS: Permission[] = [PERMISSIONS.SYSTEM_FULL_ACCESS]

type RegisterInput = {
  email: string
  password: string
  name: string
  permissions?: Permission[]
}

type LoginInput = {
  email: string
  password: string
}

type GoogleProfile = {
  email: string
  name: string
  picture?: string
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function validateEmail(email: string) {
  if (!EMAIL_REGEX.test(email)) {
    throw createHttpError(400, 'A valid email is required')
  }
}

function validatePassword(password: string) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw createHttpError(
      400,
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
    )
  }
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

export async function registerUser(input: RegisterInput): Promise<{ user: AuthUser; token: string }> {
  const email = normalizeEmail(input.email)
  const name = input.name.trim()
  const password = input.password

  validateEmail(email)
  validatePassword(password)

  if (!name) {
    throw createHttpError(400, 'Name is required')
  }

  // Check if email already exists in Auth collection
  const existingAuth = await authRepository.findByEmail(email)
  if (existingAuth) {
    throw createHttpError(409, 'Email already in use')
  }

  const passwordHash = await hashPassword(password)

  // Create User profile first
  const user = await userService.create({
    email,
    name,
    permissions: Array.isArray(input.permissions) ? input.permissions : [],
  })

  // Create Auth credentials with reference to User
  await authRepository.create({
    email,
    passwordHash,
    userId: user.id,
  })

  const authUser = buildAuthUser(user)
  const token = createAccessToken(authUser)

  return {
    user: authUser,
    token,
  }
}

export async function authenticateUser(input: LoginInput): Promise<{ user: AuthUser; token: string }> {
  const email = normalizeEmail(input.email)
  const password = input.password

  validateEmail(email)

  if (!password) {
    throw createHttpError(400, 'Email and password are required')
  }

  // Find auth credentials by email
  const auth = await authRepository.findByEmail(email)

  if (!auth) {
    throw createHttpError(401, 'Invalid credentials')
  }

  // Verify password
  const isValid = await verifyPassword(password, auth.passwordHash)

  if (!isValid) {
    throw createHttpError(401, 'Invalid credentials')
  }

  // Get user profile using userId from auth
  const user = await userService.getPublicProfile(auth.userId)

  if (!user) {
    throw createHttpError(401, 'User not found')
  }

  const authUser = buildAuthUser(user)
  const token = createAccessToken(authUser)

  return {
    user: authUser,
    token,
  }
}

export async function authenticateWithGoogle(idToken: string): Promise<{ user: AuthUser; token: string }> {
  const profile = await verifyGoogleIdToken(idToken)
  const name = profile.name?.trim() || profile.email.split('@')[0]

  let user = await userService.findByEmail(profile.email)

  if (!user) {
    user = await userService.create({
      email: profile.email,
      name,
      permissions: DEFAULT_GOOGLE_PERMISSIONS,
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
  const token = createAccessToken(authUser)

  return {
    user: authUser,
    token,
  }
}
