import { BudgetModel, toBudget, type Budget, type CreateBudgetInput, type UpdateBudgetInput } from './budget.model'

export class BudgetRepository {
  async create(input: CreateBudgetInput, createdBy: string): Promise<Budget> {
    const doc = new BudgetModel({
      project: input.project ?? null,
      startDate: input.startDate,
      endDate: input.endDate,
      amount: input.amount,
      currency: input.currency || 'PHP',
      alertThresholds: {
        warning: input.alertThresholds?.warning ?? 80,
        critical: input.alertThresholds?.critical ?? 100,
      },
      createdBy,
    })
    await doc.save()
    return toBudget(doc)
  }

  async findById(id: string): Promise<Budget | null> {
    const doc = await BudgetModel.findById(id)
    return doc ? toBudget(doc) : null
  }

  async findAll(): Promise<Budget[]> {
    const docs = await BudgetModel.find().sort({ createdAt: -1 })
    return docs.map(toBudget)
  }

  async findByProject(project: string | null): Promise<Budget[]> {
    const docs = await BudgetModel.find({ project }).sort({ createdAt: -1 })
    return docs.map(toBudget)
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<Budget[]> {
    // Find budgets that overlap with the given date range
    const docs = await BudgetModel.find({
      $or: [
        // Budget starts within range
        { startDate: { $gte: startDate, $lte: endDate } },
        // Budget ends within range
        { endDate: { $gte: startDate, $lte: endDate } },
        // Budget encompasses the range
        { startDate: { $lte: startDate }, endDate: { $gte: endDate } },
      ],
    }).sort({ startDate: -1 })
    return docs.map(toBudget)
  }

  async findActive(date: Date = new Date()): Promise<Budget[]> {
    const docs = await BudgetModel.find({
      startDate: { $lte: date },
      endDate: { $gte: date },
    }).sort({ createdAt: -1 })
    return docs.map(toBudget)
  }

  async findActiveByProject(project: string | null, date: Date = new Date()): Promise<Budget | null> {
    const doc = await BudgetModel.findOne({
      project,
      startDate: { $lte: date },
      endDate: { $gte: date },
    }).sort({ createdAt: -1 })
    return doc ? toBudget(doc) : null
  }

  async update(id: string, input: UpdateBudgetInput): Promise<Budget | null> {
    const updateData: Partial<UpdateBudgetInput> = {}
    if (input.project !== undefined) updateData.project = input.project ?? null
    if (input.startDate !== undefined) updateData.startDate = input.startDate
    if (input.endDate !== undefined) updateData.endDate = input.endDate
    if (input.amount !== undefined) updateData.amount = input.amount
    if (input.currency !== undefined) updateData.currency = input.currency
    if (input.alertThresholds !== undefined) {
      updateData.alertThresholds = input.alertThresholds
    }

    const doc = await BudgetModel.findByIdAndUpdate(id, updateData, { new: true })
    return doc ? toBudget(doc) : null
  }

  async delete(id: string): Promise<boolean> {
    const result = await BudgetModel.findByIdAndDelete(id)
    return !!result
  }
}
