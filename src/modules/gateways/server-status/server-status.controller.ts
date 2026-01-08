import type { NextFunction, Request, Response } from 'express'
import { createHttpError } from '../../../utils/http-error'
import { serverManagementService } from '../../server-managmenet/server-management/server-management.service'

type ServerStatusLevel = 'warning' | 'danger' | 'starting' | 'restarting' | 'shutdown'

type ServerStatusGatewayPayload = {
  status: ServerStatusLevel
  project: string
  serverName: string
  container?: string
  cpu: string
  memory: string
}

const allowedStatuses = new Set<ServerStatusLevel>(['warning', 'danger', 'starting', 'restarting', 'shutdown'])

const statusAliases: Record<string, ServerStatusLevel> = {
  dangert: 'danger',
  shutting_down: 'shutdown',
  shuttingdown: 'shutdown',
  restart: 'restarting',
  start: 'starting',
}

function normalizeStatus(value: unknown): ServerStatusLevel {
  if (typeof value !== 'string') {
    throw createHttpError(400, 'status is required')
  }

  const normalized = value.trim().toLowerCase().replace(/\s+/g, '_')
  const mapped = statusAliases[normalized] ?? normalized

  if (!allowedStatuses.has(mapped as ServerStatusLevel)) {
    throw createHttpError(400, 'status must be warning, danger, starting, restarting, or shutdown')
  }

  return mapped as ServerStatusLevel
}

function normalizeRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string') {
    throw createHttpError(400, `${fieldName} is required`)
  }

  const trimmed = value.trim()
  if (!trimmed) {
    throw createHttpError(400, `${fieldName} is required`)
  }

  return trimmed
}

function normalizeOptionalString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined
  }

  if (typeof value !== 'string') {
    throw createHttpError(400, `${fieldName} must be a string`)
  }

  const trimmed = value.trim()
  return trimmed || undefined
}

function normalizePayload(body: unknown): ServerStatusGatewayPayload {
  if (!body || typeof body !== 'object') {
    throw createHttpError(400, 'Invalid payload')
  }

  const raw = body as Record<string, unknown>

  return {
    status: normalizeStatus(raw.status),
    project: normalizeRequiredString(raw.project, 'project'),
    serverName: normalizeRequiredString(raw.serverName, 'serverName'),
    container: normalizeOptionalString(raw.container, 'container'),
    cpu: normalizeRequiredString(raw.cpu, 'cpu'),
    memory: normalizeRequiredString(raw.memory, 'memory'),
  }
}

export async function handleServerStatusGateway(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = normalizePayload(req.body)

    try {
      await serverManagementService.notifyServerStatus(payload)
    } catch (notifyError) {
      console.error('Failed to notify server status recipients:', notifyError)
    }

    res.json({
      success: true,
      data: {
        received: true,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}
