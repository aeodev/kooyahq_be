import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { requirePermission } from '../../middleware/require-permission'
import { PERMISSIONS } from '../auth/rbac/permissions'
import { getCesiumIonToken } from './cesium.controller'

export const cesiumRouter = Router()

cesiumRouter.get(
  '/token',
  authenticate,
  requirePermission(PERMISSIONS.CESIUM_TOKEN, PERMISSIONS.SYSTEM_FULL_ACCESS),
  getCesiumIonToken
)
