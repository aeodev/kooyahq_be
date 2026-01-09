import { randomUUID } from 'node:crypto'
import { Client } from 'ssh2'
import { SocketEmitter } from '../../../utils/socket-emitter'
import { serverManagementRunRoom } from '../../../utils/socket-rooms'
import { hasPermission, PERMISSIONS, type Permission } from '../../auth/rbac/permissions'
import { emailService } from '../../email/email.service'
import { notificationService } from '../../notifications/notification.service'
import { userService } from '../../users/user.service'
import { ServerManagementSocketEvents } from './server-management.events'
import { serverManagementRepository } from './server-management.repository'
import { decryptSshKey, isEncryptedPrivateKey, normalizeSshKey } from './server-management.ssh'
import type { ServerManagementAction, ServerManagementServer } from './server-management.model'

type StatusStreamPayload = {
  status: Record<string, string>
  rawOutput: string
}

type StatusStreamHandlers = {
  onPayload: (payload: StatusStreamPayload) => void
  onError: (message: string) => void
  onClose?: (details: { exitCode: number | null; signal: string | null }) => void
}

import type {
  NormalizedServerStatusPayload,
  OverallStatus,
} from '../../gateways/server-status/server-status.controller'

const SERVER_STATUS_LABELS: Record<OverallStatus, string> = {
  healthy: 'Healthy',
  info: 'Info',
  warning: 'Warning',
  danger: 'Danger',
  critical: 'Critical',
  starting: 'Starting',
  restarting: 'Restarting',
  shutdown: 'Shutdown',
}

const SERVER_STATUS_RECIPIENT_PERMISSIONS = [
  PERMISSIONS.SERVER_MANAGEMENT_STATUS_NOTIFY,
  PERMISSIONS.SERVER_MANAGEMENT_MANAGE,
]

function isServerStatusRecipient(user: { permissions?: Array<Permission | string> }) {
  const permissions = Array.isArray(user.permissions) ? (user.permissions as Permission[]) : []
  return SERVER_STATUS_RECIPIENT_PERMISSIONS.some((permission) => hasPermission({ permissions }, permission))
}

function buildPrivateKey(sshKey: string): Buffer {
  const normalizedKey = normalizeSshKey(sshKey)
  if (!normalizedKey) {
    throw new Error('SSH key is missing')
  }
  const decryptedKey = decryptSshKey(normalizedKey)
  const normalizedDecrypted = normalizeSshKey(decryptedKey)
  if (!normalizedDecrypted) {
    throw new Error('SSH key is missing')
  }
  if (isEncryptedPrivateKey(normalizedDecrypted)) {
    throw new Error('Encrypted SSH keys are not supported')
  }
  return Buffer.from(normalizedDecrypted)
}

function parseStatusOutput(rawOutput: string): Record<string, string> {
  const trimmed = rawOutput.trim()
  if (!trimmed) return {}

  try {
    const parsed = JSON.parse(trimmed)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const status: Record<string, string> = {}
      Object.entries(parsed).forEach(([key, value]) => {
        status[String(key)] = String(value)
      })
      return status
    }
  } catch {
    // Fall back to line parsing
  }

  const status: Record<string, string> = {}
  trimmed.split(/\r?\n/).forEach((line) => {
    const clean = line.trim()
    if (!clean) return
    const separatorIndex = clean.indexOf(':')
    if (separatorIndex === -1) return
    const key = clean.slice(0, separatorIndex).trim()
    const value = clean.slice(separatorIndex + 1).trim()
    if (!key) return
    status[key] = value
  })

  if (Object.keys(status).length === 0) {
    status.Output = trimmed
  }

  return status
}

const STRIPPED_STATUS_KEYS = new Set(['ports', 'image', 'host', 'hostname'])

