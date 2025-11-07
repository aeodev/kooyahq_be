import { Schema, model, models, type Document } from 'mongoose'

export interface UserDocument extends Document {
  email: string
  name: string
  isAdmin: boolean
  position?: string
  birthday?: Date
  profilePic?: string
  banner?: string
  bio?: string
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
    isAdmin: {
      type: Boolean,
      default: false,
      index: true,
    },
    profilePic: {
      type: String,
    },
    banner: {
      type: String,
    },
    bio: {
      type: String,
      trim: true,
    },
    position: {
      type: String,
      trim: true,
    },
    birthday: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
)

export const UserModel = models.User ?? model<UserDocument>('User', userSchema)

export type User = {
  id: string
  email: string
  name: string
  isAdmin: boolean
  position?: string
  birthday?: string
  profilePic?: string
  banner?: string
  bio?: string
  createdAt: string
  updatedAt: string
}

export type PublicUser = User

export function toUser(doc: UserDocument): User {
  return {
    id: doc.id,
    email: doc.email,
    name: doc.name,
    isAdmin: doc.isAdmin ?? false,
    position: doc.position,
    birthday: doc.birthday?.toISOString(),
    profilePic: doc.profilePic,
    banner: doc.banner,
    bio: doc.bio,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}

export function toPublicUser(user: User): PublicUser {
  return user
}
