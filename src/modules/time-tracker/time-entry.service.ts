import { TimeEntryRepository, type CreateTimeEntryInput } from './time-entry.repository'
import { TimeEntryAuditRepository } from './time-entry-audit.repository'
import { DayEndRepository } from './day-end.repository'
import type { AuditAction } from './time-entry-audit.model'
import { userRepository } from '../users/user.repository'
import { HttpError } from '../../utils/http-error'
import { SocketEmitter, TimeEntrySocketEvents } from '../../utils/socket-emitter'
import type { TimeEntry } from './time-entry.model'
import { emailService } from '../email/email.service'

export type PublicTimeEntry = TimeEntry & {
  userName: string
  userEmail: string
  canEdit: boolean
}

export type StartTimerInput = {
  projects: string[]
  task: string
  isOvertime?: boolean
}

export type UpdateTimeEntryInput = {
  projects?: string[]
  task?: string
  duration?: number
}

export type ManualEntryInput = {
  projects: string[]
  task: string
  duration: number // in minutes
  startTime?: string
  endTime?: string
  isOvertime?: boolean
}

export type AnalyticsResult = {
  totalHours: number
  totalEntries: number
  totalOvertimeEntries: number
  byUser: Array<{
    userId: string
    userName: string
    userEmail: string
    hours: number
    entries: number
    overtimeEntries: number
    overtimeHours: number
  }>
  byProject: Array<{
    project: string
    hours: number
    contributors: number
  }>
  byDay: Array<{
    date: string
    hours: number
    entries: number
  }>
}

export class TimeEntryService {
  constructor(
    private timeEntryRepo = new TimeEntryRepository(),
    private auditRepo = new TimeEntryAuditRepository(),
    private dayEndRepo = new DayEndRepository(),
  ) {}

  private async logAudit(userId: string, action: AuditAction, entryId?: string, metadata?: Record<string, unknown>) {
    try {
      await this.auditRepo.create({
        userId,
        entryId,
        action,
        metadata,
      })
    } catch (error) {
      // Don't fail the main operation if audit logging fails
      console.error('Failed to log audit:', error)
    }
  }

  async startTimer(userId: string, input: StartTimerInput): Promise<PublicTimeEntry> {
    await this.timeEntryRepo.stopActiveTimer(userId)

    const taskText = (input.task !== undefined && input.task !== null) ? String(input.task).trim() : ''
    const finalTask = taskText || 'Started working'
    
    const entry = await this.timeEntryRepo.create({
      userId,
      projects: input.projects,
      task: finalTask,
      isOvertime: input.isOvertime ?? false,
    })

    await this.logAudit(userId, 'start_timer', entry.id, {
      projects: input.projects,
      task: input.task,
    })

    const publicEntry = await this.toPublicTimeEntry(entry, userId)
    SocketEmitter.emitTimeEntryUpdate(TimeEntrySocketEvents.TIMER_STARTED, publicEntry, userId)

    return publicEntry
  }

  async addTaskToActiveTimer(userId: string, taskText: string): Promise<PublicTimeEntry> {
    const entry = await this.timeEntryRepo.addTaskToEntry(userId, taskText.trim())
    if (!entry) {
      throw new HttpError(404, 'No active timer found')
    }

    await this.logAudit(userId, 'add_task', entry.id, {
      task: taskText,
    })

    const publicEntry = await this.toPublicTimeEntry(entry, userId)
    
    // Emit socket event for real-time updates
    SocketEmitter.emitTimeEntryUpdate(TimeEntrySocketEvents.UPDATED, publicEntry, userId)

    return publicEntry
  }

  async pauseTimer(userId: string): Promise<PublicTimeEntry | null> {
    const entry = await this.timeEntryRepo.pauseActiveTimer(userId)
    if (!entry) {
      return null
    }

    await this.logAudit(userId, 'pause_timer', entry.id, {
      duration: entry.duration,
      pausedDuration: entry.pausedDuration,
    })

    const publicEntry = await this.toPublicTimeEntry(entry, userId)
    
    // Emit socket event for real-time updates
    SocketEmitter.emitTimeEntryUpdate(TimeEntrySocketEvents.TIMER_PAUSED, publicEntry, userId)

    return publicEntry
  }

