import type { NextFunction, Request, Response } from 'express'
import { AccessToken } from 'livekit-server-sdk'
import { env } from '../../config/env'

type TokenRequestBody = {
  roomName?: unknown
}

function parseString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export async function generateToken(req: Request, res: Response, next: NextFunction) {
  const body = req.body as TokenRequestBody
  const roomName = parseString(body.roomName)

  try {
    if (!roomName) {
      return res.status(400).json({
        status: 'error',
        message: 'Room name is required',
      })
    }

    if (!env.livekit.apiKey || !env.livekit.apiSecret) {
      return res.status(500).json({
        status: 'error',
        message: 'LiveKit server not configured',
      })
    }

    const userId = req.user?.id
    const userName = req.user?.name || 'Anonymous'

    if (!userId) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized',
      })
    }

    const at = new AccessToken(env.livekit.apiKey, env.livekit.apiSecret, {
      identity: userId,
      name: userName,
    })

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    })

    const token = await at.toJwt()

    res.json({
      status: 'success',
      data: {
        token,
        url: env.livekit.url,
      },
    })
  } catch (error) {
    next(error)
  }
}



