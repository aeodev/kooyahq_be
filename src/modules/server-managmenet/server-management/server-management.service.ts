import { randomUUID } from 'node:crypto'
import { Client } from 'ssh2'
import { SocketEmitter } from '../../../utils/socket-emitter'
import { serverManagementRunRoom } from '../../../utils/socket-rooms'
import { ServerManagementSocketEvents } from './server-management.events'
import { serverManagementRepository } from './server-management.repository'
import type { ServerManagementAction, ServerManagementServer } from './server-management.model'

function buildPrivateKey(sshKey: string): Buffer {
  const normalizedKey = sshKey.includes('\\n') ? sshKey.replace(/\\n/g, '\n') : sshKey
  return Buffer.from(normalizedKey)
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
            reject(execError)
            return
          }

          stream.on('data', (chunk: Buffer) => {
            stdout += chunk.toString()
          })

          stream.stderr.on('data', (chunk: Buffer) => {
            stderr += chunk.toString()
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
        reject(error)
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
    const command = server.statusPath?.trim()
    if (!command) {
      throw new Error('Status script path is missing')
    }

    const result = await executeStatusCommand(server, command)
    if (result.exitCode && result.exitCode !== 0) {
      const message = result.stderr || result.stdout || `Status script failed with exit code ${result.exitCode}`
      throw new Error(message)
    }

    const rawOutput = result.stdout || result.stderr
    return {
      status: parseStatusOutput(rawOutput),
      rawOutput,
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
      SocketEmitter.emitToRoom(serverManagementRunRoom(runId), event, payload)
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

    const privateKey = buildPrivateKey(sshKey)

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

        connection.exec(action.path, (execError, stream) => {
          if (execError) {
            emit(ServerManagementSocketEvents.RUN_ERROR, {
              runId,
              serverId: server.id,
              actionId: action.id,
              message: execError.message,
            })
            connection.end()
            return
          }

          stream.on('data', (chunk: Buffer) => {
            emit(ServerManagementSocketEvents.RUN_OUTPUT, {
              runId,
              serverId: server.id,
              actionId: action.id,
              stream: 'stdout',
              chunk: chunk.toString(),
            })
          })

          stream.stderr.on('data', (chunk: Buffer) => {
            emit(ServerManagementSocketEvents.RUN_OUTPUT, {
              runId,
              serverId: server.id,
              actionId: action.id,
              stream: 'stderr',
              chunk: chunk.toString(),
            })
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
          message: error.message,
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
