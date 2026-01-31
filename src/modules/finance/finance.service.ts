import { ExpenseRepository } from './expense.repository'
import { EmployeeCostRepository } from './employee-cost.repository'
import { RecurringExpenseRepository } from './recurring-expenses/recurring-expense.repository'
import { RecurringEmployeeCostRepository } from './recurring-employee-costs/recurring-employee-cost.repository'
import type { RecurringFrequency } from './recurring-expenses/recurring-expense.model'
import type { Expense } from './expense.model'
import type { EmployeeCost } from './employee-cost.model'
import type { RecurringExpense } from './recurring-expenses/recurring-expense.model'
import type { RecurringEmployeeCost } from './recurring-employee-costs/recurring-employee-cost.model'

export type FinanceSummary = {
  totalExpenses: number
  totalEmployeeCosts: number
  totalOutflow: number
  dailyCosts: Array<{ date: string; cost: number }>
  monthlyCosts: Array<{ month: string; cost: number }>
  topCategories: Array<{ category: string; cost: number }>
  topVendors: Array<{ vendor: string; cost: number }>
}

export class FinanceService {
  constructor(
    private expenseRepo = new ExpenseRepository(),
    private employeeCostRepo = new EmployeeCostRepository(),
    private recurringExpenseRepo = new RecurringExpenseRepository(),
    private recurringEmployeeCostRepo = new RecurringEmployeeCostRepository()
  ) {}

  private addFrequency(date: Date, frequency: RecurringFrequency): Date {
    const next = new Date(date)
    if (frequency === 'weekly') {
      next.setDate(next.getDate() + 7)
    } else if (frequency === 'biweekly') {
      next.setDate(next.getDate() + 14)
    } else {
      next.setMonth(next.getMonth() + 1)
    }
    return next
  }

  private normalizeDate(date: Date): Date {
    const normalized = new Date(date)
    normalized.setHours(0, 0, 0, 0)
    return normalized
  }

  private addRecurringToDailyMap(options: {
    itemStart: Date
    itemEnd?: Date
    frequency: RecurringFrequency
    amount: number
    rangeStart: Date
    rangeEnd: Date
    dailyMap: Map<string, { cost: number }>
  }): number {
    const { itemStart, itemEnd, frequency, amount, rangeStart, rangeEnd, dailyMap } = options
    const start = this.normalizeDate(itemStart)
    const end = itemEnd ? this.normalizeDate(itemEnd) : rangeEnd
    const rangeStartDate = this.normalizeDate(rangeStart)
    const rangeEndDate = this.normalizeDate(rangeEnd)

    if (start > rangeEndDate || end < rangeStartDate) return 0

    let current = new Date(start)
    while (current < rangeStartDate) {
      current = this.addFrequency(current, frequency)
    }

    let total = 0
    while (current <= rangeEndDate && current <= end) {
      const dateKey = current.toISOString().split('T')[0]
      const existing = dailyMap.get(dateKey) || { cost: 0 }
      existing.cost += amount
      dailyMap.set(dateKey, existing)
      total += amount
      current = this.addFrequency(current, frequency)
    }

    return total
  }

