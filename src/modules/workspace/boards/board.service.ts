import { boardRepository } from './board.repository'
import type { Board, CreateBoardInput } from './board.model'

const DEFAULT_KANBAN_COLUMNS = [
  { id: 'col_todo', name: 'To Do', order: 0, isDoneColumn: false },
  { id: 'col_doing', name: 'Doing', order: 1, isDoneColumn: false },
  { id: 'col_done', name: 'Done', order: 2, isDoneColumn: true },
]

const DEFAULT_SPRINT_COLUMNS = [
  { id: 'col_backlog', name: 'Backlog', order: 0, isDoneColumn: false },
  { id: 'col_sprint', name: 'Sprint', order: 1, isDoneColumn: false },
  { id: 'col_review', name: 'Review', order: 2, isDoneColumn: false },
  { id: 'col_done', name: 'Done', order: 3, isDoneColumn: true },
]

/**
 * Generate a unique board prefix from the board name
 * Takes first letters of each word, max 10 characters
 */
function generateBoardPrefix(name: string): string {
  const prefix = name
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase())
    .join('')
    .substring(0, 10)

  return prefix || 'BOARD'
}

/**
 * Validate prefix uniqueness, including checking deleted boards
 */
async function validatePrefixUniqueness(
  workspaceId: string,
  prefix: string,
  excludeBoardId?: string,
): Promise<{ isValid: boolean; isDeleted: boolean; message?: string }> {
  const normalizedPrefix = prefix.toUpperCase()
  
  // Check for existing active board with this prefix
  const activeBoard = await boardRepository.findByPrefix(workspaceId, normalizedPrefix)
  if (activeBoard && activeBoard.id !== excludeBoardId) {
    return {
      isValid: false,
      isDeleted: false,
      message: `A board with key "${normalizedPrefix}" already exists`,
    }
  }

  // Check for deleted board with this prefix
  const deletedBoard = await boardRepository.findByPrefixIncludingDeleted(workspaceId, normalizedPrefix)
  if (deletedBoard && deletedBoard.id !== excludeBoardId && deletedBoard.deletedAt) {
    return {
      isValid: false,
      isDeleted: true,
      message: `A deleted board with key "${normalizedPrefix}" exists. Please choose a different key.`,
    }
  }

  return { isValid: true, isDeleted: false }
}

/**
 * Generate a unique board prefix, checking for conflicts within workspace
 */
async function generateUniquePrefix(
  workspaceId: string,
  name: string,
  existingPrefix?: string,
): Promise<string> {
  if (existingPrefix) {
    // Validate the provided prefix
    const validation = await validatePrefixUniqueness(workspaceId, existingPrefix)
    if (validation.isValid) {
      return existingPrefix.toUpperCase()
    }
    // If invalid, continue to generate a new one
  }

  // Generate from name
  let basePrefix = generateBoardPrefix(name)
  let prefix = basePrefix
  let counter = 1

  // Check for conflicts and append number if needed
  while (await boardRepository.findByPrefix(workspaceId, prefix)) {
    prefix = `${basePrefix}${counter}`.substring(0, 10)
    counter++
  }

  return prefix.toUpperCase()
}

export class BoardService {
  async create(data: CreateBoardInput): Promise<Board> {
    // Boards start empty - no default columns
    const columns = data.columns || []

    // Validate prefix if provided
    if (data.prefix) {
      const validation = await validatePrefixUniqueness(data.workspaceId, data.prefix)
      if (!validation.isValid) {
        const error = new Error(validation.message || 'Prefix is not unique')
        ;(error as any).statusCode = 409
        ;(error as any).isDeleted = validation.isDeleted
        throw error
      }
    }

    // Generate unique prefix if not provided
    const prefix = await generateUniquePrefix(data.workspaceId, data.name, data.prefix)

    // Set default settings if not provided
    const settings = data.settings || {
      defaultView: 'board' as const,
      showSwimlanes: false,
    }

    // Boards don't have members - they use workspace membership
    const members: any[] = []

    try {
      return await boardRepository.create({
        ...data,
        prefix,
        columns,
        settings,
        members,
        createdBy: data.createdBy,
      })
    } catch (error: any) {
      // Handle MongoDB duplicate key error
      if (error.code === 11000 || error.message?.includes('duplicate')) {
        const validation = await validatePrefixUniqueness(data.workspaceId, prefix)
        const err = new Error(
          validation.isDeleted
            ? `A deleted board with key "${prefix}" exists. Please choose a different key.`
            : `A board with key "${prefix}" already exists`
        )
        ;(err as any).statusCode = 409
        ;(err as any).isDeleted = validation.isDeleted
        throw err
      }
      throw error
    }
  }

  async findByWorkspaceId(
    workspaceId: string,
    type?: 'kanban' | 'sprint',
  ): Promise<Board[]> {
    return boardRepository.findByWorkspaceId(workspaceId, type)
  }

  async findById(id: string): Promise<Board | null> {
    return boardRepository.findById(id)
  }

  async findByPrefix(workspaceId: string, prefix: string): Promise<Board | null> {
    return boardRepository.findByPrefix(workspaceId, prefix)
  }

  async update(
    id: string,
    updates: Partial<{
      name: string
      description: string
      prefix: string
      emoji: string
      type: 'kanban' | 'sprint'
      settings: {
        defaultView: 'board' | 'list' | 'timeline'
        showSwimlanes: boolean
      }
      columns: Array<{
        id: string
        name: string
        order: number
        hexColor?: string
        wipLimit?: number
        isDoneColumn: boolean
      }>
      members: Array<{
        userId: string
        role: 'admin' | 'member' | 'viewer'
        joinedAt: Date
      }>
    }>,
  ): Promise<Board | null> {
    // Validate prefix if being updated
    if (updates.prefix) {
      const currentBoard = await this.findById(id)
      if (!currentBoard) {
        return null
      }

      const validation = await validatePrefixUniqueness(
        currentBoard.workspaceId,
        updates.prefix,
        id
      )
      if (!validation.isValid) {
        const error = new Error(validation.message || 'Prefix is not unique')
        ;(error as any).statusCode = 409
        ;(error as any).isDeleted = validation.isDeleted
        throw error
      }
    }

    try {
      return await boardRepository.update(id, updates)
    } catch (error: any) {
      // Handle MongoDB duplicate key error
      if (error.code === 11000 || error.message?.includes('duplicate')) {
        const currentBoard = await this.findById(id)
        if (currentBoard && updates.prefix) {
          const validation = await validatePrefixUniqueness(
            currentBoard.workspaceId,
            updates.prefix,
            id
          )
          const err = new Error(
            validation.isDeleted
              ? `A deleted board with key "${updates.prefix.toUpperCase()}" exists. Please choose a different key.`
              : `A board with key "${updates.prefix.toUpperCase()}" already exists`
          )
          ;(err as any).statusCode = 409
          ;(err as any).isDeleted = validation.isDeleted
          throw err
        }
      }
      throw error
    }
  }

  async delete(id: string): Promise<boolean> {
    return boardRepository.softDelete(id)
  }
}

export const boardService = new BoardService()
