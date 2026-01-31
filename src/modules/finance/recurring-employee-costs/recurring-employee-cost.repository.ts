import { RecurringEmployeeCostModel, toRecurringEmployeeCost, type RecurringEmployeeCost, type CreateRecurringEmployeeCostInput, type UpdateRecurringEmployeeCostInput, type RecurringFrequency, type RecurringStatus } from './recurring-employee-cost.model'

export type RecurringEmployeeCostFilters = {
  employeeId?: string
  status?: RecurringStatus
  frequency?: RecurringFrequency
  search?: string
}

export class RecurringEmployeeCostRepository {
  private buildQuery(filters: RecurringEmployeeCostFilters): Record<string, unknown> {
    const query: Record<string, unknown> = {}

    if (filters.employeeId) {
      query.employeeId = filters.employeeId
    }

    if (filters.status) {
      query.status = filters.status
    }

    if (filters.frequency) {
      query.frequency = filters.frequency
    }

    if (filters.search) {
      query.$or = [
        { vendor: { $regex: filters.search, $options: 'i' } },
        { category: { $regex: filters.search, $options: 'i' } },
      ]
    }

    return query
  }

  async create(input: CreateRecurringEmployeeCostInput, createdBy: string): Promise<RecurringEmployeeCost> {
    const doc = new RecurringEmployeeCostModel({
      employeeId: input.employeeId,
      amount: input.amount,
      currency: input.currency || 'PHP',
      vendor: input.vendor,
      category: input.category,
      frequency: input.frequency,
      startDate: input.startDate,
      endDate: input.endDate,
      status: input.status || 'active',
      createdBy,
    })
    await doc.save()
    return toRecurringEmployeeCost(doc)
  }

  async list(filters: RecurringEmployeeCostFilters): Promise<RecurringEmployeeCost[]> {
    const docs = await RecurringEmployeeCostModel.find(this.buildQuery(filters)).sort({ status: 1, startDate: -1, createdAt: -1 })
    return docs.map(toRecurringEmployeeCost)
  }

  async listPaginated(filters: RecurringEmployeeCostFilters, page: number, limit: number): Promise<{ data: RecurringEmployeeCost[]; total: number }> {
    const query = this.buildQuery(filters)
    const skip = (page - 1) * limit
    const [docs, total] = await Promise.all([
      RecurringEmployeeCostModel.find(query).sort({ status: 1, startDate: -1, createdAt: -1 }).skip(skip).limit(limit),
      RecurringEmployeeCostModel.countDocuments(query),
    ])
    return { data: docs.map(toRecurringEmployeeCost), total }
  }

  async findForSummary(startDate: Date, endDate: Date): Promise<RecurringEmployeeCost[]> {
    const query = {
      startDate: { $lte: endDate },
      $or: [
        { endDate: { $exists: false } },
        { endDate: null },
        { endDate: { $gte: startDate } },
      ],
      status: { $in: ['active', 'ended'] },
    }
    const docs = await RecurringEmployeeCostModel.find(query)
    return docs.map(toRecurringEmployeeCost)
  }

  async update(id: string, input: UpdateRecurringEmployeeCostInput): Promise<RecurringEmployeeCost | null> {
    const updateData: Record<string, unknown> = {}
    if (input.employeeId !== undefined) updateData.employeeId = input.employeeId
    if (input.amount !== undefined) updateData.amount = input.amount
    if (input.currency !== undefined) updateData.currency = input.currency
    if (input.vendor !== undefined) updateData.vendor = input.vendor ?? undefined
    if (input.category !== undefined) updateData.category = input.category ?? undefined
    if (input.frequency !== undefined) updateData.frequency = input.frequency
    if (input.startDate !== undefined) updateData.startDate = input.startDate
    if (input.endDate !== undefined) updateData.endDate = input.endDate === null ? undefined : input.endDate
    if (input.status !== undefined) updateData.status = input.status

    const doc = await RecurringEmployeeCostModel.findByIdAndUpdate(id, updateData, { new: true })
    return doc ? toRecurringEmployeeCost(doc) : null
  }

  async delete(id: string): Promise<boolean> {
    const result = await RecurringEmployeeCostModel.findByIdAndDelete(id)
    return !!result
  }
}
