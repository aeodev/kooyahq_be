import type { NextFunction, Request, Response } from 'express'
import { boardService, normalizeBoardMembers } from './board.service'
import { boardFavoriteService } from './board-favorite.service'
import { createHttpError } from '../../../utils/http-error'
import { hasPermission, PERMISSIONS } from '../../auth/rbac/permissions'
import { SocketEmitter } from '../../../utils/socket-emitter'
import { workspaceRoom } from '../../../utils/socket-rooms'
import type { Board } from './board.model'
import { DEFAULT_WORKSPACE_ID } from './board.model'
import { boardCache } from '../cache/board.cache'
import { ticketCache } from '../cache/ticket.cache'
import { notificationService } from '../../notifications/notification.service'
import { userService } from '../../users/user.service'

type BoardRole = 'owner' | 'admin' | 'member' | 'viewer' | 'none'
type BoardUserSummary = { id: string; name: string; email?: string; profilePic?: string }

const getBoardRole = (board: Board, userId?: string): BoardRole => {
  if (!userId) return 'none'
  if (board.createdBy === userId) return 'owner'
  const member = (board.members ?? []).find((m) => m.userId === userId)
  if (!member) return 'none'
  return member.role
}

const hasFullBoardAccess = (user: any) => hasPermission(user ?? { permissions: [] }, PERMISSIONS.BOARD_FULL_ACCESS)
const hasBoardViewAllAccess = (user: any) => hasPermission(user ?? { permissions: [] }, PERMISSIONS.BOARD_VIEW_ALL)
const hasBoardViewAccess = (user: any) => hasPermission(user ?? { permissions: [] }, PERMISSIONS.BOARD_VIEW)
const hasBoardUpdateAccess = (user: any) => hasPermission(user ?? { permissions: [] }, PERMISSIONS.BOARD_UPDATE)

const canViewBoard = (board: Board, user: any): boolean => {
  if (hasFullBoardAccess(user) || hasBoardViewAllAccess(user)) return true
  if (!hasBoardViewAccess(user)) return false
  const role = getBoardRole(board, user?.id)
  return role !== 'none'
}

const canUpdateBoard = (board: Board, user: any): boolean => {
  if (hasFullBoardAccess(user)) return true
  if (!hasBoardUpdateAccess(user)) return false
  const role = getBoardRole(board, user?.id)
  return role === 'owner' || role === 'admin'
}

const canDeleteBoard = (board: Board, user: any): boolean => {
  if (hasFullBoardAccess(user)) return true
  if (board.createdBy === user?.id) return true
  const role = getBoardRole(board, user?.id)
  return role !== 'none' && hasPermission(user ?? { permissions: [] }, PERMISSIONS.BOARD_DELETE)
}

const isBoardMember = (board: Board, userId: string) => getBoardRole(board, userId) !== 'none'

const isBoardAdmin = (board: Board, userId: string) => {
  const role = getBoardRole(board, userId)
  return role === 'owner' || role === 'admin'
}

const buildUserSummary = (user?: { id: string; name: string; email?: string; profilePic?: string } | null): BoardUserSummary | undefined => {
  if (!user) return undefined
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    profilePic: user.profilePic,
  }
}

const attachCreatorsToBoards = async (boards: Board[]) => {
  if (!boards.length) return boards
  const creatorIds = Array.from(
    new Set(
      boards
        .map((board) => board.createdBy)
        .filter((id): id is string => Boolean(id)),
    ),
  )
  const creators = await userService.findPublicByIds(creatorIds)
  const creatorMap = new Map(creators.map((creator) => [creator.id, creator]))

  return boards.map((board) => ({
    ...board,
    createdByUser: buildUserSummary(creatorMap.get(board.createdBy)),
  }))
}

const attachMembersToBoard = async (board: Board) => {
  const memberIds = new Set(board.members.map((member) => member.userId))
  if (board.createdBy) memberIds.add(board.createdBy)
  const users = await userService.findPublicByIds([...memberIds])
  const userMap = new Map(users.map((user) => [user.id, user]))
  const creatorUser = buildUserSummary(userMap.get(board.createdBy))
  const memberUsers = board.members
    .map((member) => buildUserSummary(userMap.get(member.userId)))
    .filter((user): user is BoardUserSummary => Boolean(user))

  if (creatorUser && !memberUsers.some((user) => user.id === creatorUser.id)) {
    memberUsers.unshift(creatorUser)
  }

  return {
    ...board,
    createdByUser: creatorUser,
    memberUsers,
  }
}

