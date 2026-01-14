import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { requirePermission } from '../../middleware/require-permission'
import { PERMISSIONS } from '../auth/rbac/permissions'
import { getThemeSettings, updateThemeSettings, updateThemeMandatory } from './settings.controller'

export const settingsRouter = Router()

// Public route - no auth required (returns theme + themeMandatory flag)
settingsRouter.get('/theme', getThemeSettings)

// Protected route - requires SYSTEM_FULL_ACCESS permission
settingsRouter.put('/theme', authenticate, requirePermission(PERMISSIONS.SYSTEM_FULL_ACCESS), updateThemeSettings)

// Protected route - requires SYSTEM_FULL_ACCESS permission
settingsRouter.put('/theme/mandatory', authenticate, requirePermission(PERMISSIONS.SYSTEM_FULL_ACCESS), updateThemeMandatory)