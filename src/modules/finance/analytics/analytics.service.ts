/**
 * Analytics Service - Sanitized Implementation
 * 
 * SECURITY CRITICAL: This service implements data sanitization to prevent salary/rate leakage.
 * - Default methods return SAFE DTOs (no monthlySalary/hourlyRate)
 * - Privileged methods return full data (requires SYSTEM_FULL_ACCESS)
 * 
 * The controller layer MUST enforce permission checks for privileged endpoints.
 */

import { TimeEntryRepository } from '../../time-tracker/time-entry.repository'
import { userRepository } from '../../users/user.repository'
import type { TimeEntry } from '../../time-tracker/time-entry.model'
import type { User } from '../../users/user.model'
import { resolveMediaUrl } from '../../../utils/media-url'
import {
  type SafeLiveCostData,
  type SafeCostSummaryData,
  type SafeProjectCostSummary,
  type SafeTopPerformer,
  type PrivilegedLiveCostData,
  type PrivilegedCostSummaryData,
  type PrivilegedProjectCostSummary,
  type PrivilegedTopPerformer,
  type PrivilegedActiveDeveloper,
  type PrivilegedDeveloperCostSummary,
  type CostForecast,
  type PeriodComparison,
  type SafeOvertimeBreakdown,
  toSafeLiveCostData,
  toSafeCostSummaryData,
} from './analytics.types'

const HOURS_PER_MONTH = 160

export class AnalyticsService {
  constructor(
    private timeEntryRepo = new TimeEntryRepository()
  ) {}

  private calculateHourlyRate(monthlySalary: number): number {
    return monthlySalary / HOURS_PER_MONTH
  }

  private calculateActiveMinutes(entry: TimeEntry): number {
    if (!entry.isActive || !entry.startTime) return 0
    
    const now = new Date()
    const start = new Date(entry.startTime)
    let elapsedMs = now.getTime() - start.getTime()
    
    // Subtract paused duration
    const pausedMs = entry.pausedDuration || 0
    
    // If currently paused, add current pause time
    if (entry.isPaused && entry.lastPausedAt) {
      const currentPauseMs = now.getTime() - new Date(entry.lastPausedAt).getTime()
      elapsedMs -= (pausedMs + currentPauseMs)
    } else {
      elapsedMs -= pausedMs
    }
    
    return Math.max(0, Math.floor(elapsedMs / 60000))
  }

  // ============================================================================
  // SAFE (DEFAULT) METHODS - Never expose salary/rate
  // ============================================================================

  /**
   * Get live cost data with SAFE sanitization
   * Does NOT include monthlySalary or hourlyRate in response
   */
  async getLiveCostData(): Promise<SafeLiveCostData> {
    const privilegedData = await this.getLiveCostDataPrivileged()
    return toSafeLiveCostData(privilegedData)
  }

  /**
   * Get cost summary with SAFE sanitization
   * Does NOT include hourlyRate in response
   */
  async getCostSummary(startDate: Date, endDate: Date, project?: string | null): Promise<SafeCostSummaryData> {
    const privilegedData = await this.getCostSummaryPrivileged(startDate, endDate, project)
    return toSafeCostSummaryData(privilegedData)
  }

  /**
   * Get project detail with SAFE sanitization
   * Does NOT include hourlyRate in response
   */
  async getProjectDetail(projectName: string, startDate: Date, endDate: Date): Promise<SafeProjectCostSummary | null> {
    const privilegedData = await this.getProjectDetailPrivileged(projectName, startDate, endDate)
    if (!privilegedData) return null
    
    return {
      project: privilegedData.project,
      totalCost: privilegedData.totalCost,
      totalHours: privilegedData.totalHours,
      developers: privilegedData.developers.map(d => ({
        userId: d.userId,
        userName: d.userName,
        hours: d.hours,
        cost: d.cost,
      })),
      avgCostPerHour: privilegedData.totalHours > 0 ? privilegedData.totalCost / privilegedData.totalHours : 0,
    }
  }

