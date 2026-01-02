import type { NextFunction, Request, Response } from 'express'
import { createHttpError } from '../../../utils/http-error'
import { meetEgressService } from './meet-egress.service'
import { meetRecordingService } from '../meet-recording/meet-recording.service'
import { meetAnalysisService } from '../meet-analysis/meet-analysis.service'

/**
 * Start egress recording for a room
 */
export async function startEgress(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id
  const { roomName } = req.params

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  if (!roomName) {
    return next(createHttpError(400, 'Room name is required'))
  }

  try {
    const result = await meetEgressService.startRoomCompositeEgress(roomName, userId)

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Stop egress recording
 */
export async function stopEgress(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id
  const { egressId } = req.params
  const { roomName } = req.body

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  if (!egressId) {
    return next(createHttpError(400, 'Egress ID is required'))
  }

  try {
    const result = await meetEgressService.stopEgress(egressId, roomName)

    // Save recording to database if we have a URL
    if (result.recordingUrl && roomName) {
      try {
        const recording = await meetRecordingService.create({
          meetId: roomName,
          userId,
          recordingUrl: result.recordingUrl,
          duration: result.duration || 0,
          startTime: new Date(), // Approximate, could track actual start
          endTime: new Date(),
        })

        // Trigger analysis asynchronously
        meetAnalysisService.analyzeRecording(recording.id, req.user!).catch((error) => {
          console.error(`[Egress] Failed to trigger analysis for ${recording.id}:`, error)
        })
      } catch (dbError) {
        console.error('[Egress] Failed to save recording to database:', dbError)
        // Don't fail the request - recording still exists in S3
      }
    }

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Get egress status by ID
 */
export async function getEgressStatus(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id
  const { egressId } = req.params

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  if (!egressId) {
    return next(createHttpError(400, 'Egress ID is required'))
  }

  try {
    const result = await meetEgressService.getEgressStatus(egressId)

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Get active egress for a room
 */
export async function getActiveEgress(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id
  const { roomName } = req.params

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  if (!roomName) {
    return next(createHttpError(400, 'Room name is required'))
  }

  try {
    // First check in-memory cache
    const cachedEgressId = meetEgressService.getActiveEgressForRoom(roomName)
    
    if (cachedEgressId) {
      const status = await meetEgressService.getEgressStatus(cachedEgressId)
      return res.json({
        success: true,
        data: {
          isRecording: status.status === 'active' || status.status === 'starting',
          egressId: cachedEgressId,
          status: status.status,
        },
        timestamp: new Date().toISOString(),
      })
    }

    // Fallback to listing from LiveKit
    const egresses = await meetEgressService.listRoomEgresses(roomName)
    const activeEgress = egresses.find((e) => e.status === 'active' || e.status === 'starting')

    res.json({
      success: true,
      data: {
        isRecording: !!activeEgress,
        egressId: activeEgress?.egressId || null,
        status: activeEgress?.status || null,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}

