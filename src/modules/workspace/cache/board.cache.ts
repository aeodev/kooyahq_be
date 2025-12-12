import type { Board } from '../boards/board.model'
import { deleteKeys, getJson, setJson } from '../../../lib/redis'

const boardKey = (id: string) => `board:${id}`
const boardPrefixKey = (prefix: string) => `board:prefix:${prefix.toUpperCase()}`

export const boardCache = {
  async getBoard(id: string): Promise<Board | null> {
    return getJson<Board>(boardKey(id))
  },

  async setBoard(board: Board): Promise<void> {
    await Promise.all([setJson(boardKey(board.id), board), setJson(boardPrefixKey(board.prefix), board)])
  },

  async deleteBoard(boardId: string, prefix: string): Promise<void> {
    await deleteKeys([boardKey(boardId), boardPrefixKey(prefix)])
  },

  async getBoardByPrefix(prefix: string): Promise<Board | null> {
    return getJson<Board>(boardPrefixKey(prefix))
  },
}
