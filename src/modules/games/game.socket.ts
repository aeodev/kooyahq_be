import type { AuthenticatedSocket } from '../../lib/socket'
import { gameRoom, userRoom } from '../../utils/socket-rooms'
import { SocketEmitter } from '../../utils/socket-emitter'
import { notificationService } from '../notifications/notification.service'
import { PERMISSIONS } from '../auth/rbac/permissions'
import { socketHasPermission } from '../auth/rbac/socket-permissions'

/**
 * Register socket handlers for games module
 * Handles game invitations, room joining, and real-time game updates
 */
export function registerGameHandlers(socket: AuthenticatedSocket): void {
  const userId = socket.userId
  if (!userId) {
    return
  }

  // Listen for game join requests
  socket.on('game:join', (gameId: string) => {
    if (!socketHasPermission(socket, PERMISSIONS.GAME_PLAY, PERMISSIONS.GAME_FULL_ACCESS)) return
    socket.join(gameRoom(gameId))
    console.log(`User ${userId} joined game ${gameId}`)
  })

  socket.on('game:leave', (gameId: string) => {
    if (!socketHasPermission(socket, PERMISSIONS.GAME_PLAY, PERMISSIONS.GAME_FULL_ACCESS)) return
    socket.leave(gameRoom(gameId))
    console.log(`User ${userId} left game ${gameId}`)
  })

  // Handle user pokes
  socket.on('user:poke', (data: { pokedUserId: string }) => {
    if (!socketHasPermission(socket, PERMISSIONS.GAME_PLAY, PERMISSIONS.GAME_FULL_ACCESS)) return
    const { pokedUserId } = data
    
    // Emit poke notification to the poked user
    SocketEmitter.emitToUser(pokedUserId, 'user:poked', {
      fromUserId: userId,
      timestamp: new Date().toISOString(),
    })
  })

  // Handle game invitations
  socket.on('game:invite', async (data: { gameType: string; invitedUserId: string }) => {
    if (!socketHasPermission(socket, PERMISSIONS.GAME_INVITE, PERMISSIONS.GAME_FULL_ACCESS, PERMISSIONS.GAME_PLAY)) return
    const { gameType, invitedUserId } = data
    
    // Create notification for the invited user
    try {
      await notificationService.createGameInvitationNotification(invitedUserId, userId, gameType)
    } catch (error) {
      console.error('Failed to create game invitation notification:', error)
    }
    
    // Emit invitation to the invited user
    SocketEmitter.emitToUser(invitedUserId, 'game:invitation', {
      fromUserId: userId,
      gameType,
      timestamp: new Date().toISOString(),
    })
  })

  // Handle invitation acceptance
  socket.on('game:accept-invitation', (data: { fromUserId: string; gameType: string }) => {
    if (!socketHasPermission(socket, PERMISSIONS.GAME_INVITE, PERMISSIONS.GAME_FULL_ACCESS, PERMISSIONS.GAME_PLAY)) return
    const { fromUserId, gameType } = data
    
    // Notify the inviter that invitation was accepted
    SocketEmitter.emitToUser(fromUserId, 'game:invitation-accepted', {
      acceptedByUserId: userId,
      gameType,
      timestamp: new Date().toISOString(),
    })
  })

  // Handle game state updates (for real-time game play)
  socket.on('game:move', (data: { gameId: string; move: unknown }) => {
    if (!socketHasPermission(socket, PERMISSIONS.GAME_PLAY, PERMISSIONS.GAME_FULL_ACCESS)) return
    const { gameId } = data
    
    // Broadcast move to all players in the game room
    SocketEmitter.emitToRoom(gameRoom(gameId), 'game:move-update', {
      userId,
      gameId,
      move: data.move,
      timestamp: new Date().toISOString(),
    })
  })

  // Handle game state synchronization requests
  socket.on('game:request-state', (gameId: string) => {
    if (!socketHasPermission(socket, PERMISSIONS.GAME_READ, PERMISSIONS.GAME_FULL_ACCESS)) return
    // This will be handled by game-specific logic
    // For now, just acknowledge the request
    socket.emit('game:state-requested', { gameId })
  })
}
