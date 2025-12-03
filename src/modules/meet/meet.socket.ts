import type { AuthenticatedSocket } from '../../lib/socket'
import { meetRoom } from '../../utils/socket-rooms'
import { SocketEmitter } from '../../utils/socket-emitter'

/**
 * Register socket handlers for meet module
 * Handles room management and chat for video conferencing
 * Note: WebRTC signaling removed - now handled by LiveKit SFU
 */
export function registerMeetHandlers(socket: AuthenticatedSocket): void {
  const userId = socket.userId
  if (!userId) {
    return
  }

  // Join a meeting room (for chat coordination)
  socket.on('meet:join', (meetId: string) => {
    const room = meetRoom(meetId)
    socket.join(room)
    console.log(`User ${userId} joined meet ${meetId}`)
  })

  // Leave a meeting room
  socket.on('meet:leave', (meetId: string) => {
    socket.leave(meetRoom(meetId))
    console.log(`User ${userId} left meet ${meetId}`)
  })

  // Handle chat messages
  socket.on('meet:chat-message', (data: { meetId: string; message: string }) => {
    const { meetId, message } = data
    
    // Broadcast chat message to all participants in the room (including sender)
    SocketEmitter.emitToRoom(meetRoom(meetId), 'meet:chat-message', {
      userId,
      userName: socket.user?.name,
      meetId,
      message,
      timestamp: new Date().toISOString(),
    })
  })
}

