import type { AITool } from '../../ai-assistant.types'
import { PERMISSIONS } from '../../../auth/rbac/permissions'
import { TimeEntryService } from '../../../time-tracker/time-entry.service'

const timeEntryService = new TimeEntryService()

export const resumeTimerTool: AITool = {
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
}

