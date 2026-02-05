export type CallMode = 'one_to_one' | 'group'

export type CallMedia = 'audio' | 'video'

export type CallStatus = 'ringing' | 'active' | 'ended'

export type CallParticipantStatus = 'ringing' | 'connected' | 'left'

export type CallParticipant = {
  userId: string
  status: CallParticipantStatus
  joinedAt?: string
  lastSeenAt: string
}

export type CallSession = {
  callId: string
  roomId: string
  mode: CallMode
  media: CallMedia
  status: CallStatus
  initiatorId: string
  participants: Record<string, CallParticipant>
  createdAt: string
  updatedAt: string
}
