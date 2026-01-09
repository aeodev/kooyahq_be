import type {
  ServerStatusAlert,
  ServerStatusContainerAlert,
  ServerStatusEmailData,
  ServerStatusHealthChange,
  ServerStatusLevel,
  ServerStatusRiskLevel,
} from '../email.types'
import { COLORS, FRONTEND_URL, LOGO_URL } from './shared'

type StatusStyle = {
  label: string
  accent: string
  background: string
  border: string
}

const STATUS_STYLES: Record<ServerStatusLevel, StatusStyle> = {
  healthy: {
    label: 'Healthy',
    accent: '#059669', // Emerald 600
    background: '#ecfdf5', // Emerald 50
    border: '#a7f3d0', // Emerald 200
  },
  info: {
    label: 'Info',
    accent: '#0284c7', // Sky 600
    background: '#e0f2fe', // Sky 100
    border: '#bae6fd', // Sky 200
  },
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
  critical: {
    label: 'Critical',
    accent: '#7c2d12', // Orange 900
    background: '#fef2f2', // Red 50
    border: '#f87171', // Red 400
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
}

const RISK_STYLES: Record<ServerStatusRiskLevel, StatusStyle> = {
  info: {
    label: 'Info',
    accent: '#0284c7',
    background: '#e0f2fe',
    border: '#bae6fd',
  },
  warning: {
    label: 'Warning',
    accent: '#d97706',
    background: '#fffbeb',
    border: '#fde68a',
  },
  danger: {
    label: 'Danger',
    accent: '#dc2626',
    background: '#fef2f2',
    border: '#fecaca',
  },
  critical: {
    label: 'Critical',
    accent: '#7c2d12',
    background: '#fef2f2',
    border: '#f87171',
  },
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  return `${days}d ${hours}h`
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'N/A'
  return `${value.toFixed(1)}%`
}

function renderAlertRow(alert: ServerStatusAlert | ServerStatusContainerAlert, index: number): string {
  const riskStyle = RISK_STYLES[alert.risk] || RISK_STYLES.info
  const bgColor = index % 2 === 0 ? COLORS.background : COLORS.secondary

  return `
    <tr>
      <td style="padding: 10px 14px; background-color: ${bgColor}; vertical-align: top;">
        <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background-color: ${riskStyle.background}; color: ${riskStyle.accent}; border: 1px solid ${riskStyle.border}; font-size: 10px; font-weight: 700; text-transform: uppercase;">
          ${escapeHtml(alert.risk)}
        </span>
      </td>
      <td style="padding: 10px 14px; background-color: ${bgColor};">
        <div style="font-weight: 600; font-size: 13px; color: ${COLORS.textDark}; margin-bottom: 2px;">
          ${escapeHtml(alert.title)}
        </div>
        <div style="font-size: 12px; color: ${COLORS.text};">
          ${escapeHtml(alert.message)}
        </div>
      </td>
    </tr>
  `.trim()
}

function renderHealthChangeRow(change: ServerStatusHealthChange, index: number): string {
  const riskStyle = RISK_STYLES[change.risk] || RISK_STYLES.info
  const bgColor = index % 2 === 0 ? COLORS.background : COLORS.secondary
  const arrow = change.from && change.to ? '→' : ''
  const fromTo = change.from || change.to ? `${change.from || '—'} ${arrow} ${change.to || '—'}` : ''

  return `
    <tr>
      <td style="padding: 10px 14px; background-color: ${bgColor}; vertical-align: top;">
        <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background-color: ${riskStyle.background}; color: ${riskStyle.accent}; border: 1px solid ${riskStyle.border}; font-size: 10px; font-weight: 700; text-transform: uppercase;">
          ${escapeHtml(change.scope)}
        </span>
      </td>
      <td style="padding: 10px 14px; background-color: ${bgColor};">
        <div style="font-weight: 600; font-size: 13px; color: ${COLORS.textDark}; margin-bottom: 2px;">
          ${escapeHtml(change.name)}
        </div>
        <div style="font-size: 12px; color: ${COLORS.text};">
          ${escapeHtml(change.message)}
          ${fromTo ? `<span style="font-family: monospace; font-size: 11px; color: ${COLORS.textMuted};"> (${escapeHtml(fromTo)})</span>` : ''}
        </div>
      </td>
    </tr>
  `.trim()
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
  const hostname = data.hostname ? escapeHtml(data.hostname) : serverName
  const container = data.container ? escapeHtml(data.container) : ''
  const appUrl = escapeHtml(data.appUrl || `${FRONTEND_URL}/server-management`)

  // Metrics
  const metrics = data.metrics
  const cpuCurrent = metrics?.cpu?.current_percent
  const cpuAvg = metrics?.cpu?.average_15m_percent
  const memCurrent = metrics?.memory?.current_percent
  const memAvg = metrics?.memory?.average_15m_percent
  const memUsed = metrics?.memory?.used_bytes || 0
  const memTotal = metrics?.memory?.total_bytes || 0

  // Format CPU/Memory display
  const cpuDisplay = cpuCurrent !== null && cpuCurrent !== undefined ? formatPercent(cpuCurrent) : 'N/A'
  const memDisplay = memCurrent !== null && memCurrent !== undefined ? formatPercent(memCurrent) : 'N/A'

  // Alert summary
  const alertSummary = data.alert_summary
  const totalAlerts = alertSummary?.total || 0
  const criticalCount = alertSummary?.by_risk?.critical || 0
  const dangerCount = alertSummary?.by_risk?.danger || 0
  const warningCount = alertSummary?.by_risk?.warning || 0

  // Containers
  const containers = data.containers
  const totalContainers = containers?.total || 0
  const runningContainers = containers?.running || 0
  const stoppedContainers = containers?.stopped || 0
  const restartingContainers = containers?.restarting || 0

  // Alerts
  const instanceAlerts = data.instance_alerts || []
  const containerAlerts = data.container_alerts || []
  const healthChanges = data.health_changes || []

  // Lifecycle event
  const isLifecycleEvent =
    data.lifecycle_event === 'starting' || data.lifecycle_event === 'shutdown' || data.lifecycle_event === 'restarting'

  // Build sections
  const containerRow = container
    ? `
    <tr>
      <td style="padding: 12px 14px; background-color: ${COLORS.secondary}; font-weight: 600; font-size: 13px; color: ${COLORS.textDark}; width: 120px;">
        Container
      </td>
      <td style="padding: 12px 14px; font-size: 14px; color: ${COLORS.text};">
        ${container}
      </td>
    </tr>
  `.trim()
    : ''

  const uptimeRow =
    data.uptime_seconds !== undefined
      ? `
    <tr>
      <td style="padding: 12px 14px; background-color: ${COLORS.background}; font-weight: 600; font-size: 13px; color: ${COLORS.textDark}; width: 120px;">
        Uptime
      </td>
      <td style="padding: 12px 14px; font-size: 14px; color: ${COLORS.text};">
        ${formatUptime(data.uptime_seconds)}
      </td>
    </tr>
  `.trim()
      : ''

  // Metrics section with averages
  const metricsSection =
    metrics && !isLifecycleEvent
      ? `
    <tr>
      <td style="padding: 24px 40px 0 40px;">
        <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: ${COLORS.textDark}; text-transform: uppercase; letter-spacing: 0.5px;">
          Resource Metrics
        </h3>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border: 1px solid ${COLORS.border}; border-collapse: collapse;">
          <tr>
            <td style="padding: 12px 14px; background-color: ${COLORS.secondary}; font-weight: 600; font-size: 13px; color: ${COLORS.textDark}; width: 120px;">
              CPU
            </td>
            <td style="padding: 12px 14px; font-size: 14px; color: ${COLORS.text};">
              <span style="font-weight: 600;">${cpuDisplay}</span>
              ${cpuAvg !== null && cpuAvg !== undefined ? `<span style="color: ${COLORS.textMuted}; font-size: 12px; margin-left: 8px;">(15m avg: ${formatPercent(cpuAvg)})</span>` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 14px; background-color: ${COLORS.background}; font-weight: 600; font-size: 13px; color: ${COLORS.textDark}; width: 120px;">
              Memory
            </td>
            <td style="padding: 12px 14px; font-size: 14px; color: ${COLORS.text};">
              <span style="font-weight: 600;">${memDisplay}</span>
              ${memAvg !== null && memAvg !== undefined ? `<span style="color: ${COLORS.textMuted}; font-size: 12px; margin-left: 8px;">(15m avg: ${formatPercent(memAvg)})</span>` : ''}
              ${memTotal > 0 ? `<br/><span style="color: ${COLORS.textMuted}; font-size: 11px;">${formatBytes(memUsed)} / ${formatBytes(memTotal)}</span>` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `.trim()
      : ''

  // Alert summary badge
  const alertSummaryBadge =
    totalAlerts > 0
      ? `
    <div style="margin-top: 16px; padding: 12px; background-color: ${criticalCount > 0 ? '#fef2f2' : dangerCount > 0 ? '#fef2f2' : '#fffbeb'}; border: 1px solid ${criticalCount > 0 ? '#f87171' : dangerCount > 0 ? '#fecaca' : '#fde68a'}; border-radius: 6px;">
      <div style="font-weight: 600; font-size: 13px; color: ${COLORS.textDark}; margin-bottom: 6px;">
        Alert Summary: ${totalAlerts} alert${totalAlerts !== 1 ? 's' : ''}
      </div>
      <div style="font-size: 12px; color: ${COLORS.text};">
        ${criticalCount > 0 ? `<span style="color: #7c2d12; font-weight: 600;">${criticalCount} critical</span>` : ''}
        ${dangerCount > 0 ? `<span style="color: #dc2626; font-weight: 600; ${criticalCount > 0 ? 'margin-left: 8px;' : ''}">${dangerCount} danger</span>` : ''}
        ${warningCount > 0 ? `<span style="color: #d97706; font-weight: 600; ${criticalCount > 0 || dangerCount > 0 ? 'margin-left: 8px;' : ''}">${warningCount} warning</span>` : ''}
      </div>
    </div>
  `.trim()
      : ''

  // Instance alerts section
  const instanceAlertsSection =
    instanceAlerts.length > 0
      ? `
    <tr>
      <td style="padding: 24px 40px 0 40px;">
        <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: ${COLORS.textDark}; text-transform: uppercase; letter-spacing: 0.5px;">
          Instance Alerts
        </h3>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border: 1px solid ${COLORS.border}; border-collapse: collapse;">
          ${instanceAlerts.map((alert, i) => renderAlertRow(alert, i)).join('')}
        </table>
      </td>
    </tr>
  `.trim()
      : ''

  // Container alerts section
  const containerAlertsSection =
    containerAlerts.length > 0
      ? `
    <tr>
      <td style="padding: 24px 40px 0 40px;">
        <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: ${COLORS.textDark}; text-transform: uppercase; letter-spacing: 0.5px;">
          Container Alerts
        </h3>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border: 1px solid ${COLORS.border}; border-collapse: collapse;">
          ${containerAlerts.map((alert, i) => renderAlertRow(alert, i)).join('')}
        </table>
      </td>
    </tr>
  `.trim()
      : ''

  // Health changes section
  const healthChangesSection =
    healthChanges.length > 0
      ? `
    <tr>
      <td style="padding: 24px 40px 0 40px;">
        <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: ${COLORS.textDark}; text-transform: uppercase; letter-spacing: 0.5px;">
          Health Changes
        </h3>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border: 1px solid ${COLORS.border}; border-collapse: collapse;">
          ${healthChanges.map((change, i) => renderHealthChangeRow(change, i)).join('')}
        </table>
      </td>
    </tr>
  `.trim()
      : ''

  // Containers summary section
  const containersSummarySection =
    totalContainers > 0 && !isLifecycleEvent
      ? `
    <tr>
      <td style="padding: 24px 40px 0 40px;">
        <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: ${COLORS.textDark}; text-transform: uppercase; letter-spacing: 0.5px;">
          Containers (${totalContainers})
        </h3>
        <table role="presentation" cellpadding="0" cellspacing="0" style="border: 1px solid ${COLORS.border};">
          <tr>
            <td style="padding: 10px 16px; text-align: center; background-color: #ecfdf5; border-right: 1px solid ${COLORS.border};">
              <div style="font-size: 20px; font-weight: 700; color: #059669;">${runningContainers}</div>
              <div style="font-size: 10px; text-transform: uppercase; color: #059669; font-weight: 600;">Running</div>
            </td>
            <td style="padding: 10px 16px; text-align: center; background-color: ${stoppedContainers > 0 ? '#fef2f2' : '#f3f4f6'}; border-right: 1px solid ${COLORS.border};">
              <div style="font-size: 20px; font-weight: 700; color: ${stoppedContainers > 0 ? '#dc2626' : '#6b7280'};">${stoppedContainers}</div>
              <div style="font-size: 10px; text-transform: uppercase; color: ${stoppedContainers > 0 ? '#dc2626' : '#6b7280'}; font-weight: 600;">Stopped</div>
            </td>
            <td style="padding: 10px 16px; text-align: center; background-color: ${restartingContainers > 0 ? '#fffbeb' : '#f3f4f6'};">
              <div style="font-size: 20px; font-weight: 700; color: ${restartingContainers > 0 ? '#d97706' : '#6b7280'};">${restartingContainers}</div>
              <div style="font-size: 10px; text-transform: uppercase; color: ${restartingContainers > 0 ? '#d97706' : '#6b7280'}; font-weight: 600;">Restarting</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `.trim()
      : ''

  // Lifecycle message
  const lifecycleMessage = isLifecycleEvent
    ? `
    <p style="margin: 16px 0 24px 0; font-size: 15px; color: ${COLORS.text};">
      The server monitoring service reported a <strong>${data.lifecycle_event}</strong> event.
      ${data.lifecycle_reason ? `<br/><span style="color: ${COLORS.textMuted};">Reason: ${escapeHtml(data.lifecycle_reason)}</span>` : ''}
    </p>
  `.trim()
    : `
    <p style="margin: 16px 0 24px 0; font-size: 15px; color: ${COLORS.text};">
      The server monitor reported a ${statusStyle.label.toLowerCase()} status. Review the details below.
      ${alertSummaryBadge}
    </p>
  `.trim()

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
        <table role="presentation" cellpadding="0" cellspacing="0" width="640" style="max-width: 640px; background-color: ${COLORS.white}; border: 1px solid ${COLORS.border}; overflow: hidden;">
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

              ${lifecycleMessage}

              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border: 1px solid ${COLORS.border}; border-collapse: collapse;">
                <tr>
                  <td style="padding: 12px 14px; background-color: ${COLORS.secondary}; font-weight: 600; font-size: 13px; color: ${COLORS.textDark}; width: 120px;">
                    Project
                  </td>
                  <td style="padding: 12px 14px; font-size: 14px; color: ${COLORS.text};">
                    ${project}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 14px; background-color: ${COLORS.background}; font-weight: 600; font-size: 13px; color: ${COLORS.textDark}; width: 120px;">
                    Server
                  </td>
                  <td style="padding: 12px 14px; font-size: 14px; color: ${COLORS.text};">
                    ${serverName}
                    ${hostname !== serverName ? `<span style="color: ${COLORS.textMuted}; font-size: 12px; margin-left: 6px;">(${hostname})</span>` : ''}
                  </td>
                </tr>
                ${containerRow}
                ${uptimeRow}
              </table>
            </td>
          </tr>

          ${metricsSection}
          ${containersSummarySection}
          ${instanceAlertsSection}
          ${containerAlertsSection}
          ${healthChangesSection}

          <tr>
            <td align="center" style="background-color: ${COLORS.background}; padding: 28px 40px; border-top: 1px solid ${COLORS.border}; margin-top: 24px;">
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
