import type { AITool } from '../../ai-assistant.types'
import { PERMISSIONS } from '../../../auth/rbac/permissions'
import { userService } from '../../../users/user.service'

export const getUsersTool: AITool = {
  name: 'get_users',
  description: 'Get a list of users available for meeting invitations. Optionally search by name or email. The current user is excluded from results.',
  requiredPermission: [PERMISSIONS.MEET_TOKEN, PERMISSIONS.MEET_FULL_ACCESS],
  parameters: {
    type: 'object',
    properties: {
      search: {
        type: 'string',
        description: 'Optional search query to filter users by name or email',
      },
    },
    required: [],
  },
  execute: async (params, user) => {
    const { search } = params as { search?: string }

    try {
      let users
      if (search && search.trim()) {
        const result = await userService.searchUsers({
          search: search.trim(),
          limit: 50,
        })
        users = result.data
      } else {
        users = await userService.findAll()
      }

      // Exclude current user
      const filteredUsers = users
        .filter((u) => u.id !== user.id)
        .map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
        }))

      return {
        success: true,
        users: filteredUsers,
        count: filteredUsers.length,
        message: `Found ${filteredUsers.length} user${filteredUsers.length !== 1 ? 's' : ''}${search ? ` matching "${search}"` : ''}`,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch users',
      }
    }
  },
}

