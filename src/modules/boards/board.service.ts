import { boardRepository, type CreateBoardInput } from './board.repository'

const DEFAULT_KANBAN_COLUMNS = ['To do', 'Doing', 'Done']
const DEFAULT_SPRINT_COLUMNS = ['Backlog', 'Sprint', 'Review', 'Done']
import { boardRepository } from './board.repository'
import type { Board, Sprint } from './board.model'
import { Types } from 'mongoose'

export class BoardService {
  async create(data: { name: string; type: 'kanban' | 'sprint'; ownerId: string }): Promise<Board> {
    return boardRepository.create(data)
  }

  async findByOwnerId(ownerId: string, type?: 'kanban' | 'sprint'): Promise<Board[]> {
    return boardRepository.findByOwnerId(ownerId, type)
  }

  async findById(id: string): Promise<Board | null> {
    return boardRepository.findById(id)
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
    return boardRepository.update(id, updates)
  }

  async delete(id: string): Promise<boolean> {
    return boardRepository.delete(id)
  }

  // Sprint Management Methods

  async addSprint(
    boardId: string,
    data: { name: string; goal?: string; startDate?: Date; endDate?: Date },
  ): Promise<Board | null> {
    const board = await boardRepository.findById(boardId)
    if (!board) return null

    // Create new sprint object
    const newSprint = {
      _id: new Types.ObjectId(),
      name: data.name,
      goal: data.goal,
      startDate: data.startDate,
      endDate: data.endDate,
      state: 'future',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any // Cast to any to bypass strict type checking for subdocument creation

    // Use mongoose update to push to array
    // Note: In a real app, we might want to add this to the repository layer
    // But for now, we'll fetch, update, and save or use findByIdAndUpdate
    // Since repository.update is generic, let's try to use it or extend it.
    // Ideally, we should add specific methods to repository, but for MVP let's use direct model access or extend repository.
    // Given the current repository structure, let's assume we can't easily access the model directly here without importing it.
    // Let's add these methods to the Repository first or handle it here if we change the service to use the model directly?
    // The repository pattern is used. Let's check repository.ts content.
    // Wait, I don't have the full repository content in memory, but I saw it earlier.
    // It uses `BoardModel`.

    // Let's implement these in the service by extending the repository or just adding logic here if the repository allows partial updates that include push.
    // Standard repository.update usually does $set.

    // Let's implement `addSprint` in the repository for cleaner code.
    // But I am editing service.ts.
    // I will assume I can update the repository next.

    return boardRepository.addSprint(boardId, newSprint)
  }

  async updateSprint(
    boardId: string,
    sprintId: string,
    updates: Partial<{
      name: string
      goal: string
      startDate: Date
      endDate: Date
      state: 'future' | 'active' | 'closed'
    }>,
  ): Promise<Board | null> {
    // If setting to active, ensure no other sprint is active
    if (updates.state === 'active') {
      const board = await boardRepository.findById(boardId)
      if (board) {
        const hasActive = board.sprints.some((s) => s.state === 'active' && s.id !== sprintId)
        if (hasActive) {
          throw new Error('Another sprint is already active on this board')
        }
      }
    }
    return boardRepository.updateSprint(boardId, sprintId, updates)
  }

  async deleteSprint(boardId: string, sprintId: string): Promise<Board | null> {
    return boardRepository.deleteSprint(boardId, sprintId)
  }
}

export const boardService = new BoardService()
