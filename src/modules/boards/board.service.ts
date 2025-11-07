import { boardRepository, type CreateBoardInput } from './board.repository'

const DEFAULT_KANBAN_COLUMNS = ['To do', 'Doing', 'Done']
const DEFAULT_SPRINT_COLUMNS = ['Backlog', 'Sprint', 'Review', 'Done']

export const boardService = {
  getDefaultColumns(type: 'kanban' | 'sprint'): string[] {
    return type === 'kanban' ? DEFAULT_KANBAN_COLUMNS : DEFAULT_SPRINT_COLUMNS
  },

  async create(input: Omit<CreateBoardInput, 'columns'>) {
    const columns = this.getDefaultColumns(input.type)
    return boardRepository.create({
      ...input,
      columns,
    })
  },

  async findByOwnerId(ownerId: string) {
    return boardRepository.findByOwnerId(ownerId)
  },

  async findById(id: string) {
    return boardRepository.findById(id)
  },

  async update(id: string, updates: {
    name?: string
    memberIds?: string[]
    columns?: string[]
    columnLimits?: Record<string, number>
    sprintStartDate?: Date | null
    sprintEndDate?: Date | null
    sprintGoal?: string
  }) {
    return boardRepository.update(id, updates)
  },

  async delete(id: string) {
    return boardRepository.delete(id)
  },
}

