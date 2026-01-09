import { BudgetRepository } from './budget.repository'
import { CostAnalyticsService } from './cost-analytics.service'
import type { Budget, CreateBudgetInput, UpdateBudgetInput } from './budget.model'

export type BudgetComparison = {
  budget: Budget
  actualCost: number
  actualHours: number
  remainingBudget: number
  remainingDays: number
  utilizationPercentage: number
  alertLevel: 'ok' | 'warning' | 'critical'
  projectedCost: number // Based on current burn rate
  projectedOverspend: number // Negative if under budget
}

export class BudgetService {
  constructor(
    private budgetRepo = new BudgetRepository(),
    private costAnalyticsService = new CostAnalyticsService()
  ) {}

  async createBudget(input: CreateBudgetInput, createdBy: string): Promise<Budget> {
    // Validate date range
    if (input.startDate >= input.endDate) {
      throw new Error('Start date must be before end date')
    }

    // Validate amount
    if (input.amount <= 0) {
      throw new Error('Budget amount must be greater than 0')
    }

    return this.budgetRepo.create(input, createdBy)
  }

  async getBudget(id: string): Promise<Budget | null> {
    return this.budgetRepo.findById(id)
  }

  async getAllBudgets(): Promise<Budget[]> {
    return this.budgetRepo.findAll()
  }

  async getBudgetsByProject(project: string | null): Promise<Budget[]> {
    return this.budgetRepo.findByProject(project)
  }

  async getActiveBudgets(date: Date = new Date()): Promise<Budget[]> {
    return this.budgetRepo.findActive(date)
  }

  async updateBudget(id: string, input: UpdateBudgetInput): Promise<Budget | null> {
    const existing = await this.budgetRepo.findById(id)
    if (!existing) {
      return null
    }

    // Validate date range if dates are being updated
    const startDate = input.startDate ?? new Date(existing.startDate)
    const endDate = input.endDate ?? new Date(existing.endDate)
    
    if (startDate >= endDate) {
      throw new Error('Start date must be before end date')
    }

    // Validate amount if being updated
    const amount = input.amount ?? existing.amount
    if (amount <= 0) {
      throw new Error('Budget amount must be greater than 0')
    }

    return this.budgetRepo.update(id, input)
  }

  async deleteBudget(id: string): Promise<boolean> {
    return this.budgetRepo.delete(id)
  }

  async getBudgetComparison(budgetId: string): Promise<BudgetComparison | null> {
    const budget = await this.budgetRepo.findById(budgetId)
    if (!budget) {
      return null
    }

    const startDate = new Date(budget.startDate)
    const endDate = new Date(budget.endDate)
    const now = new Date()

    // Get actual costs for the budget period
    const summary = await this.costAnalyticsService.getCostSummary(startDate, endDate)
    
    // Filter by project if budget is project-specific
    let actualCost = summary.totalCost
    let actualHours = summary.totalHours
    
    if (budget.project) {
      const projectData = summary.projectCosts.find(p => p.project === budget.project)
      if (projectData) {
        actualCost = projectData.totalCost
        actualHours = projectData.totalHours
      } else {
        actualCost = 0
        actualHours = 0
      }
    }

    // Calculate remaining budget
    const remainingBudget = budget.amount - actualCost

    // Calculate remaining days
    const remainingDays = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

    // Calculate utilization percentage
    const utilizationPercentage = budget.amount > 0 ? (actualCost / budget.amount) * 100 : 0

    // Determine alert level
    let alertLevel: 'ok' | 'warning' | 'critical' = 'ok'
    if (utilizationPercentage >= budget.alertThresholds.critical) {
      alertLevel = 'critical'
    } else if (utilizationPercentage >= budget.alertThresholds.warning) {
      alertLevel = 'warning'
    }

    // Calculate projected cost based on current burn rate
    const daysElapsed = Math.max(1, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const dailyAverage = daysElapsed > 0 ? actualCost / daysElapsed : 0
    const projectedCost = dailyAverage * totalDays

    // Calculate projected overspend
    const projectedOverspend = projectedCost - budget.amount

    return {
      budget,
      actualCost,
      actualHours,
      remainingBudget,
      remainingDays,
      utilizationPercentage,
      alertLevel,
      projectedCost,
      projectedOverspend,
    }
  }

  async getAllBudgetComparisons(date: Date = new Date()): Promise<BudgetComparison[]> {
    const activeBudgets = await this.budgetRepo.findActive(date)
    const comparisons = await Promise.all(
      activeBudgets.map(budget => this.getBudgetComparison(budget.id))
    )
    return comparisons.filter((c): c is BudgetComparison => c !== null)
  }
}
