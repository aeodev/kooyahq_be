import type { AITool } from '../../ai-assistant.types'
import { PERMISSIONS } from '../../../auth/rbac/permissions'
import { boardService } from '../../../workspace/boards/board.service'
import { userService } from '../../../users/user.service'

export const getBoardMembersTool: AITool = {
  name: 'get_board_members',
  description: 'Get all members of a board who can be assigned to tickets.',
  requiredPermission: [PERMISSIONS.BOARD_VIEW, PERMISSIONS.BOARD_VIEW_ALL],
  parameters: {
    type: 'object',
    properties: {
      boardId: {
        type: 'string',
        description: 'The ID of the board',
      },
    },
    required: ['boardId'],
  },
  execute: async (params, _user) => {
    const { boardId } = params as { boardId: string }
    
    const board = await boardService.findById(boardId)
    if (!board) {
      return {
        success: false,
        message: 'Board not found',
      }
    }
    
    // Get user details for each member
    const membersWithDetails = await Promise.all(
      board.members.map(async (member) => {
        const user = await userService.getPublicProfile(member.userId)
        return {
          userId: member.userId,
          name: user?.name || 'Unknown',
          email: user?.email,
          role: member.role,
        }
      })
    )
    
    return {
      success: true,
      boardName: board.name,
      members: membersWithDetails,
      count: membersWithDetails.length,
    }
  },
}
