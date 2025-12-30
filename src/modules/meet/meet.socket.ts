import type { AuthenticatedSocket } from '../../lib/socket'
import { meetRoom } from '../../utils/socket-rooms'
import { SocketEmitter } from '../../utils/socket-emitter'
import { PERMISSIONS } from '../auth/rbac/permissions'
import { socketHasPermission } from '../auth/rbac/socket-permissions'

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
    if (!socketHasPermission(socket, PERMISSIONS.MEET_TOKEN, PERMISSIONS.MEET_FULL_ACCESS)) return
    const room = meetRoom(meetId)
    socket.join(room)

    // Broadcast participant joined to all other participants in the room
    socket.to(room).emit('meet:participant-joined', {
      userId,
      userName: socket.user?.name,
      timestamp: new Date().toISOString(),
    })

    console.log(`User ${userId} joined meet ${meetId}`)
  })

  // Leave a meeting room
  socket.on('meet:leave', (meetId: string) => {
    if (!socketHasPermission(socket, PERMISSIONS.MEET_TOKEN, PERMISSIONS.MEET_FULL_ACCESS)) return
    const room = meetRoom(meetId)

    // Broadcast participant left to all other participants in the room
    socket.to(room).emit('meet:participant-left', {
      userId,
      timestamp: new Date().toISOString(),
    })

    socket.leave(room)
    console.log(`User ${userId} left meet ${meetId}`)
  })

  // Handle chat messages
  socket.on('meet:chat-message', (data: { meetId: string; message: string }) => {
    if (!socketHasPermission(socket, PERMISSIONS.MEET_TOKEN, PERMISSIONS.MEET_FULL_ACCESS)) return
    const { meetId, message } = data
    
    // Validate inputs
    if (!meetId || typeof meetId !== 'string') return
    if (!message || typeof message !== 'string') return
    if (message.length > 2000) return // Max 2000 characters
    
    // Sanitize message
    const sanitizedMessage = message.trim().slice(0, 2000)
    if (!sanitizedMessage) return
    
    // Broadcast chat message to all participants in the room (including sender)
    SocketEmitter.emitToRoom(meetRoom(meetId), 'meet:chat-message', {
      userId,
      userName: socket.user?.name,
      meetId,
      message: sanitizedMessage,
      timestamp: new Date().toISOString(),
    })
  })

  // Handle meet invitations
  socket.on('meet:invite', async (data: { meetId: string; invitedUserId: string }) => {
    if (!socketHasPermission(socket, PERMISSIONS.MEET_TOKEN, PERMISSIONS.MEET_FULL_ACCESS)) return
    const { meetId, invitedUserId } = data

    // Emit invitation to the invited user
    SocketEmitter.emitToUser(invitedUserId, 'meet:invitation', {
      fromUserId: userId,
      fromUserName: socket.user?.name || 'Someone',
      meetId,
      timestamp: new Date().toISOString(),
    })
  })

  // Handle invitation acceptance
  socket.on('meet:accept-invitation', (data: { meetId: string; fromUserId: string }) => {
    if (!socketHasPermission(socket, PERMISSIONS.MEET_TOKEN, PERMISSIONS.MEET_FULL_ACCESS)) return
    const { meetId, fromUserId } = data

    // Notify the inviter that invitation was accepted
    SocketEmitter.emitToUser(fromUserId, 'meet:invitation-accepted', {
      acceptedByUserId: userId,
      acceptedByUserName: socket.user?.name || 'Someone',
      meetId,
      timestamp: new Date().toISOString(),
    })
  })

  // Handle invitation decline
  socket.on('meet:decline-invitation', (data: { meetId: string; fromUserId: string }) => {
    if (!socketHasPermission(socket, PERMISSIONS.MEET_TOKEN, PERMISSIONS.MEET_FULL_ACCESS)) return
    const { meetId, fromUserId } = data

    // Notify the inviter that invitation was declined
    SocketEmitter.emitToUser(fromUserId, 'meet:invitation-declined', {
      declinedByUserId: userId,
      declinedByUserName: socket.user?.name || 'Someone',
      meetId,
      timestamp: new Date().toISOString(),
    })
  })

  // Handle LiveKit identity mapping
  socket.on('meet:livekit-identity', (data: { meetId: string; userId: string; liveKitIdentity: string }) => {
    if (!socketHasPermission(socket, PERMISSIONS.MEET_TOKEN, PERMISSIONS.MEET_FULL_ACCESS)) return
    const { meetId, userId, liveKitIdentity } = data

    // Broadcast the identity mapping to all other participants in the room
    const room = meetRoom(meetId)
    socket.to(room).emit('meet:livekit-identity', {
      userId,
      liveKitIdentity,
    })
  })
}