  // ============================================================================
  // PRIVILEGED METHODS - Include salary/rate (requires SYSTEM_FULL_ACCESS)
  // ============================================================================

  /**
   * Get live cost data with FULL data including salary/rates
   * SECURITY: Controller MUST verify SYSTEM_FULL_ACCESS before calling
   */
  async getLiveCostDataPrivileged(): Promise<PrivilegedLiveCostData> {
    const activeEntries = await this.timeEntryRepo.findAllActive()
    
    if (activeEntries.length === 0) {
      return {
        totalBurnRate: 0,
        totalLiveCost: 0,
        activeHours: 0,
        activeDevelopers: [],
        projectCosts: [],
        timestamp: new Date().toISOString(),
      }
    }

    // Get user data for all active users
    const userIds = [...new Set(activeEntries.map(e => e.userId))]
    const users = await Promise.all(userIds.map(id => userRepository.findById(id)))
    const userMap = new Map<string, User>(
      users.filter((u): u is User => u !== undefined).map(u => [u.id, u])
    )

    // Calculate active developer costs
    const activeDevelopers: PrivilegedActiveDeveloper[] = []
    const projectCostMap = new Map<string, { cost: number; burnRate: number; developers: Set<string>; minutes: number }>()

    for (const entry of activeEntries) {
      const user = userMap.get(entry.userId)
      if (!user) continue

      const monthlySalary = user.monthlySalary || 0
      const hourlyRate = this.calculateHourlyRate(monthlySalary)
      const activeMinutes = this.calculateActiveMinutes(entry)
      const liveCost = (activeMinutes / 60) * hourlyRate

      const profilePic = user.profilePic ? resolveMediaUrl(user.profilePic) : undefined
      
      activeDevelopers.push({
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        profilePic,
        position: user.position,
        projects: entry.projects,
        monthlySalary,
        hourlyRate,
        activeMinutes,
        liveCost,
        startTime: entry.startTime || new Date().toISOString(),
        isPaused: entry.isPaused,
      })

      // Aggregate by project
      for (const project of entry.projects) {
        const existing = projectCostMap.get(project) || { cost: 0, burnRate: 0, developers: new Set<string>(), minutes: 0 }
        existing.cost += liveCost
        existing.burnRate += hourlyRate
        existing.developers.add(entry.userId)
        existing.minutes += activeMinutes
        projectCostMap.set(project, existing)
      }
    }

    // Calculate totals
    const totalBurnRate = activeDevelopers.reduce((sum, d) => sum + d.hourlyRate, 0)
    const totalLiveCost = activeDevelopers.reduce((sum, d) => sum + d.liveCost, 0)
    const totalActiveMinutes = activeDevelopers.reduce((sum, d) => sum + d.activeMinutes, 0)

    // Convert project map to array
    const projectCosts = Array.from(projectCostMap.entries())
      .map(([project, data]) => ({
        project,
        liveCost: data.cost,
        burnRate: data.burnRate,
        developers: data.developers.size,
        activeMinutes: data.minutes,
      }))
      .sort((a, b) => b.liveCost - a.liveCost)

    return {
      totalBurnRate,
      totalLiveCost,
      activeHours: totalActiveMinutes / 60,
      activeDevelopers: activeDevelopers.sort((a, b) => b.liveCost - a.liveCost),
      projectCosts,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * Get cost summary with FULL data including salary/rates
   * SECURITY: Controller MUST verify SYSTEM_FULL_ACCESS before calling
   */
  async getCostSummaryPrivileged(startDate: Date, endDate: Date, project?: string | null): Promise<PrivilegedCostSummaryData> {
    let entries = await this.timeEntryRepo.findByDateRange(null, startDate, endDate)
    
    if (project) {
      entries = entries.filter(e => e.projects.includes(project))
    }
    
    if (entries.length === 0) {
      return {
        totalCost: 0,
        totalHours: 0,
        projectCosts: [],
        topPerformers: [],
        dailyCosts: [],
        monthlyCosts: [],
        overtimeBreakdown: {
          regular: { cost: 0, hours: 0 },
          overtime: { cost: 0, hours: 0 },
          overtimePercentage: 0,
        },
      }
    }

    // Get user data
    const userIds = [...new Set(entries.map(e => e.userId))]
    const users = await Promise.all(userIds.map(id => userRepository.findById(id)))
    const userMap = new Map<string, User>(
      users.filter((u): u is User => u !== undefined).map(u => [u.id, u])
    )

    // Calculate costs by project
    const projectMap = new Map<string, {
      totalCost: number
      totalHours: number
      developers: Map<string, { hours: number; cost: number; hourlyRate: number }>
    }>()

    // Calculate costs by user
    const userCostMap = new Map<string, {
      totalHours: number
      totalCost: number
      hourlyRate: number
      projects: Set<string>
    }>()

    // Calculate daily costs
    const dailyMap = new Map<string, { cost: number; hours: number }>()

    // Overtime tracking
    let regularCost = 0
    let regularHours = 0
    let overtimeCost = 0
    let overtimeHours = 0

    for (const entry of entries) {
      const user = userMap.get(entry.userId)
      if (!user) continue

      const monthlySalary = user.monthlySalary || 0
      const hourlyRate = this.calculateHourlyRate(monthlySalary)
      const hours = entry.duration / 60
      const cost = hours * hourlyRate

      // Track overtime
      if (entry.isOvertime) {
        overtimeCost += cost
        overtimeHours += hours
      } else {
        regularCost += cost
        regularHours += hours
      }

      // Aggregate by project
      for (const proj of entry.projects) {
        const existing = projectMap.get(proj) || {
          totalCost: 0,
          totalHours: 0,
          developers: new Map<string, { hours: number; cost: number; hourlyRate: number }>(),
        }
        existing.totalCost += cost / entry.projects.length
        existing.totalHours += hours / entry.projects.length

        const devData = existing.developers.get(entry.userId) || { hours: 0, cost: 0, hourlyRate }
        devData.hours += hours / entry.projects.length
        devData.cost += cost / entry.projects.length
        existing.developers.set(entry.userId, devData)

        projectMap.set(proj, existing)
      }

      // Aggregate by user
      const userCost = userCostMap.get(entry.userId) || {
        totalHours: 0,
        totalCost: 0,
        hourlyRate,
        projects: new Set<string>(),
      }
      userCost.totalHours += hours
      userCost.totalCost += cost
      entry.projects.forEach(p => userCost.projects.add(p))
      userCostMap.set(entry.userId, userCost)

      // Aggregate by day
      const dateKey = new Date(entry.createdAt).toISOString().split('T')[0]
      const daily = dailyMap.get(dateKey) || { cost: 0, hours: 0 }
      daily.cost += cost
      daily.hours += hours
      dailyMap.set(dateKey, daily)
    }

    // Build project costs array
    const projectCosts: PrivilegedProjectCostSummary[] = Array.from(projectMap.entries())
      .map(([proj, data]) => {
        const developers: PrivilegedDeveloperCostSummary[] = Array.from(data.developers.entries())
          .map(([userId, devData]) => {
            const user = userMap.get(userId)
            return {
              userId,
              userName: user?.name || 'Unknown',
              hours: devData.hours,
              cost: devData.cost,
              hourlyRate: devData.hourlyRate,
            }
          })
          .sort((a, b) => b.cost - a.cost)

        const totalHourlyRates = developers.reduce((sum, d) => sum + d.hourlyRate, 0)
        const avgHourlyRate = developers.length > 0 ? totalHourlyRates / developers.length : 0

        return {
          project: proj,
          totalCost: data.totalCost,
          totalHours: data.totalHours,
          developers,
          avgHourlyRate,
        }
      })
      .sort((a, b) => b.totalCost - a.totalCost)

    // Build top performers array
    const topPerformers: PrivilegedTopPerformer[] = Array.from(userCostMap.entries())
      .map(([userId, data]) => {
        const user = userMap.get(userId)
        const profilePic = user?.profilePic ? resolveMediaUrl(user.profilePic) : undefined
        return {
          userId,
          userName: user?.name || 'Unknown',
          userEmail: user?.email || '',
          profilePic,
          position: user?.position,
          totalHours: data.totalHours,
          totalCost: data.totalCost,
          hourlyRate: data.hourlyRate,
          projectCount: data.projects.size,
          projects: Array.from(data.projects),
        }
      })
      .sort((a, b) => b.totalHours - a.totalHours)
      .slice(0, 20)

    // Build daily costs array
    const dailyCosts = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Build monthly costs
    const monthlyMap = new Map<string, { cost: number; hours: number }>()
    for (const day of dailyCosts) {
      const month = day.date.substring(0, 7)
      const existing = monthlyMap.get(month) || { cost: 0, hours: 0 }
      existing.cost += day.cost
      existing.hours += day.hours
      monthlyMap.set(month, existing)
    }
    const monthlyCosts = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month))

    // Calculate totals
    const totalCost = Array.from(userCostMap.values()).reduce((sum, d) => sum + d.totalCost, 0)
    const totalHours = Array.from(userCostMap.values()).reduce((sum, d) => sum + d.totalHours, 0)

    const overtimeBreakdown: SafeOvertimeBreakdown = {
      regular: { cost: regularCost, hours: regularHours },
      overtime: { cost: overtimeCost, hours: overtimeHours },
      overtimePercentage: totalCost > 0 ? (overtimeCost / totalCost) * 100 : 0,
    }

    return {
      totalCost,
      totalHours,
      projectCosts,
      topPerformers,
      dailyCosts,
      monthlyCosts,
      overtimeBreakdown,
    }
  }

