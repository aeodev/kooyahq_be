import type { AITool } from '../../ai-assistant.types'
import { PERMISSIONS } from '../../../auth/rbac/permissions'
import { TimeEntryService } from '../../../time-tracker/time-entry.service'
import { projectService } from '../../../projects/project.service'

const timeEntryService = new TimeEntryService()

export const switchTimerProjectTool: AITool = {
  name: 'switch_timer_project',
  description: 'Switch the active timer to a different project. Stops the current timer and starts a new one for the new project.',
  requiredPermission: PERMISSIONS.TIME_ENTRY_UPDATE,
  parameters: {
    type: 'object',
    properties: {
      project: {
        type: 'string',
        description: 'The project name to switch to',
      },
      task: {
        type: 'string',
        description: 'Optional task description for the new timer',
      },
    },
    required: ['project'],
  },
  execute: async (params, user) => {
    const { project, task } = params as { project: string; task?: string }
    
    // Get active timer to preserve overtime status
    const activeTimer = await timeEntryService.getActiveTimer(user.id)
    if (!activeTimer) {
      return {
        success: false,
        message: 'No active timer found',
      }
    }
    
    // Verify project exists
    const projects = await projectService.findAll()
    const projectExists = projects.some(p => p.name === project)
    if (!projectExists) {
      return {
        success: false,
        message: `Project "${project}" not found`,
        availableProjects: projects.map(p => p.name),
      }
    }
    
    // Stop current timer (saves time entry)
    await timeEntryService.stopTimer(user.id)
    
    // Start new timer with new project
    const newTimer = await timeEntryService.startTimer(user.id, {
      projects: [project],
      task: task || 'Started working',
      isOvertime: activeTimer.isOvertime || false,
    })
    
    return {
      success: true,
      message: `Switched from ${activeTimer.projects[0]} to ${project}`,
      entry: {
        id: newTimer.id,
        projects: newTimer.projects,
        task: newTimer.tasks?.[0]?.text || '',
      },
    }
  },
}

