import { TimeEntryAuditModel, toAuditLog, type TimeEntryAudit, type AuditAction } from './time-entry-audit.model'

export type CreateAuditLogInput = {
  userId: string
  entryId?: string
  action: AuditAction
  metadata?: Record<string, unknown>
}

export class TimeEntryAuditRepository {
  async create(input: CreateAuditLogInput): Promise<TimeEntryAudit> {
    const doc = new TimeEntryAuditModel({
      ...input,
      timestamp: new Date(),
    })
    await doc.save()
    return toAuditLog(doc)
  }

  async findByUserId(userId: string, startDate?: Date, endDate?: Date): Promise<TimeEntryAudit[]> {
    const query: Record<string, unknown> = { userId }
    
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

    const docs = await TimeEntryAuditModel.find(query).sort({ timestamp: -1 })
    return docs.map(toAuditLog)
  }

  async findByEntryId(entryId: string): Promise<TimeEntryAudit[]> {
    const docs = await TimeEntryAuditModel.find({ entryId }).sort({ timestamp: -1 })
    return docs.map(toAuditLog)
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<TimeEntryAudit[]> {
    const docs = await TimeEntryAuditModel.find({
      timestamp: { $gte: startDate, $lte: endDate },
    }).sort({ timestamp: -1 })
    return docs.map(toAuditLog)
  }

  async findByAction(action: AuditAction, startDate?: Date, endDate?: Date): Promise<TimeEntryAudit[]> {
    const query: Record<string, unknown> = { action }
    
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

    const docs = await TimeEntryAuditModel.find(query).sort({ timestamp: -1 })
    return docs.map(toAuditLog)
  }
}

