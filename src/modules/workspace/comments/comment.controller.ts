import type { NextFunction, Request, Response } from 'express'
import { commentService } from './comment.service'
import { ticketService } from '../tickets/ticket.service'
import { boardService } from '../boards/board.service'
import { activityRepository } from '../activities/activity.repository'
import { notificationService } from '../../notifications/notification.service'
import { createHttpError } from '../../../utils/http-error'

export async function createComment(req: Request, res: Response, next: NextFunction) {
  const { ticketId } = req.params
  const { content } = req.body
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  if (!content || typeof content !== 'object') {
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

    const comment = await commentService.create(ticketId, userId, content)

    // Create activity log
    try {
      // Extract text preview from rich text content
      const textPreview = JSON.stringify(content).substring(0, 100)

      await activityRepository.create({
        workspaceId: board.workspaceId,
        boardId: ticket.boardId,
        ticketId: ticket.id,
        actorId: userId,
        actionType: 'comment',
        comment: {
          content,
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

  if (!content || typeof content !== 'object') {
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

    const updated = await commentService.update(id, userId, content)

    if (!updated) {
      return next(createHttpError(404, 'Comment not found'))
    }

    // Create activity log for edit
    try {
      const textPreview = JSON.stringify(content).substring(0, 100)

      await activityRepository.create({
        workspaceId: board.workspaceId,
        boardId: ticket.boardId,
        ticketId: ticket.id,
        actorId: userId,
        actionType: 'comment',
        comment: {
          content,
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

