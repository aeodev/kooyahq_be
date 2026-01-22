/**
 * Budget Service with BOLA (Broken Object Level Authorization) Protection
 * 
 * SECURITY: This service implements object-level authorization.
 * - Users can only modify/delete budgets they created
 * - FINANCE_FULL_ACCESS or SYSTEM_FULL_ACCESS can override ownership checks
 * - Read operations may be scoped by workspace/project membership
 */

import { BudgetRepository } from './budget.repository'
import { AnalyticsService } from '../analytics/analytics.service'
import type { Budget, CreateBudgetInput, UpdateBudgetInput } from './budget.model'
import { hasPermission, PERMISSIONS, type Permission } from '../../auth/rbac/permissions'

export type BudgetComparison = {
  budget: Budget
  actualCost: number
  actualHours: number
  remainingBudget: number
  remainingDays: number
  utilizationPercentage: number
  alertLevel: 'ok' | 'warning' | 'critical'
  projectedCost: number
  projectedOverspend: number
}

export type AuthContext = {
  userId: string
  permissions: Permission[]
}

export class BudgetService {
  constructor(
    private budgetRepo = new BudgetRepository(),
    private analyticsService = new AnalyticsService()
  ) {}

  /**
   * Check if user can modify a budget (BOLA protection)
   */
  private canModify(budget: Budget, auth: AuthContext): boolean {
    // Owner can always modify their own budgets
    if (budget.createdBy === auth.userId) {
      return true
    }
    
    // Full access permissions bypass ownership check
    if (hasPermission({ permissions: auth.permissions }, PERMISSIONS.FINANCE_FULL_ACCESS)) {
      return true
    }
    
    if (hasPermission({ permissions: auth.permissions }, PERMISSIONS.SYSTEM_FULL_ACCESS)) {
      return true
    }
    
    return false
  }

  /**
   * Check if user can read a budget
   * Default: anyone with FINANCE_VIEW can read all budgets
   * Could be extended to scope by workspace/project membership
   */
  private canRead(_budget: Budget, _auth: AuthContext): boolean {
    // For now, read access is granted by route-level permission check
    // Could add workspace/project membership checks here in the future
    return true
  }

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

  async getBudget(id: string, auth: AuthContext): Promise<Budget | null> {
    const budget = await this.budgetRepo.findById(id)
    if (!budget) return null
    
    if (!this.canRead(budget, auth)) {
      return null // Return null instead of throwing to not leak existence
    }
    
    return budget
  }

  async getAllBudgets(_auth: AuthContext): Promise<Budget[]> {
    // Route-level permission check ensures user has at least FINANCE_VIEW
    return this.budgetRepo.findAll()
  }

  async getBudgetsByProject(project: string | null, _auth: AuthContext): Promise<Budget[]> {
    return this.budgetRepo.findByProject(project)
  }

  async getActiveBudgets(date: Date = new Date(), _auth: AuthContext): Promise<Budget[]> {
    return this.budgetRepo.findActive(date)
  }

  /**
   * Update a budget with BOLA check
   * @throws Error if user is not authorized to modify the budget
   */
  async updateBudget(id: string, input: UpdateBudgetInput, auth: AuthContext): Promise<Budget | null> {
    const existing = await this.budgetRepo.findById(id)
    if (!existing) {
      return null
    }

    // BOLA CHECK: Verify user can modify this budget
    if (!this.canModify(existing, auth)) {
      throw new Error('Not authorized to modify this budget')
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

  /**
   * Delete a budget with BOLA check
   * @throws Error if user is not authorized to delete the budget
   */
  async deleteBudget(id: string, auth: AuthContext): Promise<boolean> {
    const existing = await this.budgetRepo.findById(id)
    if (!existing) {
      return false
    }

    // BOLA CHECK: Verify user can modify (delete) this budget
    if (!this.canModify(existing, auth)) {
      throw new Error('Not authorized to delete this budget')
    }

    return this.budgetRepo.delete(id)
  }

  async getBudgetComparison(budgetId: string, auth: AuthContext): Promise<BudgetComparison | null> {
    const budget = await this.budgetRepo.findById(budgetId)
    if (!budget) {
      return null
    }

    if (!this.canRead(budget, auth)) {
      return null
    }

    const startDate = new Date(budget.startDate)
    const endDate = new Date(budget.endDate)
    const now = new Date()

    // Get actual costs for the budget period
    const summary = await this.analyticsService.getCostSummary(startDate, endDate)
    
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

  async getAllBudgetComparisons(date: Date = new Date(), auth: AuthContext): Promise<BudgetComparison[]> {
    const activeBudgets = await this.budgetRepo.findActive(date)
    const comparisons = await Promise.all(
      activeBudgets.map(budget => this.getBudgetComparison(budget.id, auth))
    )
    return comparisons.filter((c): c is BudgetComparison => c !== null)
  }
}
