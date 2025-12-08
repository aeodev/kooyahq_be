import {
  ticketDetailsSettingsRepository,
  type UpdateTicketDetailsSettingsInput,
} from './ticket-details-settings.repository'
import type { TicketDetailsSettings } from './ticket-details-settings.model'

export const ticketDetailsSettingsService = {
  async getSettings(userId: string, boardId?: string): Promise<TicketDetailsSettings | null> {
    return ticketDetailsSettingsRepository.findByUserAndBoard(userId, boardId)
  },

  async getOrCreateSettings(
    userId: string,
    boardId?: string,
  ): Promise<TicketDetailsSettings> {
    const existing = await ticketDetailsSettingsRepository.findByUserAndBoard(userId, boardId)

    if (existing) {
      return existing
    }

    // Create default settings
    return ticketDetailsSettingsRepository.resetToDefaults(userId, boardId)
  },

  async updateSettings(
    userId: string,
    boardId: string | null,
    input: UpdateTicketDetailsSettingsInput,
  ): Promise<TicketDetailsSettings> {
    return ticketDetailsSettingsRepository.createOrUpdate(userId, boardId, input)
  },

  async resetSettings(userId: string, boardId?: string): Promise<TicketDetailsSettings> {
    return ticketDetailsSettingsRepository.resetToDefaults(userId, boardId)
  },
}


