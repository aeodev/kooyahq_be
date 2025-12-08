import { Schema, model, models, type Document } from 'mongoose'

export interface BoardFavoriteDocument extends Document {
  userId: string
  boardId: string
  createdAt: Date
  updatedAt: Date
}

const boardFavoriteSchema = new Schema<BoardFavoriteDocument>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    boardId: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
)

// Compound index to ensure a user can only favorite a board once
boardFavoriteSchema.index({ userId: 1, boardId: 1 }, { unique: true })

export const BoardFavoriteModel =
  models.BoardFavorite ?? model<BoardFavoriteDocument>('BoardFavorite', boardFavoriteSchema)

export type BoardFavorite = {
  id: string
  userId: string
  boardId: string
  createdAt: string
  updatedAt: string
}

export function toBoardFavorite(doc: BoardFavoriteDocument): BoardFavorite {
  return {
    id: doc.id,
    userId: doc.userId,
    boardId: doc.boardId,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}

