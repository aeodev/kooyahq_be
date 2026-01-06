import type { NextFunction, Request, Response } from 'express'
import { commentService } from './comment.service'
import { ticketService } from '../tickets/ticket.service'
import { boardService } from '../boards/board.service'
import { activityRepository } from '../activities/activity.repository'
import { notificationService } from '../../notifications/notification.service'
import { createHttpError } from '../../../utils/http-error'
import { hasPermission, PERMISSIONS } from '../../auth/rbac/permissions'
import { sanitizeRichTextDoc } from '../../../utils/rich-text-sanitizer'
import { cleanHtml } from '../../../utils/text.utils'

type BoardRole = 'owner' | 'admin' | 'member' | 'viewer' | 'none'

const getBoardRole = (board: { createdBy: string; members: Array<{ userId: string; role: BoardRole }> }, userId?: string): BoardRole => {
  if (!userId) return 'none'
  if (board.createdBy === userId) return 'owner'
  const member = (board.members ?? []).find((m) => m.userId === userId)
  return (member?.role as BoardRole | undefined) ?? 'none'
}

const hasFullBoardAccess = (user: any) => hasPermission(user ?? { permissions: [] }, PERMISSIONS.BOARD_FULL_ACCESS)
const hasBoardViewAllAccess = (user: any) => hasPermission(user ?? { permissions: [] }, PERMISSIONS.BOARD_VIEW_ALL)
const hasBoardViewAccess = (user: any) => hasPermission(user ?? { permissions: [] }, PERMISSIONS.BOARD_VIEW)
const canViewBoard = (board: { createdBy: string; members: Array<{ userId: string; role: BoardRole }> }, user: any) => {
  if (hasFullBoardAccess(user) || hasBoardViewAllAccess(user)) return true
  if (!hasBoardViewAccess(user)) return false
  return getBoardRole(board, user?.id) !== 'none'
}
const canModifyBoardContent = (board: { createdBy: string; members: Array<{ userId: string; role: BoardRole }> }, user: any) => {
  if (hasFullBoardAccess(user)) return true
  const role = getBoardRole(board, user?.id)
  return role === 'owner' || role === 'admin' || role === 'member'
}

export async function createComment(req: Request, res: Response, next: NextFunction) {
  const { ticketId } = req.params
  const { content } = req.body
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  if (!content || (typeof content !== 'object' && typeof content !== 'string')) {
    return next(createHttpError(400, 'Comment content is required'))
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

    if (!canModifyBoardContent(board, req.user)) {
      return next(createHttpError(403, 'Forbidden'))
    }

    const sanitizedContent = sanitizeRichTextDoc(content)
    const comment = await commentService.create(ticketId, userId, sanitizedContent)

    // Create activity log
    try {
      // Extract text preview from rich text content
      const textPreview = cleanHtml(sanitizedContent.content).substring(0, 100)

      await activityRepository.create({
        workspaceId: board.workspaceId,
        boardId: ticket.boardId,
        ticketId: ticket.id,
        actorId: userId,
        actionType: 'comment',
        comment: {
          content: sanitizedContent,
          textPreview,
          mentions: [], // TODO: Extract mentions from content
          isEdit: false,
        },
      })
    } catch (activityError) {
      console.error('Failed to create activity:', activityError)
    }

    // Create notifications for ticket assignee and reporter
    try {
      await notificationService.createCardCommentNotification(
        ticketId,
        userId,
        comment.id,
        ticket.assigneeId,
        ticket.reporterId,
        board.prefix,
        ticket.ticketKey
      )
    } catch (notifError) {
      console.error('Failed to create ticket comment notification:', notifError)
    }

    res.status(201).json({
      success: true,
      data: comment,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}

export async function getCommentsByTicket(req: Request, res: Response, next: NextFunction) {
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

    if (!canViewBoard(board, req.user)) {
      return next(createHttpError(403, 'Forbidden'))
    }

    const comments = await commentService.findByTicketId(ticketId)

    res.json({
      success: true,
      data: comments,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}

export async function updateComment(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params
  const { content } = req.body
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  if (!content || (typeof content !== 'object' && typeof content !== 'string')) {
    return next(createHttpError(400, 'Comment content is required'))
  }

  try {
    const comment = await commentService.findById(id)
    if (!comment) {
      return next(createHttpError(404, 'Comment not found'))
    }

    const ticket = await ticketService.findById(comment.ticketId)
    if (!ticket) {
      return next(createHttpError(404, 'Ticket not found'))
    }

    const board = await boardService.findById(ticket.boardId)
    if (!board) {
      return next(createHttpError(404, 'Board not found'))
    }

    if (!canModifyBoardContent(board, req.user)) {
      return next(createHttpError(403, 'Forbidden'))
    }

    const sanitizedContent = sanitizeRichTextDoc(content)
    const updated = await commentService.update(id, userId, sanitizedContent)

    if (!updated) {
      return next(createHttpError(404, 'Comment not found'))
    }

    // Create activity log for edit
    try {
      const textPreview = cleanHtml(sanitizedContent.content).substring(0, 100)

      await activityRepository.create({
        workspaceId: board.workspaceId,
        boardId: ticket.boardId,
        ticketId: ticket.id,
        actorId: userId,
        actionType: 'comment',
        comment: {
          content: sanitizedContent,
          textPreview,
          mentions: [],
          isEdit: true,
          originalCommentId: id,
        },
      })
    } catch (activityError) {
      console.error('Failed to create activity:', activityError)
    }

    res.json({
      success: true,
      data: updated,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    if (error.message === 'Forbidden') {
      return next(createHttpError(403, 'Forbidden'))
    }
    next(error)
  }
}

export async function deleteComment(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const comment = await commentService.findById(id)
    if (!comment) {
      return next(createHttpError(404, 'Comment not found'))
    }

    const ticket = await ticketService.findById(comment.ticketId)
    if (!ticket) {
      return next(createHttpError(404, 'Ticket not found'))
    }

    const board = await boardService.findById(ticket.boardId)
    if (!board) {
      return next(createHttpError(404, 'Board not found'))
    }

    if (!canModifyBoardContent(board, req.user)) {
      return next(createHttpError(403, 'Forbidden'))
    }

    await commentService.delete(id, userId)

    res.json({
      success: true,
      message: 'Comment deleted',
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    if (error.message === 'Forbidden') {
      return next(createHttpError(403, 'Forbidden'))
    }
    next(error)
  }
}
