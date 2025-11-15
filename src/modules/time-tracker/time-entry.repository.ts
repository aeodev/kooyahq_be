import { TimeEntryModel, toTimeEntry, type TimeEntry, type TimeEntryDocument } from './time-entry.model'

export type CreateTimeEntryInput = {
  userId: string
  projects: string[]
  task: string
  isOvertime?: boolean
}

export class TimeEntryRepository {
  async create(input: CreateTimeEntryInput): Promise<TimeEntry> {
    const startTime = new Date()
    const doc = new TimeEntryModel({
      ...input,
      duration: 0,
      startTime,
      isActive: true,
      isOvertime: input.isOvertime ?? false,
    })
    await doc.save()
    return toTimeEntry(doc)
  }

  async findById(id: string): Promise<TimeEntry | undefined> {
    const doc = await TimeEntryModel.findById(id)
    return doc ? toTimeEntry(doc) : undefined
  }

  async findByUserId(userId: string): Promise<TimeEntry[]> {
    const docs = await TimeEntryModel.find({ userId }).sort({ createdAt: -1 })
    return docs.map(toTimeEntry)
  }

  async findActiveByUserId(userId: string): Promise<TimeEntry | undefined> {
    const doc = await TimeEntryModel.findOne({ userId, isActive: true })
    return doc ? toTimeEntry(doc) : undefined
  }

  async findAllActive(): Promise<TimeEntry[]> {
    const docs = await TimeEntryModel.find({ isActive: true }).sort({ createdAt: -1 })
    return docs.map(toTimeEntry)
  }

  async findAllToday(): Promise<TimeEntry[]> {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)

    const docs = await TimeEntryModel.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    }).sort({ createdAt: -1 })
    return docs.map(toTimeEntry)
  }

  async update(id: string, userId: string, updates: Partial<Omit<TimeEntry, 'id' | 'createdAt' | 'updatedAt'>>): Promise<TimeEntry> {
    const doc = await TimeEntryModel.findOne({ _id: id, userId })
    if (!doc) {
      throw new Error('Time entry not found or access denied')
    }

    if (updates.startTime) {
      doc.startTime = new Date(updates.startTime)
    }
    if (updates.endTime !== undefined) {
      doc.endTime = updates.endTime ? new Date(updates.endTime) : undefined
    }
    if (updates.duration !== undefined) {
      doc.duration = updates.duration
    }
    if (updates.isActive !== undefined) {
      doc.isActive = updates.isActive
    }
    if (updates.isPaused !== undefined) {
      doc.isPaused = updates.isPaused
    }
    if (updates.pausedDuration !== undefined) {
      doc.pausedDuration = updates.pausedDuration
    }
    if (updates.lastPausedAt !== undefined) {
      doc.lastPausedAt = updates.lastPausedAt ? new Date(updates.lastPausedAt) : undefined
    }
    if (updates.projects) {
      doc.projects = updates.projects
    }
    if (updates.task) {
      doc.task = updates.task
    }
    if (updates.isOvertime !== undefined) {
      doc.isOvertime = updates.isOvertime
    }

    await doc.save()
    return toTimeEntry(doc)
  }

  async delete(id: string, userId: string): Promise<void> {
    const result = await TimeEntryModel.deleteOne({ _id: id, userId })
    if (result.deletedCount === 0) {
      throw new Error('Time entry not found or access denied')
    }
  }

  async pauseActiveTimer(userId: string): Promise<TimeEntry | null> {
    const doc = await TimeEntryModel.findOne({ userId, isActive: true, isPaused: false })
    if (!doc) {
      return null
    }

    const now = new Date()
    doc.isPaused = true
    doc.lastPausedAt = now

    await doc.save()
    return toTimeEntry(doc)
  }

  async resumeActiveTimer(userId: string): Promise<TimeEntry | null> {
    const doc = await TimeEntryModel.findOne({ userId, isActive: true, isPaused: true })
    if (!doc || !doc.lastPausedAt) {
      return null
    }

    const now = new Date()
    const pauseDurationMs = now.getTime() - doc.lastPausedAt.getTime()
    const pauseDurationMinutes = Math.floor(pauseDurationMs / 60000)
    
    doc.isPaused = false
    doc.pausedDuration = (doc.pausedDuration || 0) + pauseDurationMinutes
    doc.lastPausedAt = undefined

    await doc.save()
    return toTimeEntry(doc)
  }

  async stopActiveTimer(userId: string): Promise<TimeEntry | null> {
    const doc = await TimeEntryModel.findOne({ userId, isActive: true })
    if (!doc) {
      return null
    }

    const endTime = new Date()
    const startTime = doc.startTime
    
    // Calculate actual work duration (excluding paused time)
    let workDurationMs = endTime.getTime() - startTime.getTime()
    
    // If currently paused, add the current pause duration
    if (doc.isPaused && doc.lastPausedAt) {
      const currentPauseMs = endTime.getTime() - doc.lastPausedAt.getTime()
      doc.pausedDuration = (doc.pausedDuration || 0) + Math.floor(currentPauseMs / 60000)
    }
    
    // Subtract total paused time
    workDurationMs -= (doc.pausedDuration || 0) * 60000
    const durationMinutes = Math.floor(workDurationMs / 60000)

    doc.isActive = false
    doc.isPaused = false
    doc.endTime = endTime
    doc.duration = durationMinutes
    doc.lastPausedAt = undefined

    await doc.save()
    return toTimeEntry(doc)
  }

  async stopAllActiveTimers(userId: string): Promise<TimeEntry[]> {
    const docs = await TimeEntryModel.find({ userId, isActive: true })
    const stopped: TimeEntry[] = []

    for (const doc of docs) {
      const endTime = new Date()
      const startTime = doc.startTime
      
      let workDurationMs = endTime.getTime() - startTime.getTime()
      
      if (doc.isPaused && doc.lastPausedAt) {
        const currentPauseMs = endTime.getTime() - doc.lastPausedAt.getTime()
        doc.pausedDuration = (doc.pausedDuration || 0) + Math.floor(currentPauseMs / 60000)
      }
      
      workDurationMs -= (doc.pausedDuration || 0) * 60000
      const durationMinutes = Math.floor(workDurationMs / 60000)

      doc.isActive = false
      doc.isPaused = false
      doc.endTime = endTime
      doc.duration = durationMinutes
      doc.lastPausedAt = undefined

      await doc.save()
      stopped.push(toTimeEntry(doc))
    }

    return stopped
  }

  async updateDuration(id: string, durationMinutes: number): Promise<TimeEntry> {
    const doc = await TimeEntryModel.findById(id)
    if (!doc) {
      throw new Error('Time entry not found')
    }

    doc.duration = durationMinutes
    await doc.save()
    return toTimeEntry(doc)
  }

  async findByDateRange(userId: string | null, startDate: Date, endDate: Date): Promise<TimeEntry[]> {
    const query: Record<string, unknown> = {
      createdAt: { $gte: startDate, $lte: endDate },
      isActive: false, // Only completed entries for analytics
    }
    
    if (userId) {
      query.userId = userId
    }

    const docs = await TimeEntryModel.find(query).sort({ createdAt: -1 })
    return docs.map(toTimeEntry)
  }

  async findByUserIdAndDateRange(userId: string, startDate: Date, endDate: Date): Promise<TimeEntry[]> {
    const docs = await TimeEntryModel.find({
      userId,
      createdAt: { $gte: startDate, $lte: endDate },
    }).sort({ createdAt: -1 })
    return docs.map(toTimeEntry)
  }
}

