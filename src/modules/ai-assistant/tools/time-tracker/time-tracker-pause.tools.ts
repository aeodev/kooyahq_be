import type { AITool } from '../../ai-assistant.types'
import { PERMISSIONS } from '../../../auth/rbac/permissions'
import { TimeEntryService } from '../../../time-tracker/time-entry.service'

const timeEntryService = new TimeEntryService()

export const pauseTimerTool: AITool = {
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
}

