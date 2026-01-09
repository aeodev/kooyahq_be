import type { NextFunction, Request, Response } from 'express'
import { createHttpError } from '../../../utils/http-error'
import { serverManagementService } from '../../server-managmenet/server-management/server-management.service'
import type {
  AlertSummary,
  ContainerAlert,
  ContainerSummary,
  HealthChange,
  InstanceAlert,
  NormalizedServerStatusPayload,
  OverallStatus,
  ServerStatusGatewayPayload,
} from './server-status.types'

// Allowed overall status values
const ALLOWED_STATUS = new Set<OverallStatus>([
  'healthy',
  'info',
  'warning',
  'danger',
  'critical',
  'starting',
  'shutdown',
  'restarting',
])

// Status aliases for normalization
const STATUS_ALIASES: Record<string, OverallStatus> = {
  ok: 'healthy',
  good: 'healthy',
  normal: 'healthy',
  shutting_down: 'shutdown',
  shuttingdown: 'shutdown',
  restart: 'restarting',
  start: 'starting',
}

function normalizeStatus(value: unknown): OverallStatus {
  if (typeof value !== 'string') {
    throw createHttpError(400, 'status is required and must be a string')
  }

  const normalized = value.trim().toLowerCase().replace(/\s+/g, '_')
  const mapped = STATUS_ALIASES[normalized] ?? normalized

  if (!ALLOWED_STATUS.has(mapped as OverallStatus)) {
    throw createHttpError(
      400,
      `Invalid status: ${value}. Must be one of: healthy, info, warning, danger, critical, starting, shutdown, restarting`
    )
  }

  return mapped as OverallStatus
}

function isValidPayload(body: unknown): body is ServerStatusGatewayPayload {
  if (!body || typeof body !== 'object') return false
  const raw = body as Record<string, unknown>
  return (
    typeof raw.version === 'string' &&
    typeof raw.project === 'string' &&
    typeof raw.server === 'object' &&
    raw.server !== null &&
    typeof (raw.server as Record<string, unknown>).name === 'string'
  )
}

function normalizePayload(body: unknown): NormalizedServerStatusPayload {
  if (!isValidPayload(body)) {
    throw createHttpError(
      400,
      'Invalid payload format. Required fields: version, project, server.name'
    )
  }

  const server = body.server || {}
  const cpu = body.metrics?.cpu
  const memory = body.metrics?.memory

  return {
    version: body.version,
    timestamp: body.timestamp || new Date().toISOString(),
    event_type: body.event_type || 'status',
    project: body.project,
    status: normalizeStatus(body.status),
    container: body.container,

    server: {
      name: server.name || 'unknown',
      hostname: server.hostname || server.name || 'unknown',
      status: server.status || 'unknown',
      uptime_seconds: server.uptime_seconds || 0,
      process_count: server.process_count || 0,
    },

    metrics: {
      cpu: {
        current_percent: cpu?.current_percent ?? null,
        average_15m_percent: cpu?.average_15m_percent ?? null,
        is_ready: cpu?.is_ready ?? false,
      },
      memory: {
        current_percent: memory?.current_percent ?? null,
        average_15m_percent: memory?.average_15m_percent ?? null,
        used_bytes: memory?.used_bytes ?? 0,
        total_bytes: memory?.total_bytes ?? 0,
        is_ready: memory?.is_ready ?? false,
      },
    },

    alert_summary: body.alert_summary || {
      total: 0,
      by_risk: { critical: 0, danger: 0, warning: 0, info: 0 },
      has_critical: false,
      has_danger: false,
      has_warning: false,
    },

    instance_alerts: Array.isArray(body.instance_alerts) ? body.instance_alerts : [],

    containers: body.containers || {
      total: 0,
      running: 0,
      stopped: 0,
      restarting: 0,
      alerts: [],
    },

    health_changes: Array.isArray(body.health_changes) ? body.health_changes : [],

    lifecycle: body.lifecycle,
  }
}

export async function handleServerStatusGateway(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = normalizePayload(req.body)

    // Get event type from header or payload
    const headerEvent = req.headers['x-status-event']
    const eventType = typeof headerEvent === 'string' ? headerEvent : payload.event_type

    try {
      await serverManagementService.notifyServerStatus(payload)
    } catch (notifyError) {
      console.error('Failed to notify server status recipients:', notifyError)
    }

    res.json({
      success: true,
      data: {
        received: true,
        event_type: eventType,
        status: payload.status,
        alerts_total: payload.alert_summary.total,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}

// Export types for use in other modules
export type {
  AlertSummary,
  ContainerAlert,
  ContainerSummary,
  HealthChange,
  InstanceAlert,
  NormalizedServerStatusPayload,
  OverallStatus,
}
