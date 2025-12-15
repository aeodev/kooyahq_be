import type { NextFunction, Request, Response } from 'express'
import { boardService } from '../boards/board.service'
import { ticketService } from './ticket.service'
import { ticketRepository } from './ticket.repository'
import { activityRepository } from '../activities/activity.repository'
import { commentService } from '../comments/comment.service'
import { notificationService } from '../../notifications/notification.service'
import { notificationRepository } from '../../notifications/notification.repository'
import { createHttpError } from '../../../utils/http-error'
import { hasPermission, PERMISSIONS } from '../../auth/rbac/permissions'
import { SocketEmitter } from '../../../utils/socket-emitter'
import { workspaceRoom } from '../../../utils/socket-rooms'
import { userService } from '../../users/user.service'
import type { Ticket } from './ticket.model'
import { ticketCache } from '../cache/ticket.cache'

type BoardRole = 'owner' | 'admin' | 'member' | 'viewer' | 'none'

const getBoardRole = (board: { createdBy: string; members: Array<{ userId: string; role: BoardRole }> }, userId?: string): BoardRole => {
  if (!userId) return 'none'
  if (board.createdBy === userId) return 'owner'
  const member = (board.members ?? []).find((m) => m.userId === userId)
  return (member?.role as BoardRole | undefined) ?? 'none'
}

const hasFullBoardAccess = (user: any) => hasPermission(user ?? { permissions: [] }, PERMISSIONS.BOARD_FULL_ACCESS)

const canViewBoard = (board: { createdBy: string; members: Array<{ userId: string; role: BoardRole }> }, user: any) => {
  if (hasFullBoardAccess(user)) return true
  const role = getBoardRole(board, user?.id)
  return role !== 'none'
}

