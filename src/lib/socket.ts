import { Server as HttpServer } from 'node:http'
import { Server as SocketServer, type Socket } from 'socket.io'
import { verifyAccessToken } from '../utils/token'
import { userService } from '../modules/users/user.service'
import type { AccessTokenPayload } from '../utils/token'
import { env } from '../config/env'
import { socketHandlerRegistry } from './socket-manager'
import { userRoom } from '../utils/socket-rooms'
import { registerTimeEntryHandlers } from '../modules/time-tracker/time-entry.socket'
import { registerGameHandlers } from '../modules/games/game.socket'
import { registerPresenceHandlers } from '../modules/presence/presence.socket'
import { activeUsersManager } from './active-users'
import { TimeEntryService } from '../modules/time-tracker/time-entry.service'
import { presenceManager } from '../modules/presence/presence.manager'

export type AuthenticatedSocket = Socket & {
  userId?: string
  user?: AccessTokenPayload & { id: string }
}

let io: SocketServer | null = null

export function initializeSocket(server: HttpServer): SocketServer {
  io = new SocketServer(server, {
    cors: {
      origin: env.clientUrl,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  })

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '')

    if (!token) {
      return next(new Error('Authentication token required'))
    }

    try {
      const payload = verifyAccessToken(token as string)
      const user = await userService.getPublicProfile(payload.sub)

      if (!user) {
        return next(new Error('User not found'))
      }

      socket.userId = user.id
      socket.user = { ...payload, id: user.id }
      next()
    } catch (error) {
      next(new Error('Invalid or expired token'))
    }
  })

  // Register all module handlers (called once at startup)
  socketHandlerRegistry.registerHandler(registerTimeEntryHandlers)
  socketHandlerRegistry.registerHandler(registerGameHandlers)
  socketHandlerRegistry.registerHandler(registerPresenceHandlers)

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId
    if (!userId) {
      socket.disconnect()
      return
    }

    console.log(`Socket connected: ${userId}`)

    // Join user's personal room for targeted updates
    socket.join(userRoom(userId))

    // Track active user
    activeUsersManager.addUser(userId, socket)
    presenceManager.markUserOnline(userId)

    // Register all module handlers for this socket connection
    socketHandlerRegistry.registerAllHandlers(socket)

    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${userId}`)
      
      // Check if this is the user's last socket connection before removing
      const hasOtherConnections = activeUsersManager.hasOtherActiveConnections(userId!, socket.id)
      
      // Remove the socket from active users
      activeUsersManager.removeUser(socket.id)
      
      // If this was the last connection, auto-stop any active timer (fallback for client-side beforeunload)
      if (!hasOtherConnections && userId) {
        presenceManager.markUserOffline(userId)
        try {
          const timeEntryService = new TimeEntryService()
          const activeTimer = await timeEntryService.getActiveTimer(userId)
          if (activeTimer) {
            console.log(`Auto-stopping timer for user ${userId} (last socket connection closed)`)
            await timeEntryService.stopTimer(userId)
          }
        } catch (error) {
          // Log error but don't throw - socket disconnect shouldn't fail
          console.error(`Error auto-stopping timer for user ${userId}:`, error)
        }
      }
    })
  })

  return io
}

export function getSocketServer(): SocketServer {
  if (!io) {
    throw new Error('Socket server not initialized. Call initializeSocket() first.')
  }
  return io
}
