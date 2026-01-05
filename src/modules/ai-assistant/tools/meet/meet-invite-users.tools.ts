import type { AITool } from '../../ai-assistant.types'
import { PERMISSIONS } from '../../../auth/rbac/permissions'
import { userService } from '../../../users/user.service'
import { SocketEmitter } from '../../../../utils/socket-emitter'
import { activeUsersManager } from '../../../../lib/active-users'

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length
  const len2 = str2.length
  const matrix: number[][] = []

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + 1
        )
      }
    }
  }

  return matrix[len1][len2]
}

/**
 * Calculate similarity score between two strings (0-1, where 1 is identical)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase())
  const maxLength = Math.max(str1.length, str2.length)
  if (maxLength === 0) return 1
  return 1 - distance / maxLength
}

/**
 * Find user by ID, email, or name (with fuzzy matching)
 */
async function findUserByIdentifier(identifier: string, excludeUserId?: string): Promise<{ id: string; name: string; email?: string } | null> {
  const normalizedInput = identifier.toLowerCase().trim()
  
  // Get all users
  const allUsers = await userService.findAll()
  const users = excludeUserId ? allUsers.filter((u) => u.id !== excludeUserId) : allUsers

  if (users.length === 0) return null

  // First, try exact match by ID
  const idMatch = users.find((u) => u.id === normalizedInput)
  if (idMatch) {
    return {
      id: idMatch.id,
      name: idMatch.name,
      email: idMatch.email,
    }
  }

  // Then try exact match by email (case-insensitive)
  const emailMatch = users.find((u) => u.email?.toLowerCase() === normalizedInput)
  if (emailMatch) {
    return {
      id: emailMatch.id,
      name: emailMatch.name,
      email: emailMatch.email,
    }
  }

  // Then try exact match by name (case-insensitive)
  const nameExactMatch = users.find((u) => u.name.toLowerCase() === normalizedInput)
  if (nameExactMatch) {
    return {
      id: nameExactMatch.id,
      name: nameExactMatch.name,
      email: nameExactMatch.email,
    }
  }

  // Try partial match by name (contains)
  const namePartialMatch = users.find((u) => 
    u.name.toLowerCase().includes(normalizedInput) || 
    normalizedInput.includes(u.name.toLowerCase())
  )
  if (namePartialMatch) {
    return {
      id: namePartialMatch.id,
      name: namePartialMatch.name,
      email: namePartialMatch.email,
    }
  }

  // Finally, try fuzzy match by name (similarity threshold 0.5)
  const similarities = users.map((u) => ({
    user: u,
    similarity: calculateSimilarity(normalizedInput, u.name),
  }))

  similarities.sort((a, b) => b.similarity - a.similarity)

  const bestMatch = similarities[0]
  if (bestMatch && bestMatch.similarity >= 0.5) {
    return {
      id: bestMatch.user.id,
      name: bestMatch.user.name,
      email: bestMatch.user.email,
    }
  }

  return null
}

/**
 * Get the current meeting room ID for a user by checking their socket rooms
 */
function getCurrentMeetId(userId: string): string | null {
  const userSockets = activeUsersManager.getUserSockets(userId)
  
  if (userSockets.length === 0) {
    console.log(`[getCurrentMeetId] No sockets found for user ${userId}`)
    return null
  }

  for (const socket of userSockets) {
    // socket.rooms is a native Set<string> containing all rooms this socket has joined
    for (const room of socket.rooms) {
      if (room.startsWith('meet:')) {
        const meetId = room.replace('meet:', '')
        console.log(`[getCurrentMeetId] Found meet room for user ${userId}: ${meetId}`)
        return meetId
      }
    }
  }

  console.log(`[getCurrentMeetId] No meet rooms found for user ${userId}`)
  return null
}