function sanitizeStatusMap(status: Record<string, string>): Record<string, string> {
  const sanitized = { ...status }
  Object.keys(sanitized).forEach((key) => {
    if (STRIPPED_STATUS_KEYS.has(key.trim().toLowerCase())) {
      delete sanitized[key]
    }
  })
  return sanitized
}

function sanitizeStatusOutput(rawOutput: string): string {
  const trimmed = rawOutput.trim()
  if (!trimmed) return rawOutput
  try {
    const parsed = JSON.parse(trimmed)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return rawOutput
    }
    const payload = parsed as Record<string, unknown>
    const docker = payload.docker
    if (docker && typeof docker === 'object' && !Array.isArray(docker)) {
      const dockerObject = docker as Record<string, unknown>
      const containers = dockerObject.containers
      if (containers && typeof containers === 'object' && !Array.isArray(containers)) {
        Object.values(containers as Record<string, unknown>).forEach((container) => {
          if (container && typeof container === 'object' && !Array.isArray(container)) {
            delete (container as Record<string, unknown>).image
            delete (container as Record<string, unknown>).ports
          }
        })
      }
      delete dockerObject.image
      delete dockerObject.ports
    }
    const instance = payload.instance
    if (instance && typeof instance === 'object' && !Array.isArray(instance)) {
      delete (instance as Record<string, unknown>).hostname
      delete (instance as Record<string, unknown>).host
    }
    delete payload.image
    delete payload.ports
    delete payload.hostname
    delete payload.host
    return JSON.stringify(payload)
  } catch {
    return rawOutput
  }
}

function extractJsonFrames(buffer: string): { frames: string[]; rest: string } {
  const frames: string[] = []
  let depth = 0
  let start = -1
  let inString = false
  let escaped = false
  let lastFrameEnd = 0

  for (let i = 0; i < buffer.length; i += 1) {
    const char = buffer[i]

    if (inString) {
      if (escaped) {
        escaped = false
        continue
      }
      if (char === '\\') {
        escaped = true
        continue
      }
      if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
      continue
    }

    if (char === '{') {
      if (depth === 0) {
        start = i
      }
      depth += 1
      continue
    }

    if (char === '}') {
      if (depth > 0) {
        depth -= 1
        if (depth === 0 && start >= 0) {
          frames.push(buffer.slice(start, i + 1))
          lastFrameEnd = i + 1
          start = -1
        }
      }
    }
  }

  if (depth > 0 && start >= 0) {
    return { frames, rest: buffer.slice(start) }
  }

  return { frames, rest: buffer.slice(lastFrameEnd).trimStart() }
}

function extractLineFrames(buffer: string): { frames: string[]; rest: string } {
  const lines = buffer.split(/\r?\n/)
  const rest = lines.pop() ?? ''
  const frames = lines.map((line) => line.trim()).filter((line) => line.length > 0)
  return { frames, rest }
}

function buildRemoteCommand(server: ServerManagementServer, command: string): string {
  const trimmed = command.trim()
  const appDirectory = server.appDirectory?.trim()
  if (!appDirectory) {
    return trimmed
  }
  return `cd ${appDirectory} && ${trimmed}`
}

function formatErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'string') {
    const trimmed = error.trim()
    return trimmed.length > 0 ? trimmed : fallback
  }
  if (error && typeof error === 'object') {
    const maybe = error as {
      message?: string
      code?: string
      level?: string
      reason?: string
      description?: string
    }
    const message = maybe.message?.trim()
    if (message) return message
    const details = [maybe.code, maybe.level, maybe.reason, maybe.description].filter(Boolean)
    if (details.length > 0) {
      return details.join(' - ')
    }
  }
  return fallback
}

