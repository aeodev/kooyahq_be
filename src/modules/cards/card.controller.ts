import type { NextFunction, Request, Response } from 'express'
import { boardService } from '../boards/board.service'
import { cardService } from './card.service'
import { cardActivityRepository } from './card-activity.repository'
import { notificationService } from '../notifications/notification.service'
import { createHttpError } from '../../utils/http-error'

export async function createCard(req: Request, res: Response, next: NextFunction) {
  const { boardId } = req.params
  const {
    title,
    description,
    columnId,
    issueType,
    assigneeId,
    priority,
    labels,
    dueDate,
    storyPoints,
    epicId,
    rank,
    flagged,
  } = req.body
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return next(createHttpError(400, 'Card title is required'))
  }

  try {
    const board = await boardService.findById(boardId)

    if (!board) {
      return next(createHttpError(404, 'Board not found'))
    }

    if (board.ownerId !== userId && !board.memberIds?.includes(userId)) {
      return next(createHttpError(403, 'Forbidden'))
    }

    const targetColumnId = columnId || board.columns[0]

    const card = await cardService.create({
      title: title.trim(),
      description: description?.trim(),
      boardId,
      columnId: targetColumnId,
      issueType,
      assigneeId,
      priority,
      labels: Array.isArray(labels) ? labels : undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      storyPoints: typeof storyPoints === 'number' ? storyPoints : undefined,
      epicId: typeof epicId === 'string' ? epicId : undefined,
      rank: typeof rank === 'number' ? rank : undefined,
      flagged: typeof flagged === 'boolean' ? flagged : undefined,
    }, userId)

    // Notify if card was assigned on creation
    if (assigneeId && assigneeId !== userId) {
      try {
        await notificationService.createCardAssignmentNotification(assigneeId, card.id, userId)
      } catch (notifError) {
        console.error('Failed to create assignment notification:', notifError)
      }
    }

    res.status(201).json({
      status: 'success',
      data: card,
    })
  } catch (error) {
    next(error)
  }
}

export async function getCardsByBoard(req: Request, res: Response, next: NextFunction) {
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

    if (board.ownerId !== userId && !board.memberIds?.includes(userId)) {
      return next(createHttpError(403, 'Forbidden'))
    }

    const cards = await cardService.findByBoardId(boardId)

    res.json({
      status: 'success',
      data: cards,
    })
  } catch (error) {
    next(error)
  }
}

export async function moveCard(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params
  const { columnId, boardId } = req.body
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  if (!columnId || typeof columnId !== 'string') {
    return next(createHttpError(400, 'Column ID is required'))
  }

  if (!boardId || typeof boardId !== 'string') {
    return next(createHttpError(400, 'Board ID is required'))
  }

  try {
    const board = await boardService.findById(boardId)

    if (!board) {
      return next(createHttpError(404, 'Board not found'))
    }

    if (board.ownerId !== userId && !board.memberIds?.includes(userId)) {
      return next(createHttpError(403, 'Forbidden'))
    }

    const card = await cardService.moveCard(id, columnId, boardId, userId)

    if (!card) {
      return next(createHttpError(404, 'Card not found'))
    }

    res.json({
      status: 'success',
      data: card,
    })
  } catch (error) {
    next(error)
  }
}

export async function updateCard(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params
  const {
    title,
    description,
    columnId,
    issueType,
    assigneeId,
    priority,
    labels,
    dueDate,
    storyPoints,
    completed,
    epicId,
    rank,
    flagged,
  } = req.body
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const card = await cardService.findById(id)

    if (!card) {
      return next(createHttpError(404, 'Card not found'))
    }

    const board = await boardService.findById(card.boardId)

    if (!board) {
      return next(createHttpError(404, 'Board not found'))
    }

    if (board.ownerId !== userId && !board.memberIds?.includes(userId)) {
      return next(createHttpError(403, 'Forbidden'))
    }

    const updates: any = {}
    if (title !== undefined) {
      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        return next(createHttpError(400, 'Card title is required'))
      }
      updates.title = title.trim()
    }
    if (description !== undefined) {
      updates.description = description?.trim() || undefined
    }
    if (columnId !== undefined) {
      updates.columnId = columnId
    }
    if (issueType !== undefined) {
      updates.issueType = issueType
    }
    const previousAssigneeId = card.assigneeId
    if (assigneeId !== undefined) {
      updates.assigneeId = assigneeId || null
    }
    if (priority !== undefined) {
      updates.priority = priority
    }
    if (labels !== undefined) {
      updates.labels = Array.isArray(labels) ? labels : []
    }
    if (dueDate !== undefined) {
      updates.dueDate = dueDate ? new Date(dueDate) : null
    }
    if (storyPoints !== undefined) {
      updates.storyPoints = storyPoints !== null && storyPoints !== undefined ? Number(storyPoints) : null
    }
    if (completed !== undefined) {
      updates.completed = Boolean(completed)
    }
    if (epicId !== undefined) {
      updates.epicId = epicId || null
    }
    if (rank !== undefined) {
      updates.rank = rank !== null && rank !== undefined ? Number(rank) : null
    }
    if (flagged !== undefined) {
      updates.flagged = Boolean(flagged)
    }

    const updated = await cardService.updateCard(id, updates, userId)

    if (!updated) {
      return next(createHttpError(404, 'Card not found'))
    }

    // Notify if assignee changed
    if (assigneeId !== undefined && assigneeId !== previousAssigneeId) {
      try {
        if (assigneeId && assigneeId !== userId) {
          await notificationService.createCardAssignmentNotification(assigneeId, id, userId)
        }
      } catch (notifError) {
        console.error('Failed to create assignment notification:', notifError)
      }
    }

    res.json({
      status: 'success',
      data: updated,
    })
  } catch (error) {
    next(error)
  }
}

