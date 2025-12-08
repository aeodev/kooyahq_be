import type { NextFunction, Request, Response } from 'express'
import { boardService } from '../workspace/boards/board.service'
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
    tags, // Changed from labels to tags
    dueDate,
    startDate,
    endDate,
    points, // Changed from storyPoints to points
    acceptanceCriteria,
    documents,
    parentTicketId,
    rootEpicId,
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
      tags: Array.isArray(tags) ? tags : undefined,
      points: typeof points === 'number' ? points : undefined,
      acceptanceCriteria: Array.isArray(acceptanceCriteria) ? acceptanceCriteria : undefined,
      documents: Array.isArray(documents) ? documents : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      parentTicketId: typeof parentTicketId === 'string' ? parentTicketId : undefined,
      rootEpicId: typeof rootEpicId === 'string' ? rootEpicId : undefined,
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
    sprintId,
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
    if (sprintId !== undefined) {
      updates.sprintId = sprintId || null
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

// Checklist controllers
export async function createChecklist(req: Request, res: Response, next: NextFunction) {
  const { cardId } = req.params
  const { title } = req.body
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return next(createHttpError(400, 'Checklist title is required'))
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

    const updated = await cardService.addChecklist(cardId, title)
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

export async function updateChecklist(req: Request, res: Response, next: NextFunction) {
  const { cardId, checklistId } = req.params
  const { title } = req.body
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  if (title !== undefined && (!title || typeof title !== 'string' || title.trim().length === 0)) {
    return next(createHttpError(400, 'Checklist title is required'))
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

    const updated = await cardService.updateChecklist(cardId, checklistId, { title })
    if (!updated) {
      return next(createHttpError(404, 'Card or checklist not found'))
    }

    res.json({
      status: 'success',
      data: updated,
    })
  } catch (error) {
    next(error)
  }
}

export async function deleteChecklist(req: Request, res: Response, next: NextFunction) {
  const { cardId, checklistId } = req.params
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

    const updated = await cardService.deleteChecklist(cardId, checklistId)
    if (!updated) {
      return next(createHttpError(404, 'Card or checklist not found'))
    }

    res.json({
      status: 'success',
      data: updated,
    })
  } catch (error) {
    next(error)
  }
}

export async function createChecklistItem(req: Request, res: Response, next: NextFunction) {
  const { cardId, checklistId } = req.params
  const { text } = req.body
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return next(createHttpError(400, 'Item text is required'))
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

    const updated = await cardService.addChecklistItem(cardId, checklistId, text)
    if (!updated) {
      return next(createHttpError(404, 'Card or checklist not found'))
    }

    res.json({
      status: 'success',
      data: updated,
    })
  } catch (error) {
    next(error)
  }
}

export async function updateChecklistItem(req: Request, res: Response, next: NextFunction) {
  const { cardId, checklistId, itemId } = req.params
  const { text, completed, order } = req.body
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  if (text !== undefined && (!text || typeof text !== 'string' || text.trim().length === 0)) {
    return next(createHttpError(400, 'Item text is required'))
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

    const updates: any = {}
    if (text !== undefined) updates.text = text
    if (completed !== undefined) updates.completed = Boolean(completed)
    if (order !== undefined) updates.order = Number(order)

    const updated = await cardService.updateChecklistItem(cardId, checklistId, itemId, updates)
    if (!updated) {
      return next(createHttpError(404, 'Card, checklist, or item not found'))
    }

    res.json({
      status: 'success',
      data: updated,
    })
  } catch (error) {
    next(error)
  }
}

export async function deleteChecklistItem(req: Request, res: Response, next: NextFunction) {
  const { cardId, checklistId, itemId } = req.params
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

    const updated = await cardService.deleteChecklistItem(cardId, checklistId, itemId)
    if (!updated) {
      return next(createHttpError(404, 'Card, checklist, or item not found'))
    }

    res.json({
      status: 'success',
      data: updated,
    })
  } catch (error) {
    next(error)
  }
}

// Cover controllers
export async function setCardCover(req: Request, res: Response, next: NextFunction) {
  const { cardId } = req.params
  const { url, color, brightness } = req.body
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

    // If file is uploaded, use the file URL
    const file = (req as any).file
    const coverUrl = file
      ? ((file as any).cloudinaryUrl || '')
      : url

    // Build cover object: if image is uploaded, use URL and clear color. If color is provided, use color and clear URL.
    const cover: { url?: string; color?: string; brightness?: 'dark' | 'light' } = {}
    
    if (coverUrl) {
      // Image uploaded: set URL, clear color
      cover.url = coverUrl
      cover.brightness = brightness
    } else if (color) {
      // Color provided: set color, clear URL
      cover.color = color
      cover.brightness = brightness
    }

    const updated = await cardService.setCardCover(cardId, cover)
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

export async function removeCardCover(req: Request, res: Response, next: NextFunction) {
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

    const updated = await cardService.removeCardCover(cardId)
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

