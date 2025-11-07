import type { AuthenticatedSocket } from './socket'

/**
 * Socket handler registration function type
 */
export type SocketHandler = (socket: AuthenticatedSocket) => void

/**
 * Lightweight registry for socket handlers
 * Each module can register its handlers independently
 */
class SocketHandlerRegistry {
  private handlers: SocketHandler[] = []

  /**
   * Register a socket handler function
   * Called once per module to register their handlers
   */
  registerHandler(handler: SocketHandler): void {
    this.handlers.push(handler)
  }

  /**
   * Initialize all registered handlers for a new socket connection
   * Called after socket authentication and basic setup
   */
  registerAllHandlers(socket: AuthenticatedSocket): void {
    for (const handler of this.handlers) {
      try {
        handler(socket)
      } catch (error) {
        console.error('Socket handler registration error:', error)
      }
    }
  }

  /**
   * Get count of registered handlers (for debugging)
   */
  getHandlerCount(): number {
    return this.handlers.length
  }
}

export const socketHandlerRegistry = new SocketHandlerRegistry()





