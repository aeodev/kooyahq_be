/**
 * Analytics Types - SAFE vs PRIVILEGED DTOs
 * 
 * SECURITY: Default analytics responses MUST NEVER return monthlySalary or hourlyRate.
 * Privileged responses may include salary/rates ONLY if user has USERS_MANAGE permission.
 */

// ============================================================================
// SAFE DTOs (Default - No salary/rate exposure)
// ============================================================================

/**
 * SAFE ActiveDeveloper - Used in default responses
 * Does NOT include monthlySalary or hourlyRate
 */
export type SafeActiveDeveloper = {
  userId: string
  userName: string
  userEmail: string
  profilePic?: string
  position?: string
  projects: string[]
  activeMinutes: number
  liveCost: number
  startTime: string
  isPaused: boolean
}

/**
 * SAFE ProjectLiveCost - Used in default responses
 */
export type SafeProjectLiveCost = {
  project: string
  liveCost: number
  burnRate: number // Total burn rate - not per-developer
  developers: number
  activeMinutes: number
}

/**
 * SAFE LiveCostData - Used in default responses
 */
export type SafeLiveCostData = {
  totalBurnRate: number
  totalLiveCost: number
  activeHours: number
  activeDevelopers: SafeActiveDeveloper[]
  projectCosts: SafeProjectLiveCost[]
  timestamp: string
}

/**
 * SAFE DeveloperCostSummary - Used in project cost breakdowns
 * Does NOT include hourlyRate
 */
export type SafeDeveloperCostSummary = {
  userId: string
  userName: string
  hours: number
  cost: number
}

/**
 * SAFE ProjectCostSummary - Used in default responses
 */
export type SafeProjectCostSummary = {
  project: string
  totalCost: number
  totalHours: number
  developers: SafeDeveloperCostSummary[]
  avgCostPerHour: number // Computed aggregate, not individual rate
}

/**
 * SAFE TopPerformer - Used in default responses
 * Does NOT include hourlyRate
 */
export type SafeTopPerformer = {
  userId: string
  userName: string
  userEmail: string
  profilePic?: string
  position?: string
  totalHours: number
  totalCost: number
  projectCount: number
  projects: string[]
}

/**
 * SAFE OvertimeBreakdown
 */
export type SafeOvertimeBreakdown = {
  regular: { cost: number; hours: number }
  overtime: { cost: number; hours: number }
  overtimePercentage: number
}

/**
 * SAFE CostSummaryData - Used in default responses
 */
export type SafeCostSummaryData = {
  totalCost: number
  totalHours: number
  projectCosts: SafeProjectCostSummary[]
  topPerformers: SafeTopPerformer[]
  dailyCosts: Array<{ date: string; cost: number; hours: number }>
  monthlyCosts: Array<{ month: string; cost: number; hours: number }>
  overtimeBreakdown?: SafeOvertimeBreakdown
}

/**
 * CostForecast - Does not expose sensitive data
 */
export type CostForecast = {
  projectedCost: number
  projectedHours: number
  daysRemaining: number
  confidence: number
  dailyAverage: number
  trend: 'increasing' | 'decreasing' | 'stable'
}

/**
 * PeriodComparison - Does not expose sensitive data
 */
export type PeriodComparison = {
  current: { cost: number; hours: number }
  previous: { cost: number; hours: number }
  change: { cost: number; hours: number; costPercentage: number; hoursPercentage: number }
}

// ============================================================================
// PRIVILEGED DTOs (Requires USERS_MANAGE permission)
// ============================================================================

/**
 * PRIVILEGED ActiveDeveloper - Includes salary/rate data
 * ONLY accessible with USERS_MANAGE permission
 */
export type PrivilegedActiveDeveloper = SafeActiveDeveloper & {
  monthlySalary: number
  hourlyRate: number
}

/**
 * PRIVILEGED DeveloperCostSummary - Includes hourlyRate
 */
