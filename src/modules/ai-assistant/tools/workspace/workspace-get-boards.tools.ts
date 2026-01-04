import type { AITool } from '../../ai-assistant.types'
import { PERMISSIONS } from '../../../auth/rbac/permissions'
import { boardService } from '../../../workspace/boards/board.service'

export const getMyBoardsTool: AITool = {
  name: 'get_my_boards',
  description: 'Get a list of boards the user has access to.',
  requiredPermission: [PERMISSIONS.BOARD_VIEW, PERMISSIONS.BOARD_VIEW_ALL],
  parameters: {
    type: 'object',
    properties: {},
  },
  execute: async (_params, user) => {
    const boards = await boardService.findByUserId(user.id)
    
    return {
      success: true,
      boards: boards.map((b) => ({
        id: b.id,
        name: b.name,
        prefix: b.prefix,
        type: b.type,
      })),
      count: boards.length,
    }
  },
}
