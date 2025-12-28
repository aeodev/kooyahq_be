import { randomUUID } from 'node:crypto'
import { Client } from 'ssh2'
import { SocketEmitter } from '../../../utils/socket-emitter'
import { serverManagementRunRoom } from '../../../utils/socket-rooms'
import { ServerManagementSocketEvents } from './server-management.events'
import { serverManagementRepository } from './server-management.repository'
import { decryptSshKey, isEncryptedPrivateKey, normalizeSshKey } from './server-management.ssh'
import type { ServerManagementAction, ServerManagementServer } from './server-management.model'

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
