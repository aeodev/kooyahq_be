import type { AuthenticatedSocket } from '../../lib/socket'
import { aiNewsRoom } from '../../utils/socket-rooms'
import { PERMISSIONS } from '../auth/rbac/permissions'
import { socketHasPermission } from '../auth/rbac/socket-permissions'

/**
 * Register socket handlers for AI News module
 * Called automatically when socket connects
 */
export function registerAINewsHandlers(socket: AuthenticatedSocket): void {
  const userId = socket.userId
  if (!userId) {
    return
  }

  // Join AI News room if user has read permission
  if (
    socketHasPermission(
      socket,
      PERMISSIONS.AI_NEWS_READ,
      PERMISSIONS.AI_NEWS_FULL_ACCESS
    )
  ) {
    socket.join(aiNewsRoom())
  }
}

