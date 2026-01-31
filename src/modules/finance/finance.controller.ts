/**
 * Finance Controller
 * 
 * Handles finance summary and employee cost endpoints.
 * Note: Expense endpoints have moved to expenses/expense.controller.ts
 */

import type { Request, Response, NextFunction } from 'express'
import { createHttpError } from '../../utils/http-error'
import { FinanceService } from './finance.service'
import { EmployeeCostRepository, type EmployeeCostFilters } from './employee-cost.repository'
import { RecurringEmployeeCostModel } from './recurring-employee-costs/recurring-employee-cost.model'
import type { CreateEmployeeCostInput, UpdateEmployeeCostInput } from './employee-cost.model'

const financeService = new FinanceService()
const employeeCostRepo = new EmployeeCostRepository()

function mergeUnique(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value && value.trim()))).sort((a, b) => a.localeCompare(b))
}

export async function getFinanceSummary(req: Request, res: Response, next: NextFunction) {
  try {
    let startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date()
    let endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date()

    // Default to last 15 days if no dates provided
    if (!req.query.startDate) {
      startDate.setDate(startDate.getDate() - 15)
      startDate.setHours(0, 0, 0, 0)
    } else {
      // Normalize provided startDate to beginning of day
      startDate.setHours(0, 0, 0, 0)
    }

    if (!req.query.endDate) {
      endDate.setHours(23, 59, 59, 999)
    } else {
      // Normalize provided endDate to end of day
      endDate.setHours(23, 59, 59, 999)
    }

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return next(createHttpError(400, 'Invalid date format'))
    }

    if (startDate > endDate) {
      return next(createHttpError(400, 'Start date must be before end date'))
    }

    const summary = await financeService.getFinanceSummary(startDate, endDate)
    res.json({ status: 'success', data: summary })
  } catch (error) {
    next(error)
  }
}

// Employee Cost endpoints
// NOTE: Salary is not tracked here - it comes from Users.monthlySalary
export async function getEmployeeCosts(req: Request, res: Response, next: NextFunction) {
  try {
    let startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined
    let endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined

    if (startDate) {
      startDate.setHours(0, 0, 0, 0)
    }
    if (endDate) {
      endDate.setHours(23, 59, 59, 999)
    }

    const filters: EmployeeCostFilters = {
      employeeId: req.query.employeeId as string | undefined,
      startDate,
      endDate,
    }
    if (req.query.search) {
      filters.search = req.query.search as string
    }

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1)
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 20))
    const { data, total } = await employeeCostRepo.listEmployeeCostsPaginated(filters, page, limit)

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

export async function getEmployeeCostOptions(_req: Request, res: Response, next: NextFunction) {
  try {
    const base = await employeeCostRepo.getOptions()
    const [recurringVendors, recurringCategories] = await Promise.all([
      RecurringEmployeeCostModel.distinct('vendor', { vendor: { $nin: [null, ''] } }),
      RecurringEmployeeCostModel.distinct('category', { category: { $nin: [null, ''] } }),
    ])

    res.json({
      status: 'success',
      data: {
        vendors: mergeUnique([...base.vendors, ...recurringVendors]),
        categories: mergeUnique([...base.categories, ...recurringCategories]),
      },
    })
  } catch (error) {
    next(error)
  }
}

export async function createEmployeeCost(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const input: CreateEmployeeCostInput = {
      employeeId: req.body.employeeId,
      amount: req.body.amount,
      currency: req.body.currency,
      vendor: req.body.vendor,
      category: req.body.category,
      effectiveDate: req.body.effectiveDate ? new Date(req.body.effectiveDate) : new Date(),
    }

    // Validate required fields
    if (!input.employeeId) {
      return next(createHttpError(400, 'Employee ID is required'))
    }

    if (typeof input.amount !== 'number' || input.amount < 0) {
      return next(createHttpError(400, 'Amount must be a valid positive number'))
    }

    const cost = await employeeCostRepo.create(input, userId)
    res.status(201).json({ status: 'success', data: cost })
  } catch (error) {
    next(error)
  }
}

export async function updateEmployeeCost(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const input: UpdateEmployeeCostInput = {}

    if (req.body.employeeId !== undefined) input.employeeId = req.body.employeeId
    if (req.body.amount !== undefined) input.amount = req.body.amount
    if (req.body.currency !== undefined) input.currency = req.body.currency
    if (req.body.vendor !== undefined) input.vendor = req.body.vendor
    if (req.body.category !== undefined) input.category = req.body.category
    if (req.body.effectiveDate !== undefined) input.effectiveDate = new Date(req.body.effectiveDate)

    if (input.amount !== undefined && (typeof input.amount !== 'number' || input.amount < 0)) {
      return next(createHttpError(400, 'Amount must be a valid positive number'))
    }

    const cost = await employeeCostRepo.updateEmployeeCost(id, input)

    if (!cost) {
      return next(createHttpError(404, 'Employee cost not found'))
    }

    res.json({ status: 'success', data: cost })
  } catch (error) {
    next(error)
  }
}

export async function deleteEmployeeCost(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const deleted = await employeeCostRepo.deleteEmployeeCost(id)

    if (!deleted) {
      return next(createHttpError(404, 'Employee cost not found'))
    }

    res.json({ status: 'success', message: 'Employee cost deleted successfully' })
  } catch (error) {
    next(error)
  }
}
