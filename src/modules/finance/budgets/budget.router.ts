/**
 * Budget Router
 * 
 * Routes for budget CRUD operations.
 * BOLA protection is implemented in the service layer.
 */

import { Router } from 'express'
import { authenticate } from '../../../middleware/authenticate'
import { requirePermission } from '../../../middleware/require-permission'
import { PERMISSIONS } from '../../auth/rbac/permissions'
import {
  createBudget,
  getBudgets,
  getBudget,
  updateBudget,
  deleteBudget,
  getBudgetComparison,
  getAllBudgetComparisons,
} from './budget.controller'

export const budgetRouter = Router()

// All routes require authentication
budgetRouter.use(authenticate)

// GET /comparisons/all must come before GET /:id to avoid route conflict
/**
 * @swagger
 * /finance/budgets/comparisons/all:
 *   get:
 *     summary: Get all active budget comparisons
 *     tags: [Finance Budgets]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all active budget comparisons
 */
budgetRouter.get(
  '/comparisons/all',
  requirePermission(
    PERMISSIONS.FINANCE_VIEW,
    PERMISSIONS.FINANCE_EDIT,
    PERMISSIONS.FINANCE_FULL_ACCESS,
    PERMISSIONS.COST_ANALYTICS_VIEW,
    PERMISSIONS.COST_ANALYTICS_EDIT,
    PERMISSIONS.COST_ANALYTICS_FULL_ACCESS
  ),
  getAllBudgetComparisons
)

/**
 * @swagger
 * /finance/budgets:
 *   post:
 *     summary: Create a new budget
 *     tags: [Finance Budgets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - startDate
 *               - endDate
 *               - amount
 *             properties:
 *               project:
 *                 type: string
 *                 nullable: true
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *                 default: PHP
 *               alertThresholds:
 *                 type: object
 *                 properties:
 *                   warning:
 *                     type: number
 *                     default: 80
 *                   critical:
 *                     type: number
 *                     default: 95
 *     responses:
 *       200:
 *         description: Budget created successfully
 */
budgetRouter.post(
  '/',
  requirePermission(
    PERMISSIONS.FINANCE_EDIT,
    PERMISSIONS.FINANCE_FULL_ACCESS,
    PERMISSIONS.COST_ANALYTICS_EDIT,
    PERMISSIONS.COST_ANALYTICS_FULL_ACCESS
  ),
  createBudget
)

/**
 * @swagger
 * /finance/budgets:
 *   get:
 *     summary: Get all budgets (optionally filtered by project)
 *     tags: [Finance Budgets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: project
 *         schema:
 *           type: string
 *         description: Filter by project name (use 'null' for team-wide budgets)
 *     responses:
 *       200:
 *         description: List of budgets
 */
budgetRouter.get(
  '/',
  requirePermission(
    PERMISSIONS.FINANCE_VIEW,
    PERMISSIONS.FINANCE_EDIT,
    PERMISSIONS.FINANCE_FULL_ACCESS,
    PERMISSIONS.COST_ANALYTICS_VIEW,
    PERMISSIONS.COST_ANALYTICS_EDIT,
    PERMISSIONS.COST_ANALYTICS_FULL_ACCESS
  ),
  getBudgets
)

/**
 * @swagger
 * /finance/budgets/{id}:
 *   get:
 *     summary: Get a specific budget by ID
 *     tags: [Finance Budgets]
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
 *         description: Budget details
 *       404:
 *         description: Budget not found
 */
budgetRouter.get(
  '/:id',
  requirePermission(
    PERMISSIONS.FINANCE_VIEW,
    PERMISSIONS.FINANCE_EDIT,
    PERMISSIONS.FINANCE_FULL_ACCESS,
    PERMISSIONS.COST_ANALYTICS_VIEW,
    PERMISSIONS.COST_ANALYTICS_EDIT,
    PERMISSIONS.COST_ANALYTICS_FULL_ACCESS
  ),
  getBudget
)

/**
 * @swagger
 * /finance/budgets/{id}:
 *   put:
 *     summary: Update a budget (BOLA protected)
 *     tags: [Finance Budgets]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Updates a budget. User must be the budget creator or have FINANCE_FULL_ACCESS.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Budget updated successfully
 *       403:
 *         description: Not authorized to modify this budget
 *       404:
 *         description: Budget not found
 */
budgetRouter.put(
  '/:id',
  requirePermission(
    PERMISSIONS.FINANCE_EDIT,
    PERMISSIONS.FINANCE_FULL_ACCESS,
    PERMISSIONS.COST_ANALYTICS_EDIT,
    PERMISSIONS.COST_ANALYTICS_FULL_ACCESS
  ),
  updateBudget
)

/**
 * @swagger
 * /finance/budgets/{id}:
 *   delete:
 *     summary: Delete a budget (BOLA protected)
 *     tags: [Finance Budgets]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Deletes a budget. User must be the budget creator or have FINANCE_FULL_ACCESS.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Budget deleted successfully
 *       403:
 *         description: Not authorized to delete this budget
 *       404:
 *         description: Budget not found
 */
budgetRouter.delete(
  '/:id',
  requirePermission(
    PERMISSIONS.FINANCE_EDIT,
    PERMISSIONS.FINANCE_FULL_ACCESS,
    PERMISSIONS.COST_ANALYTICS_EDIT,
    PERMISSIONS.COST_ANALYTICS_FULL_ACCESS
  ),
  deleteBudget
)

/**
 * @swagger
 * /finance/budgets/{id}/comparison:
 *   get:
 *     summary: Get budget vs actual cost comparison
 *     tags: [Finance Budgets]
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
 *         description: Budget comparison data
 *       404:
 *         description: Budget not found
 */
budgetRouter.get(
  '/:id/comparison',
  requirePermission(
    PERMISSIONS.FINANCE_VIEW,
    PERMISSIONS.FINANCE_EDIT,
    PERMISSIONS.FINANCE_FULL_ACCESS,
    PERMISSIONS.COST_ANALYTICS_VIEW,
    PERMISSIONS.COST_ANALYTICS_EDIT,
    PERMISSIONS.COST_ANALYTICS_FULL_ACCESS
  ),
  getBudgetComparison
)
