import type { AuthenticatedSocket } from '../../lib/socket'
import { timeEntriesRoom } from '../../utils/socket-rooms'
import { PERMISSIONS } from '../auth/rbac/permissions'
import { socketHasPermission } from '../auth/rbac/socket-permissions'

/**
 * Register socket handlers for time-tracker module
 * Called automatically when socket connects
 */
export function registerTimeEntryHandlers(socket: AuthenticatedSocket): void {
  const userId = socket.userId
  if (!userId) {
    return
  }

  // Join user's personal room for targeted updates (already joined in socket.ts)
  // Join global room for broadcast updates (time entries visible to all)
  if (socketHasPermission(socket, PERMISSIONS.TIME_ENTRY_READ, PERMISSIONS.TIME_ENTRY_FULL_ACCESS)) {
    socket.join(timeEntriesRoom())
  }
}
