import { sendEmail, sendBulkEmail } from '../../lib/sendgrid'
import type { AnnouncementEmailData, TimeTrackerEndDayEmailData } from './email.types'

const TIME_TRACKER_RECIPIENT = 'julius@kooya.ph'

// Brand Colors
const COLORS = {
  primary: '#15803d', // Green 700
  primaryDark: '#14532d', // Green 900
  primaryLight: '#22c55e', // Green 500
  secondary: '#f0fdf4', // Green 50
  accent: '#dcfce7', // Green 100
  text: '#1f2937', // Gray 800
  textDark: '#111827', // Gray 900
  textLight: '#6b7280', // Gray 500
  textMuted: '#9ca3af', // Gray 400
  background: '#f9fafb', // Gray 50
  white: '#ffffff',
  border: '#e5e7eb', // Gray 200
}

// Brand Assets - Using PNG format for email client compatibility (webp not supported in Outlook)
const LOGO_URL = 'https://res.cloudinary.com/ddqmsq56q/image/upload/f_png/kooya-logo-white_v9yowu'

// Frontend URL for "View in App" button
const FRONTEND_URL = process.env.CLIENT_URL?.split(',')[0] || 'https://app.kooya.ph'

/**
 * Format minutes to hours and minutes string
 */
function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) {
    return `${mins}m`
  }
  if (mins === 0) {
    return `${hours}h`
  }
  return `${hours}h ${mins}m`
}

/**
 * Common Email CSS styles
 */
const STYLES = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: ${COLORS.text}; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; background-color: ${COLORS.background}; }
  .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
  .card { background-color: ${COLORS.white}; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); overflow: hidden; }
  .header { background-color: ${COLORS.primary}; padding: 32px 40px; text-align: center; }
  .header h1 { color: ${COLORS.white}; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.025em; }
  .content { padding: 40px; }
  .footer { text-align: center; margin-top: 32px; color: ${COLORS.textLight}; font-size: 13px; }
  .label { color: ${COLORS.textLight}; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; margin-bottom: 4px; }
  .value { color: ${COLORS.text}; font-size: 16px; font-weight: 500; margin-bottom: 24px; }
  .divider { height: 1px; background-color: ${COLORS.border}; margin: 32px 0; }
  h2 { color: ${COLORS.primaryDark}; font-size: 20px; font-weight: 600; margin-top: 0; margin-bottom: 16px; }
  a { color: ${COLORS.primary}; text-decoration: none; }
  .table-container { border: 1px solid ${COLORS.border}; border-radius: 8px; overflow: hidden; }
  table { width: 100%; border-collapse: collapse; }
  th { background-color: ${COLORS.secondary}; color: ${COLORS.primaryDark}; font-weight: 600; text-align: left; padding: 12px 16px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; }
  td { padding: 16px; border-top: 1px solid ${COLORS.border}; font-size: 14px; color: ${COLORS.text}; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; background-color: ${COLORS.secondary}; color: ${COLORS.primaryDark}; font-size: 12px; font-weight: 500; }
`

/**
 * Get author initials from name
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

/**
 * Format posted time relative to now
 */
function formatPostedTime(date?: Date): string {
  if (!date) return 'Posted just now'
  
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return 'Posted just now'
  if (minutes < 60) return `Posted ${minutes} minute${minutes === 1 ? '' : 's'} ago`
  if (hours < 24) return `Posted ${hours} hour${hours === 1 ? '' : 's'} ago`
  if (days < 7) return `Posted ${days} day${days === 1 ? '' : 's'} ago`
  
  return `Posted on ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
}

/**
 * Generate HTML email template for announcements
 */
