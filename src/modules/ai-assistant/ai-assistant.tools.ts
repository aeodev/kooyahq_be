import { PERMISSIONS, hasPermission, type Permission, type AuthUser } from '../auth/rbac/permissions'
import { TimeEntryService } from '../time-tracker/time-entry.service'
import { ticketService } from '../workspace/tickets/ticket.service'
import { ticketRepository } from '../workspace/tickets/ticket.repository'
import { boardService } from '../workspace/boards/board.service'
import { userService } from '../users/user.service'
import { projectService } from '../projects/project.service'
import type { AITool, OpenAITool } from './ai-assistant.types'

const timeEntryService = new TimeEntryService()

function validateProjects(projects: unknown): string[] {
  const validProjects = (Array.isArray(projects) ? projects : [projects])
    .filter((p): p is string => p != null && typeof p === 'string' && p.trim().length > 0)
    .map(p => p.trim())
  return validProjects
}

async function startTimerWithFirstProject(
  userId: string,
  projects: unknown,
  task: string | undefined,
  isOvertime: boolean | undefined
) {
  const validProjects = validateProjects(projects)
  
  if (validProjects.length === 0) {
    return {
      success: false,
      error: 'At least one valid project name is required',
    }
  }

  const firstProject = validProjects[0]
  const finalTask = task?.trim() || 'Started working'
  const entry = await timeEntryService.startTimer(userId, {
    projects: [firstProject],
    task: finalTask,
    isOvertime: isOvertime ?? false,
  })

  const additionalProjectsText = validProjects.length > 1 
    ? ` (${validProjects.length - 1} more project${validProjects.length > 2 ? 's' : ''} available)`
    : ''

  return {
    success: true,
    message: `Timer started for ${firstProject}${additionalProjectsText}`,
    entry: {
      id: entry.id,
      projects: entry.projects,
      task: entry.tasks?.[0]?.text || '',
      startTime: entry.startTime,
    },
  }
}

