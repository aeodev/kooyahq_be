/**
 * Room naming utilities for consistent socket room management
 */

export function userRoom(userId: string): string {
  return `user:${userId}`
}

export function gameRoom(gameId: string): string {
  return `game:${gameId}`
}

export function gameTypeRoom(gameType: string): string {
  return `game:type:${gameType}`
}

export function featureRoom(feature: string, id?: string): string {
  return id ? `${feature}:${id}` : `${feature}:all`
}

export function timeEntriesRoom(): string {
  return 'time-entries:all'
}

export function meetRoom(meetId: string): string {
  return `meet:${meetId}`
}





