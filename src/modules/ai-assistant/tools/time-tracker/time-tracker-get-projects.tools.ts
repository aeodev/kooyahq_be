import type { AITool } from '../../ai-assistant.types'
import { PERMISSIONS } from '../../../auth/rbac/permissions'
import { projectService } from '../../../projects/project.service'

export const getProjectsForTimerTool: AITool = {
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
}

