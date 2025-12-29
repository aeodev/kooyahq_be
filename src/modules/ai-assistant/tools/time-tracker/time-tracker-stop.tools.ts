import type { AITool } from '../../ai-assistant.types'
import { PERMISSIONS } from '../../../auth/rbac/permissions'
import { TimeEntryService } from '../../../time-tracker/time-entry.service'

const timeEntryService = new TimeEntryService()

export const stopTimerTool: AITool = {
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
}

