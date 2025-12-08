import {
  TicketDetailsSettingsModel,
  toTicketDetailsSettings,
  type TicketDetailsSettings,
  type DetailFieldName,
} from './ticket-details-settings.model'

export type UpdateTicketDetailsSettingsInput = {
  fieldConfigs: Array<{
    fieldName: DetailFieldName
    isVisible: boolean
    order: number
  }>
}

export const ticketDetailsSettingsRepository = {
  async findByUserAndBoard(
    userId: string,
    boardId?: string,
  ): Promise<TicketDetailsSettings | null> {
    // First try to find board-specific settings
    if (boardId) {
      const doc = await TicketDetailsSettingsModel.findOne({
        userId,
        boardId,
      }).exec()

      if (doc) {
        return toTicketDetailsSettings(doc)
      }
    }

    // Fall back to global settings (boardId = null)
    const doc = await TicketDetailsSettingsModel.findOne({
      userId,
      boardId: null,
    }).exec()

    if (doc) {
      return toTicketDetailsSettings(doc)
    }

    return null
  },

  async createOrUpdate(
    userId: string,
    boardId: string | null,
    input: UpdateTicketDetailsSettingsInput,
  ): Promise<TicketDetailsSettings> {
    const doc = await TicketDetailsSettingsModel.findOneAndUpdate(
      {
        userId,
        boardId: boardId || null,
      },
      {
        userId,
        boardId: boardId || null,
        fieldConfigs: input.fieldConfigs,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    ).exec()

    return toTicketDetailsSettings(doc)
  },

  async resetToDefaults(userId: string, boardId?: string): Promise<TicketDetailsSettings> {
    // Delete existing settings to use defaults
    await TicketDetailsSettingsModel.findOneAndDelete({
      userId,
      boardId: boardId || null,
    }).exec()

    // Create new with defaults
    const doc = await TicketDetailsSettingsModel.create({
      userId,
      boardId: boardId || null,
      fieldConfigs: [
        { fieldName: 'priority', isVisible: true, order: 0 },
        { fieldName: 'assignee', isVisible: true, order: 1 },
        { fieldName: 'tags', isVisible: true, order: 2 },
        { fieldName: 'parent', isVisible: true, order: 3 },
        { fieldName: 'dueDate', isVisible: true, order: 4 },
        { fieldName: 'startDate', isVisible: true, order: 5 },
        { fieldName: 'endDate', isVisible: true, order: 6 },
      ],
    })

    return toTicketDetailsSettings(doc)
  },
}

