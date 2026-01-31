import { EmployeeCostModel, toEmployeeCost, type EmployeeCost, type CreateEmployeeCostInput, type UpdateEmployeeCostInput } from './employee-cost.model'

/**
 * Employee Cost Filters
 * NOTE: Salary is not tracked here - it comes from Users.monthlySalary
 */
export type EmployeeCostFilters = {
  employeeId?: string
  startDate?: Date
  endDate?: Date
  search?: string
}

export class EmployeeCostRepository {
  private buildQuery(filters: EmployeeCostFilters): Record<string, unknown> {
    const query: Record<string, unknown> = {}

    if (filters.employeeId) {
      query.employeeId = filters.employeeId
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

    if (filters.search) {
      query.$or = [
        { vendor: { $regex: filters.search, $options: 'i' } },
        { category: { $regex: filters.search, $options: 'i' } },
      ]
    }

    return query
  }

  async create(input: CreateEmployeeCostInput, createdBy: string): Promise<EmployeeCost> {
    const doc = new EmployeeCostModel({
      employeeId: input.employeeId,
      amount: input.amount,
      currency: input.currency || 'PHP',
      vendor: input.vendor,
      category: input.category,
      effectiveDate: input.effectiveDate,
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
    const docs = await EmployeeCostModel.find(this.buildQuery(filters)).sort({ effectiveDate: -1, createdAt: -1 })
    return docs.map(toEmployeeCost)
  }

  async listEmployeeCostsPaginated(filters: EmployeeCostFilters, page: number, limit: number): Promise<{ data: EmployeeCost[]; total: number }> {
    const query = this.buildQuery(filters)
    const skip = (page - 1) * limit
    const [docs, total] = await Promise.all([
      EmployeeCostModel.find(query).sort({ effectiveDate: -1, createdAt: -1 }).skip(skip).limit(limit),
      EmployeeCostModel.countDocuments(query),
    ])
    return { data: docs.map(toEmployeeCost), total }
  }

  async getOptions(): Promise<{ vendors: string[]; categories: string[] }> {
    const [vendors, categories] = await Promise.all([
      EmployeeCostModel.distinct('vendor', { vendor: { $nin: [null, ''] } }),
      EmployeeCostModel.distinct('category', { category: { $nin: [null, ''] } }),
    ])
    return {
      vendors: vendors.filter(Boolean),
      categories: categories.filter(Boolean),
    }
  }

  async updateEmployeeCost(id: string, input: UpdateEmployeeCostInput): Promise<EmployeeCost | null> {
    const updateData: Record<string, unknown> = {}
    if (input.employeeId !== undefined) updateData.employeeId = input.employeeId
    if (input.amount !== undefined) updateData.amount = input.amount
    if (input.currency !== undefined) updateData.currency = input.currency
    if (input.vendor !== undefined) updateData.vendor = input.vendor ?? undefined
    if (input.category !== undefined) updateData.category = input.category ?? undefined
    if (input.effectiveDate !== undefined) updateData.effectiveDate = input.effectiveDate

    const doc = await EmployeeCostModel.findByIdAndUpdate(id, updateData, { new: true })
    return doc ? toEmployeeCost(doc) : null
  }

  async deleteEmployeeCost(id: string): Promise<boolean> {
    const result = await EmployeeCostModel.findByIdAndDelete(id)
    return !!result
  }
}
