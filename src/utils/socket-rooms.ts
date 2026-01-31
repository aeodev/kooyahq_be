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

export function workspaceRoom(workspaceId: string): string {
  return `workspace:${workspaceId}`
}

export function serverManagementRunRoom(runId: string): string {
  return `server-management:run:${runId}`
}

export function aiNewsRoom(): string {
  return 'ai-news:all'
}

export function chatRoom(conversationId: string): string {
  return `chat:${conversationId}`
}

export function chatUserRoom(userId: string): string {
  return `chat:user:${userId}`
}




