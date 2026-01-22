import { ExpenseModel, toExpense, type Expense, type CreateExpenseInput, type UpdateExpenseInput } from './expense.model'

export type ExpenseFilters = {
  startDate?: Date
  endDate?: Date
  category?: string
  vendor?: string
  projectId?: string
  workspaceId?: string
  createdBy?: string
  search?: string
}

export class ExpenseRepository {
  async create(input: CreateExpenseInput, createdBy: string): Promise<Expense> {
    const doc = new ExpenseModel({
      amount: input.amount,
      currency: input.currency || 'PHP',
      category: input.category,
      vendor: input.vendor,
      notes: input.notes,
      effectiveDate: input.effectiveDate,
      endDate: input.endDate,
      isRecurringMonthly: input.isRecurringMonthly ?? false,
      projectId: input.projectId,
      workspaceId: input.workspaceId,
      metadata: input.metadata,
      createdBy,
    })
    await doc.save()
    return toExpense(doc)
  }

  async findById(id: string): Promise<Expense | null> {
    const doc = await ExpenseModel.findById(id)
    return doc ? toExpense(doc) : null
  }

  async listExpenses(filters: ExpenseFilters): Promise<Expense[]> {
    const query: Record<string, unknown> = {}

    if (filters.startDate || filters.endDate) {
      query.effectiveDate = {}
      if (filters.startDate) {
        (query.effectiveDate as Record<string, Date>).$gte = filters.startDate
      }
      if (filters.endDate) {
        (query.effectiveDate as Record<string, Date>).$lte = filters.endDate
      }
    }

    if (filters.category) {
      query.category = filters.category
    }

    if (filters.vendor) {
      query.vendor = filters.vendor
    }

    if (filters.projectId) {
      query.projectId = filters.projectId
    }

    if (filters.workspaceId) {
      query.workspaceId = filters.workspaceId
    }

    if (filters.createdBy) {
      query.createdBy = filters.createdBy
    }

    if (filters.search) {
      query.$or = [
        { notes: { $regex: filters.search, $options: 'i' } },
        { vendor: { $regex: filters.search, $options: 'i' } },
        { category: { $regex: filters.search, $options: 'i' } },
      ]
    }

    const docs = await ExpenseModel.find(query).sort({ effectiveDate: -1, createdAt: -1 })
    return docs.map(toExpense)
  }

  async updateExpense(id: string, input: UpdateExpenseInput): Promise<Expense | null> {
    const updateData: Record<string, unknown> = {}
    
    if (input.amount !== undefined) updateData.amount = input.amount
    if (input.currency !== undefined) updateData.currency = input.currency
    if (input.category !== undefined) updateData.category = input.category
    if (input.vendor !== undefined) updateData.vendor = input.vendor
    if (input.notes !== undefined) updateData.notes = input.notes
    if (input.effectiveDate !== undefined) updateData.effectiveDate = input.effectiveDate
    if (input.endDate !== undefined) updateData.endDate = input.endDate === null ? undefined : input.endDate
    if (input.isRecurringMonthly !== undefined) updateData.isRecurringMonthly = input.isRecurringMonthly
    if (input.projectId !== undefined) updateData.projectId = input.projectId === null ? undefined : input.projectId
    if (input.workspaceId !== undefined) updateData.workspaceId = input.workspaceId === null ? undefined : input.workspaceId
    if (input.metadata !== undefined) updateData.metadata = input.metadata

    const doc = await ExpenseModel.findByIdAndUpdate(id, updateData, { new: true })
    return doc ? toExpense(doc) : null
  }

  async deleteExpense(id: string): Promise<boolean> {
    const result = await ExpenseModel.findByIdAndDelete(id)
    return !!result
  }
}
