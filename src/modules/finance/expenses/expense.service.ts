/**
 * Expense Service
 * 
 * IMPORTANT PRODUCT RULES:
 * - No salary as expense type
 * - notes field for free text (not description)
 */

import { ExpenseRepository } from '../expense.repository'
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

    return this.expenseRepo.updateExpense(id, input)
  }

  async deleteExpense(id: string): Promise<boolean> {
    return this.expenseRepo.deleteExpense(id)
  }

  /**
   * Get total expenses for a date range
   */
  async getExpenseTotal(startDate: Date, endDate: Date): Promise<number> {
    const expenses = await this.expenseRepo.listExpenses({ startDate, endDate })
    return expenses.reduce((sum, e) => sum + e.amount, 0)
  }
}
