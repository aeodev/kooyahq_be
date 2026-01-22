/**
 * Unified Finance Router
 * 
 * This is the main entry point for all finance-related routes:
 * - /api/finance/analytics/* - Cost analytics (sanitized by default)
 * - /api/finance/budgets/*   - Budget CRUD with BOLA protection
 * - /api/finance/expenses/*  - Expense CRUD (from new module)
 * - /api/finance/employee-costs/* - Employee cost tracking (non-salary only)
 * - /api/finance/summary     - Unified finance summary
 * 
 * SECURITY NOTES:
 * - Analytics endpoints are sanitized by default (no salary/rate)
 * - Privileged analytics endpoints require USERS_MANAGE
 * - Budget mutations have BOLA protection (ownership checks)
 * - Employee costs do NOT allow 'salary' type - salary comes from Users.monthlySalary
 */

import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { requirePermission } from '../../middleware/require-permission'
import { PERMISSIONS } from '../auth/rbac/permissions'
import { analyticsRouter } from './analytics/analytics.router'
import { budgetRouter } from './budgets/budget.router'
import { expenseRouter } from './expenses/expense.router'
import {
  getFinanceSummary,
  getEmployeeCosts,
  createEmployeeCost,
  updateEmployeeCost,
  deleteEmployeeCost,
} from './finance.controller'

export const financeRouter = Router()

// Mount sub-routers (these handle their own auth)
financeRouter.use('/analytics', analyticsRouter)
financeRouter.use('/budgets', budgetRouter)
financeRouter.use('/expenses', expenseRouter)

// Legacy endpoints require authentication
financeRouter.use(authenticate)

// View routes require at least FINANCE_VIEW permission
financeRouter.use(requirePermission(
  PERMISSIONS.FINANCE_VIEW,
  PERMISSIONS.FINANCE_EDIT,
  PERMISSIONS.FINANCE_FULL_ACCESS
))

// Summary endpoint
financeRouter.get('/summary', getFinanceSummary)

// Employee Cost endpoints (non-salary costs only)
financeRouter.get('/employee-costs', getEmployeeCosts)
financeRouter.post('/employee-costs', requirePermission(PERMISSIONS.FINANCE_MANAGE_EMPLOYEE_COSTS, PERMISSIONS.FINANCE_FULL_ACCESS), createEmployeeCost)
financeRouter.put('/employee-costs/:id', requirePermission(PERMISSIONS.FINANCE_MANAGE_EMPLOYEE_COSTS, PERMISSIONS.FINANCE_FULL_ACCESS), updateEmployeeCost)
financeRouter.delete('/employee-costs/:id', requirePermission(PERMISSIONS.FINANCE_MANAGE_EMPLOYEE_COSTS, PERMISSIONS.FINANCE_FULL_ACCESS), deleteEmployeeCost)