const canModifyTickets = (board: { createdBy: string; members: Array<{ userId: string; role: BoardRole }> }, user: any) => {
  if (hasFullBoardAccess(user)) return true
  const role = getBoardRole(board, user?.id)
  return role === 'owner' || role === 'admin' || role === 'member'
}

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

  // Prevent direct subtask creation - subtasks must be created from an existing ticket
  if (ticketType === 'subtask' && !parentTicketId) {
    return next(createHttpError(400, 'Subtasks must have a parent ticket and cannot be created directly'))
  }

  try {
    const board = await boardService.findById(boardId)

    if (!board) {
      return next(createHttpError(404, 'Board not found'))
    }

    if (!canModifyTickets(board, req.user)) {
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
    await ticketCache.invalidateBoardTickets(boardId)

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
        await notificationService.createCardAssignmentNotification(
          assigneeId,
          ticket.id,
          userId,
          ticket.reporterId,
          board.prefix,
          ticket.ticketKey
        )
      } catch (notifError) {
        console.error('Failed to create assignment notification:', notifError)
      }
    }

    // Emit socket event for real-time updates (exclude source user)
    try {
      SocketEmitter.emitToRoomExceptUser(
        workspaceRoom(board.workspaceId),
        'ticket:created',
        {
          ticket,
          userId,
          timestamp: new Date().toISOString(),
        },
        userId
      )
    } catch (socketError) {
      console.error('Failed to emit ticket:created socket event:', socketError)
    }

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

    if (!canViewBoard(board, req.user)) {
      return next(createHttpError(403, 'Forbidden'))
    }

    const cachedTickets = await ticketCache.getBoardTickets(boardId)
    if (cachedTickets) {
      return res.json({
        success: true,
        data: cachedTickets,
        timestamp: new Date().toISOString(),
      })
    }

    const tickets = await ticketService.findByBoardId(boardId)
    await ticketCache.setBoardTickets(boardId, tickets)

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

    if (!canViewBoard(board, req.user)) {
      return next(createHttpError(403, 'Forbidden'))
    }

    // Track that this user viewed the ticket (non-blocking)
    ticketService.trackView(id, userId).catch((err: any) => {
      console.error('Error tracking ticket view:', err)
      // Don't fail the request if tracking fails
    })

    // Fetch related data in parallel - optimize queries
    const [history, comments, parent, children, epicTickets, parentSiblings, manualRelated] = await Promise.all([
      // Get ticket history/activities
      activityRepository.findByTicketId(id),
      // Get comments
      commentService.findByTicketId(id),
      // Get parent ticket if exists (parallel)
      ticket.parentTicketId ? ticketService.findById(ticket.parentTicketId) : Promise.resolve(null),
      // Get child tickets (parallel)
      ticketService.findByParentTicketId(id),
      // Get epic tickets if exists (parallel)
      ticket.rootEpicId ? ticketService.findByRootEpicId(ticket.rootEpicId) : Promise.resolve([]),
      // Get siblings if has parent but no epic (parallel)
      (!ticket.rootEpicId && ticket.parentTicketId) 
        ? ticketService.findByParentTicketId(ticket.parentTicketId) 
        : Promise.resolve([]),
      // Get manually related tickets (parallel)
      (ticket.relatedTickets && ticket.relatedTickets.length > 0)
        ? Promise.all(ticket.relatedTickets.map((relatedId) => ticketService.findById(relatedId)))
        : Promise.resolve([]),
    ])

    // Build related tickets structure from parallel results
    const related: {
      parent: Ticket | undefined | null
      children: Ticket[]
      siblings: Ticket[]
      epicTickets: Ticket[]
      manualRelated: Ticket[]
    } = {
      parent: parent || null,
      children: children || [],
      siblings: [],
      epicTickets: [],
      manualRelated: [],
    }

    // Process epic tickets
    if (ticket.rootEpicId && Array.isArray(epicTickets)) {
      // Filter out the current ticket and any tickets that are epics themselves
      // Epic tickets section should only show non-epic tickets (tasks, bugs, stories, subtasks) in the same epic
      related.epicTickets = epicTickets.filter(
        (t: Ticket) => t.id !== id && t.ticketType !== 'epic'
      )
      
      // Determine siblings based on epic and parent
      if (ticket.parentTicketId) {
        // If has parent, siblings are children (already filtered)
        related.siblings = related.children.filter((t: Ticket) => t.id !== id)
      } else {
        // If no parent, siblings are other tickets in the same epic without a parent
        // Also filter out epics from siblings
        related.siblings = epicTickets.filter(
          (t: Ticket) => t.id !== id && !t.parentTicketId && t.ticketType !== 'epic'
        )
      }
    } else if (ticket.parentTicketId && Array.isArray(parentSiblings)) {
      // If has parent but no epic, siblings are other tickets with same parent
      related.siblings = parentSiblings.filter((t: Ticket) => t.id !== id)
    }

    // Process manually related tickets
    if (Array.isArray(manualRelated)) {
      related.manualRelated = manualRelated.filter(
        (t): t is Ticket => t !== undefined && t !== null && t.ticketType !== 'subtask'
      )
    }

    const relatedTickets = related

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

