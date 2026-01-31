import { Router } from 'express'
import { authenticate } from '../../../middleware/authenticate'
import { requirePermission } from '../../../middleware/require-permission'
import { PERMISSIONS } from '../../auth/rbac/permissions'
import {
  getRecurringEmployeeCosts,
  createRecurringEmployeeCost,
  updateRecurringEmployeeCost,
  deleteRecurringEmployeeCost,
} from './recurring-employee-cost.controller'

export const recurringEmployeeCostRouter = Router()

recurringEmployeeCostRouter.use(authenticate)

recurringEmployeeCostRouter.get(
  '/',
  requirePermission(PERMISSIONS.SYSTEM_FULL_ACCESS),
  getRecurringEmployeeCosts,
)

recurringEmployeeCostRouter.post(
  '/',
  requirePermission(PERMISSIONS.SYSTEM_FULL_ACCESS),
  createRecurringEmployeeCost,
)

recurringEmployeeCostRouter.put(
  '/:id',
  requirePermission(PERMISSIONS.SYSTEM_FULL_ACCESS),
  updateRecurringEmployeeCost,
)

recurringEmployeeCostRouter.delete(
  '/:id',
  requirePermission(PERMISSIONS.SYSTEM_FULL_ACCESS),
  deleteRecurringEmployeeCost,
)
