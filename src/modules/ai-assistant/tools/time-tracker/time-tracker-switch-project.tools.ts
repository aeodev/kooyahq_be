import type { AITool } from '../../ai-assistant.types'
import { PERMISSIONS } from '../../../auth/rbac/permissions'
import { TimeEntryService } from '../../../time-tracker/time-entry.service'
import { projectService } from '../../../projects/project.service'
import { findClosestProject } from '../utils'

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
    
    // Find the closest matching project
    const matchedProject = await findClosestProject(project)
    
    if (!matchedProject) {
      // Get all available projects for error message
      const allProjects = await projectService.findAll()
      return {
        success: false,
        message: `Project "${project}" not found. Available projects: ${allProjects.map(p => p.name).join(', ')}`,
        availableProjects: allProjects.map(p => p.name),
      }
    }
    
    const matchedProjectName = matchedProject.name
    
    // Stop current timer (saves time entry)
    await timeEntryService.stopTimer(user.id)
    
    // Start new timer with new project
    const newTimer = await timeEntryService.startTimer(user.id, {
      projects: [matchedProjectName],
      task: task || 'Started working',
      isOvertime: activeTimer.isOvertime || false,
    })
    
    // If the matched project name differs from input, indicate the correction
    const correctionText = matchedProjectName.toLowerCase() !== project.toLowerCase()
      ? ` (matched "${matchedProjectName}" from "${project}")`
      : ''
    
    return {
      success: true,
      message: `Switched from ${activeTimer.projects[0]} to ${matchedProjectName}${correctionText}`,
      entry: {
        id: newTimer.id,
        projects: newTimer.projects,
        task: newTimer.tasks?.[0]?.text || '',
      },
    }
  },
}

