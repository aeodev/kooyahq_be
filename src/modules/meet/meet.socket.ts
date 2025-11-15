import type { AuthenticatedSocket } from '../../lib/socket'
import { getSocketServer } from '../../lib/socket'
import { meetRoom } from '../../utils/socket-rooms'
import { SocketEmitter } from '../../utils/socket-emitter'

// WebRTC types for signaling
interface RTCSessionDescriptionInit {
  type: 'offer' | 'answer' | 'pranswer' | 'rollback'
  sdp?: string
}

interface RTCIceCandidateInit {
  candidate?: string
  sdpMLineIndex?: number | null
  sdpMid?: string | null
  usernameFragment?: string | null
}

/**
 * Register socket handlers for meet module
 * Handles WebRTC signaling, room management, and chat for video conferencing
 */
export function registerMeetHandlers(socket: AuthenticatedSocket): void {
  const userId = socket.userId
  if (!userId) {
    return
  }

  // Join a meeting room
  socket.on('meet:join', (meetId: string) => {
    const room = meetRoom(meetId)
    socket.join(room)
    console.log(`User ${userId} joined meet ${meetId}`)
    
    // Get existing participants in the room with their info
    const io = getSocketServer()
    const roomSockets = io.sockets.adapter.rooms.get(room)
    const existingParticipants: Array<{ userId: string; userName?: string; profilePic?: string }> = []
    
    if (roomSockets) {
      roomSockets.forEach((socketId) => {
        if (socketId !== socket.id) {
          const otherSocket = io.sockets.sockets.get(socketId) as AuthenticatedSocket | undefined
          if (otherSocket?.userId) {
            existingParticipants.push({
              userId: otherSocket.userId,
              userName: otherSocket.user?.name,
              profilePic: otherSocket.user?.profilePic,
            })
          }
        }
      })
    }
    
    // Send existing participants to the new joiner
    if (existingParticipants.length > 0) {
      socket.emit('meet:existing-participants', {
        meetId,
        participants: existingParticipants,
        timestamp: new Date().toISOString(),
      })
    }
    
    // Notify other participants in the room about the new joiner
    socket.to(room).emit('meet:user-joined', {
      userId,
      userName: socket.user?.name,
      profilePic: socket.user?.profilePic,
      meetId,
      timestamp: new Date().toISOString(),
    })
  })

  // Leave a meeting room
  socket.on('meet:leave', (meetId: string) => {
    socket.leave(meetRoom(meetId))
    console.log(`User ${userId} left meet ${meetId}`)
    
    // Notify other participants in the room
    SocketEmitter.emitToRoom(meetRoom(meetId), 'meet:user-left', {
      userId,
      meetId,
      timestamp: new Date().toISOString(),
    })
  })

  // Handle WebRTC offer
  socket.on('meet:offer', (data: { meetId: string; offer: RTCSessionDescriptionInit; targetUserId: string }) => {
    const { meetId, offer, targetUserId } = data
    
    // Relay offer to target user
    SocketEmitter.emitToUser(targetUserId, 'meet:offer', {
      fromUserId: userId,
      meetId,
      offer,
      timestamp: new Date().toISOString(),
    })
  })

  // Handle WebRTC answer
  socket.on('meet:answer', (data: { meetId: string; answer: RTCSessionDescriptionInit; targetUserId: string }) => {
    const { meetId, answer, targetUserId } = data
    
    // Relay answer to target user
    SocketEmitter.emitToUser(targetUserId, 'meet:answer', {
      fromUserId: userId,
      meetId,
      answer,
      timestamp: new Date().toISOString(),
    })
  })

  // Handle ICE candidate
  socket.on('meet:ice-candidate', (data: { meetId: string; candidate: RTCIceCandidateInit; targetUserId: string }) => {
    const { meetId, candidate, targetUserId } = data
    
    // Relay ICE candidate to target user
    SocketEmitter.emitToUser(targetUserId, 'meet:ice-candidate', {
      fromUserId: userId,
      meetId,
      candidate,
      timestamp: new Date().toISOString(),
    })
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

  // Handle participant state updates (camera/mic/screen share toggles)
  socket.on('meet:participant-state', (data: { meetId: string; isVideoEnabled?: boolean; isAudioEnabled?: boolean; isScreenSharing?: boolean }) => {
    const { meetId, isVideoEnabled, isAudioEnabled, isScreenSharing } = data
    
    // Broadcast state update to all participants in the room
    SocketEmitter.emitToRoom(meetRoom(meetId), 'meet:participant-state-updated', {
      userId,
      meetId,
      isVideoEnabled,
      isAudioEnabled,
      isScreenSharing,
      timestamp: new Date().toISOString(),
    })
  })
}

