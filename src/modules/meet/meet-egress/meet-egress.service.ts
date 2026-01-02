import { EgressClient, EncodedFileOutput, S3Upload, EncodedFileType } from 'livekit-server-sdk'
import { env } from '../../../config/env'
import { createHttpError } from '../../../utils/http-error'

// Store active egress sessions in memory (room -> egressId mapping)
const activeEgresses = new Map<string, string>()

function getEgressClient(): EgressClient {
  if (!env.livekit.url || !env.livekit.apiKey || !env.livekit.apiSecret) {
    throw createHttpError(500, 'LiveKit not configured')
  }
  return new EgressClient(env.livekit.url, env.livekit.apiKey, env.livekit.apiSecret)
}

function getS3Config(): S3Upload {
  if (!env.s3.accessKeyId || !env.s3.secretAccessKey || !env.s3.bucket) {
    throw createHttpError(500, 'AWS S3 not configured for egress')
  }

  return new S3Upload({
    accessKey: env.s3.accessKeyId,
    secret: env.s3.secretAccessKey,
    bucket: env.s3.bucket,
    region: env.s3.region,
  })
}

export const meetEgressService = {
  /**
   * Start a room composite egress (records all participants in a grid layout)
   */
  async startRoomCompositeEgress(roomName: string, userId: string): Promise<{
    egressId: string
    status: string
  }> {
    // Check if room already has an active egress
    const existingEgressId = activeEgresses.get(roomName)
    if (existingEgressId) {
      throw createHttpError(409, 'Recording already in progress for this room')
    }

    const client = getEgressClient()
    const s3Config = getS3Config()

    // Generate unique filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filepath = `meet-recordings/${roomName}/${timestamp}-${userId}.mp4`

    const fileOutput = new EncodedFileOutput({
      filepath,
      output: {
        case: 's3',
        value: s3Config,
      },
      fileType: EncodedFileType.MP4,
    })

    const egressInfo = await client.startRoomCompositeEgress(
      roomName,
      {
        file: fileOutput,
      },
      {
        layout: 'grid',
        audioOnly: false,
        videoOnly: false,
      }
    )

    // Store the active egress
    activeEgresses.set(roomName, egressInfo.egressId)

    return {
      egressId: egressInfo.egressId,
      status: 'recording',
    }
  },

  /**
   * Stop an active egress by ID
   */
  async stopEgress(egressId: string, roomName?: string): Promise<{
    egressId: string
    status: string
    recordingUrl?: string
    duration?: number
  }> {
    const client = getEgressClient()

    const egressInfo = await client.stopEgress(egressId)

    // Remove from active egresses if we have room name
    if (roomName) {
      activeEgresses.delete(roomName)
    } else {
      // Find and remove by egressId
      for (const [room, id] of activeEgresses.entries()) {
        if (id === egressId) {
          activeEgresses.delete(room)
          break
        }
      }
    }

    // Build S3 URL from the file info
    let recordingUrl: string | undefined
    const fileResults = egressInfo.fileResults
    if (fileResults && fileResults.length > 0) {
      const file = fileResults[0]
      // Construct S3 URL
      recordingUrl = `https://${env.s3.bucket}.s3.${env.s3.region}.amazonaws.com/${file.filename}`
    }

    return {
      egressId: egressInfo.egressId,
      status: 'stopped',
      recordingUrl,
      duration: fileResults?.[0]?.duration ? Number(fileResults[0].duration) : undefined,
    }
  },

  /**
   * Get egress status by ID
   */
  async getEgressStatus(egressId: string): Promise<{
    egressId: string
    status: string
    recordingUrl?: string
    duration?: number
    error?: string
  }> {
    const client = getEgressClient()

    // List all egresses and find the one with matching ID
    const egresses = await client.listEgress()

    const egressInfo = egresses.find((e) => e.egressId === egressId)

    if (!egressInfo) {
      throw createHttpError(404, 'Egress not found')
    }

    // Map status enum to string
    const statusMap: Record<number, string> = {
      0: 'starting',
      1: 'active',
      2: 'ending',
      3: 'complete',
      4: 'failed',
      5: 'aborted',
      6: 'limit_reached',
    }

    const status = statusMap[egressInfo.status] || 'unknown'

    // Build recording URL if complete
    let recordingUrl: string | undefined
    let duration: number | undefined
    const fileResults = egressInfo.fileResults
    if (fileResults && fileResults.length > 0) {
      const file = fileResults[0]
      recordingUrl = `https://${env.s3.bucket}.s3.${env.s3.region}.amazonaws.com/${file.filename}`
      duration = file.duration ? Number(file.duration) : undefined
    }

    return {
      egressId: egressInfo.egressId,
      status,
      recordingUrl,
      duration,
      error: egressInfo.error,
    }
  },

  /**
   * Get active egress for a room (if any)
   */
  getActiveEgressForRoom(roomName: string): string | undefined {
    return activeEgresses.get(roomName)
  },

  /**
   * List all active egresses for a room from LiveKit
   */
  async listRoomEgresses(roomName: string): Promise<Array<{
    egressId: string
    status: string
  }>> {
    const client = getEgressClient()
    const egresses = await client.listEgress({ roomName })

    const statusMap: Record<number, string> = {
      0: 'starting',
      1: 'active',
      2: 'ending',
      3: 'complete',
      4: 'failed',
      5: 'aborted',
      6: 'limit_reached',
    }

    return egresses
      .filter((e) => e.status === 0 || e.status === 1) // Only starting/active
      .map((e) => ({
        egressId: e.egressId,
        status: statusMap[e.status] || 'unknown',
      }))
  },
}

