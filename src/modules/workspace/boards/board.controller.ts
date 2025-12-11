import type { NextFunction, Request, Response } from 'express'
import { boardService } from './board.service'
import { boardFavoriteService } from './board-favorite.service'
import { createHttpError } from '../../../utils/http-error'
import { SocketEmitter } from '../../../utils/socket-emitter'
import { workspaceRoom } from '../../../utils/socket-rooms'
import type { Board } from './board.model'
import { boardCache } from '../cache/board.cache'
import { ticketCache } from '../cache/ticket.cache'

export async function createBoard(req: Request, res: Response, next: NextFunction) {
  const { workspaceId } = req.params
  const { name, type, description, prefix, emoji, columns, settings, members } = req.body
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  // Clients cannot create boards
  if (req.user?.userType === 'client') {
    return next(createHttpError(403, 'Clients cannot create boards'))
  }

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return next(createHttpError(400, 'Board name is required'))
  }

  if (!type || (type !== 'kanban' && type !== 'sprint')) {
    return next(createHttpError(400, 'Board type must be "kanban" or "sprint"'))
  }

  if (!workspaceId) {
    return next(createHttpError(400, 'Workspace ID is required'))
  }

  try {
    const board = await boardService.create({
      workspaceId,
      name: name.trim(),
      type,
      description: description?.trim(),
      prefix,
      emoji,
      columns: columns || [], // Empty by default
      settings,
      members: [], // Boards don't have members - use workspace membership
      createdBy: userId,
    })

    await boardCache.setBoard(board)
    await boardCache.invalidateBoardLists(workspaceId)

    // Emit socket event for real-time updates
    SocketEmitter.emitToRoom(workspaceRoom(workspaceId), 'board:created', {
      board,
      userId,
      timestamp: new Date().toISOString(),
    })

    res.status(201).json({
      success: true,
      data: board,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    // Handle prefix uniqueness errors with human-readable messages
    if (error.statusCode === 409) {
      return next(createHttpError(409, error.message || 'Board key already exists'))
    }
    // Handle MongoDB duplicate key errors
    if (error.code === 11000 || error.message?.includes('duplicate')) {
      return next(createHttpError(409, 'A board with this key already exists. Please choose a different key.'))
    }
    next(error)
  }
}

export async function getBoards(req: Request, res: Response, next: NextFunction) {
  const { workspaceId } = req.params
  const type = req.query.type as 'kanban' | 'sprint' | undefined
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  if (!workspaceId) {
    return next(createHttpError(400, 'Workspace ID is required'))
  }

  // Validate type if provided
  if (type && type !== 'kanban' && type !== 'sprint') {
    return next(createHttpError(400, 'Board type must be "kanban" or "sprint"'))
  }

  try {
    let boards = await boardCache.getBoards(workspaceId, type)
    if (!boards) {
      boards = await boardService.findByWorkspaceId(workspaceId, type)
      await boardCache.setBoards(workspaceId, boards, type)
    }
    
    // Get favorite board IDs for the user
    const favoriteBoardIds = await boardFavoriteService.getFavoriteBoardIds(userId)
    const favoriteSet = new Set(favoriteBoardIds)
    
    // Add isFavorite property to each board
    const boardsWithFavorites = boards.map(board => ({
      ...board,
      isFavorite: favoriteSet.has(board.id),
    }))

    res.json({
      success: true,
      data: boardsWithFavorites,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}

export async function getBoardById(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    let board = await boardCache.getBoard(id)
    if (!board) {
      board = await boardService.findById(id)
      if (board) {
        await boardCache.setBoard(board)
      }
    }

    if (!board) {
      return next(createHttpError(404, 'Board not found'))
    }

    // Check if user is a member of the workspace (boards use workspace membership)
    const workspaceServiceModule = await import('../workspace/workspace.service')
    const workspace = await workspaceServiceModule.workspaceService.findById(board.workspaceId)
    if (!workspace) {
      return next(createHttpError(404, 'Workspace not found'))
    }
    const isWorkspaceMember = workspace.members.some((m) => m.userId === userId)
    if (!isWorkspaceMember) {
      return next(createHttpError(403, 'Forbidden'))
    }

    res.json({
      success: true,
      data: board,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}

export async function getBoardByKey(req: Request, res: Response, next: NextFunction) {
  const { key } = req.params
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  if (!key) {
    return next(createHttpError(400, 'Board key is required'))
  }

  try {
    const normalizedKey = key.toUpperCase()
    // Get user's workspaces
    const workspaceServiceModule = await import('../workspace/workspace.service')
    const workspaces = await workspaceServiceModule.workspaceService.findByUserId(userId)

    if (!workspaces || workspaces.length === 0) {
      return next(createHttpError(404, 'Board not found'))
    }

    // Search for board by prefix across user's workspaces
    let board = null
    for (const workspace of workspaces) {
      board = await boardCache.getBoardByPrefix(workspace.id, normalizedKey)
      if (!board) {
        board = await boardService.findByPrefix(workspace.id, normalizedKey)
        if (board) {
          await boardCache.setBoard(board)
        }
      }
      if (board) {
        // Boards use workspace membership - if user is workspace member, they can access
        const isWorkspaceMember = workspace.members && workspace.members.some((m) => m.userId === userId)
        
        if (isWorkspaceMember) {
          break
        }
        // If board found but user doesn't have workspace access, continue searching other workspaces
        board = null
      }
    }

    if (!board) {
      return next(createHttpError(404, 'Board not found'))
    }

    res.json({
      success: true,
      data: board,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}

export async function updateBoard(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params
  const { timestamp, data } = req.body
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  // Validate timestamp for race condition handling
  if (!timestamp) {
    return next(createHttpError(400, 'Timestamp is required'))
  }

  try {
    const board = await boardService.findById(id)

    if (!board) {
      return next(createHttpError(404, 'Board not found'))
    }

    // Check permissions - user must be workspace admin or owner (boards use workspace membership)
    const workspaceServiceModule = await import('../workspace/workspace.service')
    const workspace = await workspaceServiceModule.workspaceService.findById(board.workspaceId)
    if (!workspace) {
      return next(createHttpError(404, 'Workspace not found'))
    }
    const workspaceMember = workspace.members.find((m) => m.userId === userId)
    if (!workspaceMember || workspaceMember.role === 'member') {
      // Only workspace owners and admins can delete boards
      return next(createHttpError(403, 'Forbidden'))
    }

    const updates: Partial<Pick<Board, 'name' | 'description' | 'prefix' | 'emoji' | 'settings' | 'columns'>> = {}
    if (data.name !== undefined) {
      if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
        return next(createHttpError(400, 'Board name is required'))
      }
      updates.name = data.name.trim()
    }
    if (data.description !== undefined) {
      updates.description = data.description?.trim() || undefined
    }
    if (data.prefix !== undefined) {
      updates.prefix = data.prefix?.trim().toUpperCase()
    }
    if (data.emoji !== undefined) {
      updates.emoji = data.emoji
    }
    if (data.settings !== undefined) {
      updates.settings = data.settings
    }
    if (data.columns !== undefined) {
      updates.columns = Array.isArray(data.columns) ? data.columns : []
    }
    // Boards don't have members - they use workspace membership
    // Ignore data.members if provided

    const updated = await boardService.update(id, updates)

    if (!updated) {
      return next(createHttpError(404, 'Board not found'))
    }

    if (board.prefix !== updated.prefix) {
      await boardCache.deleteBoard(board.id, board.workspaceId, board.prefix)
    }
    await boardCache.setBoard(updated)
    await boardCache.invalidateBoardLists(board.workspaceId)

    // Emit socket event for real-time updates
    SocketEmitter.emitToRoom(workspaceRoom(board.workspaceId), 'board:updated', {
      board: updated,
      userId,
      timestamp: new Date().toISOString(),
    })

    res.json({
      success: true,
      data: updated,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    // Handle prefix uniqueness errors with human-readable messages
    if (error.statusCode === 409) {
      return next(createHttpError(409, error.message || 'Board key already exists'))
    }
    // Handle MongoDB duplicate key errors
    if (error.code === 11000 || error.message?.includes('duplicate')) {
      return next(createHttpError(409, 'A board with this key already exists. Please choose a different key.'))
    }
    next(error)
  }
}

export async function deleteBoard(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  // Clients cannot delete boards
  if (req.user?.userType === 'client') {
    return next(createHttpError(403, 'Clients cannot delete boards'))
  }

  try {
    const board = await boardService.findById(id)

    if (!board) {
      return next(createHttpError(404, 'Board not found'))
    }

    // Check permissions - user must be workspace admin or owner (boards use workspace membership)
    const workspaceServiceModule = await import('../workspace/workspace.service')
    const workspace = await workspaceServiceModule.workspaceService.findById(board.workspaceId)
    if (!workspace) {
      return next(createHttpError(404, 'Workspace not found'))
    }
    const workspaceMember = workspace.members.find((m) => m.userId === userId)
    if (!workspaceMember || workspaceMember.role === 'member') {
      // Only workspace owners and admins can delete boards
      return next(createHttpError(403, 'Forbidden'))
    }

    await boardService.delete(id)
    await boardCache.deleteBoard(board.id, board.workspaceId, board.prefix)
    await boardCache.invalidateBoardLists(board.workspaceId)
    await ticketCache.invalidateBoardTickets(id)

    // Emit socket event for real-time updates
    SocketEmitter.emitToRoom(workspaceRoom(board.workspaceId), 'board:deleted', {
      boardId: id,
      userId,
      timestamp: new Date().toISOString(),
    })

    res.json({
      success: true,
      message: 'Board deleted',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}

export async function toggleFavoriteBoard(req: Request, res: Response, next: NextFunction) {
  const { boardId } = req.params
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  if (!boardId) {
    return next(createHttpError(400, 'Board ID is required'))
  }

  try {
    // Verify board exists and user has access
    const board = await boardService.findById(boardId)
    if (!board) {
      return next(createHttpError(404, 'Board not found'))
    }

    // Check if user is a member of the workspace
    const workspaceServiceModule = await import('../workspace/workspace.service')
    const workspace = await workspaceServiceModule.workspaceService.findById(board.workspaceId)
    if (!workspace) {
      return next(createHttpError(404, 'Workspace not found'))
    }
    const isWorkspaceMember = workspace.members.some((m) => m.userId === userId)
    if (!isWorkspaceMember) {
      return next(createHttpError(403, 'Forbidden'))
    }

    const result = await boardFavoriteService.toggleFavorite(userId, boardId)

    // Emit socket event for real-time updates
    SocketEmitter.emitToRoom(workspaceRoom(board.workspaceId), 'board:favorite-toggled', {
      boardId,
      userId,
      isFavorite: result.isFavorite,
      timestamp: new Date().toISOString(),
    })

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}
