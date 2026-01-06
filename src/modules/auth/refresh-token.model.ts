import { Schema, model, models, type Document } from 'mongoose'

export interface RefreshTokenDocument extends Document {
  userId: string
  tokenHash: string
  expiresAt: Date
  revokedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const refreshTokenSchema = new Schema<RefreshTokenDocument>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revokedAt: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
  },
)

// Auto-remove expired tokens.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const RefreshTokenModel =
  models.RefreshToken ?? model<RefreshTokenDocument>('RefreshToken', refreshTokenSchema)