export async function getCardActivities(req: Request, res: Response, next: NextFunction) {
  const { cardId } = req.params
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const card = await cardService.findById(cardId)
    if (!card) {
      return next(createHttpError(404, 'Card not found'))
    }

    const board = await boardService.findById(card.boardId)
    if (!board) {
      return next(createHttpError(404, 'Board not found'))
    }

    if (board.ownerId !== userId && !board.memberIds?.includes(userId)) {
      return next(createHttpError(403, 'Forbidden'))
    }

    const activities = await cardActivityRepository.findByCardId(cardId)

    res.json({
      status: 'success',
      data: activities,
    })
  } catch (error) {
    next(error)
  }
}

export async function uploadAttachment(req: Request, res: Response, next: NextFunction) {
  const { cardId } = req.params
  const userId = req.user?.id
  const file = req.file

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  if (!file) {
    return next(createHttpError(400, 'Image file is required'))
  }

  try {
    const card = await cardService.findById(cardId)

    if (!card) {
      return next(createHttpError(404, 'Card not found'))
    }

    const board = await boardService.findById(card.boardId)

    if (!board) {
      return next(createHttpError(404, 'Board not found'))
    }

    if (board.ownerId !== userId && !board.memberIds?.includes(userId)) {
      return next(createHttpError(403, 'Forbidden'))
    }

    const url = (file as any).cloudinaryUrl || ''

    const attachment = {
      filename: (file as any).cloudinaryPublicId || file.originalname,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url,
      uploadedBy: userId,
      uploadedAt: new Date(),
    }

    const updated = await cardService.addAttachment(cardId, attachment)

    if (!updated) {
      return next(createHttpError(404, 'Card not found'))
    }

    res.json({
      status: 'success',
      data: updated,
    })
  } catch (error) {
    next(error)
  }
}

export async function deleteAttachment(req: Request, res: Response, next: NextFunction) {
  const { cardId, attachmentId } = req.params
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const card = await cardService.findById(cardId)

    if (!card) {
      return next(createHttpError(404, 'Card not found'))
    }

    const board = await boardService.findById(card.boardId)

    if (!board) {
      return next(createHttpError(404, 'Board not found'))
    }

    if (board.ownerId !== userId && !board.memberIds?.includes(userId)) {
      return next(createHttpError(403, 'Forbidden'))
    }

    const updated = await cardService.removeAttachment(cardId, attachmentId)

    if (!updated) {
      return next(createHttpError(404, 'Card or attachment not found'))
    }

    res.json({
      status: 'success',
      data: updated,
    })
  } catch (error) {
    next(error)
  }
}

export async function bulkUpdateRanks(req: Request, res: Response, next: NextFunction) {
  const { boardId } = req.params
  const { rankUpdates } = req.body
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  if (!Array.isArray(rankUpdates)) {
    return next(createHttpError(400, 'rankUpdates must be an array'))
  }

  try {
    const board = await boardService.findById(boardId)

    if (!board) {
      return next(createHttpError(404, 'Board not found'))
    }

    if (board.ownerId !== userId && !board.memberIds?.includes(userId)) {
      return next(createHttpError(403, 'Forbidden'))
    }

    const updates = rankUpdates.map((update: any) => ({
      id: update.id,
      rank: Number(update.rank),
    }))

    const updatedCards = await cardService.bulkUpdateRanks(boardId, updates)

    res.json({
      status: 'success',
      data: updatedCards,
    })
  } catch (error) {
    next(error)
  }
}

export async function deleteCard(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const card = await cardService.findById(id)

    if (!card) {
      return next(createHttpError(404, 'Card not found'))
    }

    const board = await boardService.findById(card.boardId)

    if (!board) {
      return next(createHttpError(404, 'Board not found'))
    }

    if (board.ownerId !== userId && !board.memberIds?.includes(userId)) {
      return next(createHttpError(403, 'Forbidden'))
    }

    await cardService.deleteCard(id)

    res.json({
      status: 'success',
      message: 'Card deleted',
    })
  } catch (error) {
    next(error)
  }
}

