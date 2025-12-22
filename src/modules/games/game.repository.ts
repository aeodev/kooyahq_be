import { GameMatchModel, toGameMatch, type GameMatch, type GameType, type GameStatus } from './game.model'

export type CreateGameMatchInput = {
  gameType: GameType
  players: string[]
  status?: GameStatus
  metadata?: Record<string, unknown>
  startedAt?: Date
}

export type UpdateGameMatchInput = {
  status?: GameStatus
  winner?: string
  scores?: Record<string, number>
  metadata?: Record<string, unknown>
  startedAt?: Date
  endedAt?: Date
}

export class GameRepository {
  async create(input: CreateGameMatchInput): Promise<GameMatch> {
    const doc = new GameMatchModel({
      ...input,
      status: input.status || 'waiting',
      startedAt: input.startedAt,
    })
    await doc.save()
    return toGameMatch(doc)
  }

  async findById(id: string): Promise<GameMatch | undefined> {
    const doc = await GameMatchModel.findById(id)
    return doc ? toGameMatch(doc) : undefined
  }

  async findByUserId(userId: string, limit = 50): Promise<GameMatch[]> {
    const docs = await GameMatchModel.find({
      players: userId,
    })
      .sort({ createdAt: -1 })
      .limit(limit)
    return docs.map(toGameMatch)
  }

  async findByGameType(gameType: GameType, limit = 50): Promise<GameMatch[]> {
    const docs = await GameMatchModel.find({ gameType })
      .sort({ createdAt: -1 })
      .limit(limit)
    return docs.map(toGameMatch)
  }

  async findActiveByUserId(userId: string): Promise<GameMatch[]> {
    const docs = await GameMatchModel.find({
      players: userId,
      status: { $in: ['waiting', 'in-progress'] },
    }).sort({ createdAt: -1 })
    return docs.map(toGameMatch)
  }

  async update(id: string, updates: UpdateGameMatchInput): Promise<GameMatch | undefined> {
    const doc = await GameMatchModel.findByIdAndUpdate(id, { $set: updates }, { new: true })
    return doc ? toGameMatch(doc) : undefined
  }

  async getLeaderboard(gameType: GameType, limit = 100): Promise<Array<{ userId: string; wins: number; losses: number; draws: number; totalGames: number; bestScore?: number; avgScore?: number }>> {
    const matches = await GameMatchModel.find({
      gameType,
      status: 'completed',
    })

    const stats = new Map<string, { wins: number; losses: number; draws: number; totalGames: number; bestScore?: number; avgScore?: number; scores: number[] }>()

    for (const match of matches) {
      const players = match.players || []
      const winner = match.winner
      const scores = match.scores || {}

      for (const playerId of players) {
        if (!stats.has(playerId)) {
          stats.set(playerId, { wins: 0, losses: 0, draws: 0, totalGames: 0, scores: [] })
        }

        const playerStats = stats.get(playerId)!
        playerStats.totalGames++

        // For reaction-test, track scores
        if (gameType === 'reaction-test' && scores[playerId] !== undefined) {
          playerStats.scores.push(Number(scores[playerId]))
        }

        if (!winner) {
          playerStats.draws++
        } else if (winner === playerId) {
          playerStats.wins++
        } else {
          playerStats.losses++
        }
      }
    }

    return Array.from(stats.entries())
      .map(([userId, playerStats]) => {
        const { scores, ...rest } = playerStats
        const result: { userId: string; wins: number; losses: number; draws: number; totalGames: number; bestScore?: number; avgScore?: number } = {
          userId,
          ...rest,
        }

        // For reaction-test, calculate best and average scores
        if (gameType === 'reaction-test' && scores.length > 0) {
          result.bestScore = Math.min(...scores)
          result.avgScore = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
        }

        return result
      })
      .sort((a, b) => {
        // For reaction-test, sort by best score (lower is better)
        if (gameType === 'reaction-test') {
          const aScore = a.bestScore ?? Infinity
          const bScore = b.bestScore ?? Infinity
          return aScore - bScore
        }
        // For other games, sort by wins
        return b.wins - a.wins || a.losses - b.losses
      })
      .slice(0, limit)
  }

  async delete(id: string): Promise<void> {
    await GameMatchModel.findByIdAndDelete(id)
  }

  async abandonOldMatches(cutoffDate: Date): Promise<number> {
    const result = await GameMatchModel.updateMany(
      {
        status: { $in: ['waiting', 'in-progress'] },
        updatedAt: { $lt: cutoffDate },
      },
      {
        $set: { status: 'abandoned' },
      }
    )
    return result.modifiedCount
  }
}

export const gameRepository = new GameRepository()
