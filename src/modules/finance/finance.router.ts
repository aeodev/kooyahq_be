/**
 * Unified Finance Router
 * 
 * This is the main entry point for all finance-related routes:
 * - /api/finance/expenses/*      - Expense CRUD
 * - /api/finance/employee-costs/* - Employee cost tracking (non-salary only)
 * - /api/finance/summary         - Unified finance summary
 * 
 * SECURITY NOTES:
 * - Employee costs exclude salary (salary comes from Users.monthlySalary)
 */

import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { requirePermission } from '../../middleware/require-permission'
import { PERMISSIONS } from '../auth/rbac/permissions'
import { expenseRouter } from './expenses/expense.router'
import { recurringExpenseRouter } from './recurring-expenses/recurring-expense.router'
import { recurringEmployeeCostRouter } from './recurring-employee-costs/recurring-employee-cost.router'
import {
  getFinanceSummary,
  getEmployeeCosts,
  getEmployeeCostOptions,
  createEmployeeCost,
  updateEmployeeCost,
  deleteEmployeeCost,
} from './finance.controller'

export const financeRouter = Router()

// Mount sub-routers (these handle their own auth)
financeRouter.use('/expenses', expenseRouter)
financeRouter.use('/recurring-expenses', recurringExpenseRouter)
financeRouter.use('/recurring-employee-costs', recurringEmployeeCostRouter)

// Legacy endpoints require authentication
financeRouter.use(authenticate)

// Finance routes are restricted to super admins
financeRouter.use(requirePermission(PERMISSIONS.SYSTEM_FULL_ACCESS))

// Summary endpoint
financeRouter.get('/summary', getFinanceSummary)

// Employee Cost endpoints (non-salary costs only)
financeRouter.get('/employee-costs/options', getEmployeeCostOptions)
financeRouter.get('/employee-costs', getEmployeeCosts)
financeRouter.post('/employee-costs', requirePermission(PERMISSIONS.SYSTEM_FULL_ACCESS), createEmployeeCost)
financeRouter.put('/employee-costs/:id', requirePermission(PERMISSIONS.SYSTEM_FULL_ACCESS), updateEmployeeCost)
financeRouter.delete('/employee-costs/:id', requirePermission(PERMISSIONS.SYSTEM_FULL_ACCESS), deleteEmployeeCost)
