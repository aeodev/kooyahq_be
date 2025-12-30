import { PERMISSIONS, hasPermission, type AuthUser } from '../../auth/rbac/permissions'
import { TimeEntryService } from '../../time-tracker/time-entry.service'
import { projectService } from '../../projects/project.service'
import type { AITool, OpenAITool } from '../ai-assistant.types'

const timeEntryService = new TimeEntryService()

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length
  const len2 = str2.length
  const matrix: number[][] = []

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + 1
        )
      }
    }
  }

  return matrix[len1][len2]
}

/**
 * Calculate similarity score between two strings (0-1, where 1 is identical)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase())
  const maxLength = Math.max(str1.length, str2.length)
  if (maxLength === 0) return 1
  return 1 - distance / maxLength
}

/**
 * Find the closest matching project name from available projects
 */
export async function findClosestProject(projectName: string): Promise<{ name: string; similarity: number } | null> {
  const projects = await projectService.findAll()
  if (projects.length === 0) return null

  const normalizedInput = projectName.toLowerCase().trim()
  
  // First, try exact match (case-insensitive)
  const exactMatch = projects.find(p => p.name.toLowerCase() === normalizedInput)
  if (exactMatch) {
    return { name: exactMatch.name, similarity: 1 }
  }

  // Try partial match (contains)
  const partialMatch = projects.find(p => 
    p.name.toLowerCase().includes(normalizedInput) || 
    normalizedInput.includes(p.name.toLowerCase())
  )
  if (partialMatch) {
    return { name: partialMatch.name, similarity: 0.8 }
  }

  // Calculate similarity for all projects
  const similarities = projects.map(project => ({
    name: project.name,
    similarity: calculateSimilarity(normalizedInput, project.name),
  }))

  // Sort by similarity (highest first)
  similarities.sort((a, b) => b.similarity - a.similarity)

  // Return the best match if similarity is above threshold (0.5)
  const bestMatch = similarities[0]
  if (bestMatch && bestMatch.similarity >= 0.5) {
    return bestMatch
  }

  return null
}

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

  const inputProjectName = validProjects[0]
  
  // Find the closest matching project
  const matchedProject = await findClosestProject(inputProjectName)
  
  if (!matchedProject) {
    // Get all available projects for error message
    const allProjects = await projectService.findAll()
    return {
      success: false,
      error: `Project "${inputProjectName}" not found. Available projects: ${allProjects.map(p => p.name).join(', ')}`,
      availableProjects: allProjects.map(p => p.name),
    }
  }

  const matchedProjectName = matchedProject.name
  const finalTask = task?.trim() || 'Started working'
  
  const entry = await timeEntryService.startTimer(userId, {
    projects: [matchedProjectName],
    task: finalTask,
    isOvertime: isOvertime ?? false,
  })

  const additionalProjectsText = validProjects.length > 1 
    ? ` (${validProjects.length - 1} more project${validProjects.length > 2 ? 's' : ''} available)`
    : ''
  
  // If the matched project name differs from input, indicate the correction
  const correctionText = matchedProjectName.toLowerCase() !== inputProjectName.toLowerCase()
    ? ` (matched "${matchedProjectName}" from "${inputProjectName}")`
    : ''

  return {
    success: true,
    message: `Timer started for ${matchedProjectName}${correctionText}${additionalProjectsText}`,
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


