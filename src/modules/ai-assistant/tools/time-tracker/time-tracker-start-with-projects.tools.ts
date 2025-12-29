import type { AITool } from '../../ai-assistant.types'
import { PERMISSIONS } from '../../../auth/rbac/permissions'
import { startTimerWithFirstProject } from '../utils'

export const startTimerWithProjectsTool: AITool = {
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
}

