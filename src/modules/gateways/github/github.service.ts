import { createHttpError } from '../../../utils/http-error'
import { ticketService } from '../../workspace/tickets/ticket.service'
import { boardService } from '../../workspace/boards/board.service'
import { ticketCache } from '../../workspace/cache/ticket.cache'
import { activityRepository } from '../../workspace/activities/activity.repository'
import { SocketEmitter } from '../../../utils/socket-emitter'
import { workspaceRoom } from '../../../utils/socket-rooms'
import type { Ticket, TicketGithubStatus } from '../../workspace/tickets/ticket.model'

const GATEWAY_ACTOR_ID = 'github-gateway'

const statusMap: Record<string, TicketGithubStatus> = {
  open: 'open',
  merged: 'merged',
  closed: 'closed',
  requested_pr: 'requested_pr',
  merging_pr: 'merging_pr',
  merged_pr: 'merged_pr',
  deploying: 'deploying',
  deployed: 'deployed',
  failed: 'failed',
}

type GithubGatewayPayload = {
  branch?: unknown
  branchName?: unknown
  column?: unknown
  columnName?: unknown
  status?: unknown
  prLink?: unknown
  pullRequestUrl?: unknown
}

function normalizeBranchName(branch?: unknown, branchName?: unknown): string {
  const value = typeof branchName === 'string' && branchName.trim().length > 0
    ? branchName.trim()
    : typeof branch === 'string'
      ? branch.trim()
      : ''

  if (!value) {
    throw createHttpError(400, 'branch or branchName is required')
  }

  return value
}

function normalizeColumnName(column?: unknown): string {
  if (typeof column !== 'string' || column.trim().length === 0) {
    throw createHttpError(400, 'column is required')
  }

  return column.trim()
}

function normalizeStatus(status?: unknown): TicketGithubStatus {
  if (typeof status !== 'string' || status.trim().length === 0) {
    throw createHttpError(400, 'status is required')
  }

  const normalized = status.trim().toLowerCase().replace(/[\s-]+/g, '_')
  const mapped = statusMap[normalized]

  if (!mapped) {
    throw createHttpError(400, 'Invalid status value')
  }

  return mapped
}

function normalizePrLink(prLink?: unknown): string | undefined {
  if (prLink === undefined || prLink === null) {
    return undefined
  }

  if (typeof prLink !== 'string') {
    throw createHttpError(400, 'prLink must be a string')
  }

  const trimmed = prLink.trim()
  if (!trimmed) {
    return undefined
  }

  try {
    const url = new URL(trimmed)
    return url.toString()
  } catch {
    throw createHttpError(400, 'Invalid prLink URL')
  }
}

function extractTicketKeyFromBranch(branchName: string): string | null {
  const match = branchName.match(/([A-Z]+-\d+)/i)
  return match ? match[1].toUpperCase() : null
}

async function findTicketForBranch(branchName: string): Promise<Ticket> {
  const existing = await ticketService.findByGithubBranchName(branchName)
  if (existing) {
    return existing
  }

  const ticketKey = extractTicketKeyFromBranch(branchName)
  if (ticketKey) {
    const byKey = await ticketService.findByTicketKey(ticketKey)
    if (byKey) {
      return byKey
    }
  }

  throw createHttpError(404, 'Ticket not found for provided branch')
}

function buildGithubUpdate(
  ticket: Ticket,
  branchName: string,
  status: TicketGithubStatus,
  pullRequestUrl?: string,
) {
  return {
    branchName,
    pullRequestUrl: pullRequestUrl ?? ticket.github?.pullRequestUrl,
    status,
  }
}

