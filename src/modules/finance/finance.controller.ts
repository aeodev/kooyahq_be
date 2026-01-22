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
import type { CreateEmployeeCostInput, UpdateEmployeeCostInput, EMPLOYEE_COST_TYPES, EmployeeCostType } from './employee-cost.model'

const financeService = new FinanceService()
const employeeCostRepo = new EmployeeCostRepository()

// Valid employee cost types (salary is NOT allowed)
const VALID_COST_TYPES: EmployeeCostType[] = ['subscription', 'equipment', 'training', 'benefit', 'other']

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
// NOTE: 'salary' is NOT a valid cost type - salary comes from Users.monthlySalary
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

    const costType = req.query.costType as EmployeeCostType | undefined
    
    // Validate costType if provided
    if (costType && !VALID_COST_TYPES.includes(costType)) {
      return next(createHttpError(400, `Invalid cost type. Valid types: ${VALID_COST_TYPES.join(', ')}`))
    }

    const filters: EmployeeCostFilters = {
      employeeId: req.query.employeeId as string | undefined,
      startDate,
      endDate,
      costType,
    }

    const costs = await employeeCostRepo.listEmployeeCosts(filters)
    res.json({ status: 'success', data: costs })
  } catch (error) {
    next(error)
  }
}

export async function createEmployeeCost(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id
    const input: CreateEmployeeCostInput = req.body

    // Validate required fields
    if (!input.employeeId) {
      return next(createHttpError(400, 'Employee ID is required'))
    }

    if (typeof input.amount !== 'number' || input.amount < 0) {
      return next(createHttpError(400, 'Amount must be a valid positive number'))
    }

    // SECURITY: Validate that salary is NOT a cost type
    // Salary comes EXCLUSIVELY from Users.monthlySalary
    if (!input.costType || !VALID_COST_TYPES.includes(input.costType)) {
      return next(createHttpError(400, `Invalid cost type. Valid types: ${VALID_COST_TYPES.join(', ')}. Note: Salary is not tracked as an employee cost - it comes from user records.`))
    }

    if (!input.effectiveDate) {
      input.effectiveDate = new Date()
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
    const input: UpdateEmployeeCostInput = req.body

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
