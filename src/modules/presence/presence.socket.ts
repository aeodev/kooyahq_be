import type { AuthenticatedSocket } from '../../lib/socket'
import { presenceManager, type PresenceCoordinates } from './presence.manager'

type LocationPayload = PresenceCoordinates

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

export function registerPresenceHandlers(socket: AuthenticatedSocket): void {
  const userId = socket.userId
  if (!userId) return

  const emitSnapshot = async () => {
    try {
      const snapshot = await presenceManager.getSnapshot()
      socket.emit('presence:sync', { users: snapshot })
    } catch (error) {
      console.error('Failed to emit presence snapshot:', error)
    }
  }

  socket.on('presence:request-sync', () => {
    void emitSnapshot()
  })

  socket.on('presence:update-location', async (payload: LocationPayload) => {
    if (!payload) return

    const { lat, lng, accuracy } = payload
    if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) {
      return
    }

    const coords: PresenceCoordinates = {
      lat,
      lng,
    }

    if (isFiniteNumber(accuracy)) {
      coords.accuracy = accuracy
    }

    try {
      await presenceManager.updateLocation(userId, coords)
    } catch (error) {
      console.error(`Failed to update presence for user ${userId}:`, error)
    }
  })

  // Send snapshot immediately after handler registration
  void emitSnapshot()
}

