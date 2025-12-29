import type { AITool } from '../../ai-assistant.types'
import { PERMISSIONS } from '../../../auth/rbac/permissions'
import { startTimerWithFirstProject } from '../utils'

export const startTimerTool: AITool = {
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
}

