import type { AuthenticatedSocket } from '../../lib/socket'
import { gameRoom, userRoom } from '../../utils/socket-rooms'
import { SocketEmitter } from '../../utils/socket-emitter'
import { notificationService } from '../notifications/notification.service'
import { PERMISSIONS } from '../auth/rbac/permissions'
import { socketHasPermission } from '../auth/rbac/socket-permissions'

// Tetris Battle lobby state (in-memory for now, can be moved to Redis for scaling)
interface TetrisPlayer {
  odactuserId: string
  name: string
  ready: boolean
  alive: boolean
  score: number
  koCount: number
  stackHeight: number
  lastUpdate: number
}

interface TetrisLobby {
  id: string
  status: 'waiting' | 'countdown' | 'in-progress' | 'finished'
  players: Map<string, TetrisPlayer>
  startTime?: number
  endTime?: number
  seed: number
  tickRate: number // 20 Hz = 50ms
  countdownStart?: number
}

// Global lobbies map
const tetrisLobbies = new Map<string, TetrisLobby>()
const DEFAULT_LOBBY_ID = 'global-tetris-battle'
const TICK_RATE = 50 // 20 Hz
const GAME_DURATION = 180000 // 3 minutes
const COUNTDOWN_DURATION = 5000 // 5 seconds
const READY_THRESHOLD = 0.5 // 50% of players must be ready

// Get or create the global lobby
function getOrCreateGlobalLobby(): TetrisLobby {
  if (!tetrisLobbies.has(DEFAULT_LOBBY_ID)) {
    tetrisLobbies.set(DEFAULT_LOBBY_ID, {
      id: DEFAULT_LOBBY_ID,
      status: 'waiting',
      players: new Map(),
      seed: Math.floor(Math.random() * 2147483647),
      tickRate: TICK_RATE,
    })
  }
  return tetrisLobbies.get(DEFAULT_LOBBY_ID)!
}

