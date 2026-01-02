import { Router } from 'express'
import { authenticate } from '../../../middleware/authenticate'
import { uploadMeetRecording } from '../../../middleware/upload-meet-recording'
import {
  uploadRecording,
  getRecordings,
  getRecordingById,
  getAnalysis,
} from './meet-recording.controller'

const router = Router()

router.post(
  '/recordings',
  authenticate,
  uploadMeetRecording.single('recording'),
  uploadRecording
)

router.get(
  '/recordings',
  authenticate,
  getRecordings
)

router.get(
  '/recordings/:id',
  authenticate,
  getRecordingById
)

router.get(
  '/recordings/:id/analysis',
  authenticate,
  getAnalysis
)

export default router

