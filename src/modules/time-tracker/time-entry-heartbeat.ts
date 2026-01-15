import { TimeEntryRepository } from './time-entry.repository'
import { TimeEntryService, type PublicTimeEntry } from './time-entry.service'
import { SocketEmitter, TimeEntrySocketEvents } from '../../utils/socket-emitter'
import { userRoom } from '../../utils/socket-rooms'
import { userRepository } from '../users/user.repository'

// Maximum timer duration before auto-stop (10 hours)
const MAX_TIMER_DURATION_MS = 10 * 60 * 60 * 1000

/**
 * Timer heartbeat service - broadcasts active timer states every 5 seconds
 * to keep all browser windows synchronized.
 * Also auto-stops timers that exceed the maximum duration.
 */
class TimerHeartbeatService {
  private intervalId: NodeJS.Timeout | null = null
  private timeEntryRepo: TimeEntryRepository
  private timeEntryService: TimeEntryService
  private readonly HEARTBEAT_INTERVAL = 5000 // 5 seconds

  constructor() {
    this.timeEntryRepo = new TimeEntryRepository()
    this.timeEntryService = new TimeEntryService()
  }

  /**
   * Start the heartbeat service
   */
  start(): void {
    if (this.intervalId) {
      console.warn('Timer heartbeat service is already running')
      return
    }

    console.log('Starting timer heartbeat service')
    
    // Run immediately on start, then every 5 seconds
    this.broadcastActiveTimers()
    
    this.intervalId = setInterval(() => {
      this.broadcastActiveTimers()
    }, this.HEARTBEAT_INTERVAL)
  }

  /**
   * Stop the heartbeat service
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      console.log('Timer heartbeat service stopped')
    }
  }

  /**
   * Fetch all active timers, auto-stop expired ones, and broadcast states
   */
  private async broadcastActiveTimers(): Promise<void> {
    try {
      // Fetch all active timers
      const activeTimers = await this.timeEntryRepo.findAllActive()
      
      if (activeTimers.length === 0) {
        return
      }

      const now = new Date()
      const timersToStop: string[] = []
      const timersTobroadcast: typeof activeTimers = []

      // Check each timer for max duration and separate expired ones
      for (const timer of activeTimers) {
        if (timer.startTime) {
          const runningMs = now.getTime() - new Date(timer.startTime).getTime()
          if (runningMs >= MAX_TIMER_DURATION_MS) {
            timersToStop.push(timer.userId)
            continue
          }
        }
        timersTobroadcast.push(timer)
      }

      // Auto-stop expired timers
      for (const userId of timersToStop) {
        try {
          console.log(`[Heartbeat] Auto-stopping timer for user ${userId} (exceeded 10 hours)`)
          await this.timeEntryService.stopTimer(userId)
        } catch (err) {
          console.error(`[Heartbeat] Failed to auto-stop timer for user ${userId}:`, err)
        }
      }

      if (timersTobroadcast.length === 0) {
        return
      }

      // Get user info for remaining timers
      const userIds = [...new Set(timersTobroadcast.map(e => e.userId))]
      const users = await Promise.all(
        userIds.map(id => userRepository.findById(id))
      )
      const userMap = new Map(users.filter(Boolean).map(u => [u!.id, u!]))
      
      // Convert to public entries with calculated durations using server time
      const publicTimers = await Promise.all(
        timersTobroadcast.map(async (entry) => {
          const user = userMap.get(entry.userId)
          
          // Calculate current duration for active timers using server time
          let calculatedDuration = entry.duration
          if (entry.isActive && entry.startTime) {
            const start = new Date(entry.startTime)
            
            // Calculate elapsed time
            let elapsedMs = now.getTime() - start.getTime()
            
            // Subtract paused duration if any
            const pausedMs = entry.pausedDuration || 0
            
            // If currently paused, subtract current pause time
            if (entry.isPaused && entry.lastPausedAt) {
              const currentPauseMs = now.getTime() - new Date(entry.lastPausedAt).getTime()
              elapsedMs -= (pausedMs + currentPauseMs)
            } else {
              elapsedMs -= pausedMs
            }
            
            // Update duration in minutes
            calculatedDuration = Math.max(0, Math.floor(elapsedMs / 60000))
          }
          
          const publicTimer: PublicTimeEntry = {
            ...entry,
            duration: calculatedDuration,
            userName: user?.name || 'Unknown',
            userEmail: user?.email || '',
            canEdit: false, // Not relevant for heartbeat
          }
          return publicTimer
        })
      )

      if (publicTimers.length === 0) {
        return
      }

      // Emit to each user's personal room for targeted delivery
      publicTimers.forEach((timer) => {
        SocketEmitter.emitToRoom(
          userRoom(timer.userId),
          TimeEntrySocketEvents.TIMER_HEARTBEAT,
          { entry: timer, userId: timer.userId }
        )
      })
    } catch (error) {
      console.error('Error broadcasting timer heartbeat:', error)
      // Don't throw - keep the service running even if one broadcast fails
    }
  }
}

// Singleton instance
let heartbeatService: TimerHeartbeatService | null = null

/**
 * Get or create the heartbeat service singleton
 */
export function getTimerHeartbeatService(): TimerHeartbeatService {
  if (!heartbeatService) {
    heartbeatService = new TimerHeartbeatService()
  }
  return heartbeatService
}

/**
 * Start the heartbeat service (call on server startup)
 */
export function startTimerHeartbeat(): void {
  getTimerHeartbeatService().start()
}

/**
 * Stop the heartbeat service (call on server shutdown)
 */
export function stopTimerHeartbeat(): void {
  if (heartbeatService) {
    heartbeatService.stop()
  }
}

