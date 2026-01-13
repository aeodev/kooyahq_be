import type { TimeTrackerEndDayEmailData } from '../email.types'
import { COLORS, LOGO_URL } from './shared'

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
 * Get user initials from name
 */
function getUserInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
}

function formatPriority(priority: string): string {
  if (!priority) return 'N/A'
  return `${priority.charAt(0).toUpperCase()}${priority.slice(1)}`
}

/**
 * Generate HTML email template for time tracker end day summary
 */
export function generateTimeTrackerEndDayEmailHtml(data: TimeTrackerEndDayEmailData): string {
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
        ${entry.task || `<span style=\"color: ${COLORS.textMuted}; font-style: italic;\">No task specified</span>`}
      </td>
      <td style="padding: 16px; border-bottom: 1px solid ${COLORS.border};">
        ${entry.projects.length > 0
          ? entry.projects.map(p => `<span style=\"display: inline-block; padding: 4px 10px; background-color: ${COLORS.secondary}; color: ${COLORS.primaryDark}; font-size: 12px; font-weight: 500; margin-right: 6px; border: 1px solid ${COLORS.accent};\">${p}</span>`).join('')
          : `<span style=\"color: ${COLORS.textMuted};\">—</span>`}
      </td>
      <td style="padding: 16px; border-bottom: 1px solid ${COLORS.border}; text-align: right; font-weight: 600; color: ${COLORS.primary}; font-feature-settings: 'tnum';">
        ${formatDuration(entry.duration)}
      </td>
    </tr>
  `
    )
    .join('')

  const workspaceTickets = data.workspaceTickets || []
  const workspaceTicketsHtml = workspaceTickets
    .map(
      (ticket, index) => `
    <tr style="background-color: ${index % 2 === 0 ? COLORS.white : COLORS.background};">
      <td style="padding: 12px 14px; border-bottom: 1px solid ${COLORS.border};">
        <div style="font-weight: 600; color: ${COLORS.textDark};">${ticket.ticketKey}</div>
        <div style="font-size: 12px; color: ${COLORS.textMuted};">${ticket.project}</div>
      </td>
      <td style="padding: 12px 14px; border-bottom: 1px solid ${COLORS.border}; color: ${COLORS.textDark};">
        ${ticket.title}
      </td>
      <td style="padding: 12px 14px; border-bottom: 1px solid ${COLORS.border}; color: ${COLORS.textDark};">
        ${ticket.status || 'N/A'}
      </td>
      <td style="padding: 12px 14px; border-bottom: 1px solid ${COLORS.border}; text-align: right; font-weight: 600; color: ${COLORS.primary};">
        ${formatPriority(ticket.priority)}
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
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background-color: ${COLORS.white}; border: 1px solid ${COLORS.border}; overflow: hidden;">

          <!-- Header with Logo -->
          <tr>
            <td align="center" style="background-color: ${COLORS.primary}; padding: 48px 40px; border-bottom: 4px solid ${COLORS.primaryDark};">
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
                          <table role="presentation" cellpadding="0" cellspacing="0" width="48" height="48">
                            <tr>
                              <td align="center" valign="middle" style="width: 48px; height: 48px; background-color: ${COLORS.primary}; color: ${COLORS.white}; font-weight: 600; font-size: 17px;">
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
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${COLORS.secondary}; border: 1px solid ${COLORS.accent};">
                <tr>
                  <td style="padding: 28px 32px;">
                    <p style="margin: 0; font-size: 13px; color: ${COLORS.primaryDark}; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                      Total Time Logged
                    </p>
                    <p style="margin: 8px 0 0 0; font-size: 42px; font-weight: 700; color: ${COLORS.primary}; line-height: 1; font-family: Georgia, 'Times New Roman', serif;">
                      ${totalDurationFormatted}
                    </p>
                    <p style="margin: 8px 0 0 0; font-size: 14px; color: ${COLORS.primaryDark};">
                      ${hoursFormatted} hours | ${data.entryCount} ${data.entryCount === 1 ? 'entry' : 'entries'}
                    </p>
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
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border: 1px solid ${COLORS.border}; overflow: hidden;">
                <thead>
                  <tr style="background-color: ${COLORS.secondary};">
                    <th style="padding: 14px 16px; text-align: left; font-size: 12px; font-weight: 600; color: ${COLORS.primaryDark}; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid ${COLORS.primary};">
                      Task
                    </th>
                    <th style="padding: 14px 16px; text-align: left; font-size: 12px; font-weight: 600; color: ${COLORS.primaryDark}; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid ${COLORS.primary};">
                      Projects
                    </th>
                    <th style="padding: 14px 16px; text-align: right; font-size: 12px; font-weight: 600; color: ${COLORS.primaryDark}; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid ${COLORS.primary};">
                      Duration
                    </th>
                  </tr>
                </thead>
                <tbody>
                  ${entriesHtml}
                </tbody>
              </table>
              ` : `
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${COLORS.background}; border: 1px solid ${COLORS.border};">
                <tr>
                  <td align="center" style="padding: 48px 32px;">
                    <p style="margin: 0; font-size: 16px; color: ${COLORS.textLight};">
                      No time entries recorded for this day.
                    </p>
                  </td>
                </tr>
              </table>
              `}
            </td>
          </tr>

          <!-- Workspace Summary -->
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <p style="margin: 0 0 8px 0; font-family: Georgia, 'Times New Roman', serif; font-size: 20px; font-weight: 600; color: ${COLORS.textDark};">
                Workspace Summary
              </p>
              <p style="margin: 0 0 16px 0; font-size: 13px; color: ${COLORS.textLight};">
                Tickets assigned during your tracked time or currently assigned
              </p>
              ${workspaceTickets.length > 0 ? `
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border: 1px solid ${COLORS.border}; overflow: hidden;">
                <thead>
                  <tr style="background-color: ${COLORS.secondary};">
                    <th style="padding: 12px 14px; text-align: left; font-size: 12px; font-weight: 600; color: ${COLORS.primaryDark}; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid ${COLORS.primary};">
                      Ticket
                    </th>
                    <th style="padding: 12px 14px; text-align: left; font-size: 12px; font-weight: 600; color: ${COLORS.primaryDark}; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid ${COLORS.primary};">
                      Title
                    </th>
                    <th style="padding: 12px 14px; text-align: left; font-size: 12px; font-weight: 600; color: ${COLORS.primaryDark}; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid ${COLORS.primary};">
                      Status
                    </th>
                    <th style="padding: 12px 14px; text-align: right; font-size: 12px; font-weight: 600; color: ${COLORS.primaryDark}; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid ${COLORS.primary};">
                      Priority
                    </th>
                  </tr>
                </thead>
                <tbody>
                  ${workspaceTicketsHtml}
                </tbody>
              </table>
              ` : `
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${COLORS.background}; border: 1px solid ${COLORS.border};">
                <tr>
                  <td align="center" style="padding: 32px;">
                    <p style="margin: 0; font-size: 14px; color: ${COLORS.textLight};">
                      No workspace tickets assigned during this time.
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
                Automated Report | KooyaHQ Time Tracker
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
