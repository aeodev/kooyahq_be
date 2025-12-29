import { Schema, model, models, type Document } from 'mongoose'

export type GameType = 'tic-tac-toe' | 'rock-paper-scissors' | 'number-guessing' | 'reaction-test' | 'tetris-battle'

export type GameStatus = 'waiting' | 'in-progress' | 'completed' | 'abandoned'

export interface GameMatchDocument extends Document {
  gameType: GameType
  players: string[] // userIds
  status: GameStatus
  winner?: string // userId
  scores?: Record<string, number> // userId -> score
  metadata?: Record<string, unknown> // game-specific data
  startedAt?: Date
  endedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const gameMatchSchema = new Schema<GameMatchDocument>(
  {
    gameType: {
      type: String,
      required: true,
      enum: ['tic-tac-toe', 'rock-paper-scissors', 'number-guessing', 'reaction-test', 'tetris-battle'],
      index: true,
    },
    players: {
      type: [String],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['waiting', 'in-progress', 'completed', 'abandoned'],
      default: 'waiting',
      index: true,
    },
    winner: {
      type: String,
    },
    scores: {
      type: Schema.Types.Mixed,
      default: {},
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    startedAt: {
      type: Date,
    },
    endedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
)

export const GameMatchModel = models.GameMatch ?? model<GameMatchDocument>('GameMatch', gameMatchSchema)

export type GameMatch = {
  id: string
  gameType: GameType
  players: string[]
  status: GameStatus
  winner?: string
  scores?: Record<string, number>
  metadata?: Record<string, unknown>
  startedAt?: string
  endedAt?: string
  createdAt: string
  updatedAt: string
}

export function toGameMatch(doc: GameMatchDocument): GameMatch {
  return {
    id: doc.id,
    gameType: doc.gameType as GameType,
    players: doc.players || [],
    status: doc.status as GameStatus,
    winner: doc.winner,
    scores: doc.scores as Record<string, number> | undefined,
    metadata: doc.metadata as Record<string, unknown> | undefined,
    startedAt: doc.startedAt?.toISOString(),
    endedAt: doc.endedAt?.toISOString(),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}



