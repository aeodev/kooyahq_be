import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { requirePermission } from '../../middleware/require-permission'
import { PERMISSIONS } from '../auth/rbac/permissions'
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

// All routes require authentication (permissions inherited from parent router)
budgetRouter.use(authenticate)

/**
 * @swagger
 * /cost-analytics/budgets:
 *   post:
 *     summary: Create a new budget
 *     tags: [Cost Analytics]
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
 *                     default: 100
 *     responses:
 *       200:
 *         description: Budget created successfully
 *       400:
 *         description: Invalid input
 */
budgetRouter.post('/', requirePermission(PERMISSIONS.COST_ANALYTICS_EDIT, PERMISSIONS.COST_ANALYTICS_FULL_ACCESS), createBudget)

/**
 * @swagger
 * /cost-analytics/budgets:
 *   get:
 *     summary: Get all budgets (optionally filtered by project)
 *     tags: [Cost Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: project
 *         schema:
 *           type: string
 *           nullable: true
 *         description: Filter by project name (use 'null' for team-wide budgets)
 *     responses:
 *       200:
 *         description: List of budgets
 */
budgetRouter.get('/', getBudgets)

/**
 * @swagger
 * /cost-analytics/budgets/{id}:
 *   get:
 *     summary: Get a specific budget by ID
 *     tags: [Cost Analytics]
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
budgetRouter.get('/:id', getBudget)

/**
 * @swagger
 * /cost-analytics/budgets/{id}:
 *   put:
 *     summary: Update a budget
 *     tags: [Cost Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
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
 *               alertThresholds:
 *                 type: object
 *     responses:
 *       200:
 *         description: Budget updated successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Budget not found
 */
budgetRouter.put('/:id', requirePermission(PERMISSIONS.COST_ANALYTICS_EDIT, PERMISSIONS.COST_ANALYTICS_FULL_ACCESS), updateBudget)

/**
 * @swagger
 * /cost-analytics/budgets/{id}:
 *   delete:
 *     summary: Delete a budget
 *     tags: [Cost Analytics]
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
 *         description: Budget deleted successfully
 *       404:
 *         description: Budget not found
 */
budgetRouter.delete('/:id', requirePermission(PERMISSIONS.COST_ANALYTICS_EDIT, PERMISSIONS.COST_ANALYTICS_FULL_ACCESS), deleteBudget)

/**
 * @swagger
 * /cost-analytics/budgets/{id}/comparison:
 *   get:
 *     summary: Get budget vs actual cost comparison
 *     tags: [Cost Analytics]
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
budgetRouter.get('/:id/comparison', getBudgetComparison)

/**
 * @swagger
 * /cost-analytics/budgets/comparisons/all:
 *   get:
 *     summary: Get all active budget comparisons
 *     tags: [Cost Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all active budget comparisons
 */
budgetRouter.get('/comparisons/all', getAllBudgetComparisons)
