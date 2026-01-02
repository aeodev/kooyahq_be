import type { NextFunction, Request, Response } from 'express'
import { createHttpError } from '../../../utils/http-error'
import { meetRecordingService } from './meet-recording.service'
import { meetAnalysisService } from '../meet-analysis/meet-analysis.service'

export async function uploadRecording(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id
  const file = req.file

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  if (!file) {
    return next(createHttpError(400, 'Recording file is required'))
  }

  const { meetId, duration, startTime, endTime } = req.body

  if (!meetId || !duration || !startTime || !endTime) {
    return next(createHttpError(400, 'Missing required fields: meetId, duration, startTime, endTime'))
  }

  try {
    const recordingUrl = (file as any).storagePath || ''

    if (!recordingUrl) {
      return next(createHttpError(500, 'Failed to upload recording'))
    }

    const recording = await meetRecordingService.create({
      meetId,
      userId,
      recordingUrl,
      duration: parseInt(duration, 10),
      startTime: new Date(startTime),
      endTime: new Date(endTime),
    })

    // Trigger analysis asynchronously (don't wait for it)
    meetAnalysisService.analyzeRecording(recording.id, req.user!).catch((error) => {
      console.error(`[Meet Recording] Failed to trigger analysis for ${recording.id}:`, error)
    })

    res.json({
      success: true,
      data: recording,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}

export async function getRecordings(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const recordings = await meetRecordingService.findByUserId(userId)
    res.json({
      success: true,
      data: recordings,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}

export async function getRecordingById(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id
  const { id } = req.params

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const recording = await meetRecordingService.findById(id)
    if (!recording) {
      return next(createHttpError(404, 'Recording not found'))
    }

    // Check if user owns the recording
    if (recording.userId !== userId) {
      return next(createHttpError(403, 'Forbidden'))
    }

    res.json({
      success: true,
      data: recording,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}

export async function getAnalysis(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id
  const { id } = req.params

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const recording = await meetRecordingService.findById(id)
    if (!recording) {
      return next(createHttpError(404, 'Recording not found'))
    }

    // Check if user owns the recording
    if (recording.userId !== userId) {
      return next(createHttpError(403, 'Forbidden'))
    }

    const analysis = await meetRecordingService.getAnalysisByRecordingId(id)
    if (!analysis) {
      return next(createHttpError(404, 'Analysis not found'))
    }

    res.json({
      success: true,
      data: analysis,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    next(error)
  }
}