export async function createBoard(req: Request, res: Response, next: NextFunction) {
  const { name, type, description, prefix, emoji, columns, settings, members } = req.body
  const userId = req.user?.id
  const workspaceId = req.params.workspaceId || DEFAULT_WORKSPACE_ID

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  const authUser = req.user ?? { permissions: [] }
  if (!hasPermission(authUser, PERMISSIONS.BOARD_CREATE) && !hasPermission(authUser, PERMISSIONS.BOARD_FULL_ACCESS)) {
    return next(createHttpError(403, 'You do not have permission to create boards'))
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
    const boardWithMembers = await attachMembersToBoard(board)

    // Emit socket event for real-time updates
    SocketEmitter.emitToRoom(workspaceRoom(workspaceId), 'board:created', {
      board: boardWithMembers,
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
      data: boardWithMembers,
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
    const authUser = req.user ?? { permissions: [] }
    const canViewAll = hasFullBoardAccess(authUser) || hasBoardViewAllAccess(authUser)
    const canViewLimited = hasBoardViewAccess(authUser)

    if (!canViewAll && !canViewLimited) {
      return next(createHttpError(403, 'Forbidden'))
    }

    const boards = canViewAll ? await boardService.findAll() : await boardService.findByUserId(userId)

    // Get favorite board IDs for the user
    const favoriteBoardIds = await boardFavoriteService.getFavoriteBoardIds(userId)
    const favoriteSet = new Set(favoriteBoardIds)
    
    // Add isFavorite property to each board
    const boardsWithFavorites = boards
      .filter((board) => !type || board.type === type)
      .map((board) => ({
        ...board,
        isFavorite: favoriteSet.has(board.id),
      }))

    const accessibleBoards = canViewAll
      ? boardsWithFavorites
      : boardsWithFavorites.filter((board) => isBoardMember(board, userId))
    const boardsWithCreators = await attachCreatorsToBoards(accessibleBoards)

    res.json({
      success: true,
      data: boardsWithCreators,
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
    const authUser = req.user ?? { permissions: [] }
    const canViewAll = hasFullBoardAccess(authUser) || hasBoardViewAllAccess(authUser)
    const canViewLimited = hasBoardViewAccess(authUser)

    if (!canViewAll && !canViewLimited) {
      return next(createHttpError(403, 'Forbidden'))
    }

    const boards = canViewAll ? await boardService.findAll() : await boardService.findByUserId(userId)
    const favoriteBoardIds = await boardFavoriteService.getFavoriteBoardIds(userId)
    const favoriteSet = new Set(favoriteBoardIds)

    const boardsWithFavorites = boards
      .filter((board) => !type || board.type === type)
      .map((board) => ({
        ...board,
        isFavorite: favoriteSet.has(board.id),
      }))

    const boardsWithCreators = await attachCreatorsToBoards(boardsWithFavorites)

    res.json({
      success: true,
      data: boardsWithCreators,
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

    // Allow board access only if user is allowed to view
    if (!canViewBoard(board, req.user)) {
      return next(createHttpError(403, 'Forbidden'))
    }

    const boardWithMembers = await attachMembersToBoard(board)

    res.json({
      success: true,
      data: boardWithMembers,
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

    // Final access check: require view permission or membership
    if (!canViewBoard(board, req.user)) {
      return next(createHttpError(403, 'Forbidden'))
    }

    const boardWithMembers = await attachMembersToBoard(board)

    res.json({
      success: true,
      data: boardWithMembers,
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

    // Check permissions - board admins/owners or users with update permission
    if (!canUpdateBoard(board, req.user)) {
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
      const baseSettings = board.settings
      const incomingSettings =
        data.settings && typeof data.settings === 'object' ? data.settings : {}
      const incomingGithubAutomation =
        incomingSettings.githubAutomation && typeof incomingSettings.githubAutomation === 'object'
          ? incomingSettings.githubAutomation
          : {}
      updates.settings = {
        ...baseSettings,
        ...incomingSettings,
        ticketDetailsSettings: incomingSettings.ticketDetailsSettings ?? baseSettings.ticketDetailsSettings,
        githubAutomation: {
          ...baseSettings.githubAutomation,
          ...incomingGithubAutomation,
          rules: incomingGithubAutomation.rules ?? baseSettings.githubAutomation.rules,
        },
      }
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

    const updatedWithMembers = await attachMembersToBoard(updated)

    // Emit socket event for real-time updates
    SocketEmitter.emitToRoom(workspaceRoom(board.workspaceId || DEFAULT_WORKSPACE_ID), 'board:updated', {
      board: updatedWithMembers,
      userId,
      timestamp: new Date().toISOString(),
    })

    res.json({
      success: true,
      data: updatedWithMembers,
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

  try {
    const board = await boardService.findById(id)

    if (!board) {
      return next(createHttpError(404, 'Board not found'))
    }

    // Check permissions - only owner, users with Board:Delete, or full access
    if (!canDeleteBoard(board, req.user)) {
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

    // Check if user is allowed: anyone who can view the board can favorite it
    if (!canViewBoard(board, req.user)) {
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
