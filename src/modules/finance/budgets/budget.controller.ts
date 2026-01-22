/**
 * Budget Controller with BOLA Protection
 * 
 * SECURITY: All mutating operations pass auth context to service
 * for object-level authorization checks.
 */

import { Request, Response } from 'express'
import { BudgetService, type AuthContext } from './budget.service'
import type { CreateBudgetInput, UpdateBudgetInput } from './budget.model'
import type { Permission } from '../../auth/rbac/permissions'

const service = new BudgetService()

/**
 * Extract auth context from request for BOLA checks
 */
function getAuthContext(req: Request): AuthContext {
  return {
    userId: req.user!.id,
    permissions: (req.user!.permissions || []) as Permission[],
  }
}

export async function createBudget(req: Request, res: Response) {
  try {
    const userId = req.user!.id
    const input: CreateBudgetInput = {
      project: req.body.project ?? null,
      workspaceId: req.body.workspaceId,
      startDate: new Date(req.body.startDate),
      endDate: new Date(req.body.endDate),
      amount: req.body.amount,
      currency: req.body.currency || 'PHP',
      alertThresholds: req.body.alertThresholds,
    }

    const budget = await service.createBudget(input, userId)
    res.json({ status: 'success', data: budget })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create budget'
    res.status(400).json({ status: 'error', message })
  }
}

export async function getBudgets(req: Request, res: Response) {
  try {
    const auth = getAuthContext(req)
    const { project } = req.query
    
    let budgets
    if (project === 'null' || project === null) {
      budgets = await service.getBudgetsByProject(null, auth)
    } else if (typeof project === 'string') {
      budgets = await service.getBudgetsByProject(project, auth)
    } else {
      budgets = await service.getAllBudgets(auth)
    }

    res.json({ status: 'success', data: budgets })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch budgets'
    res.status(500).json({ status: 'error', message })
  }
}

export async function getBudget(req: Request, res: Response) {
  try {
    const auth = getAuthContext(req)
    const { id } = req.params
    const budget = await service.getBudget(id, auth)
    
    if (!budget) {
      return res.status(404).json({ status: 'error', message: 'Budget not found' })
    }

    res.json({ status: 'success', data: budget })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch budget'
    res.status(500).json({ status: 'error', message })
  }
}

export async function updateBudget(req: Request, res: Response) {
  try {
    const auth = getAuthContext(req)
    const { id } = req.params
    const input: UpdateBudgetInput = {}
    
    if (req.body.project !== undefined) input.project = req.body.project ?? null
    if (req.body.workspaceId !== undefined) input.workspaceId = req.body.workspaceId
    if (req.body.startDate !== undefined) input.startDate = new Date(req.body.startDate)
    if (req.body.endDate !== undefined) input.endDate = new Date(req.body.endDate)
    if (req.body.amount !== undefined) input.amount = req.body.amount
    if (req.body.currency !== undefined) input.currency = req.body.currency
    if (req.body.alertThresholds !== undefined) input.alertThresholds = req.body.alertThresholds

    const budget = await service.updateBudget(id, input, auth)
    
    if (!budget) {
      return res.status(404).json({ status: 'error', message: 'Budget not found' })
    }

    res.json({ status: 'success', data: budget })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update budget'
    // Return 403 for authorization errors
    if (message.includes('Not authorized')) {
      return res.status(403).json({ status: 'error', message })
    }
    res.status(400).json({ status: 'error', message })
  }
}

export async function deleteBudget(req: Request, res: Response) {
  try {
    const auth = getAuthContext(req)
    const { id } = req.params
    const deleted = await service.deleteBudget(id, auth)
    
    if (!deleted) {
      return res.status(404).json({ status: 'error', message: 'Budget not found' })
    }

    res.json({ status: 'success', message: 'Budget deleted successfully' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete budget'
    // Return 403 for authorization errors
    if (message.includes('Not authorized')) {
      return res.status(403).json({ status: 'error', message })
    }
    res.status(500).json({ status: 'error', message })
  }
}

export async function getBudgetComparison(req: Request, res: Response) {
  try {
    const auth = getAuthContext(req)
    const { id } = req.params
    const comparison = await service.getBudgetComparison(id, auth)
    
    if (!comparison) {
      return res.status(404).json({ status: 'error', message: 'Budget not found' })
    }

    res.json({ status: 'success', data: comparison })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch budget comparison'
    res.status(500).json({ status: 'error', message })
  }
}

export async function getAllBudgetComparisons(req: Request, res: Response) {
  try {
    const auth = getAuthContext(req)
    const comparisons = await service.getAllBudgetComparisons(new Date(), auth)
    res.json({ status: 'success', data: comparisons })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch budget comparisons'
    res.status(500).json({ status: 'error', message })
  }
}
