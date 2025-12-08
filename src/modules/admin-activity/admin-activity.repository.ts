import { AdminActivityModel, toAdminActivity, type AdminActivity } from './admin-activity.model'
import type { AdminAction, TargetType } from './admin-activity.model'

export type CreateAdminActivityInput = {
  adminId: string
  action: AdminAction
  targetType: TargetType
  targetId: string
  changes?: Record<string, unknown>
}

export const adminActivityRepository = {
  async create(input: CreateAdminActivityInput): Promise<AdminActivity> {
    const doc = new AdminActivityModel({
      ...input,
      timestamp: new Date(),
    })
    await doc.save()
    return toAdminActivity(doc)
  },

  async findByAdminId(adminId: string, limit = 50): Promise<AdminActivity[]> {
    const docs = await AdminActivityModel.find({ adminId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec()
    return docs.map(toAdminActivity)
  },

  async findByAction(action: AdminAction, limit = 50): Promise<AdminActivity[]> {
    const docs = await AdminActivityModel.find({ action })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec()
    return docs.map(toAdminActivity)
  },

  async findByTarget(targetType: TargetType, targetId: string): Promise<AdminActivity[]> {
    const docs = await AdminActivityModel.find({ targetType, targetId })
      .sort({ timestamp: -1 })
      .exec()
    return docs.map(toAdminActivity)
  },

  async findAll(limit = 100, startDate?: Date, endDate?: Date): Promise<AdminActivity[]> {
    const query: Record<string, unknown> = {}

    if (startDate || endDate) {
      const timestampQuery: Record<string, unknown> = {}
      if (startDate) {
        timestampQuery.$gte = startDate
      }
      if (endDate) {
        timestampQuery.$lte = endDate
      }
      query.timestamp = timestampQuery
    }

    const docs = await AdminActivityModel.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec()
    return docs.map(toAdminActivity)
  },
}







