import type { AuthenticatedSocket } from '../../../lib/socket'
import { workspaceRoom } from '../../../utils/socket-rooms'

/**
 * Register socket handlers for workspace/boards module
 * Handles workspace room joining for real-time board updates
 */
export function registerBoardHandlers(socket: AuthenticatedSocket): void {
  const userId = socket.userId
  if (!userId) {
    return
  }

  // Join a workspace room to receive board updates
  socket.on('workspace:join', (workspaceId: string) => {
    socket.join(workspaceRoom(workspaceId))
    console.log(`User ${userId} joined workspace ${workspaceId}`)
  })

  // Leave a workspace room
  socket.on('workspace:leave', (workspaceId: string) => {
    socket.leave(workspaceRoom(workspaceId))
    console.log(`User ${userId} left workspace ${workspaceId}`)
  })
}

