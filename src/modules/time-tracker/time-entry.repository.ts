import { TimeEntryModel, toTimeEntry, type TimeEntry, type TimeEntryDocument, type TaskItem } from './time-entry.model'

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
      // Initialize tasks array with first task
      tasks: input.task ? [{ text: input.task, addedAt: startTime, duration: 0 }] : [],
    })
    await doc.save()
    return toTimeEntry(doc)
  }

  async addTaskToEntry(userId: string, taskText: string): Promise<TimeEntry | null> {
    const doc = await TimeEntryModel.findOne({ userId, isActive: true })
    if (!doc) {
      return null
    }

    const now = new Date()

    // Calculate duration for previous task if exists
    if (doc.tasks && doc.tasks.length > 0) {
      const lastTask = doc.tasks[doc.tasks.length - 1]
      // For intermediate task completion, calculate duration from task start to now
      let taskDurationMs = now.getTime() - new Date(lastTask.addedAt).getTime()
      // Proportionally subtract paused time
      if (doc.pausedDuration && doc.pausedDuration > 0 && doc.startTime) {
        const entryDurationMs = now.getTime() - new Date(doc.startTime).getTime()
        const taskRatio = taskDurationMs / entryDurationMs
        taskDurationMs -= doc.pausedDuration * taskRatio
      }
      lastTask.duration = Math.max(0, Math.floor(taskDurationMs / 60000))
    }

    // Add new task
    if (!doc.tasks) {
      doc.tasks = []
    }
    doc.tasks.push({ text: taskText, addedAt: now, duration: 0 })

    // Also update legacy task field for backwards compatibility
    doc.task = doc.tasks.map(t => t.text).join(', ')

    await doc.save()
    return toTimeEntry(doc)
  }

  private calculateTaskDuration(startTime: Date, endTime: Date, doc: TimeEntryDocument, totalDuration: number): number {
    // If this is the only task and it started at entry start, its duration equals total duration
    if (doc.tasks && doc.tasks.length === 1 && doc.startTime) {
      const taskStart = new Date(startTime).getTime()
      const entryStart = new Date(doc.startTime).getTime()
      // If task started within 1 second of entry start, use total duration
      if (Math.abs(taskStart - entryStart) < 1000) {
        return totalDuration
      }
    }

    let durationMs = endTime.getTime() - startTime.getTime()

    // Account for paused time during this task's period
    // Subtract total paused duration proportionally based on task's time span
    if (doc.pausedDuration && doc.pausedDuration > 0) {
      const entryDurationMs = endTime.getTime() - new Date(doc.startTime).getTime()
      const taskRatio = durationMs / entryDurationMs
      // Subtract proportional paused time
      durationMs -= doc.pausedDuration * taskRatio
    }

    return Math.max(0, Math.floor(durationMs / 60000))
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
    
    doc.isPaused = false
    doc.pausedDuration = (doc.pausedDuration || 0) + pauseDurationMs
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
      doc.pausedDuration = (doc.pausedDuration || 0) + currentPauseMs
    }
    
    // Subtract total paused time
    workDurationMs -= (doc.pausedDuration || 0)
    const durationMinutes = Math.floor(workDurationMs / 60000)

    // Calculate duration for the last task
    if (doc.tasks && doc.tasks.length > 0) {
      const lastTask = doc.tasks[doc.tasks.length - 1]
      lastTask.duration = this.calculateTaskDuration(lastTask.addedAt, endTime, doc, durationMinutes)
    }

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
        doc.pausedDuration = (doc.pausedDuration || 0) + currentPauseMs
      }
      
      workDurationMs -= (doc.pausedDuration || 0)
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

