import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { requirePermission } from '../../middleware/require-permission'
import { PERMISSIONS } from '../auth/rbac/permissions'
import { getPresenceSnapshot } from './presence.controller'

export const presenceRouter = Router()

presenceRouter.get(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.PRESENCE_READ, PERMISSIONS.PRESENCE_FULL_ACCESS),
  getPresenceSnapshot
)
