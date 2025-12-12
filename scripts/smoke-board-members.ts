import assert from 'assert'
import { boardService, normalizeBoardMembers } from '../src/modules/workspace/boards/board.service'
import { boardRepository } from '../src/modules/workspace/boards/board.repository'
import type { Board } from '../src/modules/workspace/boards/board.model'

// In-memory base board
const baseBoard: Board = {
  id: 'board-1',
  workspaceId: 'ws-1',
  name: 'Smoke Board',
  description: 'smoke test',
  prefix: 'SMK',
  emoji: '🚀',
  type: 'kanban',
  settings: {
    defaultView: 'board',
    showSwimlanes: false,
    ticketDetailsSettings: {
      fieldConfigs: [],
    },
  },
  columns: [],
  members: [{ userId: 'creator', role: 'admin', joinedAt: new Date('2024-01-01').toISOString() }],
  createdBy: 'creator',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

async function run() {
  // ---- normalizeBoardMembers basics ----
  const normalized = normalizeBoardMembers(
    [
      { userId: 'creator', role: 'member' }, // should stay admin
      'user-2', // defaults to member
      { userId: 'user-3', role: 'viewer', joinedAt: new Date('2024-02-02T00:00:00Z') },
    ],
    'creator',
  )

  assert.ok(normalized.find((m) => m.userId === 'creator' && m.role === 'admin'), 'creator forced to admin')
  assert.ok(normalized.find((m) => m.userId === 'user-2' && m.role === 'member'), 'string id defaults to member')
  assert.ok(
    normalized.find(
      (m) => m.userId === 'user-3' && m.role === 'viewer' && m.joinedAt instanceof Date && !Number.isNaN(m.joinedAt.getTime()),
    ),
    'viewer preserved with joinedAt',
  )

  // ---- boardService.update normalizes members and retains creator ----
  // Monkey-patch repo methods used by boardService.update
  ;(boardRepository as any).findById = async () => ({
    ...baseBoard,
    members: baseBoard.members.map((m) => ({ ...m, joinedAt: new Date(m.joinedAt) } as any)),
  })

  let capturedUpdate: any = null
  ;(boardRepository as any).update = async (_id: string, updates: any) => {
    capturedUpdate = updates
    const members = updates.members?.map((m: any) => ({
      userId: m.userId,
      role: m.role,
      joinedAt: m.joinedAt instanceof Date ? m.joinedAt.toISOString() : m.joinedAt,
    }))
    return { ...baseBoard, ...updates, members, updatedAt: new Date().toISOString() }
  }

  const updated = await boardService.update('board-1', {
    members: [
      { userId: 'creator', role: 'member', joinedAt: new Date('2023-01-01') },
      { userId: 'user-4', role: 'viewer', joinedAt: new Date() },
    ],
  })

  assert.ok(capturedUpdate, 'repository update called')
  assert.ok(
    capturedUpdate.members.every((m: any) => m.joinedAt instanceof Date),
    'members normalized to Date instances before repo call',
  )

  const updatedCreator = updated?.members.find((m) => m.userId === 'creator')
  assert.ok(updatedCreator && updatedCreator.role === 'admin', 'creator remains admin after update')

  const newMember = updated?.members.find((m) => m.userId === 'user-4')
  assert.ok(newMember && newMember.role === 'viewer', 'new member persisted with requested role')

  console.log('✅ Smoke test passed: board member normalization and update flow')
}

run().catch((err) => {
  console.error('❌ Smoke test failed', err)
  process.exit(1)
})
