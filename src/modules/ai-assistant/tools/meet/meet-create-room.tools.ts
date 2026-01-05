import type { AITool } from '../../ai-assistant.types'
import { PERMISSIONS } from '../../../auth/rbac/permissions'

export const createMeetRoomTool: AITool = {
  name: 'create_meet_room',
  description: 'Create a new meeting room and get the room ID. The room ID is auto-generated. Only mention the room ID in your response, do not mention the URL.',
  requiredPermission: [PERMISSIONS.MEET_TOKEN, PERMISSIONS.MEET_FULL_ACCESS],
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
  execute: async (_params, user) => {
    // Generate random meet room ID using same algorithm as frontend
    const meetId = Math.random().toString(36).substring(2, 9)
    const url = `/meet/${meetId}`

    return {
      success: true,
      meetId,
      url,
      message: `Meeting room created: ${meetId}. Share the room ID "${meetId}" with participants.`,
    }
  },
}

