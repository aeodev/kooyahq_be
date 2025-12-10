import { getSocketServer } from '../lib/socket'
import { userRoom, timeEntriesRoom } from './socket-rooms'

/**
 * Socket event names - must match frontend SocketTimeEntriesEventsEnum
 * Kept for backward compatibility
 */
export const TimeEntrySocketEvents = {
  TIMER_STARTED: 'time-entry:timer-started',
  TIMER_STOPPED: 'time-entry:timer-stopped',
  TIMER_PAUSED: 'time-entry:timer-paused',
  TIMER_RESUMED: 'time-entry:timer-resumed',
  CREATED: 'time-entry:created',
  UPDATED: 'time-entry:updated',
  DELETED: 'time-entry:deleted',
  TIMER_HEARTBEAT: 'time-entry:timer-heartbeat',
} as const

export type TimeEntryEvent = typeof TimeEntrySocketEvents[keyof typeof TimeEntrySocketEvents]

/**
 * Generic socket emitter - works with any event type
 * Maintains type safety while being flexible for all modules
 */
export class SocketEmitter {
  /**
   * Emit to all connected clients in the room
   */
  static emitToRoom<T = unknown>(room: string, event: string, data: T): void {
    try {
      const io = getSocketServer()
      io.to(room).emit(event, data)
    } catch (error) {
      // Socket server might not be initialized in tests
      console.warn('Socket emit failed:', error)
    }
  }

  /**
   * Emit to a specific user's room
   */
  static emitToUser<T = unknown>(userId: string, event: string, data: T): void {
    this.emitToRoom(userRoom(userId), event, data)
  }

  /**
   * Emit to all users (broadcast)
   */
  static emitToAll<T = unknown>(event: string, data: T): void {
    try {
      const io = getSocketServer()
      io.emit(event, data)
    } catch (error) {
      console.warn('Socket emit failed:', error)
    }
  }

  /**
   * Emit to a specific room by room name
   */
  static emitToRoomByName<T = unknown>(room: string, event: string, data: T): void {
    this.emitToRoom(room, event, data)
  }

  /**
   * Emit to all connected clients in the room except a specific user
   * Useful for broadcasting updates to all clients except the one who initiated the action
   */
  static emitToRoomExceptUser<T = unknown>(room: string, event: string, data: T, excludeUserId: string): void {
    try {
      const io = getSocketServer()
      io.to(room).except(userRoom(excludeUserId)).emit(event, data)
    } catch (error) {
      // Socket server might not be initialized in tests
      console.warn('Socket emit failed:', error)
    }
  }

  /**
   * Emit time entry update to all (for "All" tab visibility)
   * Backward compatibility helper for time-entry events
   */
  static emitTimeEntryUpdate(
    event: TimeEntryEvent,
    entry: unknown,
    userId: string
  ): void {
    const data = { entry, userId }
    this.emitToRoom(timeEntriesRoom(), event, data)
  }
}

