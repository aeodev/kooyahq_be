/**
 * Expense Controller
 */

import { Request, Response } from 'express'
import { ExpenseService } from './expense.service'
import { ExpenseRepository } from '../expense.repository'
import { RecurringExpenseModel } from '../recurring-expenses/recurring-expense.model'
import type { CreateExpenseInput, UpdateExpenseInput } from '../expense.model'
import type { ExpenseFilters } from '../expense.repository'

const service = new ExpenseService()
const repository = new ExpenseRepository()

function mergeUnique(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value && value.trim()))).sort((a, b) => a.localeCompare(b))
}

export async function getExpenseOptions(_req: Request, res: Response) {
  const base = await repository.getOptions()
  const [recurringVendors, recurringCategories] = await Promise.all([
    RecurringExpenseModel.distinct('vendor', { vendor: { $nin: [null, ''] } }),
    RecurringExpenseModel.distinct('category', { category: { $nin: [null, ''] } }),
  ])

  res.json({
    status: 'success',
    data: {
      vendors: mergeUnique([...base.vendors, ...recurringVendors]),
      categories: mergeUnique([...base.categories, ...recurringCategories]),
    },
  })
}

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
    if (req.query.search) {
      filters.search = req.query.search as string
    }

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1)
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 20))
    const { data, total } = await repository.listExpensesPaginated(filters, page, limit)

    res.json({
      status: 'success',
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
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
