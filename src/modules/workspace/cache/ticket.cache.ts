import type { Ticket } from '../tickets/ticket.model'
import { deleteKeys, getJson, setJson } from '../../../lib/redis'

const boardTicketsKey = (boardId: string) => `board:${boardId}:tickets`

export const ticketCache = {
  async getBoardTickets(boardId: string): Promise<Ticket[] | null> {
    return getJson<Ticket[]>(boardTicketsKey(boardId))
  },

  async setBoardTickets(boardId: string, tickets: Ticket[]): Promise<void> {
    await setJson(boardTicketsKey(boardId), tickets)
  },

  async invalidateBoardTickets(boardId: string): Promise<void> {
    await deleteKeys(boardTicketsKey(boardId))
  },
}
