import type { NextFunction, Request, Response } from 'express'
import { settingsService } from './settings.service'
import { SocketEmitter } from '../../utils/socket-emitter'

export async function getThemeSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const theme = await settingsService.getThemeSettings()
    res.json({
      success: true,
      data: theme,
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
    const updatedTheme = await settingsService.updateThemeSettings(theme, userId)

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

    res.json({
      success: true,
      data: updatedTheme,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}

