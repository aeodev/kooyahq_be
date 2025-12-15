import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { requirePermission } from '../../middleware/require-permission'
import { PERMISSIONS } from '../auth/rbac/permissions'
import { getStats, exportUsers } from './user-management.controller'
import { getActivity } from '../admin-activity/admin-activity.controller'

export const userManagementRouter = Router()

userManagementRouter.use(authenticate)

userManagementRouter.get(
  '/stats',
  requirePermission(
    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.USERS_MANAGE,
    PERMISSIONS.PROJECTS_VIEW,
    PERMISSIONS.PROJECTS_MANAGE,
    PERMISSIONS.SYSTEM_LOGS,
  ),
  getStats
)
userManagementRouter.get(
  '/export/users',
  requirePermission(PERMISSIONS.USERS_MANAGE),
  exportUsers
)
userManagementRouter.get(
  '/activity',
  requirePermission(PERMISSIONS.SYSTEM_LOGS),
  getActivity
)


