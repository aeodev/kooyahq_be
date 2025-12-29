import type { AITool } from '../../ai-assistant.types'
import { PERMISSIONS } from '../../../auth/rbac/permissions'
import { TimeEntryService } from '../../../time-tracker/time-entry.service'

const timeEntryService = new TimeEntryService()

export const getActiveTimerTool: AITool = {
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
}

