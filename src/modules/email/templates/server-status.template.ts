import type { ServerStatusEmailData } from '../email.types'
import { COLORS, FRONTEND_URL, LOGO_URL } from './shared'

const STATUS_STYLES = {
  warning: {
    label: 'Warning',
    accent: '#d97706', // Amber 600
    background: '#fffbeb', // Amber 50
    border: '#fde68a', // Amber 200
  },
  danger: {
    label: 'Danger',
    accent: '#dc2626', // Red 600
    background: '#fef2f2', // Red 50
    border: '#fecaca', // Red 200
  },
  starting: {
    label: 'Starting',
    accent: '#2563eb', // Blue 600
    background: '#eff6ff', // Blue 50
    border: '#bfdbfe', // Blue 200
  },
  restarting: {
    label: 'Restarting',
    accent: '#0284c7', // Sky 600
    background: '#e0f2fe', // Sky 100
    border: '#bae6fd', // Sky 200
  },
  shutdown: {
    label: 'Shutdown',
    accent: '#6b7280', // Gray 500
    background: '#f3f4f6', // Gray 100
    border: '#e5e7eb', // Gray 200
  },
} as const

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function generateServerStatusEmailHtml(data: ServerStatusEmailData): string {
  const statusStyle = STATUS_STYLES[data.status] ?? STATUS_STYLES.warning
  const receivedAtRaw = data.receivedAt ? new Date(data.receivedAt) : new Date()
  const receivedAt = Number.isNaN(receivedAtRaw.getTime()) ? new Date() : receivedAtRaw
  const receivedLabel = receivedAt.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  const project = escapeHtml(data.project)
  const serverName = escapeHtml(data.serverName)
  const container = data.container ? escapeHtml(data.container) : ''
  const cpu = escapeHtml(data.cpu)
  const memory = escapeHtml(data.memory)
  const appUrl = escapeHtml(data.appUrl || `${FRONTEND_URL}/server-management`)

  const containerRow = data.container
    ? `
                <tr>
                  <td style="padding: 12px 14px; background-color: ${COLORS.secondary}; font-weight: 600; font-size: 13px; color: ${COLORS.textDark};">
                    Container
                  </td>
                  <td style="padding: 12px 14px; font-size: 14px; color: ${COLORS.text};">
                    ${container}
                  </td>
                </tr>
      `.trim()
    : ''

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Server Status Update - ${statusStyle.label}</title>
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

  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${COLORS.background};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; background-color: ${COLORS.white}; border: 1px solid ${COLORS.border}; overflow: hidden;">
          <tr>
            <td align="center" style="background-color: ${COLORS.primary}; padding: 40px 32px; border-bottom: 4px solid ${COLORS.primaryDark};">
              <img src="${LOGO_URL}" alt="KooyaHQ" width="140" style="display: block; margin-bottom: 18px;" />
              <h1 style="margin: 0; color: ${COLORS.white}; font-family: Georgia, 'Times New Roman', serif; font-size: 26px; font-weight: 400; letter-spacing: -0.3px;">
                Server Status Update
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding: 32px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <span style="display: inline-block; padding: 4px 10px; border-radius: 9999px; background-color: ${statusStyle.background}; color: ${statusStyle.accent}; border: 1px solid ${statusStyle.border}; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                      ${statusStyle.label}
                    </span>
                  </td>
                  <td align="right" style="font-size: 12px; color: ${COLORS.textLight};">
                    ${escapeHtml(receivedLabel)}
                  </td>
                </tr>
              </table>

              <p style="margin: 16px 0 24px 0; font-size: 15px; color: ${COLORS.text};">
                The server monitor reported a ${statusStyle.label.toLowerCase()} update. Review the details below.
              </p>

              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border: 1px solid ${COLORS.border}; border-collapse: collapse;">
                <tr>
                  <td style="padding: 12px 14px; background-color: ${COLORS.secondary}; font-weight: 600; font-size: 13px; color: ${COLORS.textDark};">
                    Project
                  </td>
                  <td style="padding: 12px 14px; font-size: 14px; color: ${COLORS.text};">
                    ${project}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 14px; background-color: ${COLORS.background}; font-weight: 600; font-size: 13px; color: ${COLORS.textDark};">
                    Server
                  </td>
                  <td style="padding: 12px 14px; font-size: 14px; color: ${COLORS.text};">
                    ${serverName}
                  </td>
                </tr>
                ${containerRow}
                <tr>
                  <td style="padding: 12px 14px; background-color: ${COLORS.secondary}; font-weight: 600; font-size: 13px; color: ${COLORS.textDark};">
                    CPU
                  </td>
                  <td style="padding: 12px 14px; font-size: 14px; color: ${COLORS.text};">
                    ${cpu}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 14px; background-color: ${COLORS.background}; font-weight: 600; font-size: 13px; color: ${COLORS.textDark};">
                    Memory
                  </td>
                  <td style="padding: 12px 14px; font-size: 14px; color: ${COLORS.text};">
                    ${memory}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td align="center" style="background-color: ${COLORS.background}; padding: 28px 40px; border-top: 1px solid ${COLORS.border};">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="background-color: ${COLORS.primary};">
                    <a href="${appUrl}" target="_blank" style="display: inline-block; padding: 12px 30px; font-size: 14px; font-weight: 600; color: ${COLORS.white}; text-decoration: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      View in KooyaHQ
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 18px 0 0 0; font-size: 12px; color: ${COLORS.textMuted};">
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
