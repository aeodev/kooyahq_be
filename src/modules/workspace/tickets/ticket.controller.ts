import type { NextFunction, Request, Response } from 'express'
import { boardService } from '../boards/board.service'
import { ticketService } from './ticket.service'
import { ticketDetailsSettingsService } from './ticket-details-settings.service'
import { activityRepository } from '../activities/activity.repository'
import { commentService } from '../comments/comment.service'
import { notificationService } from '../../notifications/notification.service'
import { notificationRepository } from '../../notifications/notification.repository'
import { createHttpError } from '../../../utils/http-error'
import { workspaceService } from '../workspace/workspace.service'
import { SocketEmitter } from '../../../utils/socket-emitter'
import { workspaceRoom } from '../../../utils/socket-rooms'
import type { Ticket } from './ticket.model'

export async function createTicket(req: Request, res: Response, next: NextFunction) {
  const { boardId } = req.params
  const {
    ticketType,
    title,
    description,
    parentTicketId,
    rootEpicId,
    columnId,
    rank,
    points,
    priority,
    tags,
    assigneeId,
    acceptanceCriteria,
    documents,
    startDate,
    endDate,
    dueDate,
    github,
  } = req.body
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return next(createHttpError(400, 'Ticket title is required'))
  }

  if (!ticketType || !['epic', 'story', 'task', 'bug', 'subtask'].includes(ticketType)) {
    return next(createHttpError(400, 'Valid ticket type is required'))
  }

  try {
    const board = await boardService.findById(boardId)

    if (!board) {
      return next(createHttpError(404, 'Board not found'))
    }

    // Check if user is a member of the workspace (boards use workspace membership)
    const workspace = await workspaceService.findById(board.workspaceId)
    if (!workspace) {
      return next(createHttpError(404, 'Workspace not found'))
    }
    const isWorkspaceMember = workspace.members.some((m) => m.userId === userId)
    if (!isWorkspaceMember) {
      return next(createHttpError(403, 'Forbidden'))
    }

    const targetColumnId = columnId || board.columns[0]?.id

    const ticket = await ticketService.create(
      {
        boardId,
        ticketType,
        title: title.trim(),
        description: description || {},
        parentTicketId,
        rootEpicId,
        columnId: targetColumnId,
        rank,
        points,
        priority: priority || 'medium',
        tags: Array.isArray(tags) ? tags : [],
        assigneeId,
        acceptanceCriteria: Array.isArray(acceptanceCriteria) ? acceptanceCriteria : [],
        documents: Array.isArray(documents) ? documents : [],
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        github,
        reporterId: userId,
      },
      userId,
    )

    // Create activity log
    try {
      await activityRepository.create({
        workspaceId: board.workspaceId,
        boardId,
        ticketId: ticket.id,
        actorId: userId,
        actionType: 'create',
        changes: [
          {
            field: 'title',
            oldValue: null,
            newValue: ticket.title,
            text: `created ticket ${ticket.ticketKey}`,
          },
        ],
      })
    } catch (activityError) {
      console.error('Failed to create activity:', activityError)
    }

    // Notify if ticket was assigned on creation
    if (assigneeId && assigneeId !== userId) {
      try {
        await notificationService.createCardAssignmentNotification(assigneeId, ticket.id, userId)
      } catch (notifError) {
        console.error('Failed to create assignment notification:', notifError)
      }
    }

    // Emit socket event for real-time updates (other users will receive this)
    SocketEmitter.emitToRoom(workspaceRoom(board.workspaceId), 'ticket:created', {
      ticket,
      userId,
      timestamp: new Date().toISOString(),
    })

    res.status(201).json({
      success: true,
      data: ticket,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}

export async function getTicketsByBoard(req: Request, res: Response, next: NextFunction) {
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

    // Check if user is a member of the workspace (boards use workspace membership)
    const workspace = await workspaceService.findById(board.workspaceId)
    if (!workspace) {
      return next(createHttpError(404, 'Workspace not found'))
    }
    const isWorkspaceMember = workspace.members.some((m) => m.userId === userId)
    if (!isWorkspaceMember) {
      return next(createHttpError(403, 'Forbidden'))
    }

    const tickets = await ticketService.findByBoardId(boardId)

    res.json({
      success: true,
      data: tickets,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}

export async function getTicketById(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const ticket = await ticketService.findById(id)

    if (!ticket) {
      return next(createHttpError(404, 'Ticket not found'))
    }

    const board = await boardService.findById(ticket.boardId)

    if (!board) {
      return next(createHttpError(404, 'Board not found'))
    }

    // Check if user is a member of the workspace (boards use workspace membership)
    const workspace = await workspaceService.findById(board.workspaceId)
    if (!workspace) {
      return next(createHttpError(404, 'Workspace not found'))
    }
    const isWorkspaceMember = workspace.members.some((m) => m.userId === userId)
    if (!isWorkspaceMember) {
      return next(createHttpError(403, 'Forbidden'))
    }

    // Track that this user viewed the ticket (non-blocking)
    ticketService.trackView(id, userId).catch((err: any) => {
      console.error('Error tracking ticket view:', err)
      // Don't fail the request if tracking fails
    })

    // Fetch related data in parallel
    const [history, comments, relatedTickets] = await Promise.all([
      // Get ticket history/activities
      activityRepository.findByTicketId(id),
      // Get comments
      commentService.findByTicketId(id),
      // Get related tickets
      (async () => {
        const related: {
          parent: Ticket | undefined | null
          children: Ticket[]
          siblings: Ticket[]
          epicTickets: Ticket[]
        } = {
          parent: null,
          children: [],
          siblings: [],
          epicTickets: [],
        }

        // Get parent ticket if exists
        if (ticket.parentTicketId) {
          related.parent = await ticketService.findById(ticket.parentTicketId)
        }

        // Get child tickets (tickets that have this ticket as parent)
        related.children = await ticketService.findByParentTicketId(id)

        // Get root epic if exists
        if (ticket.rootEpicId) {
          // Get all tickets in the same epic (including this ticket)
          const epicTickets = await ticketService.findByRootEpicId(ticket.rootEpicId)
          // Filter out this ticket and get siblings (same parent or same epic)
          related.epicTickets = epicTickets.filter((t: Ticket) => t.id !== id)
          
          // If this ticket has a parent, get siblings (same parent)
          if (ticket.parentTicketId) {
            related.siblings = related.children.filter((t: Ticket) => t.id !== id)
          } else {
            // If no parent, siblings are other tickets in the same epic without a parent
            related.siblings = epicTickets.filter(
              (t: Ticket) => t.id !== id && !t.parentTicketId
            )
          }
        } else if (ticket.parentTicketId) {
          // If has parent but no epic, get siblings (same parent)
          const parentTickets = await ticketService.findByParentTicketId(ticket.parentTicketId)
          related.siblings = parentTickets.filter((t: Ticket) => t.id !== id)
        }

        return related
      })(),
    ])

    res.json({
      success: true,
      data: {
        ticket,
        history,
        comments,
        relatedTickets,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}

export async function moveTicket(req: Request, res: Response, next: NextFunction) {
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

    // Check if user is a member of the workspace (boards use workspace membership)
    const workspace = await workspaceService.findById(board.workspaceId)
    if (!workspace) {
      return next(createHttpError(404, 'Workspace not found'))
    }
    const isWorkspaceMember = workspace.members.some((m) => m.userId === userId)
    if (!isWorkspaceMember) {
      return next(createHttpError(403, 'Forbidden'))
    }

    // Get the old ticket before moving to capture the previous columnId
    const oldTicket = await ticketService.findById(id)
    if (!oldTicket) {
      return next(createHttpError(404, 'Ticket not found'))
    }

    const oldColumnId = oldTicket.columnId

    const ticket = await ticketService.moveTicket(id, columnId, boardId, userId)

    if (!ticket) {
      return next(createHttpError(404, 'Ticket not found'))
    }

    // Create activity log
    try {
      await activityRepository.create({
        workspaceId: board.workspaceId,
        boardId,
        ticketId: ticket.id,
        actorId: userId,
        actionType: 'transition',
        changes: [
          {
            field: 'columnId',
            oldValue: oldColumnId,
            newValue: columnId,
            text: `moved ${ticket.ticketKey} to ${columnId}`,
          },
        ],
      })
    } catch (activityError) {
      console.error('Failed to create activity:', activityError)
    }

    // Notify assignee and reporter about ticket movement
    try {
      await notificationService.createCardMovedNotification(
        ticket.id,
        userId,
        ticket.assigneeId,
        ticket.reporterId,
      )
    } catch (notifError) {
      console.error('Failed to create ticket movement notification:', notifError)
    }

    // Emit socket event for real-time updates
    SocketEmitter.emitToRoom(workspaceRoom(board.workspaceId), 'ticket:moved', {
      ticket,
      boardId,
      oldColumnId,
      newColumnId: columnId,
      userId,
      timestamp: new Date().toISOString(),
    })

    res.json({
      success: true,
      data: ticket,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}

export async function updateTicket(req: Request, res: Response, next: NextFunction) {
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
    const ticket = await ticketService.findById(id)

    if (!ticket) {
      return next(createHttpError(404, 'Ticket not found'))
    }

    const board = await boardService.findById(ticket.boardId)

    if (!board) {
      return next(createHttpError(404, 'Board not found'))
    }

    // Check if user is a member of the workspace (boards use workspace membership)
    const workspace = await workspaceService.findById(board.workspaceId)
    if (!workspace) {
      return next(createHttpError(404, 'Workspace not found'))
    }
    const isWorkspaceMember = workspace.members.some((m) => m.userId === userId)
    if (!isWorkspaceMember) {
      return next(createHttpError(403, 'Forbidden'))
    }

    const previousAssigneeId = ticket.assigneeId
    const changes: Array<{
      field: string
      oldValue: any
      newValue: any
      text: string
    }> = []

    const updates: any = {}
    if (data.title !== undefined) {
      if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
        return next(createHttpError(400, 'Ticket title is required'))
      }
      changes.push({
        field: 'title',
        oldValue: ticket.title,
        newValue: data.title.trim(),
        text: `changed title from "${ticket.title}" to "${data.title.trim()}"`,
      })
      updates.title = data.title.trim()
    }
    if (data.description !== undefined) {
      updates.description = data.description
      changes.push({
        field: 'description',
        oldValue: ticket.description,
        newValue: data.description,
        text: 'updated description',
      })
    }
    if (data.columnId !== undefined) {
      updates.columnId = data.columnId
    }
    if (data.rank !== undefined) {
      updates.rank = data.rank
    }
    if (data.priority !== undefined) {
      changes.push({
        field: 'priority',
        oldValue: ticket.priority,
        newValue: data.priority,
        text: `changed priority from ${ticket.priority} to ${data.priority}`,
      })
      updates.priority = data.priority
    }
    if (data.tags !== undefined) {
      updates.tags = Array.isArray(data.tags) ? data.tags : []
    }
    if (data.assigneeId !== undefined) {
      changes.push({
        field: 'assigneeId',
        oldValue: previousAssigneeId || null,
        newValue: data.assigneeId || null,
        text: data.assigneeId
          ? `assigned ${ticket.ticketKey} to user`
          : `unassigned ${ticket.ticketKey}`,
      })
      updates.assigneeId = data.assigneeId || null
    }
    if (data.points !== undefined) {
      changes.push({
        field: 'points',
        oldValue: ticket.points || null,
        newValue: data.points || null,
        text: `changed points from ${ticket.points || 'none'} to ${data.points || 'none'}`,
      })
      updates.points = data.points !== null && data.points !== undefined ? Number(data.points) : null
    }
    if (data.acceptanceCriteria !== undefined) {
      updates.acceptanceCriteria = Array.isArray(data.acceptanceCriteria) ? data.acceptanceCriteria : []
    }
    if (data.documents !== undefined) {
      updates.documents = Array.isArray(data.documents) ? data.documents : []
    }
    if (data.attachments !== undefined) {
      updates.attachments = Array.isArray(data.attachments) ? data.attachments : []
    }
    if (data.startDate !== undefined) {
      updates.startDate = data.startDate ? new Date(data.startDate) : null
    }
    if (data.endDate !== undefined) {
      updates.endDate = data.endDate ? new Date(data.endDate) : null
    }
    if (data.dueDate !== undefined) {
      updates.dueDate = data.dueDate ? new Date(data.dueDate) : null
    }
    if (data.github !== undefined) {
      updates.github = data.github
    }

    const updated = await ticketService.updateTicket(id, updates, userId)

    if (!updated) {
      return next(createHttpError(404, 'Ticket not found'))
    }

    // Create activity log if there are changes
    if (changes.length > 0) {
      try {
        await activityRepository.create({
          workspaceId: board.workspaceId,
          boardId: ticket.boardId,
          ticketId: ticket.id,
          actorId: userId,
          actionType: 'update',
          changes,
        })
      } catch (activityError) {
        console.error('Failed to create activity:', activityError)
      }
    }

    // Notify if assignee changed
    if (data.assigneeId !== undefined && data.assigneeId !== previousAssigneeId) {
      try {
        if (data.assigneeId && data.assigneeId !== userId) {
          await notificationService.createCardAssignmentNotification(
            data.assigneeId,
            id,
            userId,
            ticket.reporterId,
          )
        } else if (!data.assigneeId && ticket.reporterId && ticket.reporterId !== userId) {
          // Notify reporter when ticket is unassigned
          const notification = await notificationRepository.create({
            userId: ticket.reporterId,
            type: 'card_assigned',
            cardId: id,
            mentionId: userId,
          })
          const unreadCount = await notificationRepository.getUnreadCount(ticket.reporterId)
          SocketEmitter.emitToUser(ticket.reporterId, 'notification:new', {
            notification,
            unreadCount,
          })
        }
      } catch (notifError) {
        console.error('Failed to create assignment notification:', notifError)
      }
    }

    // Emit socket event for real-time updates (other users will receive this)
    SocketEmitter.emitToRoom(workspaceRoom(board.workspaceId), 'ticket:updated', {
      ticket: updated,
      userId,
      timestamp: new Date().toISOString(),
    })

    res.json({
      success: true,
      data: updated,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}

export async function deleteTicket(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const ticket = await ticketService.findById(id)

    if (!ticket) {
      return next(createHttpError(404, 'Ticket not found'))
    }

    const board = await boardService.findById(ticket.boardId)

    if (!board) {
      return next(createHttpError(404, 'Board not found'))
    }

    // Check if user is a member of the workspace (boards use workspace membership)
    const workspace = await workspaceService.findById(board.workspaceId)
    if (!workspace) {
      return next(createHttpError(404, 'Workspace not found'))
    }
    const isWorkspaceMember = workspace.members.some((m) => m.userId === userId)
    if (!isWorkspaceMember) {
      return next(createHttpError(403, 'Forbidden'))
    }

    await ticketService.deleteTicket(id)

    // Create activity log
    try {
      await activityRepository.create({
        workspaceId: board.workspaceId,
        boardId: ticket.boardId,
        ticketId: ticket.id,
        actorId: userId,
        actionType: 'delete',
        changes: [
          {
            field: 'deleted',
            oldValue: null,
            newValue: true,
            text: `deleted ticket ${ticket.ticketKey}`,
          },
        ],
      })
    } catch (activityError) {
      console.error('Failed to create activity:', activityError)
    }

    res.json({
      success: true,
      message: 'Ticket deleted',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}

export async function uploadAttachment(req: Request, res: Response, next: NextFunction) {
  const { ticketId } = req.params
  const userId = req.user?.id
  const file = req.file

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  if (!file) {
    return next(createHttpError(400, 'File is required'))
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
    const workspace = await workspaceService.findById(board.workspaceId)
    if (!workspace) {
      return next(createHttpError(404, 'Workspace not found'))
    }
    const isWorkspaceMember = workspace.members.some((m) => m.userId === userId)
    if (!isWorkspaceMember) {
      return next(createHttpError(403, 'Forbidden'))
    }

    const url = (file as any).cloudinaryUrl || ''

    const attachment = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      url,
      name: file.originalname,
      type: file.mimetype,
      uploadedAt: new Date(),
    }

    const updated = await ticketService.addAttachment(ticketId, attachment)

    if (!updated) {
      return next(createHttpError(404, 'Ticket not found'))
    }

    // Create activity log
    try {
      await activityRepository.create({
        workspaceId: board.workspaceId,
        boardId: ticket.boardId,
        ticketId: ticket.id,
        actorId: userId,
        actionType: 'upload',
        changes: [
          {
            field: 'attachment',
            oldValue: null,
            newValue: attachment.name,
            text: `uploaded ${attachment.name}`,
          },
        ],
      })
    } catch (activityError) {
      console.error('Failed to create activity:', activityError)
    }

    res.json({
      success: true,
      data: updated,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}

export async function deleteAttachment(req: Request, res: Response, next: NextFunction) {
  const { ticketId, attachmentId } = req.params
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
    const workspace = await workspaceService.findById(board.workspaceId)
    if (!workspace) {
      return next(createHttpError(404, 'Workspace not found'))
    }
    const isWorkspaceMember = workspace.members.some((m) => m.userId === userId)
    if (!isWorkspaceMember) {
      return next(createHttpError(403, 'Forbidden'))
    }

    const updated = await ticketService.removeAttachment(ticketId, attachmentId)

    if (!updated) {
      return next(createHttpError(404, 'Ticket or attachment not found'))
    }

    res.json({
      success: true,
      data: updated,
      timestamp: new Date().toISOString(),
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

    // Check if user is a member of the workspace (boards use workspace membership)
    const workspace = await workspaceService.findById(board.workspaceId)
    if (!workspace) {
      return next(createHttpError(404, 'Workspace not found'))
    }
    const isWorkspaceMember = workspace.members.some((m) => m.userId === userId)
    if (!isWorkspaceMember) {
      return next(createHttpError(403, 'Forbidden'))
    }

    const updates = rankUpdates.map((update: any) => ({
      id: update.id,
      rank: String(update.rank),
    }))

    const updatedTickets = await ticketService.bulkUpdateRanks(boardId, updates)

    res.json({
      success: true,
      data: updatedTickets,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}

export async function getTicketDetailsSettings(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id
  const { boardId } = req.query

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const settings = await ticketDetailsSettingsService.getOrCreateSettings(
      userId,
      boardId as string | undefined,
    )

    res.json({
      success: true,
      data: settings,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}

export async function updateTicketDetailsSettings(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id
  const { boardId } = req.body
  const { fieldConfigs } = req.body

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  if (!fieldConfigs || !Array.isArray(fieldConfigs)) {
    return next(createHttpError(400, 'fieldConfigs is required and must be an array'))
  }

  try {
    const settings = await ticketDetailsSettingsService.updateSettings(
      userId,
      boardId || null,
      { fieldConfigs },
    )

    res.json({
      success: true,
      data: settings,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}

export async function resetTicketDetailsSettings(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id
  const { boardId } = req.query

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const settings = await ticketDetailsSettingsService.resetSettings(
      userId,
      boardId as string | undefined,
    )

    res.json({
      success: true,
      data: settings,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}

