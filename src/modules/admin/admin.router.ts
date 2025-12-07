import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { requireAdmin } from '../../middleware/require-admin'
import { getStats, exportUsers } from './admin.controller'
import { getActivity } from '../admin-activity/admin-activity.controller'

export const adminRouter = Router()

// All admin routes require authentication and admin access
adminRouter.use(authenticate)
adminRouter.use(requireAdmin)

adminRouter.get('/stats', getStats)
adminRouter.get('/export/users', exportUsers)
adminRouter.get('/activity', getActivity)







