import type { AITool } from '../../ai-assistant.types'
import { PERMISSIONS } from '../../../auth/rbac/permissions'
import { TimeEntryService } from '../../../time-tracker/time-entry.service'

const timeEntryService = new TimeEntryService()

export const addTaskToTimerTool: AITool = {
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
}

