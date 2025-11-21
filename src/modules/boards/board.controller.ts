import type { NextFunction, Request, Response } from 'express'
import { boardService } from './board.service'
import { notificationService } from '../notifications/notification.service'
import { createHttpError } from '../../utils/http-error'

export async function createBoard(req: Request, res: Response, next: NextFunction) {
  const { name, type } = req.body
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return next(createHttpError(400, 'Board name is required'))
  }

  if (!type || (type !== 'kanban' && type !== 'sprint')) {
    return next(createHttpError(400, 'Board type must be "kanban" or "sprint"'))
  }

  try {
    const board = await boardService.create({
      name: name.trim(),
      type,
      ownerId: userId,
    })

    res.status(201).json({
      status: 'success',
      data: board,
    })
  } catch (error) {
    next(error)
  }
}

export async function getBoards(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id
  const type = req.query.type as 'kanban' | 'sprint' | undefined

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  // Validate type if provided
  if (type && type !== 'kanban' && type !== 'sprint') {
    return next(createHttpError(400, 'Board type must be "kanban" or "sprint"'))
  }

  try {
    const boards = await boardService.findByOwnerId(userId, type)

    res.json({
      status: 'success',
      data: boards,
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
    const board = await boardService.findById(id)

    if (!board) {
      return next(createHttpError(404, 'Board not found'))
    }

    if (board.ownerId !== userId && !board.memberIds?.includes(userId)) {
      return next(createHttpError(403, 'Forbidden'))
    }

    res.json({
      status: 'success',
      data: board,
    })
  } catch (error) {
    next(error)
  }
}

export async function updateBoard(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params
  const { name, memberIds, columns, columnLimits, sprintStartDate, sprintEndDate, sprintGoal } = req.body
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const board = await boardService.findById(id)

    if (!board) {
      return next(createHttpError(404, 'Board not found'))
    }

    if (board.ownerId !== userId && !board.memberIds?.includes(userId)) {
      return next(createHttpError(403, 'Forbidden'))
    }

    const previousMemberIds = board.memberIds || []
    const updates: any = {}
    if (name !== undefined) {
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return next(createHttpError(400, 'Board name is required'))
      }
      updates.name = name.trim()
    }
    if (memberIds !== undefined) {
      updates.memberIds = Array.isArray(memberIds) ? memberIds : []
    }
    if (columns !== undefined) {
      updates.columns = Array.isArray(columns) ? columns : []
    }
    if (columnLimits !== undefined) {
      updates.columnLimits = columnLimits && typeof columnLimits === 'object' ? columnLimits : {}
    }
    if (sprintStartDate !== undefined) {
      updates.sprintStartDate = sprintStartDate ? new Date(sprintStartDate) : null
    }
    if (sprintEndDate !== undefined) {
      updates.sprintEndDate = sprintEndDate ? new Date(sprintEndDate) : null
    }
    if (sprintGoal !== undefined) {
      updates.sprintGoal = sprintGoal?.trim() || null
    }

    const updated = await boardService.update(id, updates)

    if (!updated) {
      return next(createHttpError(404, 'Board not found'))
    }

    // Notify newly added members
    if (memberIds !== undefined) {
      try {
        const newMemberIds = updated.memberIds || []
        const addedMemberIds = newMemberIds.filter((id: string) => !previousMemberIds.includes(id))

        await Promise.all(
          addedMemberIds.map((memberId: string) =>
            notificationService.createBoardMemberNotification(memberId, id, userId)
          )
        )
      } catch (notifError) {
        console.error('Failed to create board member notification:', notifError)
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

    if (board.ownerId !== userId && !board.memberIds?.includes(userId)) {
      return next(createHttpError(403, 'Forbidden'))
    }

    await boardService.delete(id)

    res.json({
      status: 'success',
      message: 'Board deleted',
    })
  } catch (error) {
    next(error)
  }
}

// Sprint Endpoints

export async function createSprint(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params
  const { name, goal, startDate, endDate } = req.body
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const board = await boardService.findById(id)
    if (!board) return next(createHttpError(404, 'Board not found'))
    if (board.ownerId !== userId && !board.memberIds?.includes(userId)) {
      return next(createHttpError(403, 'Forbidden'))
    }

    const updatedBoard = await boardService.addSprint(id, {
      name,
      goal,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    })

    res.status(201).json({ status: 'success', data: updatedBoard })
  } catch (error) {
    next(error)
  }
}

export async function updateSprint(req: Request, res: Response, next: NextFunction) {
  const { id, sprintId } = req.params
  const updates = req.body
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const board = await boardService.findById(id)
    if (!board) return next(createHttpError(404, 'Board not found'))
    if (board.ownerId !== userId && !board.memberIds?.includes(userId)) {
      return next(createHttpError(403, 'Forbidden'))
    }

    const updatedBoard = await boardService.updateSprint(id, sprintId, updates)
    res.json({ status: 'success', data: updatedBoard })
  } catch (error: any) {
    if (error.message === 'Another sprint is already active on this board') {
      return next(createHttpError(400, error.message))
    }
    next(error)
  }
}

export async function deleteSprint(req: Request, res: Response, next: NextFunction) {
  const { id, sprintId } = req.params
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const board = await boardService.findById(id)
    if (!board) return next(createHttpError(404, 'Board not found'))
    if (board.ownerId !== userId && !board.memberIds?.includes(userId)) {
      return next(createHttpError(403, 'Forbidden'))
    }

    const updatedBoard = await boardService.deleteSprint(id, sprintId)
    res.json({ status: 'success', data: updatedBoard })
  } catch (error) {
    next(error)
  }
}

