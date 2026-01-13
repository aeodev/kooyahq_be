import type { NextFunction, Request, Response } from 'express'
import { settingsService, type ThemeSettingsWithMandatory } from './settings.service'
import { SocketEmitter } from '../../utils/socket-emitter'
import { adminActivityService } from '../admin-activity/admin-activity.service'
import type { ThemeSettings } from './settings.model'

const THEME_COLOR_KEYS: Array<keyof ThemeSettings['light']> = [
  'primary',
  'secondary',
  'accent',
  'destructive',
  'muted',
  'background',
  'foreground',
  'border',
]

function diffThemeSettings(before: ThemeSettings, after: ThemeSettings): string[] {
  const changed: string[] = []
  const themes: Array<keyof ThemeSettings> = ['light', 'dark']

  themes.forEach((variant) => {
    const beforeVariant = before[variant]
    const afterVariant = after[variant]
    THEME_COLOR_KEYS.forEach((key) => {
      const beforeValue = beforeVariant?.[key]
      const afterValue = afterVariant?.[key]
      if (beforeValue !== afterValue) {
        changed.push(`${variant}.${key}`)
      }
    })
  })

  return changed
}

export async function getThemeSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const themeSettings = await settingsService.getThemeSettings()
    res.json({
      success: true,
      data: themeSettings,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}

export async function updateThemeSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
        timestamp: new Date().toISOString(),
      })
    }

    const theme = req.body
    const existingTheme = await settingsService.getThemeSettings()
    const updatedTheme = await settingsService.updateThemeSettings(theme, userId)
    const changedFields = diffThemeSettings(existingTheme, updatedTheme)
    const changes: Record<string, unknown> = {}
    changedFields.forEach((field) => {
      const [variant, key] = field.split('.')
      const beforeVariant = existingTheme[variant as keyof ThemeSettings]
      const afterVariant = updatedTheme[variant as keyof ThemeSettings]
      if (beforeVariant && afterVariant && key) {
        changes[field] = {
          from: beforeVariant[key as keyof typeof beforeVariant],
          to: afterVariant[key as keyof typeof afterVariant],
        }
      }
    })

    // Emit socket event to all connected clients for real-time updates
    try {
      SocketEmitter.emitToAll('settings:theme-updated', {
        theme: updatedTheme,
        userId,
        timestamp: new Date().toISOString(),
      })
    } catch (socketError) {
      console.error('Failed to emit settings:theme-updated socket event:', socketError)
    }

    try {
      await adminActivityService.logActivity({
        adminId: userId,
        action: 'update_system_settings',
        targetType: 'system',
        targetId: 'theme',
        targetLabel: 'Theme Settings',
        changes: Object.keys(changes).length ? changes : undefined,
      })
    } catch (logError) {
      console.error('Failed to log admin activity:', logError)
    }

    res.json({
      success: true,
      data: updatedTheme,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}

export async function updateThemeMandatory(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
        timestamp: new Date().toISOString(),
      })
    }

    const { themeMandatory } = req.body
    if (typeof themeMandatory !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'themeMandatory must be a boolean',
        },
        timestamp: new Date().toISOString(),
      })
    }

    const existingSettings = await settingsService.getThemeSettings()
    const updatedSettings = await settingsService.updateThemeMandatory(themeMandatory, userId)

    // Emit socket event to all connected clients for real-time updates
    try {
      SocketEmitter.emitToAll('settings:theme-mandatory-updated', {
        themeMandatory: updatedSettings.themeMandatory,
        userId,
        timestamp: new Date().toISOString(),
      })
    } catch (socketError) {
      console.error('Failed to emit settings:theme-mandatory-updated socket event:', socketError)
    }

    try {
      await adminActivityService.logActivity({
        adminId: userId,
        action: 'update_system_settings',
        targetType: 'system',
        targetId: 'theme-mandatory',
        targetLabel: 'Theme Mandatory Setting',
        changes: {
          themeMandatory: {
            from: existingSettings.themeMandatory,
            to: updatedSettings.themeMandatory,
          },
        },
      })
    } catch (logError) {
      console.error('Failed to log admin activity:', logError)
    }

    res.json({
      success: true,
      data: updatedSettings,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}