function executeStatusCommand(server: ServerManagementServer, command: string) {
  return new Promise<{
    stdout: string
    stderr: string
    exitCode: number | null
    signal: string | null
  }>((resolve, reject) => {
    const connection = new Client()
    const host = server.host
    const port = server.port ? Number.parseInt(server.port, 10) : 22
    const username = server.user || 'root'
    const privateKey = buildPrivateKey(server.sshKey || '')

    let stdout = ''
    let stderr = ''

    connection
      .on('ready', () => {
        connection.exec(command, (execError, stream) => {
          if (execError) {
            connection.end()
            reject(new Error(formatErrorMessage(execError, 'Unable to start status command')))
            return
          }

          stream.setEncoding('utf8')
          stream.stderr.setEncoding('utf8')

          stream.on('data', (chunk: string) => {
            stdout += chunk
          })

          stream.stderr.on('data', (chunk: string) => {
            stderr += chunk
          })

          stream.on('error', (streamError: unknown) => {
            connection.end()
            reject(new Error(formatErrorMessage(streamError, 'Status stream error')))
          })

          stream.on('close', (code: number | null, signal: string | null) => {
            connection.end()
            resolve({
              stdout: stdout.trim(),
              stderr: stderr.trim(),
              exitCode: code,
              signal,
            })
          })
        })
      })
      .on('error', (error) => {
        connection.end()
        reject(new Error(formatErrorMessage(error, 'SSH connection error')))
      })
      .connect({
        host,
        port: Number.isFinite(port) ? port : 22,
        username,
        privateKey,
        readyTimeout: 15000,
      })
  })
}