  async getFinanceSummary(startDate: Date, endDate: Date): Promise<FinanceSummary> {
    // Get expenses and employee costs in date range
    const expenses = await this.expenseRepo.listExpenses({ startDate, endDate })
    const employeeCosts = await this.employeeCostRepo.listEmployeeCosts({ startDate, endDate })
    const recurringExpenses = await this.recurringExpenseRepo.findForSummary(startDate, endDate)
    const recurringEmployeeCosts = await this.recurringEmployeeCostRepo.findForSummary(startDate, endDate)

    // Calculate totals
    let totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
    let totalEmployeeCosts = employeeCosts.reduce((sum, c) => sum + c.amount, 0)

    // Aggregate daily costs (by effectiveDate)
    const dailyMap = new Map<string, { cost: number }>()

    // Add expenses to daily map
    for (const expense of expenses) {
      const dateKey = new Date(expense.effectiveDate).toISOString().split('T')[0] // YYYY-MM-DD
      const daily = dailyMap.get(dateKey) || { cost: 0 }
      daily.cost += expense.amount
      dailyMap.set(dateKey, daily)
    }

    // Add employee costs to daily map
    for (const cost of employeeCosts) {
      const dateKey = new Date(cost.effectiveDate).toISOString().split('T')[0] // YYYY-MM-DD
      const daily = dailyMap.get(dateKey) || { cost: 0 }
      daily.cost += cost.amount
      dailyMap.set(dateKey, daily)
    }

    // Add recurring expenses to daily map + totals
    for (const recurring of recurringExpenses) {
      if (recurring.status === 'paused') continue
      const recurringTotal = this.addRecurringToDailyMap({
        itemStart: new Date(recurring.startDate),
        itemEnd: recurring.endDate ? new Date(recurring.endDate) : undefined,
        frequency: recurring.frequency,
        amount: recurring.amount,
        rangeStart: startDate,
        rangeEnd: endDate,
        dailyMap,
      })
      totalExpenses += recurringTotal
    }

    // Add recurring employee costs to daily map + totals
    for (const recurring of recurringEmployeeCosts) {
      if (recurring.status === 'paused') continue
      const recurringTotal = this.addRecurringToDailyMap({
        itemStart: new Date(recurring.startDate),
        itemEnd: recurring.endDate ? new Date(recurring.endDate) : undefined,
        frequency: recurring.frequency,
        amount: recurring.amount,
        rangeStart: startDate,
        rangeEnd: endDate,
        dailyMap,
      })
      totalEmployeeCosts += recurringTotal
    }

    const totalOutflow = totalExpenses + totalEmployeeCosts

    // Build daily costs array
    const dailyCosts = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, cost: data.cost }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Build monthly costs from daily
    const monthlyMap = new Map<string, { cost: number }>()
    for (const day of dailyCosts) {
      const month = day.date.substring(0, 7) // YYYY-MM
      const existing = monthlyMap.get(month) || { cost: 0 }
      existing.cost += day.cost
      monthlyMap.set(month, existing)
    }
    const monthlyCosts = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({ month, cost: data.cost }))
      .sort((a, b) => a.month.localeCompare(b.month))

    // Aggregate by category (expenses + recurring expenses)
    const categoryMap = new Map<string, { cost: number }>()
    for (const expense of expenses) {
      if (expense.category) {
        const existing = categoryMap.get(expense.category) || { cost: 0 }
        existing.cost += expense.amount
        categoryMap.set(expense.category, existing)
      }
    }
    for (const recurring of recurringExpenses) {
      if (!recurring.category || recurring.status === 'paused') continue
      const recurringTotal = this.addRecurringToDailyMap({
        itemStart: new Date(recurring.startDate),
        itemEnd: recurring.endDate ? new Date(recurring.endDate) : undefined,
        frequency: recurring.frequency,
        amount: recurring.amount,
        rangeStart: startDate,
        rangeEnd: endDate,
        dailyMap: new Map(),
      })
      if (recurringTotal > 0) {
        const existing = categoryMap.get(recurring.category) || { cost: 0 }
        existing.cost += recurringTotal
        categoryMap.set(recurring.category, existing)
      }
    }
    const topCategories = Array.from(categoryMap.entries())
      .map(([category, data]) => ({ category, cost: data.cost }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5)

    // Aggregate by vendor (expenses + recurring expenses)
    const vendorMap = new Map<string, { cost: number }>()
    for (const expense of expenses) {
      if (expense.vendor) {
        const existing = vendorMap.get(expense.vendor) || { cost: 0 }
        existing.cost += expense.amount
        vendorMap.set(expense.vendor, existing)
      }
    }
    for (const recurring of recurringExpenses) {
      if (!recurring.vendor || recurring.status === 'paused') continue
      const recurringTotal = this.addRecurringToDailyMap({
        itemStart: new Date(recurring.startDate),
        itemEnd: recurring.endDate ? new Date(recurring.endDate) : undefined,
        frequency: recurring.frequency,
        amount: recurring.amount,
        rangeStart: startDate,
        rangeEnd: endDate,
        dailyMap: new Map(),
      })
      if (recurringTotal > 0) {
        const existing = vendorMap.get(recurring.vendor) || { cost: 0 }
        existing.cost += recurringTotal
        vendorMap.set(recurring.vendor, existing)
      }
    }
    const topVendors = Array.from(vendorMap.entries())
      .map(([vendor, data]) => ({ vendor, cost: data.cost }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5)

    return {
      totalExpenses,
      totalEmployeeCosts,
      totalOutflow,
      dailyCosts,
      monthlyCosts,
      topCategories,
      topVendors,
    }
  }
}