export const AI_TOOLS: AITool[] = [
  {
    name: 'start_timer',
    description: 'Start a time tracking timer for one or more projects. Call this when the user specifies projects in their message (e.g., "start timer for project X").',
    requiredPermission: PERMISSIONS.TIME_ENTRY_CREATE,
    parameters: {
      type: 'object',
      properties: {
        projects: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of project names to track time for',
        },
        task: {
          type: 'string',
          description: 'Description of the task being worked on',
        },
        isOvertime: {
          type: 'boolean',
          description: 'Whether this is overtime work (default: false)',
        },
      },
      required: ['projects'],
    },
    execute: async (params, user) => {
      const { projects, task, isOvertime } = params as {
        projects: string[]
        task?: string
        isOvertime?: boolean
      }
      return startTimerWithFirstProject(user.id, projects, task, isOvertime)
    },
  },
  {
    name: 'stop_timer',
    description: 'Stop the currently running time tracking timer.',
    requiredPermission: PERMISSIONS.TIME_ENTRY_UPDATE,
    parameters: {
      type: 'object',
      properties: {},
    },
    execute: async (_params, user) => {
      const entry = await timeEntryService.stopTimer(user.id)
      
      if (!entry) {
        return {
          success: false,
          message: 'No active timer found',
        }
      }
      
      return {
        success: true,
        message: `Timer stopped. Duration: ${Math.round(entry.duration / 60)} minutes`,
        entry: {
          id: entry.id,
          projects: entry.projects,
          duration: entry.duration,
        },
      }
    },
  },
  {
    name: 'pause_timer',
    description: 'Pause the currently running timer.',
    requiredPermission: PERMISSIONS.TIME_ENTRY_UPDATE,
    parameters: {
      type: 'object',
      properties: {},
    },
    execute: async (_params, user) => {
      const entry = await timeEntryService.pauseTimer(user.id)
      
      if (!entry) {
        return {
          success: false,
          message: 'No active timer found to pause',
        }
      }
      
      return {
        success: true,
        message: 'Timer paused',
        entry: {
          id: entry.id,
          isPaused: entry.isPaused,
        },
      }
    },
  },
  {
    name: 'resume_timer',
    description: 'Resume a paused timer.',
    requiredPermission: PERMISSIONS.TIME_ENTRY_UPDATE,
    parameters: {
      type: 'object',
      properties: {},
    },
    execute: async (_params, user) => {
      const entry = await timeEntryService.resumeTimer(user.id)
      
      if (!entry) {
        return {
          success: false,
          message: 'No paused timer found to resume',
        }
      }
      
      return {
        success: true,
        message: 'Timer resumed',
        entry: {
          id: entry.id,
          isPaused: entry.isPaused,
        },
      }
    },
  },
  {
    name: 'get_active_timer',
    description: 'Check if there is a currently running timer and get its details.',
    requiredPermission: PERMISSIONS.TIME_ENTRY_READ,
    parameters: {
      type: 'object',
      properties: {},
    },
    execute: async (_params, user) => {
      const entry = await timeEntryService.getActiveTimer(user.id)
      
      if (!entry) {
        return {
          active: false,
          message: 'No active timer',
        }
      }
      
      const durationMinutes = Math.round(entry.duration / 60)
      
      return {
        active: true,
        entry: {
          id: entry.id,
          projects: entry.projects,
          task: entry.tasks?.[0]?.text || '',
          startTime: entry.startTime,
          duration: durationMinutes,
          isPaused: entry.isPaused,
        },
        message: `Timer running for ${entry.projects.join(', ')} - ${durationMinutes} minutes`,
      }
    },
  },
  {
    name: 'add_task_to_timer',
    description: 'Add a task description to the currently running timer.',
    requiredPermission: PERMISSIONS.TIME_ENTRY_UPDATE,
    parameters: {
      type: 'object',
      properties: {
        task: {
          type: 'string',
          description: 'The task description to add',
        },
      },
      required: ['task'],
    },
    execute: async (params, user) => {
      const { task } = params as { task: string }
      
      const entry = await timeEntryService.addTaskToActiveTimer(user.id, task)
      
      return {
        success: true,
        message: `Task added: "${task}"`,
        entry: {
          id: entry.id,
          tasks: entry.tasks,
        },
      }
    },
  },
  // Board/Ticket tools
  {
    name: 'get_my_boards',
    description: 'Get a list of boards the user has access to.',
    requiredPermission: PERMISSIONS.BOARD_VIEW,
    parameters: {
      type: 'object',
      properties: {},
    },
    execute: async (_params, user) => {
      const boards = await boardService.findByUserId(user.id)
      
      return {
        success: true,
        boards: boards.map((b) => ({
          id: b.id,
          name: b.name,
          prefix: b.prefix,
          type: b.type,
        })),
        count: boards.length,
      }
    },
  },
  {
    name: 'get_board_by_name',
    description: 'Find a board by its name. Use this when the user specifies a board by name instead of ID. Returns the board ID if found.',
    requiredPermission: PERMISSIONS.BOARD_VIEW,
    parameters: {
      type: 'object',
      properties: {
        boardName: {
          type: 'string',
          description: 'The name of the board to find (case-insensitive partial match)',
        },
      },
      required: ['boardName'],
    },
    execute: async (params, user) => {
      const { boardName } = params as { boardName: string }
      const boards = await boardService.findByUserId(user.id)
      
      // Case-insensitive partial match
      const searchTerm = boardName.toLowerCase()
      const matchingBoards = boards.filter((b) => 
        b.name.toLowerCase().includes(searchTerm)
      )
      
      if (matchingBoards.length === 0) {
        return {
          success: false,
          message: `No board found matching "${boardName}"`,
          availableBoards: boards.map((b) => ({ id: b.id, name: b.name, type: b.type })),
        }
      }
      
      if (matchingBoards.length === 1) {
        const board = matchingBoards[0]
        return {
          success: true,
          board: {
            id: board.id,
            name: board.name,
            prefix: board.prefix,
            type: board.type,
          },
        }
      }
      
      // Multiple matches - return all
      return {
        success: true,
        message: `Found ${matchingBoards.length} boards matching "${boardName}"`,
        boards: matchingBoards.map((b) => ({
          id: b.id,
          name: b.name,
          prefix: b.prefix,
          type: b.type,
        })),
      }
    },
  },
  {
    name: 'create_ticket',
    description: 'Create a new ticket on a board. IMPORTANT: Before calling this, you MUST first call get_my_boards or get_board_by_name to get the board ID. Never ask the user for a board ID directly - always fetch boards first and let them choose by name.',
    requiredPermission: PERMISSIONS.BOARD_CREATE,
    parameters: {
      type: 'object',
      properties: {
        boardId: {
          type: 'string',
          description: 'The ID of the board (get this from get_my_boards or get_board_by_name, never ask user for ID)',
        },
        title: {
          type: 'string',
          description: 'The title of the ticket',
        },
        ticketType: {
          type: 'string',
          description: 'The type of ticket',
          enum: ['task', 'bug', 'story', 'epic'],
        },
        description: {
          type: 'string',
          description: 'Optional description of the ticket',
        },
        priority: {
          type: 'string',
          description: 'Priority level',
          enum: ['lowest', 'low', 'medium', 'high', 'highest'],
        },
      },
      required: ['boardId', 'title', 'ticketType'],
    },
    execute: async (params, user) => {
      const { boardId, title, ticketType, description, priority } = params as {
        boardId: string
        title: string
        ticketType: 'task' | 'bug' | 'story' | 'epic'
        description?: string
        priority?: 'lowest' | 'low' | 'medium' | 'high' | 'highest'
      }
      
      // Get board to find first column
      const board = await boardService.findById(boardId)
      if (!board) {
        return {
          success: false,
          message: 'Board not found',
        }
      }
      
      const ticket = await ticketService.create(
        {
          boardId,
          ticketType,
          title,
          description: description ? { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: description }] }] } : {},
          priority: priority || 'medium',
          columnId: board.columns[0]?.id,
          rank: `rank_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          reporterId: user.id,
        },
        user.id
      )
      
      return {
        success: true,
        message: `Created ${ticketType} "${title}" (${ticket.ticketKey})`,
        ticket: {
          id: ticket.id,
          ticketKey: ticket.ticketKey,
          title: ticket.title,
          ticketType: ticket.ticketType,
        },
      }
    },
  },
  {
    name: 'get_board_members',
    description: 'Get all members of a board who can be assigned to tickets.',
    requiredPermission: PERMISSIONS.BOARD_VIEW,
    parameters: {
      type: 'object',
      properties: {
        boardId: {
          type: 'string',
          description: 'The ID of the board',
        },
      },
      required: ['boardId'],
    },
    execute: async (params, _user) => {
      const { boardId } = params as { boardId: string }
      
      const board = await boardService.findById(boardId)
      if (!board) {
        return {
          success: false,
          message: 'Board not found',
        }
      }
      
      // Get user details for each member
      const membersWithDetails = await Promise.all(
        board.members.map(async (member) => {
          const user = await userService.getPublicProfile(member.userId)
          return {
            userId: member.userId,
            name: user?.name || 'Unknown',
            email: user?.email,
            role: member.role,
          }
        })
      )
      
      return {
        success: true,
        boardName: board.name,
        members: membersWithDetails,
        count: membersWithDetails.length,
      }
    },
  },
  {
    name: 'assign_ticket',
    description: 'Assign a ticket to a user. Use the ticket key (like TB-1) or ticket ID.',
    requiredPermission: PERMISSIONS.BOARD_UPDATE,
    parameters: {
      type: 'object',
      properties: {
        ticketKey: {
          type: 'string',
          description: 'The ticket key (e.g., TB-1) or ticket ID',
        },
        assigneeId: {
          type: 'string',
          description: 'The user ID to assign the ticket to. Use "me" to assign to the current user.',
        },
      },
      required: ['ticketKey', 'assigneeId'],
    },
    execute: async (params, user) => {
      const { ticketKey, assigneeId } = params as { ticketKey: string; assigneeId: string }
      
      // Resolve "me" to current user
      const resolvedAssigneeId = assigneeId === 'me' ? user.id : assigneeId
      
      // Find ticket by key or ID
      let ticket = await ticketRepository.findByTicketKey(ticketKey)
      if (!ticket) {
        ticket = await ticketRepository.findById(ticketKey)
      }
      
      if (!ticket) {
        return {
          success: false,
          message: `Ticket "${ticketKey}" not found`,
        }
      }
      
      // Get assignee name for confirmation
      const assignee = await userService.getPublicProfile(resolvedAssigneeId)
      if (!assignee) {
        return {
          success: false,
          message: 'User not found',
        }
      }
      
      // Update the ticket
      await ticketService.updateTicket(ticket.id, { assigneeId: resolvedAssigneeId }, user.id)
      
      return {
        success: true,
        message: `Assigned ${ticket.ticketKey} to ${assignee.name}`,
        ticket: {
          ticketKey: ticket.ticketKey,
          title: ticket.title,
          assignee: assignee.name,
        },
      }
    },
  },
  {
    name: 'get_projects_for_timer',
    description: 'Get all available projects that can be selected when starting a timer. Use this to show clickable project options to the user.',
    requiredPermission: PERMISSIONS.TIME_ENTRY_CREATE,
    parameters: {
      type: 'object',
      properties: {},
    },
    execute: async (_params, _user) => {
      const projects = await projectService.findAll()

      return {
        success: true,
        projects: projects.map((p) => ({
          id: p.id,
          name: p.name,
        })),
        count: projects.length,
        message: projects.length > 0
          ? `Found ${projects.length} available projects for time tracking`
          : 'No projects available. You may need to create some projects first.',
      }
    },
  },
  {
    name: 'start_timer_with_projects',
    description: 'Start a timer with selected projects. Use this when the user provides project names in a structured format.',
    requiredPermission: PERMISSIONS.TIME_ENTRY_CREATE,
    parameters: {
      type: 'object',
      properties: {
        projects: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of selected project names',
        },
        task: {
          type: 'string',
          description: 'Description of the task being worked on',
        },
        isOvertime: {
          type: 'boolean',
          description: 'Whether this is overtime work (default: false)',
        },
      },
      required: ['projects'],
    },
    execute: async (params, user) => {
      const { projects, task, isOvertime } = params as {
        projects: string[]
        task?: string
        isOvertime?: boolean
      }
      return startTimerWithFirstProject(user.id, projects, task, isOvertime)
    },
  },
  {
    name: 'get_current_user',
    description: 'Get information about the current user (yourself).',
    requiredPermission: PERMISSIONS.AI_ASSISTANT_ACCESS,
    parameters: {
      type: 'object',
      properties: {},
    },
    execute: async (_params, user) => {
      const profile = await userService.getPublicProfile(user.id)
      
      return {
        success: true,
        user: {
          id: user.id,
          name: profile?.name || user.name,
          email: profile?.email,
        },
      }
    },
  },
]

/**
 * Filter tools based on user's permissions
 */
export function getAvailableTools(user: AuthUser): AITool[] {
  return AI_TOOLS.filter((tool) => {
    const perms = Array.isArray(tool.requiredPermission)
      ? tool.requiredPermission
      : [tool.requiredPermission]
    return perms.every((perm) => hasPermission(user, perm))
  })
}

/**
 * Convert our tool definitions to OpenAI function format (used by OpenRouter)
 */
export function toOpenAITools(tools: AITool[]): OpenAITool[] {
  return tools.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties: tool.parameters.properties,
        required: tool.parameters.required,
      },
    },
  }))
}

/**
 * Find a tool by name
 */
export function findTool(name: string): AITool | undefined {
  return AI_TOOLS.find((t) => t.name === name)
}

/**
 * Check if user can use a specific tool
 */
export function canUseTool(user: AuthUser, toolName: string): boolean {
  const tool = findTool(toolName)
  if (!tool) return false
  
  const perms = Array.isArray(tool.requiredPermission)
    ? tool.requiredPermission
    : [tool.requiredPermission]
  return perms.every((perm) => hasPermission(user, perm))
}

