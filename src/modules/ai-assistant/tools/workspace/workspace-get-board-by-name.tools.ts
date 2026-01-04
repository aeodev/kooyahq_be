import type { AITool } from '../../ai-assistant.types'
import { PERMISSIONS } from '../../../auth/rbac/permissions'
import { boardService } from '../../../workspace/boards/board.service'

export const getBoardByNameTool: AITool = {
  name: 'get_board_by_name',
  description: 'Find a board by its name. Use this when the user specifies a board by name instead of ID. Returns the board ID if found.',
  requiredPermission: [PERMISSIONS.BOARD_VIEW, PERMISSIONS.BOARD_VIEW_ALL],
  parameters: {
    type: 'object',
    properties: {
      boardName: {
        type: 'string',
        description: 'The name of the board to find (case-insensitive partial match)',
      },
    },
    required: ['boardName'],
  },
  execute: async (params, user) => {
    const { boardName } = params as { boardName: string }
    const boards = await boardService.findByUserId(user.id)
    
    // Case-insensitive partial match
    const searchTerm = boardName.toLowerCase()
    const matchingBoards = boards.filter((b) => 
      b.name.toLowerCase().includes(searchTerm)
    )
    
    if (matchingBoards.length === 0) {
      return {
        success: false,
        message: `No board found matching "${boardName}"`,
        availableBoards: boards.map((b) => ({ id: b.id, name: b.name, type: b.type })),
      }
    }
    
    if (matchingBoards.length === 1) {
      const board = matchingBoards[0]
      return {
        success: true,
        board: {
          id: board.id,
          name: board.name,
          prefix: board.prefix,
          type: board.type,
        },
      }
    }
    
    // Multiple matches - return all
    return {
      success: true,
      message: `Found ${matchingBoards.length} boards matching "${boardName}"`,
      boards: matchingBoards.map((b) => ({
        id: b.id,
        name: b.name,
        prefix: b.prefix,
        type: b.type,
      })),
    }
  },
}