  /**
   * Get project detail with FULL data including hourlyRate
   * SECURITY: Controller MUST verify SYSTEM_FULL_ACCESS before calling
   */
  async getProjectDetailPrivileged(projectName: string, startDate: Date, endDate: Date): Promise<PrivilegedProjectCostSummary | null> {
    const allEntries = await this.timeEntryRepo.findByDateRange(null, startDate, endDate)
    const entries = allEntries.filter(e => e.projects.includes(projectName))
    
    if (entries.length === 0) {
      return null
    }

    // Get user data
    const userIds = [...new Set(entries.map(e => e.userId))]
    const users = await Promise.all(userIds.map(id => userRepository.findById(id)))
    const userMap = new Map<string, User>(
      users.filter((u): u is User => u !== undefined).map(u => [u.id, u])
    )

    // Calculate costs by developer
    const developerMap = new Map<string, { hours: number; cost: number; hourlyRate: number }>()

    for (const entry of entries) {
      const user = userMap.get(entry.userId)
      if (!user) continue

      const monthlySalary = user.monthlySalary || 0
      const hourlyRate = this.calculateHourlyRate(monthlySalary)
      const hours = entry.duration / 60
      const cost = hours * hourlyRate

      const costShare = cost / entry.projects.length
      const hoursShare = hours / entry.projects.length

      const existing = developerMap.get(entry.userId) || { hours: 0, cost: 0, hourlyRate }
      existing.hours += hoursShare
      existing.cost += costShare
      developerMap.set(entry.userId, existing)
    }

    // Build developers array
    const developers: PrivilegedDeveloperCostSummary[] = Array.from(developerMap.entries())
      .map(([userId, data]) => {
        const user = userMap.get(userId)
        return {
          userId,
          userName: user?.name || 'Unknown',
          hours: data.hours,
          cost: data.cost,
          hourlyRate: data.hourlyRate,
        }
      })
      .sort((a, b) => b.cost - a.cost)

    // Calculate totals
    const totalCost = developers.reduce((sum, d) => sum + d.cost, 0)
    const totalHours = developers.reduce((sum, d) => sum + d.hours, 0)
    const totalHourlyRates = developers.reduce((sum, d) => sum + d.hourlyRate, 0)
    const avgHourlyRate = developers.length > 0 ? totalHourlyRates / developers.length : 0

    return {
      project: projectName,
      totalCost,
      totalHours,
      developers,
      avgHourlyRate,
    }
  }

