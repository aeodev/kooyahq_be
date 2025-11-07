import { Schema, model, models, type Document } from 'mongoose'

export interface AuthDocument extends Document {
  email: string
  passwordHash: string
  userId: Schema.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const authSchema = new Schema<AuthDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
)

export const AuthModel = models.Auth ?? model<AuthDocument>('Auth', authSchema)

export type Auth = {
  id: string
  email: string
  passwordHash: string
  userId: string
  createdAt: string
  updatedAt: string
}

export function toAuth(doc: AuthDocument): Auth {
  return {
    id: doc.id,
    email: doc.email,
    passwordHash: doc.passwordHash,
    userId: doc.userId.toString(),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}





