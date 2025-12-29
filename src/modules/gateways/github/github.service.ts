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
  pull_requested: 'pull-requested',
  pull_request: 'pull-requested',
  pr_requested: 'pull-requested',
  requested_pr: 'pull-requested',
  pr_request: 'pull-requested',
  open: 'pull-requested',
  on_queue: 'pull-requested',
  queue: 'pull-requested',
  queued: 'pull-requested',
  building: 'pull-requested',
  build: 'pull-requested',
  push: 'pull-requested',
  pushed: 'pull-requested',

  pull_request_build_check_passed: 'pull-request-build-check-passed',
  pr_build_check_passed: 'pull-request-build-check-passed',
  build_check_passed: 'pull-request-build-check-passed',
  checks_passed: 'pull-request-build-check-passed',
  build_passed: 'pull-request-build-check-passed',
  build_succeeded: 'pull-request-build-check-passed',
  build_success: 'pull-request-build-check-passed',
  merged: 'pull-request-build-check-passed',
  merged_pr: 'pull-request-build-check-passed',
  merging: 'pull-request-build-check-passed',
  merging_pr: 'pull-request-build-check-passed',

  pull_request_build_check_failed: 'pull-request-build-check-failed',
  pr_build_check_failed: 'pull-request-build-check-failed',
  build_check_failed: 'pull-request-build-check-failed',
  checks_failed: 'pull-request-build-check-failed',
  build_failed: 'pull-request-build-check-failed',
  building_failed: 'pull-request-build-check-failed',
  failed_build: 'pull-request-build-check-failed',
  merge_conflict: 'pull-request-build-check-failed',
  merge_conflicts: 'pull-request-build-check-failed',
  merge_error: 'pull-request-build-check-failed',
  merge_error_conflicts: 'pull-request-build-check-failed',
  conflict: 'pull-request-build-check-failed',
  closed: 'pull-request-build-check-failed',
  failed: 'pull-request-build-check-failed',

  deploying: 'deploying',
  deploy: 'deploying',

  deployment_failed: 'deployment-failed',
  deploy_failed: 'deployment-failed',
  deploying_error: 'deployment-failed',
  deploy_error: 'deployment-failed',

  deployed: 'deployed',
}

type GithubGatewayPayload = {
  branchName?: unknown
  targetBranch?: unknown
  status?: unknown
  pullRequestUrl?: unknown
}

function normalizeBranchName(branchName?: unknown): string {
  const value = typeof branchName === 'string' ? branchName.trim() : ''

  if (!value) {
    throw createHttpError(400, 'branchName is required')
  }

  return value
}

function normalizeTargetBranch(
  targetBranch?: unknown,
): string | undefined {
  const value = typeof targetBranch === 'string' ? targetBranch.trim() : ''

  return value || undefined
}

function normalizeStatus(status?: unknown): TicketGithubStatus {
  if (typeof status !== 'string' || status.trim().length === 0) {
    throw createHttpError(400, 'status is required')
  }

  const normalized = status
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
  const mapped = statusMap[normalized]

  if (!mapped) {
    throw createHttpError(400, 'Invalid status value')
  }

  return mapped
}

function normalizePullRequestUrl(pullRequestUrl?: unknown): string | undefined {
  if (pullRequestUrl === undefined || pullRequestUrl === null) {
    return undefined
  }

  if (typeof pullRequestUrl !== 'string') {
    throw createHttpError(400, 'pullRequestUrl must be a string')
  }

  const trimmed = pullRequestUrl.trim()
  if (!trimmed) {
    return undefined
  }

  try {
    const url = new URL(trimmed)
    return url.toString()
  } catch {
    throw createHttpError(400, 'Invalid pullRequestUrl URL')
  }
}

function extractTicketKeyFromBranch(branchName: string): string | null {
  const match = branchName.match(/\/([A-Z]+-\d+)\//i)
  return match ? match[1].toUpperCase() : null
}

async function findTicketForBranch(branchName: string): Promise<Ticket> {
  const ticketKey = extractTicketKeyFromBranch(branchName)
  if (ticketKey) {
    const byKey = await ticketService.findByTicketKey(ticketKey)
    if (byKey) {
      return byKey
    }
    throw createHttpError(404, 'Ticket not found for provided branch')
  }

  const existing = await ticketService.findByGithubBranchName(branchName)
  if (existing) {
    return existing
  }

  throw createHttpError(404, 'Ticket not found for provided branch')
}

function buildGithubUpdate(
  ticket: Ticket,
  branchName: string,
  targetBranch: string,
  status: TicketGithubStatus,
  pullRequestUrl?: string,
) {
  return {
    branchName,
    targetBranch,
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

  const prevTargetBranch = params.previous.github?.targetBranch
  const nextTargetBranch = params.updated.github?.targetBranch
  if (prevTargetBranch !== nextTargetBranch && nextTargetBranch) {
    changes.push({
      field: 'github.targetBranch',
      oldValue: prevTargetBranch ?? null,
      newValue: nextTargetBranch,
      text: `set target branch to ${nextTargetBranch}`,
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
    const branchName = normalizeBranchName(payload.branchName)
    const targetBranchInput = normalizeTargetBranch(payload.targetBranch)
    const status = normalizeStatus(payload.status)
    const pullRequestUrl = normalizePullRequestUrl(payload.pullRequestUrl)
    const targetBranch = targetBranchInput ?? branchName

    const ticket = await findTicketForBranch(branchName)
    const board = await boardService.findById(ticket.boardId)

    if (!board) {
      throw createHttpError(404, 'Board not found for ticket')
    }

    const normalizedTargetBranch = targetBranch.toLowerCase()
    const rules = board.settings?.githubAutomation?.rules ?? []
    const matchedRule = rules.find((rule) => {
      if (!rule.enabled) return false
      const normalizedRuleStatus = statusMap[rule.status] ?? rule.status
      if (normalizedRuleStatus !== status) return false
      if (!rule.targetBranch) return true
      const ruleTarget = rule.targetBranch.trim().toLowerCase()
      if (!ruleTarget || ruleTarget === '*') return true
      if (ruleTarget.includes('*')) {
        const prefix = ruleTarget.replace(/\*+$/, '')
        return normalizedTargetBranch.startsWith(prefix)
      }
      return ruleTarget === normalizedTargetBranch
    })
    const targetColumn = matchedRule
      ? board.columns.find((col) => col.id === matchedRule.columnId)
      : undefined

    const previousColumn = board.columns.find((col) => col.id === ticket.columnId)
    const updates = {
      ...(targetColumn ? { columnId: targetColumn.id } : {}),
      github: buildGithubUpdate(ticket, branchName, targetBranch, status, pullRequestUrl),
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
      targetColumnName: targetColumn?.name || previousColumn?.name || 'Unknown',
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
