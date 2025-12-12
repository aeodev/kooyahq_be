import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { requirePermission } from '../../middleware/require-permission'
import { PERMISSIONS } from '../auth/rbac/permissions'
import {
  getGameTypes,
  createMatch,
  getMatch,
  getMyMatches,
  getMyActiveMatches,
  updateMatch,
  getLeaderboard,
  getActiveUsers,
  cleanupOldMatches,
} from './game.controller'

export const gameRouter = Router()

gameRouter.use(authenticate)

gameRouter.get('/types', requirePermission(PERMISSIONS.GAME_READ, PERMISSIONS.GAME_FULL_ACCESS), getGameTypes)
gameRouter.get(
  '/active-users',
  requirePermission(PERMISSIONS.GAME_READ, PERMISSIONS.GAME_FULL_ACCESS),
  getActiveUsers
)
gameRouter.get(
  '/matches/me',
  requirePermission(PERMISSIONS.GAME_READ, PERMISSIONS.GAME_FULL_ACCESS),
  getMyMatches
)
gameRouter.get(
  '/matches/me/active',
  requirePermission(PERMISSIONS.GAME_READ, PERMISSIONS.GAME_FULL_ACCESS),
  getMyActiveMatches
)
gameRouter.get(
  '/matches/:id',
  requirePermission(PERMISSIONS.GAME_READ, PERMISSIONS.GAME_FULL_ACCESS),
  getMatch
)
gameRouter.post(
  '/matches',
  requirePermission(PERMISSIONS.GAME_PLAY, PERMISSIONS.GAME_FULL_ACCESS),
  createMatch
)
gameRouter.put(
  '/matches/:id',
  requirePermission(PERMISSIONS.GAME_PLAY, PERMISSIONS.GAME_FULL_ACCESS),
  updateMatch
)
gameRouter.patch(
  '/matches/:id',
  requirePermission(PERMISSIONS.GAME_PLAY, PERMISSIONS.GAME_FULL_ACCESS),
  updateMatch
)
gameRouter.get(
  '/leaderboard/:gameType',
  requirePermission(PERMISSIONS.GAME_READ, PERMISSIONS.GAME_FULL_ACCESS),
  getLeaderboard
)
gameRouter.post(
  '/matches/cleanup',
  requirePermission(PERMISSIONS.GAME_CLEANUP, PERMISSIONS.GAME_FULL_ACCESS),
  cleanupOldMatches
)