export const inviteToMeetTool: AITool = {
  name: 'invite_to_meet',
  description: 'Invite users to the current meeting room. Automatically detects which meeting room you are in from your active socket connection. Accepts user IDs, names, or emails. Use "all" or "everyone" to invite all users. Users will receive a socket invitation notification.',
  requiredPermission: [PERMISSIONS.MEET_TOKEN, PERMISSIONS.MEET_FULL_ACCESS],
  parameters: {
    type: 'object',
    properties: {
      userIds: {
        type: 'array',
        description: 'Array of user identifiers (IDs, names, or emails) to invite. Use "all" or "everyone" to invite all users.',
        items: {
          type: 'string',
        },
      },
    },
    required: ['userIds'],
  },
  execute: async (params, user) => {
    const { userIds } = params as {
      userIds: string[]
    }

    // Automatically detect current meeting room from socket rooms
    const meetId = getCurrentMeetId(user.id)
    if (!meetId) {
      return {
        success: false,
        error: 'You are not currently in a meeting room. Please join a meeting room first before inviting users.',
      }
    }

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return {
        success: false,
        error: 'userIds must be a non-empty array',
      }
    }

    // Check if user wants to invite "all" or "everyone"
    const normalizedUserIds = userIds.map((id) => id.toLowerCase().trim())
    const inviteAll = normalizedUserIds.includes('all') || normalizedUserIds.includes('everyone')

    const invited: Array<{ userId: string; name: string }> = []
    const failed: Array<{ identifier: string; reason: string }> = []

    // If "all" or "everyone" is specified, get all users and invite them directly
    if (inviteAll) {
      const allUsers = await userService.findAll()
      // Exclude current user
      const usersToInvite = allUsers.filter((u) => u.id !== user.id)
      
      if (usersToInvite.length === 0) {
        return {
          success: false,
          error: 'No other users found to invite',
        }
      }

      // Invite all users directly (no need to look them up)
      for (const userToInvite of usersToInvite) {
        try {
          SocketEmitter.emitToUser(userToInvite.id, 'meet:invitation', {
            fromUserId: user.id,
            fromUserName: user.name || 'Someone',
            meetId: meetId.trim(),
            timestamp: new Date().toISOString(),
          })

          invited.push({
            userId: userToInvite.id,
            name: userToInvite.name,
          })
        } catch (socketError) {
          failed.push({
            identifier: userToInvite.id,
            reason: `Failed to send invitation: ${socketError instanceof Error ? socketError.message : 'Unknown error'}`,
          })
        }
      }
    } else {
      // Process each user identifier normally
      for (const identifier of userIds) {
        if (typeof identifier !== 'string' || !identifier.trim()) {
          failed.push({
            identifier: String(identifier),
            reason: 'Invalid identifier format',
          })
          continue
        }

        try {
          const foundUser = await findUserByIdentifier(identifier.trim(), user.id)

          if (!foundUser) {
            failed.push({
              identifier: identifier.trim(),
              reason: 'User not found',
            })
            continue
          }

          // Prevent inviting yourself
          if (foundUser.id === user.id) {
            failed.push({
              identifier: identifier.trim(),
              reason: 'Cannot invite yourself',
            })
            continue
          }

          // Send socket invitation
          try {
            SocketEmitter.emitToUser(foundUser.id, 'meet:invitation', {
              fromUserId: user.id,
              fromUserName: user.name || 'Someone',
              meetId: meetId.trim(),
              timestamp: new Date().toISOString(),
            })

            invited.push({
              userId: foundUser.id,
              name: foundUser.name,
            })
          } catch (socketError) {
            failed.push({
              identifier: identifier.trim(),
              reason: `Failed to send invitation: ${socketError instanceof Error ? socketError.message : 'Unknown error'}`,
            })
          }
        } catch (error) {
          failed.push({
            identifier: identifier.trim(),
            reason: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }
    }

    const successCount = invited.length
    const failCount = failed.length

    return {
      success: successCount > 0,
      invited,
      failed: failCount > 0 ? failed : undefined,
      message: `Invited ${successCount} user${successCount !== 1 ? 's' : ''}${failCount > 0 ? `, ${failCount} failed` : ''}`,
    }
  },
}