  async resumeTimer(userId: string): Promise<PublicTimeEntry | null> {
    const entry = await this.timeEntryRepo.resumeActiveTimer(userId)
    if (!entry) {
      return null
    }

    await this.logAudit(userId, 'resume_timer', entry.id, {
      duration: entry.duration,
      pausedDuration: entry.pausedDuration,
    })

    const publicEntry = await this.toPublicTimeEntry(entry, userId)
    
    // Emit socket event for real-time updates
    SocketEmitter.emitTimeEntryUpdate(TimeEntrySocketEvents.TIMER_RESUMED, publicEntry, userId)

    return publicEntry
  }

  async stopTimer(userId: string): Promise<PublicTimeEntry | null> {
    const entry = await this.timeEntryRepo.stopActiveTimer(userId)
    if (!entry) {
      return null
    }

    await this.logAudit(userId, 'stop_timer', entry.id, {
      duration: entry.duration,
      projects: entry.projects,
      tasks: entry.tasks,
    })

    const publicEntry = await this.toPublicTimeEntry(entry, userId)
    
    // Emit socket event for real-time updates
    SocketEmitter.emitTimeEntryUpdate(TimeEntrySocketEvents.TIMER_STOPPED, publicEntry, userId)

    return publicEntry
  }

  async endDay(userId: string): Promise<PublicTimeEntry[]> {
    // Stop any active timers first
    await this.timeEntryRepo.stopAllActiveTimers(userId)
    
    const endedAt = new Date()
    await this.dayEndRepo.create(userId, endedAt)
    
    // Fetch ALL today's entries for the email (not just the ones that were active)
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const allTodayEntries = await this.timeEntryRepo.findByUserIdAndDateRange(userId, startOfDay, endedAt)
    const publicEntries = await Promise.all(allTodayEntries.map(entry => this.toPublicTimeEntry(entry, userId)))

    // Send email summary to the user
    try {
      const user = await userRepository.findById(userId)
      if (user) {
        // Calculate totals
        const totalMinutes = publicEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0)
        const totalHours = Math.floor(totalMinutes / 60)

        // Format entries for email
        const emailEntries = publicEntries.map((entry) => ({
          task: entry.tasks && entry.tasks.length > 0 
            ? entry.tasks.map(t => t.text).join(', ') 
            : 'No task specified',
          projects: entry.projects || [],
          duration: entry.duration || 0,
        }))

        await emailService.sendTimeTrackerEndDayEmail({
          userName: user.name,
          userEmail: user.email,
          date: endedAt.toISOString(),
          totalHours,
          totalMinutes,
          entryCount: publicEntries.length,
          entries: emailEntries,
        })
      }
    } catch (emailError) {
      console.error('Failed to send time tracker end day email:', emailError)
      // Don't fail the end day operation if email fails
    }

