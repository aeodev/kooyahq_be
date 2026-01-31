import { Router } from 'express'
import { authenticate } from '../../../middleware/authenticate'
import { requirePermission } from '../../../middleware/require-permission'
import { PERMISSIONS } from '../../auth/rbac/permissions'
import {
  getRecurringExpenses,
  createRecurringExpense,
  updateRecurringExpense,
  deleteRecurringExpense,
} from './recurring-expense.controller'

export const recurringExpenseRouter = Router()

recurringExpenseRouter.use(authenticate)

recurringExpenseRouter.get(
  '/',
  requirePermission(PERMISSIONS.SYSTEM_FULL_ACCESS),
  getRecurringExpenses,
)

recurringExpenseRouter.post(
  '/',
  requirePermission(PERMISSIONS.SYSTEM_FULL_ACCESS),
  createRecurringExpense,
)

recurringExpenseRouter.put(
  '/:id',
  requirePermission(PERMISSIONS.SYSTEM_FULL_ACCESS),
  updateRecurringExpense,
)

recurringExpenseRouter.delete(
  '/:id',
  requirePermission(PERMISSIONS.SYSTEM_FULL_ACCESS),
  deleteRecurringExpense,
)
