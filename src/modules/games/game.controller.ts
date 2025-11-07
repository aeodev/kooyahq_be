import { Request, Response } from 'express'
import { gameService } from './game.service'
import { HttpError } from '../../utils/http-error'
import type { GameType } from './game.model'

export async function getGameTypes(_req: Request, res: Response) {
  const gameTypes = await gameService.getGameTypes()
  res.json({ status: 'success', data: gameTypes })
}

export async function createMatch(req: Request, res: Response) {
  const userId = req.user!.id
  const { gameType, players, metadata } = req.body

  if (!gameType) {
    return res.status(400).json({ status: 'error', message: 'Game type is required' })
  }

  if (!players || !Array.isArray(players) || players.length === 0) {
    return res.status(400).json({ status: 'error', message: 'Players array is required' })
  }

  if (!players.includes(userId)) {
    return res.status(400).json({ status: 'error', message: 'You must be included in the players array' })
  }

  try {
    const match = await gameService.createMatch(userId, { gameType, players, metadata })
    res.json({ status: 'success', data: match })
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ status: 'error', message: error.message })
    }
    throw error
  }
}

export async function getMatch(req: Request, res: Response) {
  const matchId = req.params.id
  const match = await gameService.getMatch(matchId)

  if (!match) {
    return res.status(404).json({ status: 'error', message: 'Match not found' })
  }

  res.json({ status: 'success', data: match })
}

export async function getMyMatches(req: Request, res: Response) {
  try {
    const userId = req.user!.id
    const matches = await gameService.getUserMatches(userId)
    res.json({ status: 'success', data: matches })
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ status: 'error', message: error.message })
    }
    console.error('Error in getMyMatches:', error)
    res.status(500).json({ status: 'error', message: 'Failed to fetch matches' })
  }
}

export async function getMyActiveMatches(req: Request, res: Response) {
  try {
    const userId = req.user!.id
    const matches = await gameService.getActiveMatches(userId)
    res.json({ status: 'success', data: matches })
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ status: 'error', message: error.message })
    }
    console.error('Error in getMyActiveMatches:', error)
    res.status(500).json({ status: 'error', message: 'Failed to fetch active matches' })
  }
}

export async function updateMatch(req: Request, res: Response) {
  const userId = req.user!.id
  const matchId = req.params.id
  const updates = req.body

  try {
    const match = await gameService.updateMatch(userId, matchId, updates)
    res.json({ status: 'success', data: match })
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ status: 'error', message: error.message })
    }
    throw error
  }
}

export async function getLeaderboard(req: Request, res: Response) {
  const gameType = req.params.gameType as GameType
  const limit = parseInt(req.query.limit as string) || 100

  if (!gameType) {
    return res.status(400).json({ status: 'error', message: 'Game type is required' })
  }

  const leaderboard = await gameService.getLeaderboard(gameType, limit)
  res.json({ status: 'success', data: leaderboard })
}

export async function getActiveUsers(_req: Request, res: Response) {
  const { activeUsersManager } = await import('../../lib/active-users')
  const activeUsers = await activeUsersManager.getActiveUsers()
  res.json({ status: 'success', data: activeUsers })
}

export async function cleanupOldMatches(_req: Request, res: Response) {
  try {
    const olderThan = parseInt((_req.query.olderThan as string) || '30')
    const count = await gameService.abandonOldMatches(olderThan)
    res.json({ status: 'success', data: { abandonedMatches: count } })
  } catch (error) {
    console.error('Error cleaning up old matches:', error)
    res.status(500).json({ status: 'error', message: 'Failed to cleanup matches' })
  }
}

