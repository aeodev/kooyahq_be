import type { NextFunction, Request, Response } from 'express'
import { boardService, normalizeBoardMembers } from './board.service'
import { boardFavoriteService } from './board-favorite.service'
import { createHttpError } from '../../../utils/http-error'
import { SocketEmitter } from '../../../utils/socket-emitter'
import { workspaceRoom } from '../../../utils/socket-rooms'
import type { Board } from './board.model'
import { DEFAULT_WORKSPACE_ID } from './board.model'
import { boardCache } from '../cache/board.cache'
import { ticketCache } from '../cache/ticket.cache'
import { notificationService } from '../../notifications/notification.service'

const isBoardMember = (board: Board, userId: string) =>
  board.createdBy === userId || (board.members ?? []).some((m) => m.userId === userId)

const isBoardAdmin = (board: Board, userId: string) =>
  board.createdBy === userId || (board.members ?? []).some((m) => m.userId === userId && m.role === 'admin')

export async function createBoard(req: Request, res: Response, next: NextFunction) {
  const { name, type, description, prefix, emoji, columns, settings, members } = req.body
  const userId = req.user?.id
  const workspaceId = req.params.workspaceId || DEFAULT_WORKSPACE_ID

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

  try {
    const normalizedMembers = normalizeBoardMembers(members, userId)

    const board = await boardService.create({
      workspaceId,
      name: name.trim(),
      type,
      description: description?.trim(),
      prefix,
      emoji,
      columns: columns || [], // Empty by default
      settings,
      members: normalizedMembers,
      createdBy: userId,
    })

    await boardCache.setBoard(board)

    // Emit socket event for real-time updates
    SocketEmitter.emitToRoom(workspaceRoom(workspaceId), 'board:created', {
      board,
      userId,
      timestamp: new Date().toISOString(),
    })

    // Notify invited members (excluding creator)
    const invitedIds = Array.from(
      new Set(normalizedMembers.filter((m) => m.userId !== userId).map((m) => m.userId)),
    )
    try {
      await Promise.all(
        invitedIds.map((memberId) =>
          notificationService.createBoardMemberNotification(memberId, board.id, userId),
        ),
      )
    } catch (notifyError) {
      console.error('Failed to send board invite notifications', notifyError)
    }

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
  const type = req.query.type as 'kanban' | 'sprint' | undefined
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  // Validate type if provided
  if (type && type !== 'kanban' && type !== 'sprint') {
    return next(createHttpError(400, 'Board type must be "kanban" or "sprint"'))
  }

  try {
    const boards = await boardService.findByUserId(userId)

    // Get favorite board IDs for the user
    const favoriteBoardIds = await boardFavoriteService.getFavoriteBoardIds(userId)
    const favoriteSet = new Set(favoriteBoardIds)
    
    // Add isFavorite property to each board
    const boardsWithFavorites = boards
      .filter((board) => !type || board.type === type)
      .map(board => ({
        ...board,
        isFavorite: favoriteSet.has(board.id),
      }))

    // Only allow boards where the user is a member or creator
    const accessibleBoards = boardsWithFavorites.filter((board) => isBoardMember(board, userId))

    res.json({
      success: true,
      data: accessibleBoards,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}

export async function getBoardsForUser(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id
  const type = req.query.type as 'kanban' | 'sprint' | undefined

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  if (type && type !== 'kanban' && type !== 'sprint') {
    return next(createHttpError(400, 'Board type must be \"kanban\" or \"sprint\"'))
  }

  try {
    const boards = await boardService.findByUserId(userId)
    const favoriteBoardIds = await boardFavoriteService.getFavoriteBoardIds(userId)
    const favoriteSet = new Set(favoriteBoardIds)

    const boardsWithFavorites = boards
      .filter((board) => !type || board.type === type)
      .map((board) => ({
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

    // Allow board access only if user is a board member or creator
    if (!isBoardMember(board, userId)) {
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
    let board: Board | null = await boardCache.getBoardByPrefix(normalizedKey)

    // Fallback: search globally for this prefix
    if (!board) {
      board = await boardService.findByPrefixAnyWorkspace(normalizedKey)
      if (board) {
        await boardCache.setBoard(board)
      }
    }

    if (!board) {
      return next(createHttpError(404, 'Board not found'))
    }

    // Final access check: require board membership or creator
    if (!isBoardMember(board, userId)) {
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

    // Check permissions - board admins can update
    if (!isBoardAdmin(board, userId)) {
      return next(createHttpError(403, 'Forbidden'))
    }

    const updates: Partial<{
      name: string
      description?: string
      prefix?: string
      emoji?: string
      settings: Board['settings']
      columns: Board['columns']
      members: Array<{
        userId: string
        role: 'admin' | 'member' | 'viewer'
        joinedAt: Date
      }>
    }> = {}
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
    // Handle members updates (invite/remove)
    if (data.members !== undefined) {
      if (!Array.isArray(data.members)) {
        return next(createHttpError(400, 'Members must be an array'))
      }
      updates.members = normalizeBoardMembers(data.members as any, board.createdBy, board.members)
      // Prevent removing creator
      if (!updates.members.some((m) => m.userId === board.createdBy)) {
        updates.members.push({
          userId: board.createdBy,
          role: 'admin',
          joinedAt: new Date(),
        })
      }
    }

    const updated = await boardService.update(id, updates)

    if (!updated) {
      return next(createHttpError(404, 'Board not found'))
    }

    if (board.prefix !== updated.prefix) {
      await boardCache.deleteBoard(board.id, board.prefix)
    }
    await boardCache.setBoard(updated)

    // Notify newly added members
    if (updates.members) {
      const previousIds = new Set(board.members.map((m) => m.userId))
      const addedIds = updates.members
        .filter((member) => !previousIds.has(member.userId) && member.userId !== userId)
        .map((member) => member.userId)
      await Promise.all(
        addedIds.map((memberId) =>
          notificationService.createBoardMemberNotification(memberId, updated.id, userId),
        ),
      )
    }

    // Emit socket event for real-time updates
    SocketEmitter.emitToRoom(workspaceRoom(board.workspaceId || DEFAULT_WORKSPACE_ID), 'board:updated', {
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

    // Check permissions - board admins can delete
    if (!isBoardAdmin(board, userId)) {
      return next(createHttpError(403, 'Forbidden'))
    }

    await boardService.delete(id)
    await boardCache.deleteBoard(board.id, board.prefix)
    await ticketCache.invalidateBoardTickets(id)

    // Emit socket event for real-time updates
    SocketEmitter.emitToRoom(workspaceRoom(board.workspaceId || DEFAULT_WORKSPACE_ID), 'board:deleted', {
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

    // Check if user is allowed: board member or creator
    if (!isBoardMember(board, userId)) {
      return next(createHttpError(403, 'Forbidden'))
    }

    const result = await boardFavoriteService.toggleFavorite(userId, boardId)

    // Emit socket event for real-time updates
    SocketEmitter.emitToRoom(workspaceRoom(board.workspaceId || DEFAULT_WORKSPACE_ID), 'board:favorite-toggled', {
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
