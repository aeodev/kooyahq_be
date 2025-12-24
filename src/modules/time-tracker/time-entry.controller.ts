import { Request, Response } from 'express'
import { TimeEntryService, type ManualEntryInput, type StartTimerInput, type UpdateTimeEntryInput } from './time-entry.service'

const service = new TimeEntryService()

export async function getAllTodayEntries(req: Request, res: Response) {
  const entries = await service.getAllTodayEntries()
  const requestingUserId = req.user!.id

  // Set canEdit for each entry
  const entriesWithEdit = entries.map(entry => ({
    ...entry,
    canEdit: entry.userId === requestingUserId,
  }))

  res.json({ status: 'success', data: entriesWithEdit })
}

export async function getMyEntries(req: Request, res: Response) {
  const userId = req.user!.id
  const entries = await service.getUserEntries(userId)
  res.json({ status: 'success', data: entries })
}

export async function getActiveTimer(req: Request, res: Response) {
  const userId = req.user!.id
  const timer = await service.getActiveTimer(userId)
  if (!timer) {
    return res.json({ status: 'success', data: null })
  }
  res.json({ status: 'success', data: timer })
}

export async function startTimer(req: Request, res: Response) {
  const userId = req.user!.id
  const input: StartTimerInput = req.body

  if (!input.projects || !Array.isArray(input.projects) || input.projects.length === 0) {
    return res.status(400).json({ status: 'error', message: 'Projects array is required' })
  }

  // Task is optional - allow empty string
  const entry = await service.startTimer(userId, input)
  res.json({ status: 'success', data: entry })
}

export async function addTask(req: Request, res: Response) {
  const userId = req.user!.id
  const { task } = req.body

  if (!task || !task.trim()) {
    return res.status(400).json({ status: 'error', message: 'Task text is required' })
  }

  const entry = await service.addTaskToActiveTimer(userId, task)
  res.json({ status: 'success', data: entry })
}

export async function getDayEndedStatus(req: Request, res: Response) {
  const userId = req.user!.id
  const today = new Date()
  const dayEndedAt = await service.getDayEndedAt(userId, today)
  
  res.json({ 
    status: 'success', 
    data: { 
      dayEnded: dayEndedAt !== null,
      endedAt: dayEndedAt?.toISOString() || null
    } 
  })
}

export async function pauseTimer(req: Request, res: Response) {
  const userId = req.user!.id
  const entry = await service.pauseTimer(userId)
  
  if (!entry) {
    return res.status(404).json({ status: 'error', message: 'No active timer found' })
  }

  res.json({ status: 'success', data: entry })
}

export async function resumeTimer(req: Request, res: Response) {
  const userId = req.user!.id
  const entry = await service.resumeTimer(userId)
  
  if (!entry) {
    return res.status(404).json({ status: 'error', message: 'No paused timer found' })
  }

  res.json({ status: 'success', data: entry })
}

export async function stopTimer(req: Request, res: Response) {
  const userId = req.user!.id
  const entry = await service.stopTimer(userId)

  if (!entry) {
    return res.status(404).json({ status: 'error', message: 'No active timer found' })
  }

  res.json({ status: 'success', data: entry })
}

/**
 * Emergency stop endpoint for client-side auto-stop during page unload
 * Uses sendBeacon which may not include auth headers, so we get userId from body
 */
export async function emergencyStopTimer(req: Request, res: Response) {
  try {
    const { userId } = req.body

    if (!userId) {
      return res.status(400).json({ status: 'error', message: 'User ID required' })
    }

    // Validate userId format (basic check)
    if (typeof userId !== 'string' || userId.length !== 24) {
      return res.status(400).json({ status: 'error', message: 'Invalid user ID format' })
    }

    const entry = await service.stopTimer(userId)

    if (!entry) {
      return res.status(404).json({ status: 'error', message: 'No active timer found' })
    }

    res.json({ status: 'success', data: entry })
  } catch (error) {
    // Emergency endpoint - don't fail loudly, just log and return success
    console.error('Emergency stop timer error:', error)
    res.status(200).json({ status: 'success', message: 'Emergency stop processed' })
  }
}

export async function endDay(req: Request, res: Response) {
  const userId = req.user!.id
  const entries = await service.endDay(userId)
  
  res.json({ status: 'success', data: entries, message: 'All timers stopped for the day' })
}

export async function logManualEntry(req: Request, res: Response) {
  const userId = req.user!.id
  const input: ManualEntryInput = req.body

  if (!input.projects || !Array.isArray(input.projects) || input.projects.length === 0) {
    return res.status(400).json({ status: 'error', message: 'Projects array is required' })
  }

  if (!input.task || !input.task.trim()) {
    return res.status(400).json({ status: 'error', message: 'Task description is required' })
  }

  if (!input.duration || input.duration <= 0) {
    return res.status(400).json({ status: 'error', message: 'Duration must be greater than 0' })
  }

  const entry = await service.logManualEntry(userId, input)
  res.json({ status: 'success', data: entry })
}

export async function updateEntry(req: Request, res: Response) {
  const userId = req.user!.id
  const entryId = req.params.id
  const updates: UpdateTimeEntryInput = req.body

  const entry = await service.update(userId, entryId, updates)
  res.json({ status: 'success', data: entry })
}

export async function deleteEntry(req: Request, res: Response) {
  const userId = req.user!.id
  const entryId = req.params.id

  await service.delete(userId, entryId)
  res.json({ status: 'success', message: 'Time entry deleted' })
}

export async function getAnalytics(req: Request, res: Response) {
  const userId = req.query.userId === 'me' ? req.user!.id : (req.query.userId as string | undefined) || null
  let startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date()
  let endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date()

  // Default to last 15 days if no dates provided
  if (!req.query.startDate) {
    startDate.setDate(startDate.getDate() - 15)
    startDate.setHours(0, 0, 0, 0)
  } else {
    // Normalize provided startDate to beginning of day
    startDate.setHours(0, 0, 0, 0)
  }
  
  if (!req.query.endDate) {
    endDate.setHours(23, 59, 59, 999)
  } else {
    // Normalize provided endDate to end of day
    endDate.setHours(23, 59, 59, 999)
  }

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return res.status(400).json({ status: 'error', message: 'Invalid date format' })
  }

  if (startDate > endDate) {
    return res.status(400).json({ status: 'error', message: 'Start date must be before end date' })
  }

  const analytics = await service.getAnalytics(userId, startDate, endDate)
  res.json({ status: 'success', data: analytics })
}

export async function getMyEntriesByDateRange(req: Request, res: Response) {
  const userId = req.user!.id
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date()
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date()

  // Default to today if no dates provided
  if (!req.query.startDate) {
    startDate.setHours(0, 0, 0, 0)
  }
  if (!req.query.endDate) {
    endDate.setHours(23, 59, 59, 999)
  }

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return res.status(400).json({ status: 'error', message: 'Invalid date format' })
  }

  if (startDate > endDate) {
    return res.status(400).json({ status: 'error', message: 'Start date must be before end date' })
  }

  const entries = await service.getUserEntriesByDateRange(userId, startDate, endDate)
  res.json({ status: 'success', data: entries })
}

