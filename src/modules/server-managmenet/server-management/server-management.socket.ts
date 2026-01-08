import type { AuthenticatedSocket } from '../../../lib/socket'
import { serverManagementRunRoom } from '../../../utils/socket-rooms'
import { ServerManagementSocketEvents } from './server-management.events'
import { serverManagementService } from './server-management.service'
import { socketHasPermission } from '../../auth/rbac/socket-permissions'
import { PERMISSIONS } from '../../auth/rbac/permissions'

export function registerServerManagementHandlers(socket: AuthenticatedSocket): void {
  if (!socket.userId) {
    return
  }

  const canAccess = socketHasPermission(
    socket,
    PERMISSIONS.SERVER_MANAGEMENT_VIEW,
    PERMISSIONS.SERVER_MANAGEMENT_USE,
    PERMISSIONS.SERVER_MANAGEMENT_ELEVATED_USE,
    PERMISSIONS.SERVER_MANAGEMENT_MANAGE,
  )

  if (!canAccess) {
    return
  }

  const canUse = socketHasPermission(
    socket,
    PERMISSIONS.SERVER_MANAGEMENT_USE,
    PERMISSIONS.SERVER_MANAGEMENT_ELEVATED_USE,
    PERMISSIONS.SERVER_MANAGEMENT_MANAGE,
  )

  let activeStatusStream: { serverId: string; stop: () => void } | null = null

  const stopStatusStream = () => {
    if (!activeStatusStream) return
    activeStatusStream.stop()
    activeStatusStream = null
  }

  socket.on('server-management:join-run', (runId: string) => {
    if (!runId) return
    socket.join(serverManagementRunRoom(runId))
  })

  socket.on('server-management:leave-run', (runId: string) => {
    if (!runId) return
    socket.leave(serverManagementRunRoom(runId))
  })

  socket.on('server-management:status-start', async (serverId: string) => {
    if (!serverId) return

    if (!canUse) {
      socket.emit(ServerManagementSocketEvents.STATUS_ERROR, {
        serverId,
        message: 'Forbidden',
      })
      return
    }

    stopStatusStream()

    try {
      const resolved = await serverManagementService.findServerById(serverId)
      if (!resolved) {
        socket.emit(ServerManagementSocketEvents.STATUS_ERROR, {
          serverId,
          message: 'Server not found',
        })
        return
      }

      const { server } = resolved
      if (!server.host?.trim()) {
        socket.emit(ServerManagementSocketEvents.STATUS_ERROR, {
          serverId,
          message: 'Server host is missing',
        })
        return
      }

      if (!server.sshKey?.trim()) {
        socket.emit(ServerManagementSocketEvents.STATUS_ERROR, {
          serverId,
          message: 'Server SSH key is missing',
        })
        return
      }

      if (!server.statusCommand?.trim()) {
        socket.emit(ServerManagementSocketEvents.STATUS_ERROR, {
          serverId,
          message: 'Status command is missing',
        })
        return
      }

      const stream = serverManagementService.startStatusStream({
        server,
        onPayload: (payload) => {
          socket.emit(ServerManagementSocketEvents.STATUS_UPDATE, {
            serverId,
            ...payload,
          })
        },
        onError: (message) => {
          socket.emit(ServerManagementSocketEvents.STATUS_ERROR, {
            serverId,
            message,
          })
        },
        onClose: () => {
          if (activeStatusStream?.stop === stream.stop) {
            activeStatusStream = null
          }
        },
      })

      activeStatusStream = { serverId, stop: stream.stop }
    } catch (error) {
      const message =
        error instanceof Error && error.message ? error.message : 'Unable to start status stream'
      socket.emit(ServerManagementSocketEvents.STATUS_ERROR, {
        serverId,
        message,
      })
    }
  })

  socket.on('server-management:status-stop', (serverId: string) => {
    if (!activeStatusStream) return
    if (!serverId || activeStatusStream.serverId === serverId) {
      stopStatusStream()
    }
  })

  socket.on('disconnect', () => {
    stopStatusStream()
  })
}
