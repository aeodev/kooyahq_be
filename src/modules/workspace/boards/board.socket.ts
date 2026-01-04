import type { AuthenticatedSocket } from '../../../lib/socket'
import { workspaceRoom } from '../../../utils/socket-rooms'
import { PERMISSIONS } from '../../auth/rbac/permissions'
import { socketHasPermission } from '../../auth/rbac/socket-permissions'
import { DEFAULT_WORKSPACE_ID } from './board.model'

/**
 * Register socket handlers for workspace/boards module
 * Handles workspace room joining for real-time board updates
 */
export function registerBoardHandlers(socket: AuthenticatedSocket): void {
  const userId = socket.userId
  if (!userId) {
    return
  }

  // Auto-join the global boards room for real-time updates
  if (socketHasPermission(socket, PERMISSIONS.BOARD_VIEW_ALL, PERMISSIONS.BOARD_FULL_ACCESS)) {
    socket.join(workspaceRoom(DEFAULT_WORKSPACE_ID))
    console.log(`User ${userId} joined default boards room`)
  }

  // Join a workspace room to receive board updates
  socket.on('workspace:join', (workspaceId: string) => {
    if (!socketHasPermission(socket, PERMISSIONS.BOARD_VIEW_ALL, PERMISSIONS.BOARD_FULL_ACCESS)) return
    socket.join(workspaceRoom(workspaceId))
    console.log(`User ${userId} joined workspace ${workspaceId}`)
  })

  // Leave a workspace room
  socket.on('workspace:leave', (workspaceId: string) => {
    if (!socketHasPermission(socket, PERMISSIONS.BOARD_VIEW_ALL, PERMISSIONS.BOARD_FULL_ACCESS)) return
    socket.leave(workspaceRoom(workspaceId))
    console.log(`User ${userId} left workspace ${workspaceId}`)
  })
}