  // ============================================================================
  // NON-SENSITIVE METHODS - Safe to use without special permissions
  // ============================================================================

  async getAllProjectNames(): Promise<string[]> {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setFullYear(startDate.getFullYear() - 2)
    
    const entries = await this.timeEntryRepo.findByDateRange(null, startDate, endDate)
    const projectSet = new Set<string>()
    entries.forEach(e => e.projects.forEach(p => projectSet.add(p)))
    return Array.from(projectSet).sort()
  }

  async getCostForecast(startDate: Date, endDate: Date, forecastDays: number = 30, project?: string | null): Promise<CostForecast> {
    const summary = await this.getCostSummary(startDate, endDate, project)
    
    if (summary.dailyCosts.length < 2) {
      const dailyAverage = summary.dailyCosts.length > 0 
        ? summary.dailyCosts[0].cost 
        : 0
      return {
        projectedCost: dailyAverage * forecastDays,
        projectedHours: (summary.dailyCosts.length > 0 ? summary.dailyCosts[0].hours : 0) * forecastDays,
        daysRemaining: forecastDays,
        confidence: 0,
        dailyAverage,
        trend: 'stable',
      }
    }

    // Linear regression for trend
    const costs = summary.dailyCosts.map(d => d.cost)
    const n = costs.length
    const x = Array.from({ length: n }, (_, i) => i + 1)
    
    const sumX = x.reduce((a, b) => a + b, 0)
    const sumY = costs.reduce((a, b) => a + b, 0)
    const sumXY = x.reduce((sum, xi, i) => sum + xi * costs[i], 0)
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0)
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n
    