// Tetris lobby room name helper
function tetrisLobbyRoom(lobbyId: string): string {
  return `tetris:lobby:${lobbyId}`
}

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

  // =====================================
  // TETRIS BATTLE SPECIFIC HANDLERS
  // =====================================

  // Join Tetris Battle lobby
  socket.on('tetris:join-lobby', (data: { playerName: string }) => {
    if (!socketHasPermission(socket, PERMISSIONS.GAME_PLAY, PERMISSIONS.GAME_FULL_ACCESS)) return
    
    const lobby = getOrCreateGlobalLobby()
    const roomName = tetrisLobbyRoom(lobby.id)
    
    // Add player to lobby
    lobby.players.set(userId, {
      odactuserId: userId,
      name: data.playerName || 'Unknown',
      ready: false,
      alive: true,
      score: 0,
      koCount: 0,
      stackHeight: 0,
      lastUpdate: Date.now(),
    })
    
    // Join socket room
    socket.join(roomName)
    
    // Send lobby state to joining player
    socket.emit('tetris:lobby-state', {
      lobbyId: lobby.id,
      status: lobby.status,
      players: Array.from(lobby.players.entries()).map(([id, p]) => ({
        odactuserId: id,
        name: p.name,
        ready: p.ready,
      })),
      seed: lobby.seed,
      tickRate: lobby.tickRate,
    })
    
    // Broadcast player joined to others
    SocketEmitter.emitToRoom(roomName, 'tetris:player-joined', {
      odactuserId: userId,
      name: data.playerName,
      playerCount: lobby.players.size,
    })
    
    console.log(`User ${userId} joined Tetris lobby. Total players: ${lobby.players.size}`)
  })

  // Leave Tetris Battle lobby
  socket.on('tetris:leave-lobby', () => {
    if (!socketHasPermission(socket, PERMISSIONS.GAME_PLAY, PERMISSIONS.GAME_FULL_ACCESS)) return
    
    const lobby = getOrCreateGlobalLobby()
    const roomName = tetrisLobbyRoom(lobby.id)
    
    const player = lobby.players.get(userId)
    if (!player) return

    lobby.players.delete(userId)
    socket.leave(roomName)

    if (lobby.status === 'in-progress') {
      SocketEmitter.emitToRoom(roomName, 'tetris:player-disconnected', {
        odactuserId: userId,
        playerName: player.name,
      })
      SocketEmitter.emitToRoom(roomName, 'tetris:player-update', {
        odactuserId: userId,
        score: player.score,
        stackHeight: player.stackHeight,
        koCount: player.koCount,
        alive: false,
      })
      const alivePlayers = Array.from(lobby.players.values()).filter(p => p.alive)
      if (alivePlayers.length <= 1) {
        endTetrisGame(lobby, roomName)
      }
      return
    }

    // Broadcast player left
    SocketEmitter.emitToRoom(roomName, 'tetris:player-left', {
      odactuserId: userId,
      playerCount: lobby.players.size,
    })
    
    console.log(`User ${userId} left Tetris lobby. Remaining players: ${lobby.players.size}`)
  })

  // Player ready toggle
  socket.on('tetris:ready', (data: { ready: boolean }) => {
    if (!socketHasPermission(socket, PERMISSIONS.GAME_PLAY, PERMISSIONS.GAME_FULL_ACCESS)) return
    
    const lobby = getOrCreateGlobalLobby()
    const roomName = tetrisLobbyRoom(lobby.id)
    const player = lobby.players.get(userId)
    
    if (!player || lobby.status !== 'waiting') return
    
    player.ready = data.ready
    
    // Broadcast ready state change
    SocketEmitter.emitToRoom(roomName, 'tetris:player-ready', {
      odactuserId: userId,
      ready: data.ready,
    })
    
    // Check if enough players are ready to start countdown
    const readyCount = Array.from(lobby.players.values()).filter(p => p.ready).length
    const readyRatio = readyCount / lobby.players.size
    
    if (lobby.players.size >= 2 && readyRatio >= READY_THRESHOLD && lobby.status === 'waiting') {
      // Start countdown
      lobby.status = 'countdown'
      lobby.countdownStart = Date.now()
      
      SocketEmitter.emitToRoom(roomName, 'tetris:countdown-start', {
        duration: COUNTDOWN_DURATION,
        startTime: lobby.countdownStart,
      })
      
      // Schedule game start
      setTimeout(() => {
        if (lobby.status !== 'countdown') return

        const currentReadyCount = Array.from(lobby.players.values()).filter(p => p.ready).length
        const currentReadyRatio = lobby.players.size > 0 ? currentReadyCount / lobby.players.size : 0

        if (lobby.players.size < 2 || currentReadyRatio < READY_THRESHOLD) {
          lobby.status = 'waiting'
          lobby.countdownStart = undefined
          SocketEmitter.emitToRoom(roomName, 'tetris:lobby-state', {
            lobbyId: lobby.id,
            status: lobby.status,
            players: Array.from(lobby.players.entries()).map(([id, p]) => ({
              odactuserId: id,
              name: p.name,
              ready: p.ready,
            })),
            seed: lobby.seed,
            tickRate: lobby.tickRate,
          })
          return
        }

        startTetrisGame(lobby, roomName)
      }, COUNTDOWN_DURATION)
    }
  })

  // Player input during game
  socket.on('tetris:input', (data: { action: string; timestamp: number }) => {
    if (!socketHasPermission(socket, PERMISSIONS.GAME_PLAY, PERMISSIONS.GAME_FULL_ACCESS)) return
    
    const lobby = getOrCreateGlobalLobby()
    if (lobby.status !== 'in-progress') return
    
    const player = lobby.players.get(userId)
    if (!player || !player.alive) return
    
    // Input is processed client-side, but we track it for validation
    // Server mainly handles attack distribution and state sync
    player.lastUpdate = Date.now()
  })

  // Player state update (score, stack height, K.O.)
  socket.on('tetris:player-update', (data: { 
    score: number
    stackHeight: number
    koCount: number
    alive: boolean
  }) => {
    if (!socketHasPermission(socket, PERMISSIONS.GAME_PLAY, PERMISSIONS.GAME_FULL_ACCESS)) return
    
    const lobby = getOrCreateGlobalLobby()
    if (lobby.status !== 'in-progress') return
    
    const player = lobby.players.get(userId)
    if (!player) return
    
    player.score = data.score
    player.stackHeight = data.stackHeight
    player.koCount = Math.max(player.koCount, data.koCount)
    player.alive = data.alive
    player.lastUpdate = Date.now()

    const roomName = tetrisLobbyRoom(lobby.id)
    SocketEmitter.emitToRoom(roomName, 'tetris:player-update', {
      odactuserId: userId,
      score: player.score,
      stackHeight: player.stackHeight,
      koCount: player.koCount,
      alive: player.alive,
    })
  })

  // Send attack (garbage lines) to opponents
  socket.on('tetris:attack', (data: { 
    lines: number
    targetId?: string // Optional specific target, otherwise use targeting rules
  }) => {
    if (!socketHasPermission(socket, PERMISSIONS.GAME_PLAY, PERMISSIONS.GAME_FULL_ACCESS)) return
    
    const lobby = getOrCreateGlobalLobby()
    const roomName = tetrisLobbyRoom(lobby.id)
    if (lobby.status !== 'in-progress') return
    
    const attacker = lobby.players.get(userId)
    if (!attacker || !attacker.alive) return
    
    // Determine target based on targeting rules
    let targetId = data.targetId
    
    if (!targetId) {
      // Priority 1: Highest stack height (easiest to kill)
      let maxHeight = -1
      for (const [playerId, player] of lobby.players) {
        if (playerId !== userId && player.alive && player.stackHeight > maxHeight) {
          maxHeight = player.stackHeight
          targetId = playerId
        }
      }
    }
    
    if (targetId && lobby.players.has(targetId)) {
      // Send attack to target only
      SocketEmitter.emitToUser(targetId, 'tetris:receive-attack', {
        fromUserId: userId,
        lines: data.lines,
        timestamp: Date.now(),
      })
    }
  })

  // Player topped out (died)
  socket.on('tetris:top-out', (data?: { killedBy?: string | null }) => {
    if (!socketHasPermission(socket, PERMISSIONS.GAME_PLAY, PERMISSIONS.GAME_FULL_ACCESS)) return
    
    const lobby = getOrCreateGlobalLobby()
    const roomName = tetrisLobbyRoom(lobby.id)
    if (lobby.status !== 'in-progress') return
    
    const player = lobby.players.get(userId)
    if (!player) return
    
    player.alive = false
    
    // Broadcast death
    SocketEmitter.emitToRoom(roomName, 'tetris:player-died', {
      odactuserId: userId,
      playerName: player.name,
      finalScore: player.score,
    })

    if (data?.killedBy && data.killedBy !== userId && lobby.players.has(data.killedBy)) {
      const killer = lobby.players.get(data.killedBy)!
      killer.koCount += 1
      SocketEmitter.emitToRoom(roomName, 'tetris:player-update', {
        odactuserId: data.killedBy,
        score: killer.score,
        stackHeight: killer.stackHeight,
        koCount: killer.koCount,
        alive: killer.alive,
      })
    }
    
    // Check if game should end (only one player left)
    const alivePlayers = Array.from(lobby.players.values()).filter(p => p.alive)
    if (alivePlayers.length <= 1) {
      endTetrisGame(lobby, roomName)
    }
  })

  // Request current game snapshot (for spectators or late joiners)
  socket.on('tetris:request-snapshot', () => {
    if (!socketHasPermission(socket, PERMISSIONS.GAME_READ, PERMISSIONS.GAME_FULL_ACCESS)) return
    
    const lobby = getOrCreateGlobalLobby()
    
    socket.emit('tetris:snapshot', {
      lobbyId: lobby.id,
      status: lobby.status,
      players: Array.from(lobby.players.entries()).map(([id, p]) => ({
        odactuserId: id,
        name: p.name,
        alive: p.alive,
        score: p.score,
        koCount: p.koCount,
        stackHeight: p.stackHeight,
      })),
      timeRemaining: lobby.endTime ? lobby.endTime - Date.now() : null,
      seed: lobby.seed,
    })
  })

  // Handle disconnect - remove from lobby
  socket.on('disconnect', () => {
    const lobby = getOrCreateGlobalLobby()
    const player = lobby.players.get(userId)
    if (!player) return

    const roomName = tetrisLobbyRoom(lobby.id)
    lobby.players.delete(userId)
    
    if (lobby.status === 'in-progress') {
      SocketEmitter.emitToRoom(roomName, 'tetris:player-disconnected', {
        odactuserId: userId,
        playerName: player.name,
      })
      SocketEmitter.emitToRoom(roomName, 'tetris:player-update', {
        odactuserId: userId,
        score: player.score,
        stackHeight: player.stackHeight,
        koCount: player.koCount,
        alive: false,
      })
      const alivePlayers = Array.from(lobby.players.values()).filter(p => p.alive)
      if (alivePlayers.length <= 1) {
        endTetrisGame(lobby, roomName)
      }
      return
    }

    SocketEmitter.emitToRoom(roomName, 'tetris:player-left', {
      odactuserId: userId,
      playerCount: lobby.players.size,
    })
  })
}

