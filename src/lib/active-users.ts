import type { AuthenticatedSocket } from './socket'
import { getSocketServer } from './socket'
import { SocketEmitter } from '../utils/socket-emitter'
import { userRoom } from '../utils/socket-rooms'
import { userService } from '../modules/users/user.service'

/**
 * Track active users connected via socket
 */
class ActiveUsersManager {
  private activeUsers = new Map<string, { userId: string; socket: AuthenticatedSocket; joinedAt: Date }>()

  /**
   * Add a user to active users list
   */
  addUser(userId: string, socket: AuthenticatedSocket): void {
    this.activeUsers.set(socket.id, { userId, socket, joinedAt: new Date() })
    this.broadcastActiveUsers()
  }

  /**
   * Remove a user from active users list
   */
  removeUser(socketId: string): void {
    this.activeUsers.delete(socketId)
    this.broadcastActiveUsers()
  }

  /**
   * Get all active user IDs
   */
  getActiveUserIds(): string[] {
    const userIds = Array.from(new Set(Array.from(this.activeUsers.values()).map((u) => u.userId)))
    return userIds
  }

  /**
   * Get active users count
   */
  getActiveUsersCount(): number {
    return this.getActiveUserIds().length
  }

  /**
   * Check if a user has any active socket connections
   */
  hasActiveConnection(userId: string): boolean {
    return Array.from(this.activeUsers.values()).some((u) => u.userId === userId)
  }

  /**
   * Check if a user has other active socket connections (excluding a specific socket)
   */
  hasOtherActiveConnections(userId: string, excludeSocketId: string): boolean {
    return Array.from(this.activeUsers.values()).some(
      (u) => u.userId === userId && u.socket.id !== excludeSocketId
    )
  }

  /**
   * Broadcast active users list to all connected clients
   */
  private async broadcastActiveUsers(): Promise<void> {
    const userIds = this.getActiveUserIds()
    const users = await Promise.all(userIds.map((id) => userService.getPublicProfile(id)))
    const activeUsers = users.filter(Boolean).map((u) => ({
      id: u!.id,
      name: u!.name,
      email: u!.email,
      profilePic: u!.profilePic,
    }))

    SocketEmitter.emitToAll('game:active-users', { users: activeUsers })
  }

  /**
   * Get active users list for initial load
   */
  async getActiveUsers(): Promise<Array<{ id: string; name: string; email: string; profilePic?: string }>> {
    const userIds = this.getActiveUserIds()
    const users = await Promise.all(userIds.map((id) => userService.getPublicProfile(id)))
    return users.filter(Boolean).map((u) => ({
      id: u!.id,
      name: u!.name,
      email: u!.email,
      profilePic: u!.profilePic,
    }))
  }
}

export const activeUsersManager = new ActiveUsersManager()




