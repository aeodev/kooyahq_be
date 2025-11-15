import { DayEndModel, toDayEnd, type DayEnd } from './day-end.model'

export class DayEndRepository {
  async create(userId: string, endedAt: Date): Promise<DayEnd> {
    const doc = new DayEndModel({
      userId,
      endedAt,
    })
    await doc.save()
    return toDayEnd(doc)
  }

  async findByUserIdAndDate(userId: string, date: Date): Promise<DayEnd | null> {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    const doc = await DayEndModel.findOne({
      userId,
      endedAt: { $gte: startOfDay, $lte: endOfDay },
    }).sort({ endedAt: -1 })

    return doc ? toDayEnd(doc) : null
  }

  async getLastDayEndedAt(userId: string, date: Date): Promise<Date | null> {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    const doc = await DayEndModel.findOne({
      userId,
      endedAt: { $gte: startOfDay, $lte: endOfDay },
    }).sort({ endedAt: -1 })

    return doc ? doc.endedAt : null
  }
}


