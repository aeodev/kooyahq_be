import { RecurringExpenseModel, toRecurringExpense, type RecurringExpense, type CreateRecurringExpenseInput, type UpdateRecurringExpenseInput, type RecurringFrequency, type RecurringStatus } from './recurring-expense.model'

export type RecurringExpenseFilters = {
  status?: RecurringStatus
  frequency?: RecurringFrequency
  search?: string
}

export class RecurringExpenseRepository {
  private buildQuery(filters: RecurringExpenseFilters): Record<string, unknown> {
    const query: Record<string, unknown> = {}

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
        { notes: { $regex: filters.search, $options: 'i' } },
      ]
    }

    return query
  }

  async create(input: CreateRecurringExpenseInput, createdBy: string): Promise<RecurringExpense> {
    const doc = new RecurringExpenseModel({
      amount: input.amount,
      currency: input.currency || 'PHP',
      vendor: input.vendor,
      category: input.category,
      notes: input.notes,
      frequency: input.frequency,
      startDate: input.startDate,
      endDate: input.endDate,
      status: input.status || 'active',
      createdBy,
    })
    await doc.save()
    return toRecurringExpense(doc)
  }

  async list(filters: RecurringExpenseFilters): Promise<RecurringExpense[]> {
    const docs = await RecurringExpenseModel.find(this.buildQuery(filters)).sort({ status: 1, startDate: -1, createdAt: -1 })
    return docs.map(toRecurringExpense)
  }

  async listPaginated(filters: RecurringExpenseFilters, page: number, limit: number): Promise<{ data: RecurringExpense[]; total: number }> {
    const query = this.buildQuery(filters)
    const skip = (page - 1) * limit
    const [docs, total] = await Promise.all([
      RecurringExpenseModel.find(query).sort({ status: 1, startDate: -1, createdAt: -1 }).skip(skip).limit(limit),
      RecurringExpenseModel.countDocuments(query),
    ])
    return { data: docs.map(toRecurringExpense), total }
  }

  async findForSummary(startDate: Date, endDate: Date): Promise<RecurringExpense[]> {
    const query = {
      startDate: { $lte: endDate },
      $or: [
        { endDate: { $exists: false } },
        { endDate: null },
        { endDate: { $gte: startDate } },
      ],
      status: { $in: ['active', 'ended'] },
    }
    const docs = await RecurringExpenseModel.find(query)
    return docs.map(toRecurringExpense)
  }

  async update(id: string, input: UpdateRecurringExpenseInput): Promise<RecurringExpense | null> {
    const updateData: Record<string, unknown> = {}
    if (input.amount !== undefined) updateData.amount = input.amount
    if (input.currency !== undefined) updateData.currency = input.currency
    if (input.vendor !== undefined) updateData.vendor = input.vendor ?? undefined
    if (input.category !== undefined) updateData.category = input.category ?? undefined
    if (input.notes !== undefined) updateData.notes = input.notes ?? undefined
    if (input.frequency !== undefined) updateData.frequency = input.frequency
    if (input.startDate !== undefined) updateData.startDate = input.startDate
    if (input.endDate !== undefined) updateData.endDate = input.endDate === null ? undefined : input.endDate
    if (input.status !== undefined) updateData.status = input.status

    const doc = await RecurringExpenseModel.findByIdAndUpdate(id, updateData, { new: true })
    return doc ? toRecurringExpense(doc) : null
  }

  async delete(id: string): Promise<boolean> {
    const result = await RecurringExpenseModel.findByIdAndDelete(id)
    return !!result
  }
}
