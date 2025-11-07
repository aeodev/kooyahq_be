import type { NextFunction, Request, Response } from 'express'
import { commentService } from './comment.service'
import { cardService } from './card.service'
import { boardService } from '../boards/board.service'
import { notificationService } from '../notifications/notification.service'
import { createHttpError } from '../../utils/http-error'

export async function createComment(req: Request, res: Response, next: NextFunction) {
  const { cardId } = req.params
  const { content } = req.body
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return next(createHttpError(400, 'Comment content is required'))
  }

  try {
    const comment = await commentService.create(cardId, userId, content.trim())

    // Create notifications for card assignee and board owner
    try {
      const card = await cardService.findById(cardId)
      if (card) {
        const board = await boardService.findById(card.boardId)
        await notificationService.createCardCommentNotification(
          cardId,
          userId,
          comment.id,
          card.assigneeId,
          board?.ownerId
        )
      }
    } catch (notifError) {
      console.error('Failed to create card comment notification:', notifError)
    }

    res.status(201).json({
      status: 'success',
      data: comment,
    })
  } catch (error) {
    next(error)
  }
}

export async function getCommentsByCard(req: Request, res: Response, next: NextFunction) {
  const { cardId } = req.params
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const comments = await commentService.findByCardId(cardId)

    res.json({
      status: 'success',
      data: comments,
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

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return next(createHttpError(400, 'Comment content is required'))
  }

  try {
    const updated = await commentService.update(id, userId, content.trim())

    if (!updated) {
      return next(createHttpError(404, 'Comment not found'))
    }

    res.json({
      status: 'success',
      data: updated,
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
    await commentService.delete(id, userId)

    res.json({
      status: 'success',
      message: 'Comment deleted',
    })
  } catch (error: any) {
    if (error.message === 'Forbidden') {
      return next(createHttpError(403, 'Forbidden'))
    }
    next(error)
  }
}






