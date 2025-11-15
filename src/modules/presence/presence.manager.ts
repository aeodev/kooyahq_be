import { SocketEmitter } from '../../utils/socket-emitter'
import { userService } from '../users/user.service'

export type PresenceCoordinates = {
  lat: number
  lng: number
  accuracy?: number
}

export type PresenceUser = {
  id: string
  name: string
  email: string
  profilePic?: string
  lat: number
  lng: number
  accuracy?: number
  lastSeen: string
  isActive: boolean
}

type PresenceState = {
  coords?: PresenceCoordinates
  lastSeen: Date
  isActive: boolean
}

class PresenceManager {
  private states = new Map<string, PresenceState>()

  /**
   * Update or create presence entry with the latest coordinates
   */
  async updateLocation(userId: string, coords: PresenceCoordinates): Promise<void> {
    const entry = this.getOrCreateState(userId)
    entry.coords = coords
    entry.lastSeen = new Date()
    entry.isActive = true
    await this.broadcastSnapshot()
  }

  /**
   * Mark an existing presence entry as online (no-op if user never shared location)
   */
  markUserOnline(userId: string): void {
    const entry = this.states.get(userId)
    if (!entry) return
    entry.isActive = true
    entry.lastSeen = new Date()
    void this.broadcastSnapshot()
  }

  /**
   * Mark an existing presence entry as offline (no-op if user never shared location)
   */
  markUserOffline(userId: string): void {
    const entry = this.states.get(userId)
    if (!entry) return
    entry.isActive = false
    entry.lastSeen = new Date()
    void this.broadcastSnapshot()
  }

  /**
   * Remove presence entry entirely (used if data should be cleared)
   */
  clearUser(userId: string): void {
    if (this.states.delete(userId)) {
      void this.broadcastSnapshot()
    }
  }

  /**
   * Current snapshot of users who have shared a location at least once
   */
  async getSnapshot(): Promise<PresenceUser[]> {
    const entries = Array.from(this.states.entries())
    const users = await Promise.all(
      entries.map(async ([userId, state]): Promise<PresenceUser | null> => {
        if (!state.coords) return null
        const profile = await userService.getPublicProfile(userId)
        if (!profile) return null

        return {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          profilePic: profile.profilePic,
          lat: state.coords.lat,
          lng: state.coords.lng,
          accuracy: state.coords.accuracy,
          lastSeen: state.lastSeen.toISOString(),
          isActive: state.isActive,
        }
      }),
    )

    return users.filter((user): user is PresenceUser => user !== null)
  }

  private getOrCreateState(userId: string): PresenceState {
    if (!this.states.has(userId)) {
      this.states.set(userId, {
        lastSeen: new Date(),
        isActive: false,
      })
    }

    return this.states.get(userId)!
  }

  private async broadcastSnapshot(): Promise<void> {
    try {
      const snapshot = await this.getSnapshot()
      SocketEmitter.emitToAll('presence:sync', { users: snapshot })
    } catch (error) {
      console.error('Failed to broadcast presence snapshot:', error)
    }
  }
}

export const presenceManager = new PresenceManager()

