import { TicketModel, toTicket, type Ticket, type TicketGithubStatus } from './ticket.model'
import { boardService } from '../boards/board.service'

export type CreateTicketInput = {
  boardId: string
  ticketType: 'epic' | 'story' | 'task' | 'bug' | 'subtask'
  title: string
  description?: Record<string, any>
  parentTicketId?: string
  rootEpicId?: string
  columnId: string
  rank: string
  points?: number
  priority?: 'highest' | 'high' | 'medium' | 'low' | 'lowest'
  tags?: string[]
  assigneeId?: string
  reporterId: string
  acceptanceCriteria?: Array<{
    id: string
    text: string
    isCompleted: boolean
  }>
  documents?: Array<{
    name: string
    url: string
    type: 'doc' | 'sheet' | 'slide' | 'figma' | 'other'
  }>
  attachments?: Array<{
    id: string
    url: string
    name: string
    type: string
    uploadedAt: Date
  }>
  startDate?: Date
  endDate?: Date
  dueDate?: Date
  github?: {
    branchName?: string
    pullRequestUrl?: string
    status?: TicketGithubStatus
  }
  relatedTickets?: string[]
}

export type UpdateTicketInput = {
  title?: string
  description?: Record<string, any>
  parentTicketId?: string
  rootEpicId?: string
  columnId?: string
  rank?: string
  points?: number | null
  priority?: 'highest' | 'high' | 'medium' | 'low' | 'lowest'
  tags?: string[]
  assigneeId?: string | null
  acceptanceCriteria?: Array<{
    id: string
    text: string
    isCompleted: boolean
  }>
  documents?: Array<{
    name: string
    url: string
    type: 'doc' | 'sheet' | 'slide' | 'figma' | 'other'
  }>
  attachments?: Array<{
    id: string
    url: string
    name: string
    type: string
    uploadedAt: Date
  }>
  startDate?: Date | null
  endDate?: Date | null
  dueDate?: Date | null
  completedAt?: Date | null
  github?: {
    branchName?: string
    pullRequestUrl?: string
    status?: TicketGithubStatus
  }
  relatedTickets?: string[]
}

/**
 * Generate next ticket key (e.g., ENG-1, ENG-2)
 */
async function generateTicketKey(boardId: string): Promise<string> {
  const board = await boardService.findById(boardId)
  if (!board) {
    throw new Error('Board not found')
  }

  // Find the highest ticket number for this board
  const lastTicket = await TicketModel.findOne({ boardId })
    .sort({ ticketKey: -1 })
    .exec()

  if (!lastTicket) {
    return `${board.prefix}-1`
  }

  // Extract number from ticketKey (e.g., "ENG-42" -> 42)
  const match = lastTicket.ticketKey.match(/-(\d+)$/)
  const nextNumber = match ? parseInt(match[1], 10) + 1 : 1

  return `${board.prefix}-${nextNumber}`
}

/**
 * Simple Lexorank implementation - generates rank strings for ordering
 * For now, using a simple incrementing approach. Can be enhanced later.
 */
