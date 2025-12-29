import { MeetRecordingModel, toMeetRecording, type MeetRecording } from './meet-recording.model'
import { MeetAnalysisModel, toMeetAnalysis, type MeetAnalysis } from './meet-analysis.model'
import { HttpError } from '../../utils/http-error'

export const meetRecordingService = {
  async create(input: {
    meetId: string
    userId: string
    recordingUrl: string
    cloudinaryPublicId?: string
    duration: number
    startTime: Date
    endTime: Date
  }): Promise<MeetRecording> {
    const recording = new MeetRecordingModel({
      ...input,
      analysisStatus: 'pending',
    })
    await recording.save()
    return toMeetRecording(recording)
  },

  async findById(id: string): Promise<MeetRecording | null> {
    const doc = await MeetRecordingModel.findById(id)
    return doc ? toMeetRecording(doc) : null
  },

  async findByUserId(userId: string): Promise<MeetRecording[]> {
    const docs = await MeetRecordingModel.find({ userId })
      .sort({ createdAt: -1 })
      .exec()
    return docs.map(toMeetRecording)
  },

  async findByMeetId(meetId: string): Promise<MeetRecording[]> {
    const docs = await MeetRecordingModel.find({ meetId })
      .sort({ createdAt: -1 })
      .exec()
    return docs.map(toMeetRecording)
  },

  async updateAnalysisStatus(
    recordingId: string,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    analysisId?: string
  ): Promise<MeetRecording> {
    const doc = await MeetRecordingModel.findById(recordingId)
    if (!doc) {
      throw new HttpError(404, 'Recording not found')
    }

    doc.analysisStatus = status
    if (analysisId) {
      doc.analysisId = analysisId
    }
    await doc.save()

    return toMeetRecording(doc)
  },

  async createAnalysis(input: {
    recordingId: string
    transcription: string
    summary: string
    actionItems: string[]
    keyPoints: string[]
  }): Promise<MeetAnalysis> {
    const analysis = new MeetAnalysisModel({
      ...input,
      completedAt: new Date(),
    })
    await analysis.save()
    return toMeetAnalysis(analysis)
  },

  async getAnalysis(recordingId: string): Promise<MeetAnalysis | null> {
    const doc = await MeetAnalysisModel.findOne({ recordingId })
    return doc ? toMeetAnalysis(doc) : null
  },

  async getAnalysisByRecordingId(recordingId: string): Promise<MeetAnalysis | null> {
    const doc = await MeetAnalysisModel.findOne({ recordingId })
    return doc ? toMeetAnalysis(doc) : null
  },
}

