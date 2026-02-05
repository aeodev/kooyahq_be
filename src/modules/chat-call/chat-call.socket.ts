import { randomUUID } from 'crypto'
import type { AuthenticatedSocket } from '../../lib/socket'
import { activeUsersManager } from '../../lib/active-users'
import { SocketEmitter } from '../../utils/socket-emitter'
import { chatRoom, chatUserRoom } from '../../utils/socket-rooms'
import { PERMISSIONS } from '../auth/rbac/permissions'
import { socketHasPermission } from '../auth/rbac/socket-permissions'
import { chatRepository } from '../chat/chat.repository'
import { chatService } from '../chat/chat.service'
import { createMessageEvent } from '../chat/chat-socket.helpers'
import {
  clearActiveCall,
  clearUserCall,
  getActiveCallId,
  getCallSession,
  getUserCall,
  setActiveCallId,
  setCallSession,
  setUserCall,
} from './chat-call.store'
import type { CallMode, CallParticipantStatus, CallSession } from './chat-call.types'

const RING_TIMEOUT_MS = 30_000
const ringTimeouts = new Map<string, NodeJS.Timeout>()

type CallPayload = {
  callId: string
  roomId: string
  mode: CallMode
  media: CallSession['media']
  initiatorId: string
  participants: Array<{ userId: string; status: CallParticipantStatus }>
  status: CallSession['status']
}

type SignalPayload = {
  callId: string
  toUserId: string
  sdp?: string
  candidate?: unknown
}

function nowIso(): string {
  return new Date().toISOString()
}

function toParticipantsArray(session: CallSession): Array<{ userId: string; status: CallParticipantStatus }> {
  return Object.values(session.participants).map((participant) => ({
    userId: participant.userId,
    status: participant.status,
  }))
}

function buildCallPayload(session: CallSession): CallPayload {
  return {
    callId: session.callId,
    roomId: session.roomId,
    mode: session.mode,
    media: session.media,
    initiatorId: session.initiatorId,
    participants: toParticipantsArray(session),
    status: session.status,
  }
}

function getParticipantIds(session: CallSession): string[] {
  return Object.keys(session.participants)
}

function emitToParticipants(
  participantIds: string[],
  event: string,
  payload: Record<string, unknown>,
  excludeUserId?: string
): void {
  participantIds.forEach((participantId) => {
    if (excludeUserId && participantId === excludeUserId) return
    SocketEmitter.emitToRoom(chatUserRoom(participantId), event, payload)
  })
}

async function emitSystemMessage(
  conversationId: string,
  actorId: string,
  content: string,
  participantIds: string[]
): Promise<void> {
  try {
    const message = await chatService.createSystemMessage(conversationId, actorId, content)
    const messageEvent = createMessageEvent(message, conversationId)

    SocketEmitter.emitToRoom(chatRoom(conversationId), 'new_message', messageEvent)
    participantIds.forEach((participantId) => {
      SocketEmitter.emitToRoom(chatUserRoom(participantId), 'new_message', messageEvent)
    })
  } catch (error) {
    console.error('Failed to emit system message for call event:', error)
  }
}

function scheduleRingTimeout(callId: string, roomId: string): void {
  const existing = ringTimeouts.get(callId)
  if (existing) {
    clearTimeout(existing)
  }

  const timeout = setTimeout(async () => {
    const session = await getCallSession(callId)
    if (!session || session.status !== 'ringing') return

    session.status = 'ended'
    session.updatedAt = nowIso()
    await setCallSession(session)
    await clearActiveCall(roomId)

    const participantIds = getParticipantIds(session)
    await Promise.all(participantIds.map((participantId) => clearUserCall(participantId)))
    emitToParticipants(participantIds, 'call:timeout', {
      callId,
      reason: 'timeout',
    })
    emitToParticipants(participantIds, 'call:end', {
      callId,
      endedBy: session.initiatorId,
      reason: 'timeout',
    })

    await emitSystemMessage(roomId, session.initiatorId, 'Call ended (no answer)', participantIds)
  }, RING_TIMEOUT_MS)

  ringTimeouts.set(callId, timeout)
}

