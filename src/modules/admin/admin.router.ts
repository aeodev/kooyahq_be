import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { requirePermission } from '../../middleware/require-permission'
import { PERMISSIONS } from '../auth/rbac/permissions'
import { getStats, exportUsers } from './admin.controller'
import { getActivity } from '../admin-activity/admin-activity.controller'

export const adminRouter = Router()

adminRouter.use(authenticate)

adminRouter.get('/stats', requirePermission(PERMISSIONS.ADMIN_FULL_ACCESS, PERMISSIONS.ADMIN_READ), getStats)
adminRouter.get(
  '/export/users',
  requirePermission(PERMISSIONS.ADMIN_FULL_ACCESS, PERMISSIONS.ADMIN_EXPORT),
  exportUsers
)
adminRouter.get(
  '/activity',
  requirePermission(PERMISSIONS.ADMIN_FULL_ACCESS, PERMISSIONS.ADMIN_ACTIVITY_READ, PERMISSIONS.ADMIN_READ),
  getActivity
)






