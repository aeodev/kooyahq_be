/**
 * Email template data types
 */

export interface AnnouncementEmailData {
  title: string
  content: string
  authorName: string
  authorInitials?: string // For avatar circle
  postedAt?: Date // For timestamp display
}

export interface TimeTrackerEndDayEmailData {
  userName: string
  userEmail: string
  date: string
  totalHours: number
  totalMinutes: number
  entryCount: number
  entries: Array<{
    task: string
    projects: string[]
    duration: number // in minutes
  }>
}

// Risk level for alerts
export type ServerStatusRiskLevel = 'info' | 'warning' | 'danger' | 'critical'

// Overall status
export type ServerStatusLevel =
  | 'healthy'
  | 'info'
  | 'warning'
  | 'danger'
  | 'critical'
  | 'starting'
  | 'shutdown'
  | 'restarting'

// Instance alert
export interface ServerStatusAlert {
  risk: ServerStatusRiskLevel
  category: 'cpu' | 'memory' | 'health' | 'system'
  type: string
  title: string
  message: string
  details?: {
    metric?: string
    value?: number
    threshold?: number
    threshold_type?: string
  }
}

// Container alert
export interface ServerStatusContainerAlert {
  name: string
  risk: ServerStatusRiskLevel
  category: 'cpu' | 'memory' | 'health'
  type: string
  title: string
  message: string
  details?: {
    metric?: string
    value?: number
    threshold?: number
    health?: string
    status?: string
  }
}

// Health change
export interface ServerStatusHealthChange {
  scope: 'instance' | 'container'
  name: string
  change_type: 'health_change' | 'new' | 'removed'
  from: string | null
  to: string | null
  risk: ServerStatusRiskLevel
  message: string
}

// Container summary
export interface ServerStatusContainerSummary {
  total: number
  running: number
  stopped: number
  restarting: number
}

// Metrics
export interface ServerStatusMetrics {
  cpu: {
    current_percent: number | null
    average_15m_percent: number | null
    is_ready: boolean
  }
  memory: {
    current_percent: number | null
    average_15m_percent: number | null
    used_bytes: number
    total_bytes: number
    is_ready: boolean
  }
}

// Alert summary
export interface ServerStatusAlertSummary {
  total: number
  by_risk: {
    critical: number
    danger: number
    warning: number
    info: number
  }
  has_critical: boolean
  has_danger: boolean
  has_warning: boolean
}

// Full email data
export interface ServerStatusEmailData {
  // Overall status
  status: ServerStatusLevel
  project: string
  serverName: string
  hostname?: string
  container?: string

  // Server info
  uptime_seconds?: number
  process_count?: number

  // Metrics
  metrics?: ServerStatusMetrics

  // Alerts
  alert_summary?: ServerStatusAlertSummary
  instance_alerts?: ServerStatusAlert[]
  container_alerts?: ServerStatusContainerAlert[]
  health_changes?: ServerStatusHealthChange[]

  // Containers
  containers?: ServerStatusContainerSummary

  // Lifecycle
  lifecycle_event?: 'starting' | 'shutdown' | 'restarting'
  lifecycle_reason?: string

  // Metadata
  receivedAt?: Date
  appUrl?: string
}
