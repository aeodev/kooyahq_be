/**
 * Expense Router
 */

import { Router } from 'express'
import { authenticate } from '../../../middleware/authenticate'
import { requirePermission } from '../../../middleware/require-permission'
import { PERMISSIONS } from '../../auth/rbac/permissions'
import {
  createExpense,
  getExpenses,
  getExpense,
  updateExpense,
  deleteExpense,
} from './expense.controller'

export const expenseRouter = Router()

// All routes require authentication
expenseRouter.use(authenticate)

/**
 * @swagger
 * /finance/expenses:
 *   post:
 *     summary: Create a new expense
 *     tags: [Finance Expenses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - effectiveDate
 *             properties:
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *                 default: PHP
 *               category:
 *                 type: string
 *               vendor:
 *                 type: string
 *               notes:
 *                 type: string
 *                 maxLength: 2000
 *               effectiveDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               isRecurringMonthly:
 *                 type: boolean
 *                 default: false
 *               projectId:
 *                 type: string
 *               workspaceId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Expense created successfully
 */
expenseRouter.post(
  '/',
  requirePermission(PERMISSIONS.FINANCE_EDIT, PERMISSIONS.FINANCE_FULL_ACCESS),
  createExpense
)

/**
 * @swagger
 * /finance/expenses:
 *   get:
 *     summary: Get all expenses (with optional filters)
 *     tags: [Finance Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: vendor
 *         schema:
 *           type: string
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of expenses
 */
expenseRouter.get(
  '/',
  requirePermission(PERMISSIONS.FINANCE_VIEW, PERMISSIONS.FINANCE_EDIT, PERMISSIONS.FINANCE_FULL_ACCESS),
  getExpenses
)

/**
 * @swagger
 * /finance/expenses/{id}:
 *   get:
 *     summary: Get a specific expense by ID
 *     tags: [Finance Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Expense details
 *       404:
 *         description: Expense not found
 */
expenseRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.FINANCE_VIEW, PERMISSIONS.FINANCE_EDIT, PERMISSIONS.FINANCE_FULL_ACCESS),
  getExpense
)

/**
 * @swagger
 * /finance/expenses/{id}:
 *   put:
 *     summary: Update an expense
 *     tags: [Finance Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Expense updated successfully
 *       404:
 *         description: Expense not found
 */
expenseRouter.put(
  '/:id',
  requirePermission(PERMISSIONS.FINANCE_EDIT, PERMISSIONS.FINANCE_FULL_ACCESS),
  updateExpense
)

/**
 * @swagger
 * /finance/expenses/{id}:
 *   delete:
 *     summary: Delete an expense
 *     tags: [Finance Expenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Expense deleted successfully
 *       404:
 *         description: Expense not found
 */
expenseRouter.delete(
  '/:id',
  requirePermission(PERMISSIONS.FINANCE_EDIT, PERMISSIONS.FINANCE_FULL_ACCESS),
  deleteExpense
)