function generateAnnouncementEmailHtml(data: AnnouncementEmailData): string {
  const initials = data.authorInitials || getInitials(data.authorName)
  const postedTime = formatPostedTime(data.postedAt)
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>New Announcement: ${data.title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body { margin: 0; padding: 0; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: 100%; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${COLORS.background}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  
  <!-- Wrapper Table -->
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${COLORS.background};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        
        <!-- Main Card -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background-color: ${COLORS.white}; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1); overflow: hidden;">
          
          <!-- Header with Logo and Gradient -->
          <tr>
            <td align="center" style="background: linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%); padding: 48px 40px;">
              <img src="${LOGO_URL}" alt="KooyaHQ" width="140" style="display: block; margin-bottom: 20px;" />
              <h1 style="margin: 0; color: ${COLORS.white}; font-family: Georgia, 'Times New Roman', serif; font-size: 28px; font-weight: 400; letter-spacing: -0.5px;">
                New Announcement
              </h1>
            </td>
          </tr>
          
          <!-- Content Section -->
          <tr>
            <td style="padding: 40px;">
              
              <!-- Title -->
              <h2 style="margin: 0 0 24px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 26px; font-weight: 600; color: ${COLORS.textDark}; line-height: 1.3;">
                ${data.title}
              </h2>
              
              <!-- Quote Block with Gradient -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 32px;">
                <tr>
                  <td style="border-left: 3px solid ${COLORS.primaryLight}; background: linear-gradient(to right, ${COLORS.secondary}, ${COLORS.white}); padding: 24px; border-radius: 0 8px 8px 0;">
                    <p style="margin: 0; font-size: 16px; line-height: 1.7; color: #374151;">
                      ${data.content.replace(/\n/g, '<br>')}
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Divider -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="border-top: 1px solid ${COLORS.border}; padding-top: 24px;">
                    
                    <!-- Author Section -->
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <!-- Avatar Circle -->
                        <td style="vertical-align: middle; padding-right: 14px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" width="48" height="48">
                            <tr>
                              <td align="center" valign="middle" style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, ${COLORS.primaryLight}, ${COLORS.primary}); color: ${COLORS.white}; font-weight: 600; font-size: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                                ${initials}
                              </td>
                            </tr>
                          </table>
                        </td>
                        <!-- Author Info -->
                        <td style="vertical-align: middle;">
                          <p style="margin: 0; font-weight: 600; font-size: 15px; color: ${COLORS.textDark};">
                            ${data.authorName}
                          </p>
                          <p style="margin: 4px 0 0 0; font-size: 13px; color: ${COLORS.textLight};">
                            ${postedTime}
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                  </td>
                </tr>
              </table>
              
            </td>
          </tr>
          
          <!-- Footer with CTA -->
          <tr>
            <td align="center" style="background-color: ${COLORS.background}; padding: 32px 40px;">
              
              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="border-radius: 8px; background: linear-gradient(135deg, ${COLORS.primaryLight}, ${COLORS.primary});">
                    <a href="${FRONTEND_URL}" target="_blank" style="display: inline-block; padding: 14px 36px; font-size: 15px; font-weight: 600; color: ${COLORS.white}; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      View in KooyaHQ
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Copyright -->
              <p style="margin: 28px 0 0 0; font-size: 12px; color: ${COLORS.textMuted};">
                &copy; ${new Date().getFullYear()} KooyaHQ. All rights reserved.
              </p>
              
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>
  `.trim()
}

/**
 * Get user initials from name
 */
function getUserInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

/**
 * Generate HTML email template for time tracker end day summary
 */
function generateTimeTrackerEndDayEmailHtml(data: TimeTrackerEndDayEmailData): string {
  const formattedDate = new Date(data.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const shortDate = new Date(data.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

  const totalDurationFormatted = formatDuration(data.totalMinutes)
  const hoursFormatted = (data.totalMinutes / 60).toFixed(2)
  const userInitials = getUserInitials(data.userName)

  const entriesHtml = data.entries
    .map(
      (entry, index) => `
    <tr style="background-color: ${index % 2 === 0 ? COLORS.white : COLORS.background};">
      <td style="padding: 16px; border-bottom: 1px solid ${COLORS.border}; font-weight: 500; color: ${COLORS.textDark};">
        ${entry.task || `<span style="color: ${COLORS.textMuted}; font-style: italic;">No task specified</span>`}
      </td>
      <td style="padding: 16px; border-bottom: 1px solid ${COLORS.border};">
        ${entry.projects.length > 0 
          ? entry.projects.map(p => `<span style="display: inline-block; padding: 4px 10px; background: linear-gradient(135deg, ${COLORS.secondary}, ${COLORS.accent}); color: ${COLORS.primaryDark}; border-radius: 12px; font-size: 12px; font-weight: 500; margin-right: 6px;">${p}</span>`).join('') 
          : `<span style="color: ${COLORS.textMuted};">—</span>`}
      </td>
      <td style="padding: 16px; border-bottom: 1px solid ${COLORS.border}; text-align: right; font-weight: 600; color: ${COLORS.primary}; font-feature-settings: 'tnum';">
        ${formatDuration(entry.duration)}
      </td>
    </tr>
  `
    )
    .join('')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Daily Time Summary - ${data.userName}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body { margin: 0; padding: 0; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: 100%; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${COLORS.background}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  
  <!-- Wrapper Table -->
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${COLORS.background};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        
        <!-- Main Card -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background-color: ${COLORS.white}; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1); overflow: hidden;">
          
          <!-- Header with Logo and Gradient -->
          <tr>
            <td align="center" style="background: linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%); padding: 48px 40px;">
              <img src="${LOGO_URL}" alt="KooyaHQ" width="140" style="display: block; margin-bottom: 20px;" />
              <h1 style="margin: 0; color: ${COLORS.white}; font-family: Georgia, 'Times New Roman', serif; font-size: 28px; font-weight: 400; letter-spacing: -0.5px;">
                Daily Time Summary
              </h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.85); font-size: 15px;">
                ${shortDate}
              </p>
            </td>
          </tr>
          
          <!-- Employee Info Section -->
          <tr>
            <td style="padding: 32px 40px 0 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <!-- Employee Avatar + Name -->
                  <td style="vertical-align: middle;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align: middle; padding-right: 14px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" width="52" height="52">
                            <tr>
                              <td align="center" valign="middle" style="width: 52px; height: 52px; border-radius: 50%; background: linear-gradient(135deg, ${COLORS.primaryLight}, ${COLORS.primary}); color: ${COLORS.white}; font-weight: 600; font-size: 18px;">
                                ${userInitials}
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td style="vertical-align: middle;">
                          <p style="margin: 0; font-weight: 600; font-size: 17px; color: ${COLORS.textDark};">
                            ${data.userName}
                          </p>
                          <p style="margin: 4px 0 0 0; font-size: 14px; color: ${COLORS.textLight};">
                            ${data.userEmail}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <!-- Date -->
                  <td align="right" style="vertical-align: middle;">
                    <p style="margin: 0; font-size: 13px; color: ${COLORS.textLight}; text-transform: uppercase; letter-spacing: 0.5px;">
                      Date
                    </p>
                    <p style="margin: 4px 0 0 0; font-size: 15px; font-weight: 500; color: ${COLORS.textDark};">
                      ${formattedDate}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Total Time Card -->
          <tr>
            <td style="padding: 24px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, ${COLORS.secondary} 0%, ${COLORS.accent} 100%); border-radius: 12px; border: 1px solid ${COLORS.primaryLight}20;">
                <tr>
                  <td style="padding: 28px 32px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td>
                          <p style="margin: 0; font-size: 13px; color: ${COLORS.primaryDark}; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                            Total Time Logged
                          </p>
                          <p style="margin: 8px 0 0 0; font-size: 42px; font-weight: 700; color: ${COLORS.primary}; line-height: 1; font-family: Georgia, 'Times New Roman', serif;">
                            ${totalDurationFormatted}
                          </p>
                          <p style="margin: 8px 0 0 0; font-size: 14px; color: ${COLORS.primaryDark};">
                            ${hoursFormatted} hours • ${data.entryCount} ${data.entryCount === 1 ? 'entry' : 'entries'}
                          </p>
                        </td>
                        <td align="right" valign="middle">
                          <!-- Clock Icon -->
                          <div style="width: 64px; height: 64px; border-radius: 50%; background: ${COLORS.white}; display: inline-block; text-align: center; line-height: 64px;">
                            <span style="font-size: 28px;">⏱️</span>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Time Entries Table -->
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              ${data.entries.length > 0 ? `
              <p style="margin: 0 0 16px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 20px; font-weight: 600; color: ${COLORS.textDark};">
                Time Entries
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border: 1px solid ${COLORS.border}; border-radius: 12px; overflow: hidden;">
                <thead>
                  <tr style="background: linear-gradient(135deg, ${COLORS.secondary}, ${COLORS.accent});">
                    <th style="padding: 14px 16px; text-align: left; font-size: 12px; font-weight: 600; color: ${COLORS.primaryDark}; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid ${COLORS.primaryLight};">
                      Task
                    </th>
                    <th style="padding: 14px 16px; text-align: left; font-size: 12px; font-weight: 600; color: ${COLORS.primaryDark}; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid ${COLORS.primaryLight};">
                      Projects
                    </th>
                    <th style="padding: 14px 16px; text-align: right; font-size: 12px; font-weight: 600; color: ${COLORS.primaryDark}; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid ${COLORS.primaryLight};">
                      Duration
                    </th>
                  </tr>
                </thead>
                <tbody>
                  ${entriesHtml}
                </tbody>
              </table>
              ` : `
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${COLORS.background}; border-radius: 12px;">
                <tr>
                  <td align="center" style="padding: 48px 32px;">
                    <p style="margin: 0; font-size: 40px;">📭</p>
                    <p style="margin: 16px 0 0 0; font-size: 16px; color: ${COLORS.textLight};">
                      No time entries recorded for this day.
                    </p>
                  </td>
                </tr>
              </table>
              `}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="background-color: ${COLORS.background}; padding: 28px 40px; border-top: 1px solid ${COLORS.border};">
              <p style="margin: 0; font-size: 13px; color: ${COLORS.textMuted};">
                Automated Report • KooyaHQ Time Tracker
              </p>
              <p style="margin: 12px 0 0 0; font-size: 12px; color: ${COLORS.textMuted};">
                &copy; ${new Date().getFullYear()} KooyaHQ. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>
  `.trim()
}

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
   * Send time tracker end day summary email to julius@kooya.ph
   */
  async sendTimeTrackerEndDayEmail(data: TimeTrackerEndDayEmailData): Promise<void> {
    const html = generateTimeTrackerEndDayEmailHtml(data)
    const formattedDate = new Date(data.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    const subject = `Daily Time Summary - ${data.userName} - ${formattedDate}`

    await sendEmail({
      to: TIME_TRACKER_RECIPIENT,
      subject,
      html,
    })
  },
}
