/**
 * Server Status Gateway Types
 * 
 * These types match the payload structure sent by system-status script
 */

// Risk levels ordered by severity
export type RiskLevel = 'info' | 'warning' | 'danger' | 'critical'

// Overall status levels
export type OverallStatus = 'healthy' | 'info' | 'warning' | 'danger' | 'critical' | 'starting' | 'shutdown' | 'restarting'

// Event types
export type EventType = 'status' | 'lifecycle'

// Server information
export type ServerInfo = {
  name: string
  hostname: string
  status?: string
  uptime_seconds?: number
  process_count?: number
}

// CPU metrics
export type CpuMetrics = {
  current_percent: number | null
  average_15m_percent: number | null
  samples_collected: number
  samples_required: number
  is_ready: boolean
  load_avg?: {
    '1m_percent'?: number
    '5m_percent'?: number
    '15m_percent'?: number
  }
}

// Memory metrics
export type MemoryMetrics = {
  current_percent: number | null
  average_15m_percent: number | null
  used_bytes: number
  total_bytes: number
  free_bytes: number
  samples_collected: number
  samples_required: number
  is_ready: boolean
}

// Thresholds configuration
export type ThresholdConfig = {
  cpu_warn_percent: number
  cpu_danger_percent: number
  memory_warn_percent: number
  memory_danger_percent: number
}

export type ThresholdsPayload = {
  instance: ThresholdConfig
  container: ThresholdConfig
}

// Alert summary
export type AlertSummary = {
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

// Instance alert
export type InstanceAlert = {
  risk: RiskLevel
  category: 'cpu' | 'memory' | 'health' | 'system'
  type: 'threshold_current' | 'threshold_average' | 'health_change'
  title: string
  message: string
  details?: {
    metric?: string
    value?: number
    threshold?: number
    threshold_type?: string
    from?: string
    to?: string
  }
}

// Container alert
export type ContainerAlert = {
  name: string
  risk: RiskLevel
  category: 'cpu' | 'memory' | 'health'
  type: 'threshold_average' | 'health'
  title: string
  message: string
  details?: {
    metric?: string
    value?: number
    threshold?: number
    threshold_type?: string
    health?: string
    status?: string
  }
}

// Container summary
export type ContainerSummary = {
  total: number
  running: number
  stopped: number
  restarting: number
  alerts: ContainerAlert[]
}

// Health change
export type HealthChange = {
  scope: 'instance' | 'container'
  name: string
  change_type: 'health_change' | 'new' | 'removed'
  from: string | null
  to: string | null
  risk: RiskLevel
  message: string
}

// Lifecycle event
export type LifecycleEvent = {
  event: 'starting' | 'shutdown' | 'restarting'
  reason?: string
}

// Full payload from system-status
export type ServerStatusGatewayPayload = {
  version: string
  timestamp: string
  event_type: EventType
  project: string
  status: OverallStatus
  container?: string
  
  server: ServerInfo
  
  metrics?: {
    cpu: CpuMetrics
    memory: MemoryMetrics
  }
  
  thresholds?: ThresholdsPayload
  
  alert_summary: AlertSummary
  
  instance_alerts: InstanceAlert[]
  
  containers: ContainerSummary
  
  health_changes: HealthChange[]
  
  lifecycle?: LifecycleEvent
}

// Normalized payload used internally
export type NormalizedServerStatusPayload = {
  version: string
  timestamp: string
  event_type: EventType
  project: string
  status: OverallStatus
  container?: string
  
  server: {
    name: string
    hostname: string
    status: string
    uptime_seconds: number
    process_count: number
  }
  
  metrics: {
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
  
  alert_summary: AlertSummary
  
  instance_alerts: InstanceAlert[]
  
  containers: ContainerSummary
  
  health_changes: HealthChange[]
  
  lifecycle?: LifecycleEvent
}
