import type { Request, Response, NextFunction } from 'express'
import { createHttpError } from '../../../utils/http-error'
import { RecurringEmployeeCostRepository, type RecurringEmployeeCostFilters } from './recurring-employee-cost.repository'
import type { CreateRecurringEmployeeCostInput, UpdateRecurringEmployeeCostInput, RecurringFrequency, RecurringStatus } from './recurring-employee-cost.model'

const repository = new RecurringEmployeeCostRepository()

const VALID_FREQUENCIES: RecurringFrequency[] = ['weekly', 'biweekly', 'monthly']
const VALID_STATUSES: RecurringStatus[] = ['active', 'paused', 'ended']

export async function getRecurringEmployeeCosts(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1)
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 20))

    const filters: RecurringEmployeeCostFilters = {}
    if (req.query.employeeId) {
      filters.employeeId = req.query.employeeId as string
    }
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

export async function createRecurringEmployeeCost(req: Request, res: Response, next: NextFunction) {
  try {
    const createdBy = req.user!.id
    const input: CreateRecurringEmployeeCostInput = {
      employeeId: req.body.employeeId,
      amount: req.body.amount,
      currency: req.body.currency,
      vendor: req.body.vendor,
      category: req.body.category,
      frequency: req.body.frequency,
      startDate: req.body.startDate ? new Date(req.body.startDate) : new Date(),
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      status: req.body.status,
    }

    if (!input.employeeId) {
      return next(createHttpError(400, 'Employee ID is required'))
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

    if (input.endDate && input.endDate <= input.startDate) {
      return next(createHttpError(400, 'End date must be after start date'))
    }

    const recurring = await repository.create(input, createdBy)
    res.status(201).json({ status: 'success', data: recurring })
  } catch (error) {
    next(error)
  }
}

export async function updateRecurringEmployeeCost(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const input: UpdateRecurringEmployeeCostInput = {}

    if (req.body.employeeId !== undefined) input.employeeId = req.body.employeeId
    if (req.body.amount !== undefined) input.amount = req.body.amount
    if (req.body.currency !== undefined) input.currency = req.body.currency
    if (req.body.vendor !== undefined) input.vendor = req.body.vendor
    if (req.body.category !== undefined) input.category = req.body.category
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

    const updated = await repository.update(id, input)
    if (!updated) {
      return next(createHttpError(404, 'Recurring employee cost not found'))
    }

    res.json({ status: 'success', data: updated })
  } catch (error) {
    next(error)
  }
}

export async function deleteRecurringEmployeeCost(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const deleted = await repository.delete(id)
    if (!deleted) {
      return next(createHttpError(404, 'Recurring employee cost not found'))
    }
    res.json({ status: 'success', message: 'Recurring employee cost deleted successfully' })
  } catch (error) {
    next(error)
  }
}
