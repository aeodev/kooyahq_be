import { BudgetModel, toBudget, type Budget, type CreateBudgetInput, type UpdateBudgetInput } from './budget.model'

export class BudgetRepository {
  async create(input: CreateBudgetInput, createdBy: string): Promise<Budget> {
    const doc = new BudgetModel({
      project: input.project ?? null,
      workspaceId: input.workspaceId,
      startDate: input.startDate,
      endDate: input.endDate,
      amount: input.amount,
      currency: input.currency || 'PHP',
      alertThresholds: {
        warning: input.alertThresholds?.warning ?? 80,
        critical: input.alertThresholds?.critical ?? 95,
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

  async findByCreatedBy(userId: string): Promise<Budget[]> {
    const docs = await BudgetModel.find({ createdBy: userId }).sort({ createdAt: -1 })
    return docs.map(toBudget)
  }

  async findByWorkspace(workspaceId: string): Promise<Budget[]> {
    const docs = await BudgetModel.find({ workspaceId }).sort({ createdAt: -1 })
    return docs.map(toBudget)
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<Budget[]> {
    const docs = await BudgetModel.find({
      $or: [
        { startDate: { $gte: startDate, $lte: endDate } },
        { endDate: { $gte: startDate, $lte: endDate } },
        { $and: [{ startDate: { $lte: startDate } }, { endDate: { $gte: endDate } }] },
      ],
    }).sort({ createdAt: -1 })
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
    })
    return doc ? toBudget(doc) : null
  }

  async update(id: string, input: UpdateBudgetInput): Promise<Budget | null> {
    const updateData: Record<string, unknown> = {}
    
    if (input.project !== undefined) updateData.project = input.project
    if (input.workspaceId !== undefined) updateData.workspaceId = input.workspaceId === null ? undefined : input.workspaceId
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