function generateRank(): string {
  // Simple implementation: use timestamp + random for uniqueness
  // In production, you'd want a proper Lexorank implementation
  return `rank_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export const ticketRepository = {
  async create(input: CreateTicketInput): Promise<Ticket> {
    const ticketKey = await generateTicketKey(input.boardId)
    const rank = input.rank || generateRank()

    const doc = await TicketModel.create({
      boardId: input.boardId,
      ticketKey,
      ticketType: input.ticketType,
      title: input.title,
      description: input.description || {},
      parentTicketId: input.parentTicketId,
      rootEpicId: input.rootEpicId,
      columnId: input.columnId,
      rank,
      points: input.points,
      priority: input.priority || 'medium',
      tags: input.tags || [],
      assigneeId: input.assigneeId,
      reporterId: input.reporterId,
      acceptanceCriteria: input.acceptanceCriteria || [],
      documents: input.documents || [],
      attachments: input.attachments || [],
      startDate: input.startDate,
      endDate: input.endDate,
      dueDate: input.dueDate,
      github: input.github,
      relatedTickets: input.relatedTickets || [],
    })

    return toTicket(doc)
  },

  async findByBoardId(boardId: string): Promise<Ticket[]> {
    const docs = await TicketModel.find({
      boardId,
      deletedAt: { $exists: false },
    })
      .sort({ rank: 1, createdAt: -1 })
      .exec()
    return docs.map((doc) => toTicket(doc))
  },

  async findById(id: string): Promise<Ticket | undefined> {
    const doc = await TicketModel.findOne({
      _id: id,
      deletedAt: { $exists: false },
    }).exec()
    return doc ? toTicket(doc) : undefined
  },

  async findByTicketKey(ticketKey: string): Promise<Ticket | undefined> {
    const doc = await TicketModel.findOne({
      ticketKey,
      deletedAt: { $exists: false },
    }).exec()
    return doc ? toTicket(doc) : undefined
  },

  async update(id: string, updates: UpdateTicketInput): Promise<Ticket | undefined> {
    const updateData: any = {}
    const unsetFields: any = {}

    // Handle regular fields
    if (updates.title !== undefined) updateData.title = updates.title
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.parentTicketId !== undefined) updateData.parentTicketId = updates.parentTicketId
    if (updates.rootEpicId !== undefined) updateData.rootEpicId = updates.rootEpicId
    if (updates.columnId !== undefined) updateData.columnId = updates.columnId
    if (updates.rank !== undefined) updateData.rank = updates.rank
    if (updates.priority !== undefined) updateData.priority = updates.priority
    if (updates.tags !== undefined) updateData.tags = updates.tags
    if (updates.acceptanceCriteria !== undefined) updateData.acceptanceCriteria = updates.acceptanceCriteria
    if (updates.documents !== undefined) updateData.documents = updates.documents
    if (updates.attachments !== undefined) updateData.attachments = updates.attachments
    if (updates.github !== undefined) updateData.github = updates.github
    if (updates.relatedTickets !== undefined) updateData.relatedTickets = updates.relatedTickets

    // Handle nullable fields
    if (updates.points === null) {
      unsetFields.points = ''
    } else if (updates.points !== undefined) {
      updateData.points = updates.points
    }

    if (updates.assigneeId === null) {
      unsetFields.assigneeId = ''
    } else if (updates.assigneeId !== undefined) {
      updateData.assigneeId = updates.assigneeId
    }

    if (updates.startDate === null) {
      unsetFields.startDate = ''
    } else if (updates.startDate !== undefined) {
      updateData.startDate = updates.startDate
    }

    if (updates.endDate === null) {
      unsetFields.endDate = ''
    } else if (updates.endDate !== undefined) {
      updateData.endDate = updates.endDate
    }

    if (updates.dueDate === null) {
      unsetFields.dueDate = ''
    } else if (updates.dueDate !== undefined) {
      updateData.dueDate = updates.dueDate
    }

    if (updates.completedAt === null) {
      unsetFields.completedAt = ''
    } else if (updates.completedAt !== undefined) {
      updateData.completedAt = updates.completedAt
    }

    // Build final update object
    const finalUpdate: any = {}
    if (Object.keys(updateData).length > 0) {
      finalUpdate.$set = updateData
    }
    if (Object.keys(unsetFields).length > 0) {
      finalUpdate.$unset = unsetFields
    }

    const doc = await TicketModel.findOneAndUpdate(
      { _id: id, deletedAt: { $exists: false } },
      finalUpdate,
      { new: true },
    ).exec()
    return doc ? toTicket(doc) : undefined
  },

  async findByGithubBranchName(branchName: string): Promise<Ticket | undefined> {
    const doc = await TicketModel.findOne({
      'github.branchName': branchName,
      deletedAt: { $exists: false },
    }).exec()

    return doc ? toTicket(doc) : undefined
  },

  async bulkUpdateRanks(
    boardId: string,
    rankUpdates: Array<{ id: string; rank: string }>,
  ): Promise<Ticket[]> {
    const bulkOps = rankUpdates.map(({ id, rank }) => ({
      updateOne: {
        filter: { _id: id, boardId, deletedAt: { $exists: false } },
        update: { $set: { rank } },
      },
    }))

    if (bulkOps.length > 0) {
      await TicketModel.bulkWrite(bulkOps)
    }

    // Return updated tickets
    const updatedIds = rankUpdates.map((u) => u.id)
    const docs = await TicketModel.find({
      _id: { $in: updatedIds },
      boardId,
      deletedAt: { $exists: false },
    }).exec()
    return docs.map((doc) => toTicket(doc))
  },

  async softDelete(id: string): Promise<boolean> {
    const result = await TicketModel.findByIdAndUpdate(
      id,
      { deletedAt: new Date() },
      { new: true },
    )
    return !!result
  },

  async delete(id: string): Promise<boolean> {
    const result = await TicketModel.findByIdAndDelete(id).exec()
    return !!result
  },

  async findByParentTicketId(parentTicketId: string): Promise<Ticket[]> {
    const docs = await TicketModel.find({
      parentTicketId,
      deletedAt: { $exists: false },
    })
      .sort({ rank: 1, createdAt: -1 })
      .exec()
    return docs.map((doc) => toTicket(doc))
  },

  async findByRootEpicId(rootEpicId: string): Promise<Ticket[]> {
    const docs = await TicketModel.find({
      rootEpicId,
      deletedAt: { $exists: false },
    })
      .sort({ rank: 1, createdAt: -1 })
      .exec()
    return docs.map((doc) => toTicket(doc))
  },

  async findByAssigneeId(userId: string): Promise<Ticket[]> {
    const docs = await TicketModel.find({
      assigneeId: userId,
      deletedAt: { $exists: false },
    })
      .sort({ updatedAt: -1 })
      .limit(10)
      .exec()
    return docs.map((doc) => toTicket(doc))
  },

  async addViewer(ticketId: string, userId: string): Promise<Ticket | null> {
    const doc = await TicketModel.findById(ticketId).exec()
    if (!doc) {
      return null
    }

    const existingViewerIndex = doc.viewedBy.findIndex((v: { userId: string }) => v.userId === userId)

    if (existingViewerIndex >= 0) {
      // Update existing viewer's viewedAgainAt timestamp (keep viewedAt as first view time)
      doc.viewedBy[existingViewerIndex].viewedAgainAt = new Date()
    } else {
      // Add new viewer with viewedAt as first view time
      doc.viewedBy.push({
        userId,
        viewedAt: new Date(),
      })
    }

    await doc.save()
    return toTicket(doc)
  },

  async addRelatedTicket(ticketId: string, relatedTicketId: string): Promise<Ticket | null> {
    const doc = await TicketModel.findById(ticketId).exec()
    if (!doc) {
      return null
    }

    // Check if already related
    if (doc.relatedTickets.includes(relatedTicketId)) {
      return toTicket(doc)
    }

    // Add to array
    doc.relatedTickets.push(relatedTicketId)
    await doc.save()
    return toTicket(doc)
  },

  async removeRelatedTicket(ticketId: string, relatedTicketId: string): Promise<Ticket | null> {
    const doc = await TicketModel.findById(ticketId).exec()
    if (!doc) {
      return null
    }

    // Remove from array
    doc.relatedTickets = doc.relatedTickets.filter((id: string) => id !== relatedTicketId)
    await doc.save()
    return toTicket(doc)
  },
}