function buildChanges(params: {
  ticketKey: string
  previous: Ticket
  updated: Ticket
  targetColumnName: string
  previousColumnName?: string
}) {
  const changes: Array<{
    field: string
    oldValue: any
    newValue: any
    text: string
  }> = []

  if (params.previous.columnId !== params.updated.columnId) {
    const fromColumn = params.previousColumnName
    const toColumn = params.targetColumnName
    const moveText = fromColumn
      ? `moved ${params.ticketKey} from ${fromColumn} to ${toColumn}`
      : `moved ${params.ticketKey} to ${toColumn}`

    changes.push({
      field: 'columnId',
      oldValue: params.previous.columnId,
      newValue: params.updated.columnId,
      text: moveText,
    })
  }

  const prevStatus = params.previous.github?.status
  const nextStatus = params.updated.github?.status
  if (prevStatus !== nextStatus && nextStatus) {
    changes.push({
      field: 'github.status',
      oldValue: prevStatus ?? null,
      newValue: nextStatus,
      text: `updated GitHub status to ${nextStatus}`,
    })
  }

  const prevBranch = params.previous.github?.branchName
  const nextBranch = params.updated.github?.branchName
  if (prevBranch !== nextBranch && nextBranch) {
    changes.push({
      field: 'github.branchName',
      oldValue: prevBranch ?? null,
      newValue: nextBranch,
      text: `linked branch ${nextBranch}`,
    })
  }

  const prevPr = params.previous.github?.pullRequestUrl
  const nextPr = params.updated.github?.pullRequestUrl
  if (prevPr !== nextPr && nextPr) {
    changes.push({
      field: 'github.pullRequestUrl',
      oldValue: prevPr ?? null,
      newValue: nextPr,
      text: 'updated pull request link',
    })
  }

  return changes
}

export const githubGatewayService = {
  async processGithubAction(payload: GithubGatewayPayload) {
    const branchName = normalizeBranchName(payload.branch, payload.branchName)
    const status = normalizeStatus(payload.status)
    const columnName = normalizeColumnName(payload.column ?? payload.columnName)
    const pullRequestUrl = normalizePrLink(payload.prLink ?? payload.pullRequestUrl)

    const ticket = await findTicketForBranch(branchName)
    const board = await boardService.findById(ticket.boardId)

    if (!board) {
      throw createHttpError(404, 'Board not found for ticket')
    }

    const targetColumn = board.columns.find(
      (col) => col.name.trim().toLowerCase() === columnName.toLowerCase(),
    )

    if (!targetColumn) {
      throw createHttpError(404, 'Column not found on ticket board')
    }

    const previousColumn = board.columns.find((col) => col.id === ticket.columnId)
    const updates = {
      columnId: targetColumn.id,
      github: buildGithubUpdate(ticket, branchName, status, pullRequestUrl),
    }

    const updatedTicket = await ticketService.updateTicket(
      ticket.id,
      updates,
      GATEWAY_ACTOR_ID,
    )

    if (!updatedTicket) {
      throw createHttpError(404, 'Ticket not found while updating')
    }

    await ticketCache.invalidateBoardTickets(ticket.boardId)

    const changes = buildChanges({
      ticketKey: ticket.ticketKey,
      previous: ticket,
      updated: updatedTicket,
      targetColumnName: targetColumn.name,
      previousColumnName: previousColumn?.name,
    })

    if (changes.length > 0) {
      try {
        await activityRepository.create({
          workspaceId: board.workspaceId,
          boardId: board.id,
          ticketId: ticket.id,
          actorId: GATEWAY_ACTOR_ID,
          actionType: changes.some((c) => c.field === 'columnId') ? 'transition' : 'update',
          changes,
        })
      } catch (err) {
        console.error('Failed to log GitHub gateway activity:', err)
      }
    }

    try {
      SocketEmitter.emitToRoom(
        workspaceRoom(board.workspaceId),
        'ticket:updated',
        {
          ticket: updatedTicket,
          userId: GATEWAY_ACTOR_ID,
          timestamp: new Date().toISOString(),
        },
      )
    } catch (socketError) {
      console.error('Failed to emit ticket:updated from GitHub gateway:', socketError)
    }

    return updatedTicket
  },
}
