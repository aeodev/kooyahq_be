import { BoardModel, toBoard, type Board } from './board.model'

export type CreateBoardInput = {
  name: string
  type: 'kanban' | 'sprint'
  ownerId: string
  memberIds?: string[]
  columns: string[]
  sprintStartDate?: Date
  sprintEndDate?: Date
  sprintGoal?: string
}

export type UpdateBoardInput = {
  name?: string
  memberIds?: string[]
  columns?: string[]
  sprintStartDate?: Date | null
  sprintEndDate?: Date | null
  sprintGoal?: string
}

export const boardRepository = {
  async create(input: CreateBoardInput): Promise<Board> {
    const doc = await BoardModel.create({
      name: input.name,
      type: input.type,
      ownerId: input.ownerId,
      memberIds: input.memberIds || [],
      columns: input.columns,
      sprintStartDate: input.sprintStartDate,
      sprintEndDate: input.sprintEndDate,
      sprintGoal: input.sprintGoal,
    })

    return toBoard(doc)
  },

  async findByOwnerId(ownerId: string, type?: 'kanban' | 'sprint'): Promise<Board[]> {
    const query: any = {
      $or: [{ ownerId }, { memberIds: ownerId }],
    }
    
    if (type) {
      query.type = type
    }
    
    const docs = await BoardModel.find(query)
      .sort({ createdAt: -1 })
      .exec()
    return docs.map((doc) => toBoard(doc))
  },

  async findById(id: string): Promise<Board | undefined> {
    const doc = await BoardModel.findById(id).exec()
    return doc ? toBoard(doc) : undefined
  },

  async update(id: string, updates: UpdateBoardInput): Promise<Board | undefined> {
    const updateData: any = { ...updates }
    if (updates.sprintStartDate === null) {
      updateData.$unset = { sprintStartDate: '' }
    }
    if (updates.sprintEndDate === null) {
      updateData.$unset = { ...updateData.$unset, sprintEndDate: '' }
    }
    const doc = await BoardModel.findByIdAndUpdate(id, updateData, { new: true }).exec()
    return doc ? toBoard(doc) : undefined
  },

  async delete(id: string): Promise<boolean> {
    const result = await BoardModel.findByIdAndDelete(id).exec()
    return !!result
  },
}

