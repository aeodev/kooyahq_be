import { EmployeeCostModel, toEmployeeCost, type EmployeeCost, type CreateEmployeeCostInput, type UpdateEmployeeCostInput, type EmployeeCostType } from './employee-cost.model'

/**
 * Employee Cost Filters
 * NOTE: 'salary' is NOT a valid cost type - salary comes from Users.monthlySalary
 */
export type EmployeeCostFilters = {
  employeeId?: string
  startDate?: Date
  endDate?: Date
  costType?: EmployeeCostType // subscription, equipment, training, benefit, other
}

export class EmployeeCostRepository {
  async create(input: CreateEmployeeCostInput, createdBy: string): Promise<EmployeeCost> {
    const doc = new EmployeeCostModel({
      employeeId: input.employeeId,
      costType: input.costType,
      amount: input.amount,
      currency: input.currency || 'PHP',
      effectiveDate: input.effectiveDate,
      endDate: input.endDate,
      notes: input.notes,
      metadata: input.metadata,
      createdBy,
    })
    await doc.save()
    return toEmployeeCost(doc)
  }

  async findById(id: string): Promise<EmployeeCost | null> {
    const doc = await EmployeeCostModel.findById(id)
    return doc ? toEmployeeCost(doc) : null
  }

  async listEmployeeCosts(filters: EmployeeCostFilters): Promise<EmployeeCost[]> {
    const query: Record<string, unknown> = {}

    if (filters.employeeId) {
      query.employeeId = filters.employeeId
    }

    if (filters.costType) {
      query.costType = filters.costType
    }

    if (filters.startDate || filters.endDate) {
      query.effectiveDate = {}
      if (filters.startDate) {
        query.effectiveDate.$gte = filters.startDate
      }
      if (filters.endDate) {
        query.effectiveDate.$lte = filters.endDate
      }
    }

    const docs = await EmployeeCostModel.find(query).sort({ effectiveDate: -1, createdAt: -1 })
    return docs.map(toEmployeeCost)
  }

  async updateEmployeeCost(id: string, input: UpdateEmployeeCostInput): Promise<EmployeeCost | null> {
    const updateData: Record<string, unknown> = {}
    if (input.employeeId !== undefined) updateData.employeeId = input.employeeId
    if (input.costType !== undefined) updateData.costType = input.costType
    if (input.amount !== undefined) updateData.amount = input.amount
    if (input.currency !== undefined) updateData.currency = input.currency
    if (input.effectiveDate !== undefined) updateData.effectiveDate = input.effectiveDate
    if (input.endDate !== undefined) updateData.endDate = input.endDate === null ? undefined : input.endDate
    if (input.notes !== undefined) updateData.notes = input.notes
    if (input.metadata !== undefined) updateData.metadata = input.metadata

    const doc = await EmployeeCostModel.findByIdAndUpdate(id, updateData, { new: true })
    return doc ? toEmployeeCost(doc) : null
  }

  async deleteEmployeeCost(id: string): Promise<boolean> {
    const result = await EmployeeCostModel.findByIdAndDelete(id)
    return !!result
  }
}
