import type { AnnouncementEmailData } from '../email.types'
import { COLORS, FRONTEND_URL, LOGO_URL } from './shared'

/**
 * Get author initials from name
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase())
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
export function generateAnnouncementEmailHtml(data: AnnouncementEmailData): string {
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
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background-color: ${COLORS.white}; border: 1px solid ${COLORS.border}; overflow: hidden;">

          <!-- Header with Logo -->
          <tr>
            <td align="center" style="background-color: ${COLORS.primary}; padding: 48px 40px; border-bottom: 4px solid ${COLORS.primaryDark};">
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

              <!-- Quote Block -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 32px;">
                <tr>
                  <td style="border-left: 4px solid ${COLORS.primary}; background-color: ${COLORS.secondary}; padding: 24px;">
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
                        <!-- Avatar Square -->
                        <td style="vertical-align: middle; padding-right: 14px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" width="44" height="44">
                            <tr>
                              <td align="center" valign="middle" style="width: 44px; height: 44px; background-color: ${COLORS.primary}; color: ${COLORS.white}; font-weight: 600; font-size: 15px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
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
            <td align="center" style="background-color: ${COLORS.background}; padding: 32px 40px; border-top: 1px solid ${COLORS.border};">

              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="background-color: ${COLORS.primary};">
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
