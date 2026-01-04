import type { NextFunction, Request, Response } from 'express'
import { activityRepository } from './activity.repository'
import { boardService } from '../boards/board.service'
import { ticketService } from '../tickets/ticket.service'
import { createHttpError } from '../../../utils/http-error'
import { hasPermission, PERMISSIONS } from '../../auth/rbac/permissions'

/**
 * Get activities for a ticket
 * GET /api/tickets/:ticketId/activities
 */
export async function getTicketActivities(req: Request, res: Response, next: NextFunction) {
  const { ticketId } = req.params
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const ticket = await ticketService.findById(ticketId)
    if (!ticket) {
      return next(createHttpError(404, 'Ticket not found'))
    }

    const board = await boardService.findById(ticket.boardId)
    if (!board) {
      return next(createHttpError(404, 'Board not found'))
    }

    // Check if user is a member of the board
    const authUser = req.user ?? { permissions: [] }
    const hasFullAccess = hasPermission(authUser, PERMISSIONS.BOARD_FULL_ACCESS)
    const hasViewAll = hasPermission(authUser, PERMISSIONS.BOARD_VIEW_ALL)
    const hasViewLimited = hasPermission(authUser, PERMISSIONS.BOARD_VIEW)
    const isMember = board.members.some((m) => m.userId === userId)
    if ((hasFullAccess || hasViewAll) === false && hasViewLimited === false) {
      return next(createHttpError(403, 'Forbidden'))
    }
    if (!isMember && !hasFullAccess && !hasViewAll) {
      return next(createHttpError(403, 'Forbidden'))
    }

    const activities = await activityRepository.findByTicketId(ticketId)

    res.json({
      success: true,
      data: activities,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Get activities for a board
 * GET /api/boards/:boardId/activities
 */
export async function getBoardActivities(req: Request, res: Response, next: NextFunction) {
  const { boardId } = req.params
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const board = await boardService.findById(boardId)
    if (!board) {
      return next(createHttpError(404, 'Board not found'))
    }

    // Check if user is a member of the board
    const authUser = req.user ?? { permissions: [] }
    const hasFullAccess = hasPermission(authUser, PERMISSIONS.BOARD_FULL_ACCESS)
    const hasViewAll = hasPermission(authUser, PERMISSIONS.BOARD_VIEW_ALL)
    const hasViewLimited = hasPermission(authUser, PERMISSIONS.BOARD_VIEW)
    const isMember = board.members.some((m) => m.userId === userId)
    if ((hasFullAccess || hasViewAll) === false && hasViewLimited === false) {
      return next(createHttpError(403, 'Forbidden'))
    }
    if (!isMember && !hasFullAccess && !hasViewAll) {
      return next(createHttpError(403, 'Forbidden'))
    }

    const activities = await activityRepository.findByBoardId(boardId)

    res.json({
      success: true,
      data: activities,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}

