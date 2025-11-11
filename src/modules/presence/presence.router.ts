import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { getPresenceSnapshot } from './presence.controller'

export const presenceRouter = Router()

presenceRouter.get('/', authenticate, getPresenceSnapshot)

