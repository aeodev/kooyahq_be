import type { AITool } from '../ai-assistant.types'
import { getAvailableTools as getAvailableToolsUtil, toOpenAITools as toOpenAIToolsUtil, findTool as findToolUtil, canUseTool as canUseToolUtil } from './utils'

// Time tracker tools
import { startTimerTool } from './time-tracker/time-tracker-start.tools'
import { stopTimerTool } from './time-tracker/time-tracker-stop.tools'
import { pauseTimerTool } from './time-tracker/time-tracker-pause.tools'
import { resumeTimerTool } from './time-tracker/time-tracker-resume.tools'
import { getActiveTimerTool } from './time-tracker/time-tracker-get-active.tools'
import { addTaskToTimerTool } from './time-tracker/time-tracker-add-task.tools'
import { getProjectsForTimerTool } from './time-tracker/time-tracker-get-projects.tools'
import { startTimerWithProjectsTool } from './time-tracker/time-tracker-start-with-projects.tools'
import { switchTimerProjectTool } from './time-tracker/time-tracker-switch-project.tools'

// Workspace tools
import { getMyBoardsTool } from './workspace/workspace-get-boards.tools'
import { getBoardByNameTool } from './workspace/workspace-get-board-by-name.tools'
import { createTicketTool } from './workspace/workspace-create-ticket.tools'
import { getBoardMembersTool } from './workspace/workspace-get-members.tools'
import { assignTicketTool } from './workspace/workspace-assign-ticket.tools'
import { getTicketDetailsTool } from './workspace/workspace-get-ticket-details.tools'
import { moveTicketTool } from './workspace/workspace-move-ticket.tools'
import { searchTicketsTool } from './workspace/workspace-search-tickets.tools'
import { updateTicketTool } from './workspace/workspace-update-ticket.tools'

// User tools
import { getCurrentUserTool } from './user/user-get-current.tools'

// Export all tools as combined array
export const AI_TOOLS: AITool[] = [
  // Time tracker tools
  startTimerTool,
  stopTimerTool,
  pauseTimerTool,
  resumeTimerTool,
  getActiveTimerTool,
  addTaskToTimerTool,
  getProjectsForTimerTool,
  startTimerWithProjectsTool,
  switchTimerProjectTool,
  // Workspace tools
  getMyBoardsTool,
  getBoardByNameTool,
  createTicketTool,
  getBoardMembersTool,
  assignTicketTool,
  getTicketDetailsTool,
  moveTicketTool,
  searchTicketsTool,
  updateTicketTool,
  // User tools
  getCurrentUserTool,
]

// Re-export utility functions with proper signatures
import type { AuthUser } from '../../auth/rbac/permissions'
import type { OpenAITool } from '../ai-assistant.types'

export function getAvailableTools(user: AuthUser): AITool[] {
  return getAvailableToolsUtil(AI_TOOLS, user)
}

export function toOpenAITools(tools: AITool[]): OpenAITool[] {
  return toOpenAIToolsUtil(tools)
}

export function findTool(name: string): AITool | undefined {
  return findToolUtil(AI_TOOLS, name)
}

export function canUseTool(user: AuthUser, toolName: string): boolean {
  return canUseToolUtil(AI_TOOLS, user, toolName)
}

// Re-export type
export type { AITool } from '../ai-assistant.types'

