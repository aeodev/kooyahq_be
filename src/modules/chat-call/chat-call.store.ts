import { deleteKeys, getJson, setJson } from '../../lib/redis'
import type { CallSession } from './chat-call.types'

const CALL_SESSION_PREFIX = 'chat:call'
const ACTIVE_CALL_PREFIX = 'chat:call:active'
const USER_CALL_PREFIX = 'chat:call:user'
const CALL_TTL_SECONDS = 2 * 60 * 60

export function callSessionKey(callId: string): string {
  return `${CALL_SESSION_PREFIX}:${callId}`
}

export function activeCallKey(roomId: string): string {
  return `${ACTIVE_CALL_PREFIX}:${roomId}`
}

export function userCallKey(userId: string): string {
  return `${USER_CALL_PREFIX}:${userId}`
}

export async function getCallSession(callId: string): Promise<CallSession | null> {
  return getJson<CallSession>(callSessionKey(callId))
}

export async function setCallSession(call: CallSession): Promise<void> {
  await setJson(callSessionKey(call.callId), call, CALL_TTL_SECONDS)
}

export async function deleteCallSession(callId: string): Promise<void> {
  await deleteKeys(callSessionKey(callId))
}

export async function getActiveCallId(roomId: string): Promise<string | null> {
  const value = await getJson<string>(activeCallKey(roomId))
  return value || null
}

export async function setActiveCallId(roomId: string, callId: string): Promise<void> {
  await setJson(activeCallKey(roomId), callId, CALL_TTL_SECONDS)
}

export async function clearActiveCall(roomId: string): Promise<void> {
  await deleteKeys(activeCallKey(roomId))
}

export async function setUserCall(userId: string, callId: string): Promise<void> {
  await setJson(userCallKey(userId), callId, CALL_TTL_SECONDS)
}

export async function getUserCall(userId: string): Promise<string | null> {
  const value = await getJson<string>(userCallKey(userId))
  return value || null
}

export async function clearUserCall(userId: string): Promise<void> {
  await deleteKeys(userCallKey(userId))
}
