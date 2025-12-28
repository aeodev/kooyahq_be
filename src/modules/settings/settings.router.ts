import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { requirePermission } from '../../middleware/require-permission'
import { PERMISSIONS } from '../auth/rbac/permissions'
import { getThemeSettings, updateThemeSettings } from './settings.controller'

export const settingsRouter = Router()

// Public route - no auth required
settingsRouter.get('/theme', getThemeSettings)

// Protected route - requires SYSTEM_FULL_ACCESS permission
settingsRouter.put('/theme', authenticate, requirePermission(PERMISSIONS.SYSTEM_FULL_ACCESS), updateThemeSettings)