    const dailyAverage = sumY / n
    
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable'
    if (slope > 0.01) trend = 'increasing'
    else if (slope < -0.01) trend = 'decreasing'
    
    const lastX = n
    const projectedDailyCost = slope * (lastX + forecastDays) + intercept
    const projectedCost = Math.max(0, (projectedDailyCost + dailyAverage) / 2 * forecastDays)
    
    const hours = summary.dailyCosts.map(d => d.hours)
    const sumHours = hours.reduce((a, b) => a + b, 0)
    const dailyAverageHours = sumHours / n
    const projectedHours = dailyAverageHours * forecastDays
    
    const variance = costs.reduce((sum, cost) => sum + Math.pow(cost - dailyAverage, 2), 0) / n
    const stdDev = Math.sqrt(variance)
    const coefficientOfVariation = dailyAverage > 0 ? stdDev / dailyAverage : 1
    const confidence = Math.max(0, Math.min(100, 100 - (coefficientOfVariation * 100)))
    
    return {
      projectedCost,
      projectedHours,
      daysRemaining: forecastDays,
      confidence: Math.round(confidence),
      dailyAverage,
      trend,
    }
  }

  async getPeriodComparison(
    currentStart: Date,
    currentEnd: Date,
    previousStart: Date,
    previousEnd: Date,
    project?: string | null
  ): Promise<PeriodComparison> {
    const currentSummary = await this.getCostSummary(currentStart, currentEnd, project)
    const previousSummary = await this.getCostSummary(previousStart, previousEnd, project)
    
    const current = {
      cost: currentSummary.totalCost,
      hours: currentSummary.totalHours,
    }
    
    const previous = {
      cost: previousSummary.totalCost,
      hours: previousSummary.totalHours,
    }
    
    const change = {
      cost: current.cost - previous.cost,
      hours: current.hours - previous.hours,
      costPercentage: previous.cost > 0 ? ((current.cost - previous.cost) / previous.cost) * 100 : 0,
      hoursPercentage: previous.hours > 0 ? ((current.hours - previous.hours) / previous.hours) * 100 : 0,
    }
    
    return { current, previous, change }
  }

  async getOvertimeBreakdown(startDate: Date, endDate: Date, project?: string | null): Promise<SafeOvertimeBreakdown> {
    const summary = await this.getCostSummary(startDate, endDate, project)
    return summary.overtimeBreakdown || {
      regular: { cost: 0, hours: 0 },
      overtime: { cost: 0, hours: 0 },
      overtimePercentage: 0,
    }
  }
}
