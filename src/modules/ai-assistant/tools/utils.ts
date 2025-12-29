import { PERMISSIONS, hasPermission, type AuthUser } from '../../auth/rbac/permissions'
import { TimeEntryService } from '../../time-tracker/time-entry.service'
import { projectService } from '../../projects/project.service'
import type { AITool, OpenAITool } from '../ai-assistant.types'

const timeEntryService = new TimeEntryService()

export function validateProjects(projects: unknown): string[] {
  const validProjects = (Array.isArray(projects) ? projects : [projects])
    .filter((p): p is string => p != null && typeof p === 'string' && p.trim().length > 0)
    .map(p => p.trim())
  return validProjects
}

export async function startTimerWithFirstProject(
  userId: string,
  projects: unknown,
  task: string | undefined,
  isOvertime: boolean | undefined
) {
  const validProjects = validateProjects(projects)
  
  if (validProjects.length === 0) {
    return {
      success: false,
      error: 'At least one valid project name is required',
    }
  }

  const firstProject = validProjects[0]
  const finalTask = task?.trim() || 'Started working'
  const entry = await timeEntryService.startTimer(userId, {
    projects: [firstProject],
    task: finalTask,
    isOvertime: isOvertime ?? false,
  })

  const additionalProjectsText = validProjects.length > 1 
    ? ` (${validProjects.length - 1} more project${validProjects.length > 2 ? 's' : ''} available)`
    : ''

  return {
    success: true,
    message: `Timer started for ${firstProject}${additionalProjectsText}`,
    entry: {
      id: entry.id,
      projects: entry.projects,
      task: entry.tasks?.[0]?.text || '',
      startTime: entry.startTime,
    },
  }
}

/**
 * Filter tools based on user's permissions
 */
export function getAvailableTools(tools: AITool[], user: AuthUser): AITool[] {
  return tools.filter((tool) => {
    const perms = Array.isArray(tool.requiredPermission)
      ? tool.requiredPermission
      : [tool.requiredPermission]
    return perms.every((perm) => hasPermission(user, perm))
  })
}

/**
 * Convert our tool definitions to OpenAI function format (used by OpenRouter)
 */
export function toOpenAITools(tools: AITool[]): OpenAITool[] {
  return tools.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties: tool.parameters.properties,
        required: tool.parameters.required,
      },
    },
  }))
}

/**
 * Find a tool by name
 */
export function findTool(tools: AITool[], name: string): AITool | undefined {
  return tools.find((t) => t.name === name)
}

/**
 * Check if user can use a specific tool
 */
export function canUseTool(tools: AITool[], user: AuthUser, toolName: string): boolean {
  const tool = findTool(tools, toolName)
  if (!tool) return false
  
  const perms = Array.isArray(tool.requiredPermission)
    ? tool.requiredPermission
    : [tool.requiredPermission]
  return perms.every((perm) => hasPermission(user, perm))
}

