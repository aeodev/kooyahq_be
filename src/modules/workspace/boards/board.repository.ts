import { BoardModel, DEFAULT_WORKSPACE_ID, toBoard, type Board, type CreateBoardInput } from './board.model'

export class BoardRepository {
  async create(data: CreateBoardInput): Promise<Board> {
    const board = await BoardModel.create({
      ...data,
      workspaceId: data.workspaceId || DEFAULT_WORKSPACE_ID,
    })
    return toBoard(board)
  }

  async findByWorkspaceId(workspaceId?: string, type?: 'kanban' | 'sprint'): Promise<Board[]> {
    const targetWorkspaceId = workspaceId || DEFAULT_WORKSPACE_ID
    const query: any = {
      workspaceId: targetWorkspaceId,
      deletedAt: { $exists: false },
    }
    if (type) {
      query.type = type
    }
    const boards = await BoardModel.find(query).sort({ updatedAt: -1 })
    return boards.map(toBoard)
  }

  async findById(id: string): Promise<Board | null> {
    const board = await BoardModel.findOne({
      _id: id,
      deletedAt: { $exists: false },
    })
    return board ? toBoard(board) : null
  }

  async findByPrefix(workspaceId: string | undefined, prefix: string): Promise<Board | null> {
    const targetWorkspaceId = workspaceId || DEFAULT_WORKSPACE_ID
    const board = await BoardModel.findOne({
      workspaceId: targetWorkspaceId,
      prefix: prefix.toUpperCase(),
      deletedAt: { $exists: false },
    })
    return board ? toBoard(board) : null
  }

  async findByPrefixIncludingDeleted(workspaceId: string | undefined, prefix: string): Promise<Board | null> {
    const targetWorkspaceId = workspaceId || DEFAULT_WORKSPACE_ID
    const board = await BoardModel.findOne({
      workspaceId: targetWorkspaceId,
      prefix: prefix.toUpperCase(),
    })
    return board ? toBoard(board) : null
  }

  async findByPrefixAnyWorkspace(prefix: string): Promise<Board | null> {
    const board = await BoardModel.findOne({
      prefix: prefix.toUpperCase(),
      deletedAt: { $exists: false },
    })
    return board ? toBoard(board) : null
  }

  async findByUserId(userId: string): Promise<Board[]> {
    const boards = await BoardModel.find({
      deletedAt: { $exists: false },
      $or: [
        { createdBy: userId },
        { 'members.userId': userId },
      ],
    }).sort({ updatedAt: -1 })
    return boards.map(toBoard)
  }

  async findAll(type?: 'kanban' | 'sprint'): Promise<Board[]> {
    const query: any = {
      deletedAt: { $exists: false },
    }
    if (type) {
      query.type = type
    }
    const boards = await BoardModel.find(query).sort({ updatedAt: -1 })
    return boards.map(toBoard)
  }

  async findByIdIncludingDeleted(id: string): Promise<Board | null> {
    const board = await BoardModel.findById(id)
    return board ? toBoard(board) : null
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
    const board = await BoardModel.findOneAndUpdate(
      { _id: id, deletedAt: { $exists: false } },
      updates,
      { new: true },
    )
    return board ? toBoard(board) : null
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await BoardModel.findByIdAndUpdate(
      id,
      { deletedAt: new Date() },
      { new: true },
    )
    return !!result
  }

  async delete(id: string): Promise<boolean> {
    const result = await BoardModel.deleteOne({ _id: id })
    return result.deletedCount === 1
  }
}

export const boardRepository = new BoardRepository()
