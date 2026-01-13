import { ActivityModel, toActivity, type Activity } from './activity.model'

export type CreateActivityInput = {
  workspaceId: string
  boardId: string
  ticketId?: string
  actorId: string
  actionType: 'create' | 'update' | 'delete' | 'comment' | 'transition' | 'upload'
  changes?: Array<{
    field: string
    oldValue: any
    newValue: any
    text: string
  }>
  comment?: {
    content: Record<string, any>
    textPreview: string
    mentions: string[]
    isEdit: boolean
    originalCommentId?: string
  }
}

export const activityRepository = {
  async create(input: CreateActivityInput): Promise<Activity> {
    const doc = await ActivityModel.create(input)
    return toActivity(doc)
  },

  async findByTicketId(ticketId: string): Promise<Activity[]> {
    const docs = await ActivityModel.find({ ticketId })
      .sort({ createdAt: -1 })
      .limit(100)
    return docs.map(toActivity)
  },

  async findByBoardId(boardId: string): Promise<Activity[]> {
    const docs = await ActivityModel.find({ boardId })
      .sort({ createdAt: -1 })
      .limit(100)
    return docs.map(toActivity)
  },

  async findByWorkspaceId(workspaceId: string): Promise<Activity[]> {
    const docs = await ActivityModel.find({ workspaceId })
      .sort({ createdAt: -1 })
      .limit(100)
    return docs.map(toActivity)
  },

  async findAssigneeChangesForUser(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Activity[]> {
    const docs = await ActivityModel.find({
      createdAt: { $gte: startDate, $lte: endDate },
      changes: { $elemMatch: { field: 'assigneeId', newValue: userId } },
    }).sort({ createdAt: -1 })
    return docs.map(toActivity)
  },
}