    return publicEntries
  }

  async getDayEndedAt(userId: string, date: Date): Promise<Date | null> {
    return await this.dayEndRepo.getLastDayEndedAt(userId, date)
  }

  async getUserEntries(userId: string): Promise<PublicTimeEntry[]> {
    const entries = await this.timeEntryRepo.findByUserId(userId)
    const user = await userRepository.findById(userId)
    
    return entries.map((entry) => ({
      ...entry,
      userName: user?.name || 'Unknown',
      userEmail: user?.email || '',
      canEdit: true,
    }))
  }

  async getAllTodayEntries(): Promise<PublicTimeEntry[]> {
    const entries = await this.timeEntryRepo.findAllToday()
    const userIds = [...new Set(entries.map(e => e.userId))]
    const users = await Promise.all(
      userIds.map(id => userRepository.findById(id))
    )
    const userMap = new Map(users.filter(Boolean).map(u => [u!.id, u!]))

    return entries.map((entry) => {
      const user = userMap.get(entry.userId)
      return {
        ...entry,
        userName: user?.name || 'Unknown',
        userEmail: user?.email || '',
        canEdit: false, // Will be set by controller based on requesting user
      }
    })
  }

  async update(userId: string, entryId: string, updates: UpdateTimeEntryInput): Promise<PublicTimeEntry> {
    const entry = await this.timeEntryRepo.findById(entryId)
    if (!entry) {
      throw new HttpError(404, 'Time entry not found')
    }

    if (entry.userId !== userId) {
      throw new HttpError(403, 'Access denied')
    }

    const oldValue = {
      projects: entry.projects,
      tasks: entry.tasks,
      duration: entry.duration,
    }

    const updated = await this.timeEntryRepo.update(entryId, userId, updates)

    await this.logAudit(userId, 'update_entry', entryId, {
      oldValue,
      newValue: {
        projects: updated.projects,
        tasks: updated.tasks,
        duration: updated.duration,
        ...updates,
      },
    })

    const publicEntry = await this.toPublicTimeEntry(updated, userId)
    
    // Emit socket event for real-time updates
    SocketEmitter.emitTimeEntryUpdate(TimeEntrySocketEvents.UPDATED, publicEntry, userId)

    return publicEntry
  }

  async delete(userId: string, entryId: string): Promise<void> {
    const entry = await this.timeEntryRepo.findById(entryId)
    if (!entry) {
      throw new HttpError(404, 'Time entry not found')
    }

    if (entry.userId !== userId) {
      throw new HttpError(403, 'Access denied')
    }

    await this.logAudit(userId, 'delete_entry', entryId, {
      projects: entry.projects,
      tasks: entry.tasks,
      duration: entry.duration,
    })

    await this.timeEntryRepo.delete(entryId, userId)
    
    // Emit socket event for real-time updates
    SocketEmitter.emitTimeEntryUpdate(TimeEntrySocketEvents.DELETED, { id: entryId }, userId)
  }

  async logManualEntry(userId: string, input: ManualEntryInput): Promise<PublicTimeEntry> {
    const startTime = input.startTime ? new Date(input.startTime) : new Date()
    const endTime = input.endTime ? new Date(input.endTime) : new Date()

    const entry = await this.timeEntryRepo.create({
      userId,
      projects: input.projects,
      task: input.task,
      isOvertime: input.isOvertime ?? false,
    })

    // Immediately update with manual duration
    const updated = await this.timeEntryRepo.update(entry.id, userId, {
      duration: input.duration,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      isActive: false,
    })

    await this.logAudit(userId, 'log_manual', updated.id, {
      projects: input.projects,
      task: input.task,
      duration: input.duration,
    })

    const publicEntry = await this.toPublicTimeEntry(updated, userId)
    
    // Emit socket event for real-time updates
    SocketEmitter.emitTimeEntryUpdate(TimeEntrySocketEvents.CREATED, publicEntry, userId)

    return publicEntry
  }

  async getActiveTimer(userId: string): Promise<PublicTimeEntry | null> {
    const entry = await this.timeEntryRepo.findActiveByUserId(userId)
    if (!entry) {
      return null
    }

    return this.toPublicTimeEntry(entry, userId)
  }

  async getAnalytics(userId: string | null, startDate: Date, endDate: Date): Promise<AnalyticsResult> {
    const entries = await this.timeEntryRepo.findByDateRange(userId, startDate, endDate)
    const userIds = [...new Set(entries.map(e => e.userId))]
    const users = await Promise.all(userIds.map(id => userRepository.findById(id)))
    const userMap = new Map(users.filter(Boolean).map(u => [u!.id, u!]))

    // Calculate totals
    const totalHours = entries.reduce((sum, e) => sum + e.duration, 0) / 60
    const totalOvertimeEntries = entries.filter((e) => e.isOvertime).length

    // Group by user
    const userMap2 = new Map<string, { userName: string; userEmail: string; hours: number; entries: number; overtimeEntries: number; overtimeHours: number }>()
    entries.forEach((entry) => {
      const user = userMap.get(entry.userId)
      const existing = userMap2.get(entry.userId) || {
        userId: entry.userId,
        userName: user?.name || 'Unknown',
        userEmail: user?.email || '',
        hours: 0,
        entries: 0,
        overtimeEntries: 0,
        overtimeHours: 0,
      }
      existing.hours += entry.duration
      existing.entries += 1
      if (entry.isOvertime) {
        existing.overtimeEntries += 1
        existing.overtimeHours += entry.duration
      }
      userMap2.set(entry.userId, existing)
    })

    // Group by project
    const projectMap = new Map<string, { hours: number; contributors: Set<string> }>()
    entries.forEach((entry) => {
      entry.projects.forEach((project) => {
        const existing = projectMap.get(project) || { hours: 0, contributors: new Set<string>() }
        existing.hours += entry.duration
        existing.contributors.add(entry.userId)
        projectMap.set(project, existing)
      })
    })

    // Group by day
    const dayMap = new Map<string, { hours: number; entries: number }>()
    entries.forEach((entry) => {
      const dateKey = new Date(entry.createdAt).toISOString().split('T')[0]
      const existing = dayMap.get(dateKey) || { hours: 0, entries: 0 }
      existing.hours += entry.duration
      existing.entries += 1
      dayMap.set(dateKey, existing)
    })

    return {
      totalHours,
      totalEntries: entries.length,
      totalOvertimeEntries,
      byUser: Array.from(userMap2.entries())
        .map(([userId, u]) => ({ userId, ...u, hours: u.hours / 60, overtimeHours: u.overtimeHours / 60 }))
        .sort((a, b) => b.hours - a.hours),
      byProject: Array.from(projectMap.entries())
        .sort((a, b) => b[1].hours - a[1].hours)
        .map(([project, data]) => ({
          project,
          hours: data.hours / 60,
          contributors: data.contributors.size,
        })),
      byDay: Array.from(dayMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, data]) => ({
          date,
          hours: data.hours / 60,
          entries: data.entries,
        })),
    }
  }

  async getUserEntriesByDateRange(userId: string, startDate: Date, endDate: Date): Promise<PublicTimeEntry[]> {
    const entries = await this.timeEntryRepo.findByUserIdAndDateRange(userId, startDate, endDate)
    const user = await userRepository.findById(userId)
    
    return entries.map((entry) => ({
      ...entry,
      userName: user?.name || 'Unknown',
      userEmail: user?.email || '',
      canEdit: true,
    }))
  }

  private async toPublicTimeEntry(entry: TimeEntry, requestingUserId: string): Promise<PublicTimeEntry> {
    const user = await userRepository.findById(entry.userId)
    
    // Calculate current duration for active timers using server time
    let calculatedEntry = { ...entry }
    if (entry.isActive && entry.startTime) {
      const now = new Date()
      const start = new Date(entry.startTime)
      
      // Calculate elapsed time
      let elapsedMs = now.getTime() - start.getTime()
      
      // Subtract paused duration if any
      const pausedMs = entry.pausedDuration || 0
      
      // If currently paused, add current pause time
      if (entry.isPaused && entry.lastPausedAt) {
        const currentPauseMs = now.getTime() - new Date(entry.lastPausedAt).getTime()
        elapsedMs -= (pausedMs + currentPauseMs)
      } else {
        elapsedMs -= pausedMs
      }
      
      // Update duration in minutes (for display consistency)
      calculatedEntry.duration = Math.max(0, Math.floor(elapsedMs / 60000))
    }
    
    return {
      ...calculatedEntry,
      userName: user?.name || 'Unknown',
      userEmail: user?.email || '',
      canEdit: entry.userId === requestingUserId,
    }
  }
}