function clearRingTimeout(callId: string): void {
  const timeout = ringTimeouts.get(callId)
  if (timeout) {
    clearTimeout(timeout)
    ringTimeouts.delete(callId)
  }
}

function resolveCallMode(conversationType: 'direct' | 'group'): CallMode {
  return conversationType === 'direct' ? 'one_to_one' : 'group'
}

function updateParticipantStatus(
  session: CallSession,
  userId: string,
  status: CallParticipantStatus
): CallSession {
  const participant = session.participants[userId]
  if (!participant) return session

  participant.status = status
  participant.lastSeenAt = nowIso()
  if (status === 'connected' && !participant.joinedAt) {
    participant.joinedAt = nowIso()
  }

  session.participants[userId] = participant
  session.updatedAt = nowIso()
  return session
}

function countConnected(session: CallSession): number {
  return Object.values(session.participants).filter((p) => p.status === 'connected').length
}

function shouldEndCall(session: CallSession): boolean {
  return countConnected(session) <= 1
}

async function endCall(session: CallSession, endedBy: string, reason: 'ended' | 'left' | 'timeout' | 'error'): Promise<void> {
  session.status = 'ended'
  session.updatedAt = nowIso()
  await setCallSession(session)
  await clearActiveCall(session.roomId)
  clearRingTimeout(session.callId)

  const participantIds = getParticipantIds(session)
  await Promise.all(participantIds.map((participantId) => clearUserCall(participantId)))

  emitToParticipants(participantIds, 'call:end', {
    callId: session.callId,
    endedBy,
    reason,
  })

  await emitSystemMessage(session.roomId, endedBy, 'Call ended', participantIds)
}

