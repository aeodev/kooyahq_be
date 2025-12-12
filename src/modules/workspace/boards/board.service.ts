import { boardRepository } from './board.repository'
import { DEFAULT_WORKSPACE_ID, type Board, type BoardMember, type CreateBoardInput } from './board.model'

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
  prefix: string,
  excludeBoardId?: string,
): Promise<{ isValid: boolean; isDeleted: boolean; message?: string }> {
  const normalizedPrefix = prefix.toUpperCase()
  const workspaceId = DEFAULT_WORKSPACE_ID
  
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
  name: string,
  existingPrefix?: string,
): Promise<string> {
  const workspaceId = DEFAULT_WORKSPACE_ID
  if (existingPrefix) {
    // Validate the provided prefix
    const validation = await validatePrefixUniqueness(existingPrefix)
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

export function normalizeBoardMembers(
  rawMembers: Array<Partial<BoardMember> | string> | undefined,
  creatorId: string,
  existingMembers: Array<BoardMember | { userId: string; role: 'admin' | 'member' | 'viewer'; joinedAt: string | Date }> = [],
): BoardMember[] {
  const now = new Date()
  const previousMembers = new Map(
    existingMembers.map((member) => [member.userId, { ...member, joinedAt: new Date(member.joinedAt) }]),
  )

  const normalizedMembers = new Map<string, BoardMember>()

  const source = Array.isArray(rawMembers) ? rawMembers : []
  source.forEach((member) => {
    const userId = typeof member === 'string' ? member : member?.userId
    if (!userId) return

    const providedRole = typeof member === 'string' ? undefined : (member as BoardMember)?.role
    const role: BoardMember['role'] =
      providedRole === 'admin' || providedRole === 'viewer' ? providedRole : 'member'

    const previous = previousMembers.get(userId)
    const joinedAt =
      typeof (member as BoardMember)?.joinedAt === 'string' || (member as BoardMember)?.joinedAt instanceof Date
        ? new Date((member as BoardMember).joinedAt as any)
        : previous?.joinedAt || now

    normalizedMembers.set(userId, {
      userId,
      role: previous?.role ?? role,
      joinedAt,
    })
  })

  // Ensure creator is always an admin member
  const creatorExisting = normalizedMembers.get(creatorId) || previousMembers.get(creatorId)
  normalizedMembers.set(creatorId, {
    userId: creatorId,
    role: 'admin',
    joinedAt: creatorExisting?.joinedAt || now,
  })

  return Array.from(normalizedMembers.values())
}

export class BoardService {
  async create(data: CreateBoardInput): Promise<Board> {
    const workspaceId = data.workspaceId || DEFAULT_WORKSPACE_ID
    // Boards start empty - no default columns
    const columns = data.columns || []

    // Validate prefix if provided
    if (data.prefix) {
      const validation = await validatePrefixUniqueness(data.prefix)
      if (!validation.isValid) {
        const error = new Error(validation.message || 'Prefix is not unique')
        ;(error as any).statusCode = 409
        ;(error as any).isDeleted = validation.isDeleted
        throw error
      }
    }

    // Generate unique prefix if not provided
    const prefix = await generateUniquePrefix(data.name, data.prefix)

    // Set default settings if not provided
    const settings = data.settings || {
      defaultView: 'board' as const,
      showSwimlanes: false,
      ticketDetailsSettings: {
        fieldConfigs: [
          { fieldName: 'priority', isVisible: true, order: 0 },
          { fieldName: 'assignee', isVisible: true, order: 1 },
          { fieldName: 'tags', isVisible: true, order: 2 },
          { fieldName: 'parent', isVisible: true, order: 3 },
          { fieldName: 'dueDate', isVisible: true, order: 4 },
          { fieldName: 'startDate', isVisible: true, order: 5 },
          { fieldName: 'endDate', isVisible: true, order: 6 },
        ],
      },
    }

    const members = normalizeBoardMembers(data.members, data.createdBy)

    try {
      return await boardRepository.create({
        ...data,
        workspaceId,
        prefix,
        columns,
        settings,
        members,
        createdBy: data.createdBy,
      })
    } catch (error: any) {
      // Handle MongoDB duplicate key error
      if (error.code === 11000 || error.message?.includes('duplicate')) {
        const validation = await validatePrefixUniqueness(prefix)
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
    workspaceId?: string,
    type?: 'kanban' | 'sprint',
  ): Promise<Board[]> {
    return boardRepository.findByWorkspaceId(workspaceId || DEFAULT_WORKSPACE_ID, type)
  }

  async findById(id: string): Promise<Board | null> {
    return boardRepository.findById(id)
  }

  async findByPrefix(workspaceId: string | undefined, prefix: string): Promise<Board | null> {
    return boardRepository.findByPrefix(workspaceId || DEFAULT_WORKSPACE_ID, prefix)
  }

  async findByPrefixAnyWorkspace(prefix: string): Promise<Board | null> {
    return boardRepository.findByPrefixAnyWorkspace(prefix)
  }

  async findByUserId(userId: string): Promise<Board[]> {
    return boardRepository.findByUserId(userId)
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
    let currentBoard: Board | null = null
    // Validate prefix if being updated
    if (updates.prefix) {
      currentBoard = await this.findById(id)
      if (!currentBoard) {
        return null
      }

      const validation = await validatePrefixUniqueness(updates.prefix, id)
      if (!validation.isValid) {
        const error = new Error(validation.message || 'Prefix is not unique')
        ;(error as any).statusCode = 409
        ;(error as any).isDeleted = validation.isDeleted
        throw error
      }
    }

    // Normalize members if provided
    const normalizedUpdates = { ...updates }
    if (updates.members) {
      currentBoard = currentBoard ?? await this.findById(id)
      const creatorId = currentBoard?.createdBy || (updates.members[0] as any)?.userId || ''
      normalizedUpdates.members = normalizeBoardMembers(updates.members as any, creatorId, currentBoard?.members)
    }

    try {
      return await boardRepository.update(id, normalizedUpdates)
    } catch (error: any) {
      // Handle MongoDB duplicate key error
      if (error.code === 11000 || error.message?.includes('duplicate')) {
        currentBoard = currentBoard ?? await this.findById(id)
        if (currentBoard && normalizedUpdates.prefix) {
          const validation = await validatePrefixUniqueness(normalizedUpdates.prefix, id)
          const err = new Error(
            validation.isDeleted
              ? `A deleted board with key "${normalizedUpdates.prefix.toUpperCase()}" exists. Please choose a different key.`
              : `A board with key "${normalizedUpdates.prefix.toUpperCase()}" already exists`
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
