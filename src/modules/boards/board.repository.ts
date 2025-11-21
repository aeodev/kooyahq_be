import { BoardModel, toBoard, type Board, type Sprint, type CreateBoardInput } from './board.model'

export class BoardRepository {
  async create(data: CreateBoardInput): Promise<Board> {
    const board = await BoardModel.create(data)
    return toBoard(board)
  }

  async findByOwnerId(ownerId: string, type?: 'kanban' | 'sprint'): Promise<Board[]> {
    const query: any = {
      $or: [{ ownerId }, { memberIds: ownerId }],
    }
    if (type) {
      query.type = type
    }
    const boards = await BoardModel.find(query).sort({ updatedAt: -1 })
    return boards.map(toBoard)
  }

  async findById(id: string): Promise<Board | null> {
    const board = await BoardModel.findById(id)
    return board ? toBoard(board) : null
  }

  async update(
    id: string,
    updates: Partial<{
      name: string
      memberIds: string[]
      columns: string[]
      columnLimits: Record<string, number>
      sprintStartDate: Date
      sprintEndDate: Date
      sprintGoal: string
    }>,
  ): Promise<Board | null> {
    const board = await BoardModel.findByIdAndUpdate(id, updates, { new: true })
    return board ? toBoard(board) : null
  }

  async delete(id: string): Promise<boolean> {
    const result = await BoardModel.deleteOne({ _id: id })
    return result.deletedCount === 1
  }

  // Sprint Methods

  async addSprint(boardId: string, sprint: any): Promise<Board | null> {
    const board = await BoardModel.findByIdAndUpdate(
      boardId,
      { $push: { sprints: sprint } },
      { new: true },
    )
    return board ? toBoard(board) : null
  }

  async updateSprint(
    boardId: string,
    sprintId: string,
    updates: Partial<Sprint>,
  ): Promise<Board | null> {
    // Construct the update object dynamically
    const updateQuery: any = {}
    for (const [key, value] of Object.entries(updates)) {
      updateQuery[`sprints.$.${key}`] = value
    }
    updateQuery[`sprints.$.updatedAt`] = new Date()

    const board = await BoardModel.findOneAndUpdate(
      { _id: boardId, 'sprints._id': sprintId },
      { $set: updateQuery },
      { new: true },
    )
    return board ? toBoard(board) : null
  }

  async deleteSprint(boardId: string, sprintId: string): Promise<Board | null> {
    const board = await BoardModel.findByIdAndUpdate(
      boardId,
      { $pull: { sprints: { _id: sprintId } } },
      { new: true },
    )
    return board ? toBoard(board) : null
  }
}

export const boardRepository = new BoardRepository()
