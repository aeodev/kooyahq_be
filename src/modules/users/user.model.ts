import { Schema, model, models, type Document } from 'mongoose'
import { resolveMediaUrl } from '../../utils/media-url'
import type { ThemeColors } from '../settings/settings.model'

export interface UserPreferences {
  themeColors?: {
    light?: ThemeColors | null
    dark?: ThemeColors | null
  }
  fontSize?: 'small' | 'medium' | 'large'
  sidebarCollapsed?: boolean
  heyKooyaEnabled?: boolean
}

export interface UserDocument extends Document {
  email: string
  name: string
  permissions: string[]
  position?: string
  birthday?: Date
  profilePic?: string
  banner?: string
  bio?: string
  status?: 'online' | 'busy' | 'away' | 'offline'
  monthlySalary?: number
  preferences?: UserPreferences
  deletedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const userSchema = new Schema<UserDocument>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    permissions: {
      type: [String],
      default: [],
    },
    profilePic: {
      type: String,
      default: '',
    },
    banner: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['online', 'busy', 'away', 'offline'],
      default: 'online',
    },
    position: {
      type: String,
      trim: true,
    },

    birthday: {
      type: Date,
    },
    monthlySalary: {
      type: Number,
      default: 0,
      min: 0,
    },
    preferences: {
      type: {
        themeColors: {
          light: {
            primary: String,
            secondary: String,
            accent: String,
            destructive: String,
            muted: String,
            background: String,
            foreground: String,
            border: String,
          },
          dark: {
            primary: String,
            secondary: String,
            accent: String,
            destructive: String,
            muted: String,
            background: String,
            foreground: String,
            border: String,
          },
        },
        fontSize: {
          type: String,
          enum: ['small', 'medium', 'large'],
        },
        sidebarCollapsed: Boolean,
      },
      default: {
        themeColors: { light: null, dark: null },
        fontSize: 'medium',
        sidebarCollapsed: false,
      },
    },
    deletedAt: {
      type: Date,
      default: undefined,
      index: true,
    },
  },
  {
    timestamps: true,
  },
)

// Indexes for search/filter queries
userSchema.index({ name: 'text', email: 'text', position: 'text' })
userSchema.index({ createdAt: -1 })

export const UserModel = models.User ?? model<UserDocument>('User', userSchema)

export type User = {
  id: string
  email: string
  name: string
  permissions: string[]
  position?: string
  birthday?: string
  profilePic?: string
  banner?: string
  bio?: string
  status?: 'online' | 'busy' | 'away' | 'offline'
  monthlySalary?: number
  preferences?: UserPreferences
  deletedAt?: string
  createdAt: string
  updatedAt: string
}

export type PublicUser = Omit<User, 'monthlySalary'> & { monthlySalary?: number }

export type PublicUserOptions = {
  includeSalary?: boolean
}

const DEFAULT_PREFERENCES: UserPreferences = {
  themeColors: { light: null, dark: null },
  fontSize: 'medium',
  sidebarCollapsed: false,
  heyKooyaEnabled: false,
}

export function toUser(doc: UserDocument): User {
  return {
    id: doc.id,
    email: doc.email,
    name: doc.name,
    permissions: Array.isArray(doc.permissions) ? doc.permissions : [],
    position: doc.position,
    birthday: doc.birthday?.toISOString(),
    profilePic: doc.profilePic,
    banner: doc.banner,
    bio: doc.bio,
    status: doc.status || 'online',
    monthlySalary: doc.monthlySalary || 0,
    preferences: doc.preferences || DEFAULT_PREFERENCES,
    deletedAt: doc.deletedAt?.toISOString(),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}

export function toPublicUser(user: User, options: PublicUserOptions = {}): PublicUser {
  const publicUser: PublicUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    permissions: user.permissions,
    position: user.position,
    birthday: user.birthday,
    profilePic: resolveMediaUrl(user.profilePic),
    banner: resolveMediaUrl(user.banner),
    bio: user.bio,
    status: user.status,
    deletedAt: user.deletedAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }

  if (options.includeSalary) {
    publicUser.monthlySalary = user.monthlySalary ?? 0
  }

  return publicUser
}
