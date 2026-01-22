/**
 * Expense Service
 * 
 * IMPORTANT PRODUCT RULES:
 * - No salary as expense type
 * - isRecurringMonthly is the ONLY recurrence option
 * - notes field for free text (not description)
 */

import { ExpenseRepository, type ExpenseFilters } from '../expense.repository'
import type { Expense, CreateExpenseInput, UpdateExpenseInput } from '../expense.model'

export class ExpenseService {
  constructor(
    private expenseRepo = new ExpenseRepository()
  ) {}

  async createExpense(input: CreateExpenseInput, createdBy: string): Promise<Expense> {
    // Validate amount
    if (input.amount <= 0) {
      throw new Error('Expense amount must be greater than 0')
    }

    // Validate dates if recurring with end date
    if (input.isRecurringMonthly && input.endDate && input.endDate <= input.effectiveDate) {
      throw new Error('End date must be after effective date for recurring expenses')
    }

    // Validate notes length
    if (input.notes && input.notes.length > 2000) {
      throw new Error('Notes must be 2000 characters or less')
    }

    return this.expenseRepo.create(input, createdBy)
  }

  async getExpense(id: string): Promise<Expense | null> {
    return this.expenseRepo.findById(id)
  }

  async listExpenses(filters: ExpenseFilters): Promise<Expense[]> {
    return this.expenseRepo.listExpenses(filters)
  }

  async updateExpense(id: string, input: UpdateExpenseInput): Promise<Expense | null> {
    const existing = await this.expenseRepo.findById(id)
    if (!existing) {
      return null
    }

    // Validate amount if provided
    if (input.amount !== undefined && input.amount <= 0) {
      throw new Error('Expense amount must be greater than 0')
    }

    // Validate notes length
    if (input.notes !== undefined && input.notes.length > 2000) {
      throw new Error('Notes must be 2000 characters or less')
    }

    // Validate date range for recurring
    const isRecurring = input.isRecurringMonthly ?? existing.isRecurringMonthly
    const effectiveDate = input.effectiveDate ?? new Date(existing.effectiveDate)
    const endDate = input.endDate === null ? undefined : (input.endDate ?? (existing.endDate ? new Date(existing.endDate) : undefined))
    
    if (isRecurring && endDate && endDate <= effectiveDate) {
      throw new Error('End date must be after effective date for recurring expenses')
    }

    return this.expenseRepo.updateExpense(id, input)
  }

  async deleteExpense(id: string): Promise<boolean> {
    return this.expenseRepo.deleteExpense(id)
  }

  /**
   * Get total expenses for a date range
   */
  async getExpenseTotal(startDate: Date, endDate: Date, projectId?: string): Promise<number> {
    const filters: ExpenseFilters = { startDate, endDate }
    if (projectId) {
      filters.projectId = projectId
    }
    const expenses = await this.expenseRepo.listExpenses(filters)
    return expenses.reduce((sum, e) => sum + e.amount, 0)
  }
}