export type PrivilegedDeveloperCostSummary = SafeDeveloperCostSummary & {
  hourlyRate: number
}

/**
 * PRIVILEGED ProjectCostSummary - Includes developer rates
 */
export type PrivilegedProjectCostSummary = {
  project: string
  totalCost: number
  totalHours: number
  developers: PrivilegedDeveloperCostSummary[]
  avgHourlyRate: number
}

/**
 * PRIVILEGED TopPerformer - Includes hourlyRate
 */
export type PrivilegedTopPerformer = SafeTopPerformer & {
  hourlyRate: number
}

/**
 * PRIVILEGED LiveCostData - Includes salary/rate data
 */
export type PrivilegedLiveCostData = {
  totalBurnRate: number
  totalLiveCost: number
  activeHours: number
  activeDevelopers: PrivilegedActiveDeveloper[]
  projectCosts: SafeProjectLiveCost[]
  timestamp: string
}

/**
 * PRIVILEGED CostSummaryData - Includes salary/rate data
 */
export type PrivilegedCostSummaryData = {
  totalCost: number
  totalHours: number
  projectCosts: PrivilegedProjectCostSummary[]
  topPerformers: PrivilegedTopPerformer[]
  dailyCosts: Array<{ date: string; cost: number; hours: number }>
  monthlyCosts: Array<{ month: string; cost: number; hours: number }>
  overtimeBreakdown?: SafeOvertimeBreakdown
}

// ============================================================================
// Internal Types (Used for computation, never exposed directly)
// ============================================================================

/**
 * Internal developer data with full salary information
 * Used for cost calculations but NEVER returned directly to clients
 */
export type InternalDeveloperData = {
  userId: string
  userName: string
  userEmail: string
  profilePic?: string
  position?: string
  monthlySalary: number
  hourlyRate: number
}

// ============================================================================
// Mapper Functions
// ============================================================================

/**
 * Strips sensitive fields from ActiveDeveloper
 */
export function toSafeActiveDeveloper(dev: PrivilegedActiveDeveloper): SafeActiveDeveloper {
  const { monthlySalary: _m, hourlyRate: _h, ...safe } = dev
  return safe
}

/**
 * Strips sensitive fields from LiveCostData
 */
export function toSafeLiveCostData(data: PrivilegedLiveCostData): SafeLiveCostData {
  return {
    ...data,
    activeDevelopers: data.activeDevelopers.map(toSafeActiveDeveloper),
  }
}

/**
 * Strips sensitive fields from DeveloperCostSummary
 */
export function toSafeDeveloperCostSummary(dev: PrivilegedDeveloperCostSummary): SafeDeveloperCostSummary {
  const { hourlyRate: _h, ...safe } = dev
  return safe
}

/**
 * Strips sensitive fields from ProjectCostSummary
 */
export function toSafeProjectCostSummary(project: PrivilegedProjectCostSummary): SafeProjectCostSummary {
  return {
    project: project.project,
    totalCost: project.totalCost,
    totalHours: project.totalHours,
    developers: project.developers.map(toSafeDeveloperCostSummary),
    avgCostPerHour: project.totalHours > 0 ? project.totalCost / project.totalHours : 0,
  }
}

/**
 * Strips sensitive fields from TopPerformer
 */
export function toSafeTopPerformer(performer: PrivilegedTopPerformer): SafeTopPerformer {
  const { hourlyRate: _h, ...safe } = performer
  return safe
}

/**
 * Strips sensitive fields from CostSummaryData
 */
export function toSafeCostSummaryData(data: PrivilegedCostSummaryData): SafeCostSummaryData {
  return {
    totalCost: data.totalCost,
    totalHours: data.totalHours,
    projectCosts: data.projectCosts.map(toSafeProjectCostSummary),
    topPerformers: data.topPerformers.map(toSafeTopPerformer),
    dailyCosts: data.dailyCosts,
    monthlyCosts: data.monthlyCosts,
    overtimeBreakdown: data.overtimeBreakdown,
  }
}