export function registerChatCallHandlers(socket: AuthenticatedSocket): void {
  const userId = socket.userId
  if (!userId) return

  socket.on('call:start', async (payload: { conversationId: string; media?: 'audio' | 'video' }) => {
    if (!socketHasPermission(socket, PERMISSIONS.CHAT_SEND, PERMISSIONS.CHAT_FULL_ACCESS)) return
    const { conversationId } = payload || {}
    if (!conversationId || typeof conversationId !== 'string') return

    try {
      const conversation = await chatRepository.findConversationById(conversationId, userId)
      if (!conversation) {
        socket.emit('call:error', { message: 'Conversation not found or access denied' })
        return
      }

      const existingCallId = await getActiveCallId(conversationId)
      if (existingCallId) {
        const existingSession = await getCallSession(existingCallId)
        if (existingSession && existingSession.status !== 'ended') {
          socket.emit('call:already-active', buildCallPayload(existingSession))
          return
        }
      }

      const callId = randomUUID()
      const now = nowIso()
      const mode = resolveCallMode(conversation.type)
      const media = payload?.media === 'audio' ? 'audio' : 'video'
      const participants: CallSession['participants'] = {}

      conversation.participants.forEach((participantId) => {
        participants[participantId] = {
          userId: participantId,
          status: participantId === userId ? 'connected' : 'ringing',
          joinedAt: participantId === userId ? now : undefined,
          lastSeenAt: now,
        }
      })

      const session: CallSession = {
        callId,
        roomId: conversationId,
        mode,
        media,
        status: 'ringing',
        initiatorId: userId,
        participants,
        createdAt: now,
        updatedAt: now,
      }

      await setCallSession(session)
      await setActiveCallId(conversationId, callId)
      await setUserCall(userId, callId)

      scheduleRingTimeout(callId, conversationId)

      socket.emit('call:started', buildCallPayload(session))

      const participantIds = getParticipantIds(session)
      emitToParticipants(participantIds, 'call:ring', buildCallPayload(session), userId)

      await emitSystemMessage(conversationId, userId, 'Call started', participantIds)
    } catch (error) {
      console.error('Failed to start call:', error)
      socket.emit('call:error', { message: 'Failed to start call' })
    }
  })

  socket.on('call:accept', async (payload: { callId: string }) => {
    if (!socketHasPermission(socket, PERMISSIONS.CHAT_READ, PERMISSIONS.CHAT_FULL_ACCESS)) return
    const { callId } = payload || {}
    if (!callId || typeof callId !== 'string') return

    try {
      const session = await getCallSession(callId)
      if (!session || !session.participants[userId]) return

      if (session.participants[userId].status !== 'connected') {
        updateParticipantStatus(session, userId, 'connected')
        await setCallSession(session)
        await setUserCall(userId, callId)
      }

      if (session.status === 'ringing' && countConnected(session) >= 2) {
        session.status = 'active'
        session.updatedAt = nowIso()
        await setCallSession(session)
        clearRingTimeout(callId)
      }

      const participantIds = getParticipantIds(session)
      emitToParticipants(participantIds, 'call:join', {
        callId,
        userId,
        timestamp: nowIso(),
      })
      emitToParticipants(participantIds, 'call:participants', {
        callId,
        participants: toParticipantsArray(session),
      })

      await emitSystemMessage(session.roomId, userId, 'Joined the call', participantIds)
    } catch (error) {
      console.error('Failed to accept call:', error)
    }
  })

  socket.on('call:reject', async (payload: { callId: string }) => {
    if (!socketHasPermission(socket, PERMISSIONS.CHAT_READ, PERMISSIONS.CHAT_FULL_ACCESS)) return
    const { callId } = payload || {}
    if (!callId || typeof callId !== 'string') return

    try {
      const session = await getCallSession(callId)
      if (!session || !session.participants[userId]) return

      updateParticipantStatus(session, userId, 'left')
      await setCallSession(session)
      await clearUserCall(userId)

      const participantIds = getParticipantIds(session)
      emitToParticipants(participantIds, 'call:reject', {
        callId,
        userId,
      })
      emitToParticipants(participantIds, 'call:participants', {
        callId,
        participants: toParticipantsArray(session),
      })

      const nonInitiatorIds = participantIds.filter((id) => id !== session.initiatorId)
      const allRejected = nonInitiatorIds.every((id) => session.participants[id]?.status === 'left')

      if (allRejected) {
        await endCall(session, userId, 'ended')
      }
    } catch (error) {
      console.error('Failed to reject call:', error)
    }
  })

  socket.on('call:join', async (payload: { callId: string }) => {
    if (!socketHasPermission(socket, PERMISSIONS.CHAT_READ, PERMISSIONS.CHAT_FULL_ACCESS)) return
    const { callId } = payload || {}
    if (!callId || typeof callId !== 'string') return

    try {
      const session = await getCallSession(callId)
      if (!session || !session.participants[userId]) return

      if (session.participants[userId].status !== 'connected') {
        updateParticipantStatus(session, userId, 'connected')
        await setCallSession(session)
        await setUserCall(userId, callId)
      }

      if (session.status === 'ringing' && countConnected(session) >= 2) {
        session.status = 'active'
        session.updatedAt = nowIso()
        await setCallSession(session)
        clearRingTimeout(callId)
      }

      const participantIds = getParticipantIds(session)
      emitToParticipants(participantIds, 'call:join', {
        callId,
        userId,
        timestamp: nowIso(),
      })
      emitToParticipants(participantIds, 'call:participants', {
        callId,
        participants: toParticipantsArray(session),
      })

      await emitSystemMessage(session.roomId, userId, 'Joined the call', participantIds)
    } catch (error) {
      console.error('Failed to join call:', error)
    }
  })

  socket.on('call:leave', async (payload: { callId: string; reason?: 'left' | 'disconnect' }) => {
    if (!socketHasPermission(socket, PERMISSIONS.CHAT_READ, PERMISSIONS.CHAT_FULL_ACCESS)) return
    const { callId } = payload || {}
    if (!callId || typeof callId !== 'string') return

    try {
      const session = await getCallSession(callId)
      if (!session || !session.participants[userId]) return

      updateParticipantStatus(session, userId, 'left')
      await setCallSession(session)
      await clearUserCall(userId)

      const participantIds = getParticipantIds(session)
      emitToParticipants(participantIds, 'call:leave', {
        callId,
        userId,
      })
      emitToParticipants(participantIds, 'call:participants', {
        callId,
        participants: toParticipantsArray(session),
      })

      await emitSystemMessage(session.roomId, userId, 'Left the call', participantIds)

      if (shouldEndCall(session)) {
        await endCall(session, userId, 'left')
      }
    } catch (error) {
      console.error('Failed to leave call:', error)
    }
  })

  socket.on('call:end', async (payload: { callId: string; reason?: 'ended' | 'error' }) => {
    if (!socketHasPermission(socket, PERMISSIONS.CHAT_READ, PERMISSIONS.CHAT_FULL_ACCESS)) return
    const { callId } = payload || {}
    if (!callId || typeof callId !== 'string') return

    try {
      const session = await getCallSession(callId)
      if (!session || !session.participants[userId]) return

      await endCall(session, userId, payload.reason || 'ended')
    } catch (error) {
      console.error('Failed to end call:', error)
    }
  })

  socket.on('call:offer', async (payload: SignalPayload) => {
    if (!socketHasPermission(socket, PERMISSIONS.CHAT_READ, PERMISSIONS.CHAT_FULL_ACCESS)) return
    if (!payload?.callId || !payload?.toUserId || !payload?.sdp) return

    const session = await getCallSession(payload.callId)
    if (!session || !session.participants[userId] || !session.participants[payload.toUserId]) return

    SocketEmitter.emitToRoom(chatUserRoom(payload.toUserId), 'call:offer', {
      callId: payload.callId,
      fromUserId: userId,
      toUserId: payload.toUserId,
      sdp: payload.sdp,
    })
  })

  socket.on('call:answer', async (payload: SignalPayload) => {
    if (!socketHasPermission(socket, PERMISSIONS.CHAT_READ, PERMISSIONS.CHAT_FULL_ACCESS)) return
    if (!payload?.callId || !payload?.toUserId || !payload?.sdp) return

    const session = await getCallSession(payload.callId)
    if (!session || !session.participants[userId] || !session.participants[payload.toUserId]) return

    SocketEmitter.emitToRoom(chatUserRoom(payload.toUserId), 'call:answer', {
      callId: payload.callId,
      fromUserId: userId,
      toUserId: payload.toUserId,
      sdp: payload.sdp,
    })
  })

  socket.on('call:ice', async (payload: SignalPayload) => {
    if (!socketHasPermission(socket, PERMISSIONS.CHAT_READ, PERMISSIONS.CHAT_FULL_ACCESS)) return
    if (!payload?.callId || !payload?.toUserId || !payload?.candidate) return

    const session = await getCallSession(payload.callId)
    if (!session || !session.participants[userId] || !session.participants[payload.toUserId]) return

    SocketEmitter.emitToRoom(chatUserRoom(payload.toUserId), 'call:ice', {
      callId: payload.callId,
      fromUserId: userId,
      toUserId: payload.toUserId,
      candidate: payload.candidate,
    })
  })

  socket.on('disconnect', async () => {
    const hasOtherConnections = activeUsersManager.hasOtherActiveConnections(userId, socket.id)
    if (hasOtherConnections) return

    const activeCallId = await getUserCall(userId)
    if (!activeCallId) return

    const session = await getCallSession(activeCallId)
    if (!session || !session.participants[userId]) {
      await clearUserCall(userId)
      return
    }

    if (session.participants[userId].status === 'left') {
      await clearUserCall(userId)
      return
    }

    updateParticipantStatus(session, userId, 'left')
    await setCallSession(session)
    await clearUserCall(userId)

    const participantIds = getParticipantIds(session)
    emitToParticipants(participantIds, 'call:leave', {
      callId: session.callId,
      userId,
      reason: 'disconnect',
    })
    emitToParticipants(participantIds, 'call:participants', {
      callId: session.callId,
      participants: toParticipantsArray(session),
    })

    await emitSystemMessage(session.roomId, userId, 'Left the call', participantIds)

    if (shouldEndCall(session)) {
      await endCall(session, userId, 'left')
    }
  })
}
