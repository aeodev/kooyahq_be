import { sendEmail, sendBulkEmail } from '../../lib/sendgrid'
import type { AnnouncementEmailData, ServerStatusEmailData, TimeTrackerEndDayEmailData } from './email.types'
import {
  generateAnnouncementEmailHtml,
  generateServerStatusEmailHtml,
  generateTimeTrackerEndDayEmailHtml,
} from './templates'

export const emailService = {
  /**
   * Send announcement email to all users
   */
  async sendAnnouncementEmail(to: string[], data: AnnouncementEmailData): Promise<void> {
    if (to.length === 0) {
      console.warn('No recipients provided for announcement email')
      return
    }

    const html = generateAnnouncementEmailHtml(data)
    const subject = `New Announcement: ${data.title}`

    await sendBulkEmail({
      to,
      subject,
      html,
    })
  },

  /**
   * Send time tracker end day summary email to the user
   */
  async sendTimeTrackerEndDayEmail(data: TimeTrackerEndDayEmailData): Promise<void> {
    if (!data.userEmail) {
      console.warn('No user email provided for time tracker end day email')
      return
    }

    const html = generateTimeTrackerEndDayEmailHtml(data)
    const formattedDate = new Date(data.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    const subject = `Daily Time Summary - ${data.userName} - ${formattedDate}`

    await sendEmail({
      to: data.userEmail,
      subject,
      html,
    })
  },

  /**
   * Send server status alert email to selected users
   */
  async sendServerStatusEmail(to: string[], data: ServerStatusEmailData): Promise<void> {
    if (to.length === 0) {
      console.warn('No recipients provided for server status email')
      return
    }

    const html = generateServerStatusEmailHtml(data)
    const subject = `Server Status Update (${data.status.toUpperCase()}): ${data.serverName}`

    await sendBulkEmail({
      to,
      subject,
      html,
    })
  },
}
