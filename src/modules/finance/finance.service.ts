import { ExpenseRepository, type ExpenseFilters } from './expense.repository'
import { EmployeeCostRepository, type EmployeeCostFilters } from './employee-cost.repository'
import type { Expense } from './expense.model'
import type { EmployeeCost } from './employee-cost.model'

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
    private employeeCostRepo = new EmployeeCostRepository()
  ) {}

  async getFinanceSummary(startDate: Date, endDate: Date): Promise<FinanceSummary> {
    // Get expenses and employee costs in date range
    const expenses = await this.expenseRepo.listExpenses({ startDate, endDate })
    const employeeCosts = await this.employeeCostRepo.listEmployeeCosts({ startDate, endDate })

    // Calculate totals
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
    const totalEmployeeCosts = employeeCosts.reduce((sum, c) => sum + c.amount, 0)
    const totalOutflow = totalExpenses + totalEmployeeCosts

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

    // Aggregate by category (expenses only)
    const categoryMap = new Map<string, { cost: number }>()
    for (const expense of expenses) {
      if (expense.category) {
        const existing = categoryMap.get(expense.category) || { cost: 0 }
        existing.cost += expense.amount
        categoryMap.set(expense.category, existing)
      }
    }
    const topCategories = Array.from(categoryMap.entries())
      .map(([category, data]) => ({ category, cost: data.cost }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5)

    // Aggregate by vendor (expenses only)
    const vendorMap = new Map<string, { cost: number }>()
    for (const expense of expenses) {
      if (expense.vendor) {
        const existing = vendorMap.get(expense.vendor) || { cost: 0 }
        existing.cost += expense.amount
        vendorMap.set(expense.vendor, existing)
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
