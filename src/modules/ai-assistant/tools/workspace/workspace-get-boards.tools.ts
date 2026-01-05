import type { AITool } from '../../ai-assistant.types'
import { PERMISSIONS, hasPermission } from '../../../auth/rbac/permissions'
import { boardService } from '../../../workspace/boards/board.service'
import { userService } from '../../../users/user.service'

const hasFullBoardAccess = (user: any) => hasPermission(user ?? { permissions: [] }, PERMISSIONS.BOARD_FULL_ACCESS)
const hasBoardViewAllAccess = (user: any) => hasPermission(user ?? { permissions: [] }, PERMISSIONS.BOARD_VIEW_ALL)

export const getMyBoardsTool: AITool = {
  name: 'get_my_boards',
  description: 'Get a list of boards the user has access to. Use this tool when the user asks about boards, how many boards they have, what boards are in their workspace, wants to list/show boards, or asks about boards they own or are a member of. This includes queries like "how many boards", "what boards", "list boards", "show boards", "boards in workspace", etc. Returns board details including name, prefix (key), type, and creator/lead information.',
  requiredPermission: [PERMISSIONS.BOARD_VIEW, PERMISSIONS.BOARD_VIEW_ALL],
  parameters: {
    type: 'object',
    properties: {},
  },
  execute: async (_params, user) => {
    // Check if user has permission to view all boards
    const canViewAll = hasFullBoardAccess(user) || hasBoardViewAllAccess(user)
    
    // Use findAll() for users with full access, findByUserId() for limited access
    const boards = canViewAll 
      ? await boardService.findAll() 
      : await boardService.findByUserId(user.id)
    
    if (boards.length === 0) {
      return {
        success: true,
        boards: [],
        count: 0,
        message: 'You have no boards in your workspace.',
      }
    }
    
    // Get creator information for all boards
    const creatorIds = Array.from(
      new Set(
        boards
          .map((board) => board.createdBy)
          .filter((id): id is string => Boolean(id)),
      ),
    )
    
    const creators = creatorIds.length > 0 
      ? await userService.findPublicByIds(creatorIds)
      : []
    const creatorMap = new Map(creators.map((creator) => [creator.id, creator]))
    
    return {
      success: true,
      boards: boards.map((b) => {
        const creator = b.createdBy ? creatorMap.get(b.createdBy) : null
        return {
          id: b.id,
          name: b.name,
          prefix: b.prefix,
          type: b.type,
          lead: creator ? creator.name : null,
        }
      }),
      count: boards.length,
      message: `Found ${boards.length} board(s) in your workspace.`,
    }
  },
}
