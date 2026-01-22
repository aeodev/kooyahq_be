/**
 * Expense Controller
 */

import { Request, Response } from 'express'
import { ExpenseService } from './expense.service'
import type { CreateExpenseInput, UpdateExpenseInput } from '../expense.model'
import type { ExpenseFilters } from '../expense.repository'

const service = new ExpenseService()

export async function createExpense(req: Request, res: Response) {
  try {
    const createdBy = req.user!.id
    const input: CreateExpenseInput = {
      amount: req.body.amount,
      currency: req.body.currency,
      category: req.body.category,
      vendor: req.body.vendor,
      notes: req.body.notes,
      effectiveDate: new Date(req.body.effectiveDate),
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      isRecurringMonthly: req.body.isRecurringMonthly ?? false,
      projectId: req.body.projectId,
      workspaceId: req.body.workspaceId,
      metadata: req.body.metadata,
    }

    const expense = await service.createExpense(input, createdBy)
    res.json({ status: 'success', data: expense })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create expense'
    res.status(400).json({ status: 'error', message })
  }
}

export async function getExpenses(req: Request, res: Response) {
  try {
    const filters: ExpenseFilters = {}
    
    if (req.query.startDate) {
      filters.startDate = new Date(req.query.startDate as string)
    }
    if (req.query.endDate) {
      filters.endDate = new Date(req.query.endDate as string)
    }
    if (req.query.category) {
      filters.category = req.query.category as string
    }
    if (req.query.vendor) {
      filters.vendor = req.query.vendor as string
    }
    if (req.query.projectId) {
      filters.projectId = req.query.projectId as string
    }
    if (req.query.workspaceId) {
      filters.workspaceId = req.query.workspaceId as string
    }
    if (req.query.search) {
      filters.search = req.query.search as string
    }

    const expenses = await service.listExpenses(filters)
    res.json({ status: 'success', data: expenses })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch expenses'
    res.status(500).json({ status: 'error', message })
  }
}

export async function getExpense(req: Request, res: Response) {
  try {
    const { id } = req.params
    const expense = await service.getExpense(id)
    
    if (!expense) {
      return res.status(404).json({ status: 'error', message: 'Expense not found' })
    }

    res.json({ status: 'success', data: expense })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch expense'
    res.status(500).json({ status: 'error', message })
  }
}

export async function updateExpense(req: Request, res: Response) {
  try {
    const { id } = req.params
    const input: UpdateExpenseInput = {}
    
    if (req.body.amount !== undefined) input.amount = req.body.amount
    if (req.body.currency !== undefined) input.currency = req.body.currency
    if (req.body.category !== undefined) input.category = req.body.category
    if (req.body.vendor !== undefined) input.vendor = req.body.vendor
    if (req.body.notes !== undefined) input.notes = req.body.notes
    if (req.body.effectiveDate !== undefined) input.effectiveDate = new Date(req.body.effectiveDate)
    if (req.body.endDate !== undefined) input.endDate = req.body.endDate === null ? null : new Date(req.body.endDate)
    if (req.body.isRecurringMonthly !== undefined) input.isRecurringMonthly = req.body.isRecurringMonthly
    if (req.body.projectId !== undefined) input.projectId = req.body.projectId
    if (req.body.workspaceId !== undefined) input.workspaceId = req.body.workspaceId
    if (req.body.metadata !== undefined) input.metadata = req.body.metadata

    const expense = await service.updateExpense(id, input)
    
    if (!expense) {
      return res.status(404).json({ status: 'error', message: 'Expense not found' })
    }

    res.json({ status: 'success', data: expense })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update expense'
    res.status(400).json({ status: 'error', message })
  }
}

export async function deleteExpense(req: Request, res: Response) {
  try {
    const { id } = req.params
    const deleted = await service.deleteExpense(id)
    
    if (!deleted) {
      return res.status(404).json({ status: 'error', message: 'Expense not found' })
    }

    res.json({ status: 'success', message: 'Expense deleted successfully' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete expense'
    res.status(500).json({ status: 'error', message })
  }
}
