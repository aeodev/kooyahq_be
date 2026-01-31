import type { Request, Response, NextFunction } from 'express'
import { createHttpError } from '../../../utils/http-error'
import { RecurringExpenseRepository, type RecurringExpenseFilters } from './recurring-expense.repository'
import type { CreateRecurringExpenseInput, UpdateRecurringExpenseInput, RecurringFrequency, RecurringStatus } from './recurring-expense.model'

const repository = new RecurringExpenseRepository()

const VALID_FREQUENCIES: RecurringFrequency[] = ['weekly', 'biweekly', 'monthly']
const VALID_STATUSES: RecurringStatus[] = ['active', 'paused', 'ended']

export async function getRecurringExpenses(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1)
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 20))

    const filters: RecurringExpenseFilters = {}
    if (req.query.status && VALID_STATUSES.includes(req.query.status as RecurringStatus)) {
      filters.status = req.query.status as RecurringStatus
    }
    if (req.query.frequency && VALID_FREQUENCIES.includes(req.query.frequency as RecurringFrequency)) {
      filters.frequency = req.query.frequency as RecurringFrequency
    }
    if (req.query.search) {
      filters.search = req.query.search as string
    }

    const { data, total } = await repository.listPaginated(filters, page, limit)
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
    next(error)
  }
}

export async function createRecurringExpense(req: Request, res: Response, next: NextFunction) {
  try {
    const createdBy = req.user!.id
    const input: CreateRecurringExpenseInput = {
      amount: req.body.amount,
      currency: req.body.currency,
      vendor: req.body.vendor,
      category: req.body.category,
      notes: req.body.notes,
      frequency: req.body.frequency,
      startDate: req.body.startDate ? new Date(req.body.startDate) : new Date(),
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      status: req.body.status,
    }

    if (typeof input.amount !== 'number' || input.amount <= 0) {
      return next(createHttpError(400, 'Amount must be a valid positive number'))
    }

    if (!input.frequency || !VALID_FREQUENCIES.includes(input.frequency)) {
      return next(createHttpError(400, `Invalid frequency. Valid values: ${VALID_FREQUENCIES.join(', ')}`))
    }

    if (input.status && !VALID_STATUSES.includes(input.status)) {
      return next(createHttpError(400, `Invalid status. Valid values: ${VALID_STATUSES.join(', ')}`))
    }

    if (input.notes && input.notes.length > 2000) {
      return next(createHttpError(400, 'Notes must be 2000 characters or less'))
    }

    if (input.endDate && input.endDate <= input.startDate) {
      return next(createHttpError(400, 'End date must be after start date'))
    }

    const recurring = await repository.create(input, createdBy)
    res.status(201).json({ status: 'success', data: recurring })
  } catch (error) {
    next(error)
  }
}

export async function updateRecurringExpense(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const input: UpdateRecurringExpenseInput = {}

    if (req.body.amount !== undefined) input.amount = req.body.amount
    if (req.body.currency !== undefined) input.currency = req.body.currency
    if (req.body.vendor !== undefined) input.vendor = req.body.vendor
    if (req.body.category !== undefined) input.category = req.body.category
    if (req.body.notes !== undefined) input.notes = req.body.notes
    if (req.body.frequency !== undefined) input.frequency = req.body.frequency
    if (req.body.startDate !== undefined) input.startDate = new Date(req.body.startDate)
    if (req.body.endDate !== undefined) input.endDate = req.body.endDate === null ? null : new Date(req.body.endDate)
    if (req.body.status !== undefined) input.status = req.body.status

    if (input.amount !== undefined && (typeof input.amount !== 'number' || input.amount <= 0)) {
      return next(createHttpError(400, 'Amount must be a valid positive number'))
    }

    if (input.frequency !== undefined && !VALID_FREQUENCIES.includes(input.frequency)) {
      return next(createHttpError(400, `Invalid frequency. Valid values: ${VALID_FREQUENCIES.join(', ')}`))
    }

    if (input.status !== undefined && !VALID_STATUSES.includes(input.status)) {
      return next(createHttpError(400, `Invalid status. Valid values: ${VALID_STATUSES.join(', ')}`))
    }

    if (input.notes && input.notes.length > 2000) {
      return next(createHttpError(400, 'Notes must be 2000 characters or less'))
    }

    const updated = await repository.update(id, input)
    if (!updated) {
      return next(createHttpError(404, 'Recurring expense not found'))
    }

    res.json({ status: 'success', data: updated })
  } catch (error) {
    next(error)
  }
}

export async function deleteRecurringExpense(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const deleted = await repository.delete(id)
    if (!deleted) {
      return next(createHttpError(404, 'Recurring expense not found'))
    }
    res.json({ status: 'success', message: 'Recurring expense deleted successfully' })
  } catch (error) {
    next(error)
  }
}
