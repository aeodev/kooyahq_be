import { TimeEntryRepository } from '../time-tracker/time-entry.repository'
import { userRepository } from '../users/user.repository'
import type { TimeEntry } from '../time-tracker/time-entry.model'
import type { User } from '../users/user.model'
import { resolveMediaUrl } from '../../utils/media-url'

const HOURS_PER_MONTH = 160

export type ActiveDeveloper = {
  userId: string
  userName: string
  userEmail: string
  profilePic?: string
  position?: string
  projects: string[]
  monthlySalary: number
  hourlyRate: number
  activeMinutes: number
  liveCost: number
  startTime: string
  isPaused: boolean
}

export type ProjectLiveCost = {
  project: string
  liveCost: number
  burnRate: number // per hour
  developers: number
  activeMinutes: number
}

export type LiveCostData = {
  totalBurnRate: number // per hour
  totalLiveCost: number
  activeHours: number
  activeDevelopers: ActiveDeveloper[]
  projectCosts: ProjectLiveCost[]
  timestamp: string
}

export type ProjectCostSummary = {
  project: string
  totalCost: number
  totalHours: number
  developers: Array<{
    userId: string
    userName: string
    hours: number
    cost: number
    hourlyRate: number
  }>
  avgHourlyRate: number
}

export type TopPerformer = {
  userId: string
  userName: string
  userEmail: string
  profilePic?: string
  position?: string
  totalHours: number
  totalCost: number
  hourlyRate: number
  projectCount: number
  projects: string[]
}

export type OvertimeBreakdown = {
  regular: { cost: number; hours: number }
  overtime: { cost: number; hours: number }
  overtimePercentage: number
}

export type CostSummaryData = {
  totalCost: number
  totalHours: number
  projectCosts: ProjectCostSummary[]
  topPerformers: TopPerformer[]
  dailyCosts: Array<{
    date: string
    cost: number
    hours: number
  }>
  monthlyCosts: Array<{
    month: string
    cost: number
    hours: number
  }>
  overtimeBreakdown?: OvertimeBreakdown
}

export type CostForecast = {
  projectedCost: number
  projectedHours: number
  daysRemaining: number
  confidence: number
  dailyAverage: number
  trend: 'increasing' | 'decreasing' | 'stable'
}

export type PeriodComparison = {
  current: { cost: number; hours: number }
  previous: { cost: number; hours: number }
  change: { cost: number; hours: number; costPercentage: number; hoursPercentage: number }
}

export class CostAnalyticsService {
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

