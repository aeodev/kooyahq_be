import { adminActivityRepository, type CreateAdminActivityInput } from './admin-activity.repository'
import type { AdminActivity } from './admin-activity.model'

export const adminActivityService = {
  async logActivity(input: CreateAdminActivityInput): Promise<AdminActivity> {
    return adminActivityRepository.create(input)
  },

  async getActivity(params: {
    limit?: number
    startDate?: Date
    endDate?: Date
    action?: string
  }): Promise<AdminActivity[]> {
    if (params.action) {
      return adminActivityRepository.findByAction(params.action as any, params.limit)
    }
    return adminActivityRepository.findAll(params.limit, params.startDate, params.endDate)
  },
}







