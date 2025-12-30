/**
 * Email template data types
 */

export interface AnnouncementEmailData {
  title: string
  content: string
  authorName: string
  authorInitials?: string  // For avatar circle
  postedAt?: Date          // For timestamp display
}

export interface TimeTrackerEndDayEmailData {
  userName: string
  userEmail: string
  date: string
  totalHours: number
  totalMinutes: number
  entryCount: number
  entries: Array<{
    task: string
    projects: string[]
    duration: number // in minutes
  }>
}