  async getLiveCostData(): Promise<LiveCostData> {
    // Get all active timers
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
    const activeDevelopers: ActiveDeveloper[] = []
    const projectCostMap = new Map<string, { cost: number; burnRate: number; developers: Set<string>; minutes: number }>()

    for (const entry of activeEntries) {
      const user = userMap.get(entry.userId)
      if (!user) continue

      const monthlySalary = user.monthlySalary || 0
      const hourlyRate = this.calculateHourlyRate(monthlySalary)
      const activeMinutes = this.calculateActiveMinutes(entry)
      const liveCost = (activeMinutes / 60) * hourlyRate

      // Resolve media URL for profilePic if it exists
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
    const projectCosts: ProjectLiveCost[] = Array.from(projectCostMap.entries())
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

  async getCostSummary(startDate: Date, endDate: Date, project?: string | null): Promise<CostSummaryData> {
    // Get all completed entries in date range
    let entries = await this.timeEntryRepo.findByDateRange(null, startDate, endDate)
    
    // Filter by project if specified
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

    for (const entry of entries) {
      const user = userMap.get(entry.userId)
      if (!user) continue

      const monthlySalary = user.monthlySalary || 0
      const hourlyRate = this.calculateHourlyRate(monthlySalary)
      const hours = entry.duration / 60
      const cost = hours * hourlyRate

      // Aggregate by project
      for (const project of entry.projects) {
        const existing = projectMap.get(project) || {
          totalCost: 0,
          totalHours: 0,
          developers: new Map<string, { hours: number; cost: number; hourlyRate: number }>(),
        }
        existing.totalCost += cost / entry.projects.length // Split cost across projects
        existing.totalHours += hours / entry.projects.length

        const devData = existing.developers.get(entry.userId) || { hours: 0, cost: 0, hourlyRate }
        devData.hours += hours / entry.projects.length
        devData.cost += cost / entry.projects.length
        existing.developers.set(entry.userId, devData)

        projectMap.set(project, existing)
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
    const projectCosts: ProjectCostSummary[] = Array.from(projectMap.entries())
      .map(([project, data]) => {
        const developers = Array.from(data.developers.entries()).map(([userId, devData]) => {
          const user = userMap.get(userId)
          return {
            userId,
            userName: user?.name || 'Unknown',
            hours: devData.hours,
            cost: devData.cost,
            hourlyRate: devData.hourlyRate,
          }
        }).sort((a, b) => b.cost - a.cost)

        const totalHourlyRates = developers.reduce((sum, d) => sum + d.hourlyRate, 0)
        const avgHourlyRate = developers.length > 0 ? totalHourlyRates / developers.length : 0

        return {
          project,
          totalCost: data.totalCost,
          totalHours: data.totalHours,
          developers,
          avgHourlyRate,
        }
      })
      .sort((a, b) => b.totalCost - a.totalCost)

    // Build top performers array
    const topPerformers: TopPerformer[] = Array.from(userCostMap.entries())
      .map(([userId, data]) => {
        const user = userMap.get(userId)
        // Resolve media URL for profilePic if it exists
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

    // Build monthly costs from daily
    const monthlyMap = new Map<string, { cost: number; hours: number }>()
    for (const day of dailyCosts) {
      const month = day.date.substring(0, 7) // YYYY-MM
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

    // Calculate overtime breakdown
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

      if (entry.isOvertime) {
        overtimeCost += cost
        overtimeHours += hours
      } else {
        regularCost += cost
        regularHours += hours
      }
    }

    const overtimeBreakdown: OvertimeBreakdown = {
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

  async getProjectDetail(projectName: string, startDate: Date, endDate: Date): Promise<ProjectCostSummary | null> {
    // Get all completed entries in date range for this project
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

      // Split cost across projects
      const costShare = cost / entry.projects.length
      const hoursShare = hours / entry.projects.length

      const existing = developerMap.get(entry.userId) || { hours: 0, cost: 0, hourlyRate }
      existing.hours += hoursShare
      existing.cost += costShare
      developerMap.set(entry.userId, existing)
    }

    // Build developers array
    const developers = Array.from(developerMap.entries()).map(([userId, data]) => {
      const user = userMap.get(userId)
      return {
        userId,
        userName: user?.name || 'Unknown',
        hours: data.hours,
        cost: data.cost,
        hourlyRate: data.hourlyRate,
      }
    }).sort((a, b) => b.cost - a.cost)

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

  async getAllProjectNames(): Promise<string[]> {
    // Get entries from the last 2 years to capture all projects
    const endDate = new Date()
    const startDate = new Date()
    startDate.setFullYear(startDate.getFullYear() - 2)
    
    const entries = await this.timeEntryRepo.findByDateRange(null, startDate, endDate)
    const projectSet = new Set<string>()
    entries.forEach(e => e.projects.forEach(p => projectSet.add(p)))
    return Array.from(projectSet).sort()
  }

  async getCostForecast(startDate: Date, endDate: Date, forecastDays: number = 30, project?: string | null): Promise<CostForecast> {
    // Get historical data
    const summary = await this.getCostSummary(startDate, endDate, project)
    
    if (summary.dailyCosts.length < 2) {
      // Not enough data for forecast
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

    // Simple linear regression for trend
    const costs = summary.dailyCosts.map(d => d.cost)
    const n = costs.length
    const x = Array.from({ length: n }, (_, i) => i + 1)
    
    const sumX = x.reduce((a, b) => a + b, 0)
    const sumY = costs.reduce((a, b) => a + b, 0)
    const sumXY = x.reduce((sum, xi, i) => sum + xi * costs[i], 0)
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0)
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n
    
    // Calculate daily average
    const dailyAverage = sumY / n
    
    // Determine trend
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable'
    if (slope > 0.01) trend = 'increasing'
    else if (slope < -0.01) trend = 'decreasing'
    
    // Project future costs using linear regression
    const lastX = n
    const projectedDailyCost = slope * (lastX + forecastDays) + intercept
    
    // Use average of recent trend and daily average for better projection
    const projectedCost = Math.max(0, (projectedDailyCost + dailyAverage) / 2 * forecastDays)
    
    // Calculate hours projection
    const hours = summary.dailyCosts.map(d => d.hours)
    const sumHours = hours.reduce((a, b) => a + b, 0)
    const dailyAverageHours = sumHours / n
    const projectedHours = dailyAverageHours * forecastDays
    
    // Calculate confidence based on data consistency
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
    
    return {
      current,
      previous,
      change,
    }
  }

  async getOvertimeBreakdown(startDate: Date, endDate: Date, project?: string | null): Promise<OvertimeBreakdown> {
    const summary = await this.getCostSummary(startDate, endDate, project)
    return summary.overtimeBreakdown || {
      regular: { cost: 0, hours: 0 },
      overtime: { cost: 0, hours: 0 },
      overtimePercentage: 0,
    }
  }
}
