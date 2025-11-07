import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
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

gameRouter.get('/types', getGameTypes)
gameRouter.get('/active-users', getActiveUsers)
gameRouter.get('/matches/me', getMyMatches)
gameRouter.get('/matches/me/active', getMyActiveMatches)
gameRouter.get('/matches/:id', getMatch)
gameRouter.post('/matches', createMatch)
gameRouter.put('/matches/:id', updateMatch)
gameRouter.patch('/matches/:id', updateMatch)
gameRouter.get('/leaderboard/:gameType', getLeaderboard)
gameRouter.post('/matches/cleanup', cleanupOldMatches)

