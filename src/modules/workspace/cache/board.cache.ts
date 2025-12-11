import type { Board } from '../boards/board.model'
import { deleteKeys, getJson, setJson } from '../../../lib/redis'

const boardKey = (id: string) => `board:${id}`
const boardPrefixKey = (workspaceId: string, prefix: string) =>
  `board:${workspaceId}:prefix:${prefix.toUpperCase()}`
const boardListKey = (workspaceId: string, type?: 'kanban' | 'sprint') =>
  `boards:${workspaceId}:${type ?? 'all'}`

export const boardCache = {
  async getBoard(id: string): Promise<Board | null> {
    return getJson<Board>(boardKey(id))
  },

  async setBoard(board: Board): Promise<void> {
    await Promise.all([
      setJson(boardKey(board.id), board),
      setJson(boardPrefixKey(board.workspaceId, board.prefix), board),
    ])
  },

  async deleteBoard(boardId: string, workspaceId: string, prefix: string): Promise<void> {
    await deleteKeys([boardKey(boardId), boardPrefixKey(workspaceId, prefix)])
  },

  async getBoardByPrefix(workspaceId: string, prefix: string): Promise<Board | null> {
    return getJson<Board>(boardPrefixKey(workspaceId, prefix))
  },

  async getBoards(workspaceId: string, type?: 'kanban' | 'sprint'): Promise<Board[] | null> {
    return getJson<Board[]>(boardListKey(workspaceId, type))
  },

  async setBoards(workspaceId: string, boards: Board[], type?: 'kanban' | 'sprint'): Promise<void> {
    await setJson(boardListKey(workspaceId, type), boards)
  },

  async invalidateBoardLists(workspaceId: string): Promise<void> {
    await deleteKeys([
      boardListKey(workspaceId, 'kanban'),
      boardListKey(workspaceId, 'sprint'),
      boardListKey(workspaceId, undefined),
    ])
  },
}