export const serverManagementService = {
  createProject: serverManagementRepository.createProject,
  findAllProjects: serverManagementRepository.findAllProjects,
  findProjectById: serverManagementRepository.findProjectById,
  updateProject: serverManagementRepository.updateProject,
  deleteProject: serverManagementRepository.deleteProject,
  addServer: serverManagementRepository.addServer,
  updateServer: serverManagementRepository.updateServer,
  deleteServer: serverManagementRepository.deleteServer,
  addAction: serverManagementRepository.addAction,
  updateAction: serverManagementRepository.updateAction,
  deleteAction: serverManagementRepository.deleteAction,
  findServerById: serverManagementRepository.findServerById,
  findActionByIds: serverManagementRepository.findActionByIds,

  async fetchServerStatus(server: ServerManagementServer) {
    const command = server.statusCommand?.trim()
    if (!command) {
      throw new Error('Status command is missing')
    }

    const result = await executeStatusCommand(server, buildRemoteCommand(server, command))
    if (result.exitCode && result.exitCode !== 0) {
      const message = result.stderr || result.stdout || `Status command failed with exit code ${result.exitCode}`
      throw new Error(message)
    }

    const rawOutput = result.stdout || result.stderr
    const sanitizedRawOutput = sanitizeStatusOutput(rawOutput)
    return {
      status: sanitizeStatusMap(parseStatusOutput(sanitizedRawOutput)),
      rawOutput: sanitizedRawOutput,
      exitCode: result.exitCode,
      signal: result.signal,
    }
  },

  startStatusStream(params: { server: ServerManagementServer } & StatusStreamHandlers) {
    const { server, onPayload, onError, onClose } = params
    const command = server.statusCommand?.trim()
    if (!command) {
      throw new Error('Status command is missing')
    }
    if (!server.host?.trim()) {
      throw new Error('Server host is missing')
    }

    const sshKey = server.sshKey
    if (!sshKey) {
      throw new Error('Missing SSH key')
    }

    let privateKey: Buffer
    try {
      privateKey = buildPrivateKey(sshKey)
    } catch (error) {
      throw new Error(formatErrorMessage(error, 'Invalid SSH key'))
    }

    const host = server.host
    const port = server.port ? Number.parseInt(server.port, 10) : 22
    const username = server.user || 'root'
    const connection = new Client()
    let buffer = ''
    let closed = false

    const emitPayload = (payload: StatusStreamPayload) => {
      if (closed) return
      onPayload(payload)
    }

    const emitError = (message: string) => {
      if (closed) return
      onError(message)
    }

    const stop = () => {
      if (closed) return
      closed = true
      connection.end()
    }

    const handleFrame = (frame: string) => {
      const sanitizedRawOutput = sanitizeStatusOutput(frame)
      emitPayload({
        status: sanitizeStatusMap(parseStatusOutput(sanitizedRawOutput)),
        rawOutput: sanitizedRawOutput,
      })
    }

    connection
      .on('ready', () => {
        connection.exec(buildRemoteCommand(server, command), (execError, stream) => {
          if (execError) {
            emitError(formatErrorMessage(execError, 'Unable to start status command'))
            stop()
            return
          }

          stream.setEncoding('utf8')
          stream.stderr.setEncoding('utf8')

          stream.on('data', (chunk: string) => {
            if (closed) return
            buffer += chunk
            const { frames, rest } = extractJsonFrames(buffer)
            buffer = rest

            if (frames.length > 0) {
              frames.forEach(handleFrame)
              return
            }

            if (!buffer.includes('{')) {
              const lineResult = extractLineFrames(buffer)
              buffer = lineResult.rest
              lineResult.frames.forEach(handleFrame)
            } else if (buffer.length > 200_000) {
              buffer = buffer.slice(-200_000)
            }
          })

          stream.stderr.on('data', (chunk: string) => {
            const message = chunk.trim()
            if (message) {
              emitError(message)
            }
          })

          stream.on('error', (streamError: unknown) => {
            emitError(formatErrorMessage(streamError, 'Status stream error'))
            stop()
          })

          stream.on('close', (code: number | null, signal: string | null) => {
            onClose?.({ exitCode: code, signal })
            stop()
          })
        })
      })
      .on('error', (error) => {
        emitError(formatErrorMessage(error, 'SSH connection error'))
        stop()
      })
      .connect({
        host,
        port: Number.isFinite(port) ? port : 22,
        username,
        privateKey,
        readyTimeout: 15000,
      })

    return { stop }
  },

  async notifyServerStatus(payload: NormalizedServerStatusPayload) {
    const users = await userService.findAll()
    const recipients = users.filter(isServerStatusRecipient)

    if (recipients.length === 0) {
      console.warn('No recipients found for server status alert')
      return
    }

    const statusLabel = SERVER_STATUS_LABELS[payload.status] || 'Update'
    const containerSuffix = payload.container?.trim() ? ` (${payload.container.trim()})` : ''
    const serverName = payload.server?.name || 'Unknown'
    const alertCount = payload.alert_summary?.total || 0
    const alertSuffix = alertCount > 0 ? ` - ${alertCount} alert${alertCount !== 1 ? 's' : ''}` : ''
    const title = `Server ${statusLabel}: ${payload.project} / ${serverName}${containerSuffix}${alertSuffix}`
    const userIds = recipients.map((user) => user.id)
    const testEmail = process.env.SERVER_STATUS_TEST_EMAIL?.trim()
    const emails = testEmail ? [testEmail] : recipients.map((user) => user.email).filter(Boolean)

    // Build email data from normalized payload
    const emailData = {
      status: payload.status,
      project: payload.project,
      serverName: payload.server?.name || 'Unknown',
      hostname: payload.server?.hostname,
      container: payload.container,
      uptime_seconds: payload.server?.uptime_seconds,
      process_count: payload.server?.process_count,
      metrics: payload.metrics,
      alert_summary: payload.alert_summary,
      instance_alerts: payload.instance_alerts,
      container_alerts: payload.containers?.alerts,
      health_changes: payload.health_changes,
      containers: payload.containers
        ? {
            total: payload.containers.total,
            running: payload.containers.running,
            stopped: payload.containers.stopped,
            restarting: payload.containers.restarting,
          }
        : undefined,
      lifecycle_event: payload.lifecycle?.event,
      lifecycle_reason: payload.lifecycle?.reason,
      receivedAt: new Date(),
    }

    const notificationPromise = notificationService.createSystemNotificationForUsers(
      userIds,
      title,
      '/server-management'
    )
    const emailPromise =
      emails.length > 0 ? emailService.sendServerStatusEmail(emails, emailData) : Promise.resolve()

    const results = await Promise.allSettled([notificationPromise, emailPromise])
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const label = index === 0 ? 'notification' : 'email'
        console.error(`Failed to send server status ${label}:`, result.reason)
      }
    })
  },

  startActionRun(params: { userId: string; server: ServerManagementServer; action: ServerManagementAction }) {
    const { userId, server, action } = params
    const runId = randomUUID()
    const startedAt = new Date().toISOString()

    const emit = (event: string, payload: Record<string, unknown>) => {
      SocketEmitter.emitToUser(userId, event, payload)
      SocketEmitter.emitToRoomExceptUser(serverManagementRunRoom(runId), event, payload, userId)
    }

    const sshKey = server.sshKey
    if (!sshKey) {
      emit(ServerManagementSocketEvents.RUN_ERROR, {
        runId,
        serverId: server.id,
        actionId: action.id,
        message: 'Missing SSH key',
      })
      return { runId }
    }

    let privateKey: Buffer
    try {
      privateKey = buildPrivateKey(sshKey)
    } catch (error) {
      emit(ServerManagementSocketEvents.RUN_ERROR, {
        runId,
        serverId: server.id,
        actionId: action.id,
        message: formatErrorMessage(error, 'Invalid SSH key'),
      })
      return { runId }
    }

    const host = server.host
    const port = server.port ? Number.parseInt(server.port, 10) : 22
    const username = server.user || 'root'

    const connection = new Client()

    connection
      .on('ready', () => {
        emit(ServerManagementSocketEvents.RUN_STARTED, {
          runId,
          serverId: server.id,
          actionId: action.id,
          actionName: action.name,
          host,
          startedAt,
        })

        connection.exec(buildRemoteCommand(server, action.command), (execError, stream) => {
          if (execError) {
            emit(ServerManagementSocketEvents.RUN_ERROR, {
              runId,
              serverId: server.id,
              actionId: action.id,
              message: formatErrorMessage(execError, 'Unable to start command'),
            })
            connection.end()
            return
          }

          stream.setEncoding('utf8')
          stream.stderr.setEncoding('utf8')

          stream.on('data', (chunk: string) => {
            emit(ServerManagementSocketEvents.RUN_OUTPUT, {
              runId,
              serverId: server.id,
              actionId: action.id,
              stream: 'stdout',
              chunk,
            })
          })

          stream.stderr.on('data', (chunk: string) => {
            emit(ServerManagementSocketEvents.RUN_OUTPUT, {
              runId,
              serverId: server.id,
              actionId: action.id,
              stream: 'stderr',
              chunk,
            })
          })

          stream.on('error', (streamError: unknown) => {
            emit(ServerManagementSocketEvents.RUN_ERROR, {
              runId,
              serverId: server.id,
              actionId: action.id,
              message: formatErrorMessage(streamError, 'Command stream error'),
            })
            connection.end()
          })

          stream.on('close', (code: number | null, signal: string | null) => {
            emit(ServerManagementSocketEvents.RUN_COMPLETED, {
              runId,
              serverId: server.id,
              actionId: action.id,
              exitCode: code,
              signal,
              success: code === 0,
              completedAt: new Date().toISOString(),
            })
            connection.end()
          })
        })
      })
      .on('error', (error) => {
        emit(ServerManagementSocketEvents.RUN_ERROR, {
          runId,
          serverId: server.id,
          actionId: action.id,
          message: formatErrorMessage(error, 'SSH connection error'),
        })
        connection.end()
      })
      .connect({
        host,
        port: Number.isFinite(port) ? port : 22,
        username,
        privateKey,
        readyTimeout: 15000,
      })

    return { runId }
  },
}
