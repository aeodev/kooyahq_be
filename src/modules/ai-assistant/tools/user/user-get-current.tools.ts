import type { AITool } from '../../ai-assistant.types'
import { PERMISSIONS } from '../../../auth/rbac/permissions'
import { userService } from '../../../users/user.service'

export const getCurrentUserTool: AITool = {
  name: 'get_current_user',
  description: 'Get information about the current user (yourself).',
  requiredPermission: PERMISSIONS.AI_ASSISTANT_ACCESS,
  parameters: {
    type: 'object',
    properties: {},
  },
  execute: async (_params, user) => {
    const profile = await userService.getPublicProfile(user.id)
    
    return {
      success: true,
      user: {
        id: user.id,
        name: profile?.name || user.name,
        email: profile?.email,
      },
    }
  },
}

