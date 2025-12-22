import { gameRepository, type CreateGameMatchInput, type UpdateGameMatchInput } from './game.repository'
import { userRepository } from '../users/user.repository'
import { HttpError } from '../../utils/http-error'
import type { GameMatch, GameType, GameStatus } from './game.model'

export type PublicGameMatch = GameMatch & {
  playerNames: string[]
  winnerName?: string
}

export type GameLeaderboardEntry = {
  userId: string
  userName: string
  userEmail: string
  wins: number
  losses: number
  draws: number
  totalGames: number
  winRate: number
}

export class GameService {
  async createMatch(userId: string, input: CreateGameMatchInput): Promise<PublicGameMatch> {
    if (!input.players.includes(userId)) {
      throw new HttpError(400, 'You must be a player in the match')
    }

    const match = await gameRepository.create(input)
    return this.toPublicGameMatch(match)
  }

  async getMatch(matchId: string): Promise<PublicGameMatch | undefined> {
    const match = await gameRepository.findById(matchId)
    if (!match) {
      return undefined
    }
    return this.toPublicGameMatch(match)
  }

  async getUserMatches(userId: string): Promise<PublicGameMatch[]> {
    const matches = await gameRepository.findByUserId(userId)
    return Promise.all(matches.map((match) => this.toPublicGameMatch(match)))
  }

  async getActiveMatches(userId: string): Promise<PublicGameMatch[]> {
    const matches = await gameRepository.findActiveByUserId(userId)
    return Promise.all(matches.map((match) => this.toPublicGameMatch(match)))
  }

  async updateMatch(userId: string, matchId: string, updates: UpdateGameMatchInput): Promise<PublicGameMatch> {
    const match = await gameRepository.findById(matchId)
    if (!match) {
      throw new HttpError(404, 'Match not found')
    }

    if (!match.players.includes(userId)) {
      throw new HttpError(403, 'You are not a player in this match')
    }

    // Convert ISO strings to Date objects for startedAt and endedAt
    const processedUpdates: UpdateGameMatchInput = { ...updates }
    if (updates.startedAt && typeof updates.startedAt === 'string') {
      processedUpdates.startedAt = new Date(updates.startedAt)
    }
    if (updates.endedAt && typeof updates.endedAt === 'string') {
      processedUpdates.endedAt = new Date(updates.endedAt)
    }

    const updated = await gameRepository.update(matchId, processedUpdates)
    if (!updated) {
      throw new HttpError(404, 'Match not found')
    }

    return this.toPublicGameMatch(updated)
  }

  async getLeaderboard(gameType: GameType, limit = 100): Promise<GameLeaderboardEntry[]> {
    const leaderboard = await gameRepository.getLeaderboard(gameType, limit)
    const userIds = leaderboard.map((entry) => entry.userId)
    const users = await Promise.all(userIds.map((id) => userRepository.findById(id)))
    const userMap = new Map(users.filter(Boolean).map((u) => [u!.id, u!]))

    return leaderboard.map((entry) => {
      const user = userMap.get(entry.userId)
      const totalGames = entry.totalGames
      const winRate = totalGames > 0 ? (entry.wins / totalGames) * 100 : 0

      return {
        userId: entry.userId,
        userName: user?.name || 'Unknown',
        userEmail: user?.email || '',
        wins: entry.wins,
        losses: entry.losses,
        draws: entry.draws,
        totalGames,
        winRate: Math.round(winRate * 10) / 10,
        bestScore: entry.bestScore,
        avgScore: entry.avgScore,
      }
    })
  }

  async abandonOldMatches(olderThanMinutes = 30): Promise<number> {
    const cutoffDate = new Date(Date.now() - olderThanMinutes * 60 * 1000)
    const result = await gameRepository.abandonOldMatches(cutoffDate)
    return result
  }

  async getGameTypes(): Promise<Array<{ type: GameType; name: string; description: string }>> {
    return [
      {
        type: 'tic-tac-toe',
        name: 'Tic Tac Toe',
        description: 'Classic 3x3 grid strategy game',
      },
      {
        type: 'rock-paper-scissors',
        name: 'Rock Paper Scissors',
        description: 'Quick best-of-three rounds',
      },
      {
        type: 'number-guessing',
        name: 'Number Guessing',
        description: 'Compete to guess the number fastest',
      },
      {
        type: 'reaction-test',
        name: 'Reaction Test',
        description: 'Test your reaction speed',
      },
    ]
  }

  private async toPublicGameMatch(match: GameMatch): Promise<PublicGameMatch> {
    const userIds = match.players || []
    const users = await Promise.all(
      userIds.map(async (id) => {
        try {
          return await userRepository.findById(id)
        } catch {
          return null
        }
      })
    )
    const playerNames = users.map((u) => u?.name || 'Unknown')
    let winnerName: string | undefined
    if (match.winner) {
      try {
        const winnerUser = await userRepository.findById(match.winner)
        winnerName = winnerUser?.name
      } catch {
        winnerName = undefined
      }
    }

    return {
      ...match,
      playerNames,
      winnerName,
    }
  }
}

export const gameService = new GameService()
