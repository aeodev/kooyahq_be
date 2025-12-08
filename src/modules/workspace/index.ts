/**
 * Workspace Module
 * 
 * This module contains all workspace-related functionality:
 * - Workspace: Top-level organization container
 * - Boards: Project/team board configuration
 * - Tickets: Core work items (replaces Cards)
 * - Activities: Unified activity log
 * - Comments: Ticket comments
 */

export * from './workspace/workspace.model'
export * from './workspace/workspace.repository'
export * from './workspace/workspace.service'
export * from './workspace/workspace.controller'
export * from './workspace/workspace.router'

export * from './boards/board.model'
export * from './boards/board.repository'
export * from './boards/board.service'
export * from './boards/board.controller'
export * from './boards/board.router'

export * from './tickets/ticket.model'
export * from './tickets/ticket.repository'
export * from './tickets/ticket.service'
export * from './tickets/ticket.controller'
export * from './tickets/ticket.router'

export * from './activities/activity.model'
export * from './activities/activity.repository'
export * from './activities/activity.controller'
export * from './activities/activity.router'

export * from './comments/comment.model'
export * from './comments/comment.repository'
export * from './comments/comment.service'
export * from './comments/comment.controller'

