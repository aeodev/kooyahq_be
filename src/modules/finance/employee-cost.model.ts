import { Schema, model, models, type Document } from 'mongoose'

/**
 * Employee Cost Model
 * 
 * Employee costs track non-salary outflow per employee.
 * Salary comes EXCLUSIVELY from Users.monthlySalary.
 */
export interface EmployeeCostDocument extends Document {
  employeeId: string
  amount: number
  currency: string
  vendor?: string
  category?: string
  effectiveDate: Date
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

const employeeCostSchema = new Schema<EmployeeCostDocument>(
  {
    employeeId: {
      type: String,
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: 'PHP',
    },
    vendor: {
      type: String,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      trim: true,
      index: true,
    },
    effectiveDate: {
      type: Date,
      required: true,
      index: true,
    },
    createdBy: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
)

// Compound indexes for common queries
employeeCostSchema.index({ employeeId: 1, effectiveDate: 1 })
employeeCostSchema.index({ createdBy: 1, effectiveDate: 1 })

export const EmployeeCostModel = models.EmployeeCost ?? model<EmployeeCostDocument>('EmployeeCost', employeeCostSchema)

export type EmployeeCost = {
  id: string
  employeeId: string
  amount: number
  currency: string
  vendor?: string
  category?: string
  effectiveDate: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export function toEmployeeCost(doc: EmployeeCostDocument): EmployeeCost {
  return {
    id: doc._id.toString(),
    employeeId: doc.employeeId,
    amount: doc.amount,
    currency: doc.currency,
    vendor: doc.vendor,
    category: doc.category,
    effectiveDate: doc.effectiveDate.toISOString(),
    createdBy: doc.createdBy,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}

export type CreateEmployeeCostInput = {
  employeeId: string
  amount: number
  currency?: string
  vendor?: string
  category?: string
  effectiveDate: Date
}

export type UpdateEmployeeCostInput = {
  employeeId?: string
  amount?: number
  currency?: string
  vendor?: string | null
  category?: string | null
  effectiveDate?: Date
}
