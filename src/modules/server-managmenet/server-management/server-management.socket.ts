import type { AuthenticatedSocket } from '../../../lib/socket'
import { serverManagementRunRoom } from '../../../utils/socket-rooms'
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

  socket.on('server-management:join-run', (runId: string) => {
    if (!runId) return
    socket.join(serverManagementRunRoom(runId))
  })

  socket.on('server-management:leave-run', (runId: string) => {
    if (!runId) return
    socket.leave(serverManagementRunRoom(runId))
  })
}
