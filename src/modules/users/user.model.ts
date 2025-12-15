import { Schema, model, models, type Document } from 'mongoose'

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
  deletedAt?: string
  createdAt: string
  updatedAt: string
}

export type PublicUser = User

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
    deletedAt: doc.deletedAt?.toISOString(),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}

export function toPublicUser(user: User): PublicUser {
  return user
}