// Helper function to start the game
function startTetrisGame(lobby: TetrisLobby, roomName: string): void {
  lobby.status = 'in-progress'
  lobby.startTime = Date.now()
  lobby.endTime = Date.now() + GAME_DURATION
  lobby.seed = Math.floor(Math.random() * 2147483647) // New seed for this game
  
  // Reset all players
  for (const player of lobby.players.values()) {
    player.alive = true
    player.score = 0
    player.koCount = 0
    player.stackHeight = 0
  }
  
  // Broadcast game start
  SocketEmitter.emitToRoom(roomName, 'tetris:game-start', {
    seed: lobby.seed,
    duration: GAME_DURATION,
    startTime: lobby.startTime,
    endTime: lobby.endTime,
    players: Array.from(lobby.players.entries()).map(([id, p]) => ({
      odactuserId: id,
      name: p.name,
    })),
  })
  
  // Schedule game end
  setTimeout(() => {
    if (lobby.status === 'in-progress') {
      endTetrisGame(lobby, roomName)
    }
  }, GAME_DURATION)
  
  console.log(`Tetris game started with ${lobby.players.size} players. Seed: ${lobby.seed}`)
}

// Helper function to end the game
function endTetrisGame(lobby: TetrisLobby, roomName: string): void {
  lobby.status = 'finished'
  
  // Determine winner (highest K.O. count, then highest score)
  const sortedPlayers = Array.from(lobby.players.entries()).sort((a, b) => {
    if (b[1].koCount !== a[1].koCount) return b[1].koCount - a[1].koCount
    return b[1].score - a[1].score
  })
  
  const winner = sortedPlayers[0]
  
  // Broadcast game end
  SocketEmitter.emitToRoom(roomName, 'tetris:game-end', {
    winnerId: winner?.[0],
    winnerName: winner?.[1].name,
    leaderboard: sortedPlayers.map(([id, p], rank) => ({
      rank: rank + 1,
      odactuserId: id,
      name: p.name,
      score: p.score,
      koCount: p.koCount,
      alive: p.alive,
    })),
  })
  
  // Reset lobby after a delay for next game
  setTimeout(() => {
    lobby.status = 'waiting'
    lobby.startTime = undefined
    lobby.endTime = undefined
    for (const player of lobby.players.values()) {
      player.ready = false
      player.alive = true
      player.score = 0
      player.koCount = 0
      player.stackHeight = 0
    }
    
    SocketEmitter.emitToRoom(roomName, 'tetris:lobby-reset', {
      lobbyId: lobby.id,
    })
  }, 10000) // 10 second delay before reset
  
  console.log(`Tetris game ended. Winner: ${winner?.[1].name}`)
}