export async function updateTicket(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params
  const { timestamp, data } = req.body
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  // Timestamp is optional - only required for certain operations if needed
  // If not provided, we'll use current timestamp

  try {
    const ticket = await ticketService.findById(id)

    if (!ticket) {
      return next(createHttpError(404, 'Ticket not found'))
    }

    const board = await boardService.findById(ticket.boardId)

    if (!board) {
      return next(createHttpError(404, 'Board not found'))
    }

    if (!canModifyTickets(board, req.user)) {
      return next(createHttpError(403, 'Forbidden'))
    }

    const previousAssigneeId = ticket.assigneeId
    const previousColumnId = ticket.columnId
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
      const oldColumnId = previousColumnId
      updates.columnId = data.columnId
      // Track column change for activity log
      if (oldColumnId !== data.columnId) {
        const oldColumn = board.columns.find(col => col.id === oldColumnId)
        const newColumn = board.columns.find(col => col.id === data.columnId)
        changes.push({
          field: 'columnId',
          oldValue: oldColumnId,
          newValue: data.columnId,
          text: `moved ${ticket.ticketKey} to ${newColumn?.name || data.columnId}`,
        })
      }
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
      let assigneeName = 'user'
      if (data.assigneeId) {
        try {
          const assignee = await userService.getPublicProfile(data.assigneeId)
          assigneeName = assignee?.name || 'user'
        } catch (error) {
          console.error('Error fetching assignee name:', error)
        }
      }
      changes.push({
        field: 'assigneeId',
        oldValue: previousAssigneeId || null,
        newValue: data.assigneeId || null,
        text: data.assigneeId
          ? `assigned ${ticket.ticketKey} to ${assigneeName}`
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
      type TicketAttachment = Ticket['attachments'][number]
      const oldAttachments: TicketAttachment[] = (ticket.attachments || []) as TicketAttachment[]
      const newAttachments: TicketAttachment[] = (Array.isArray(data.attachments) ? data.attachments : []) as TicketAttachment[]
      
      // Track attachment changes
      const addedAttachments = newAttachments.filter(
        (newAtt: TicketAttachment) => !oldAttachments.some((oldAtt) => oldAtt.id === newAtt.id)
      )
      const removedAttachments = oldAttachments.filter(
        (oldAtt: TicketAttachment) => !newAttachments.some((newAtt: TicketAttachment) => newAtt.id === oldAtt.id)
      )
      
      if (addedAttachments.length > 0) {
        addedAttachments.forEach((att: TicketAttachment) => {
          changes.push({
            field: 'attachment',
            oldValue: null,
            newValue: att.name,
            text: `uploaded ${att.name}`,
          })
        })
      }
      
      if (removedAttachments.length > 0) {
        removedAttachments.forEach((att: TicketAttachment) => {
          changes.push({
            field: 'attachment',
            oldValue: att.name,
            newValue: null,
            text: `removed ${att.name}`,
          })
        })
      }
      
      updates.attachments = newAttachments
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
    if (data.parentTicketId !== undefined) {
      const oldParentTicketId = ticket.parentTicketId
      updates.parentTicketId = data.parentTicketId || null
      if (oldParentTicketId !== data.parentTicketId) {
        let parentTicketKey = data.parentTicketId
        if (data.parentTicketId) {
          try {
            const parentTicket = await ticketService.findById(data.parentTicketId)
            parentTicketKey = parentTicket?.ticketKey || data.parentTicketId
          } catch (error) {
            console.error('Error fetching parent ticket:', error)
          }
        }
        changes.push({
          field: 'parentTicketId',
          oldValue: oldParentTicketId || null,
          newValue: data.parentTicketId || null,
          text: data.parentTicketId
            ? `set parent ticket to ${parentTicketKey}`
            : 'removed parent ticket',
        })
      }
    }
    if (data.rootEpicId !== undefined) {
      const oldRootEpicId = ticket.rootEpicId
      updates.rootEpicId = data.rootEpicId || null
      if (oldRootEpicId !== data.rootEpicId) {
        let epicTicketKey = data.rootEpicId
        if (data.rootEpicId) {
          try {
            const epicTicket = await ticketService.findById(data.rootEpicId)
            epicTicketKey = epicTicket?.ticketKey || data.rootEpicId
          } catch (error) {
            console.error('Error fetching epic ticket:', error)
          }
        }
        changes.push({
          field: 'rootEpicId',
          oldValue: oldRootEpicId || null,
          newValue: data.rootEpicId || null,
          text: data.rootEpicId
            ? `set root epic to ${epicTicketKey}`
            : 'removed root epic',
        })
      }
    }

    const updated = await ticketService.updateTicket(id, updates, userId)

    if (!updated) {
      return next(createHttpError(404, 'Ticket not found'))
    }
    await ticketCache.invalidateBoardTickets(ticket.boardId)

    // Create activity log if there are changes
    if (changes.length > 0) {
      try {
        // Determine action type based on changes
        const hasColumnChange = changes.some((c) => c.field === 'columnId')
        const actionType = hasColumnChange ? 'transition' : 'update'
        
        await activityRepository.create({
          workspaceId: board.workspaceId,
          boardId: ticket.boardId,
          ticketId: ticket.id,
          actorId: userId,
          actionType,
          changes,
        })
      } catch (activityError) {
        console.error('Failed to create activity:', activityError)
      }
    }

    // Notify if column changed (ticket moved)
    if (data.columnId !== undefined && data.columnId !== previousColumnId) {
      try {
        await notificationService.createCardMovedNotification(
          ticket.id,
          userId,
          ticket.assigneeId,
          ticket.reporterId,
          board.prefix,
          ticket.ticketKey
        )
      } catch (notifError) {
        console.error('Failed to create ticket movement notification:', notifError)
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
            board.prefix,
            ticket.ticketKey
          )
        } else if (!data.assigneeId && ticket.reporterId && ticket.reporterId !== userId) {
          // Notify reporter when ticket is unassigned
          const url = `/workspace/${board.prefix}/${ticket.ticketKey}`
          const notification = await notificationRepository.create({
            userId: ticket.reporterId,
            type: 'card_assigned',
            cardId: id,
            mentionId: userId,
            url,
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

    // Emit socket event for real-time updates (exclude source user)
    try {
      SocketEmitter.emitToRoomExceptUser(
        workspaceRoom(board.workspaceId),
        'ticket:updated',
        {
          ticket: updated,
          userId,
          timestamp: new Date().toISOString(),
        },
        userId
      )
    } catch (socketError) {
      console.error('Failed to emit ticket:updated socket event:', socketError)
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

    if (!canModifyTickets(board, req.user)) {
      return next(createHttpError(403, 'Forbidden'))
    }

    await ticketService.deleteTicket(id)
    await ticketCache.invalidateBoardTickets(ticket.boardId)

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

    // Emit socket event for real-time updates (exclude source user)
    try {
      SocketEmitter.emitToRoomExceptUser(
        workspaceRoom(board.workspaceId),
        'ticket:deleted',
        {
          ticketId: ticket.id,
          boardId: ticket.boardId,
          userId,
          timestamp: new Date().toISOString(),
        },
        userId
      )
    } catch (socketError) {
      console.error('Failed to emit ticket:deleted socket event:', socketError)
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


export async function addRelatedTicket(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params
  const { relatedTicketId } = req.body
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  if (!relatedTicketId || typeof relatedTicketId !== 'string') {
    return next(createHttpError(400, 'relatedTicketId is required'))
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

    if (!canModifyTickets(board, req.user)) {
      return next(createHttpError(403, 'Forbidden'))
    }

    // Validate related ticket exists
    const relatedTicket = await ticketService.findById(relatedTicketId)
    if (!relatedTicket) {
      return next(createHttpError(404, 'Related ticket not found'))
    }

    // Validate related ticket is not epic or subtask
    if (relatedTicket.ticketType === 'epic' || relatedTicket.ticketType === 'subtask') {
      return next(createHttpError(400, 'Cannot relate to epics or subtasks'))
    }

    // Validate not adding self
    if (relatedTicketId === id) {
      return next(createHttpError(400, 'Cannot relate ticket to itself'))
    }

    // Check if already related
    if (ticket.relatedTickets && ticket.relatedTickets.includes(relatedTicketId)) {
      return res.json({
        success: true,
        data: ticket,
        message: 'Ticket already related',
      })
    }

    // Add relationship
    const updated = await ticketRepository.addRelatedTicket(id, relatedTicketId)

    if (!updated) {
      return next(createHttpError(404, 'Ticket not found'))
    }
    await ticketCache.invalidateBoardTickets(ticket.boardId)

    res.json({
      success: true,
      data: updated,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}

export async function removeRelatedTicket(req: Request, res: Response, next: NextFunction) {
  const { id, relatedTicketId } = req.params
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

    if (!canModifyTickets(board, req.user)) {
      return next(createHttpError(403, 'Forbidden'))
    }

    // Remove relationship
    const updated = await ticketRepository.removeRelatedTicket(id, relatedTicketId)

    if (!updated) {
      return next(createHttpError(404, 'Ticket not found'))
    }
    await ticketCache.invalidateBoardTickets(ticket.boardId)

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

    if (!canModifyTickets(board, req.user)) {
      return next(createHttpError(403, 'Forbidden'))
    }

    const updates = rankUpdates.map((update: any) => ({
      id: update.id,
      rank: String(update.rank),
    }))

    const updatedTickets = await ticketService.bulkUpdateRanks(boardId, updates)
    await ticketCache.invalidateBoardTickets(boardId)

    res.json({
      success: true,
      data: updatedTickets,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}
