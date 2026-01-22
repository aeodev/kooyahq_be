import { Schema, model, models, type Document } from 'mongoose'

/**
 * Employee Cost Model
 * 
 * IMPORTANT: 'salary' is NOT a valid cost type.
 * Salary comes EXCLUSIVELY from Users.monthlySalary.
 * This model is for employee-related NON-SALARY costs only:
 * - subscription: Software licenses, tools, services for the employee
 * - equipment: Hardware, furniture, etc.
 * - training: Courses, certifications, conferences
 * - benefit: Insurance, allowances, etc.
 * - other: Miscellaneous employee costs
 */
export interface EmployeeCostDocument extends Document {
  employeeId: string
  costType: 'subscription' | 'equipment' | 'training' | 'benefit' | 'other'
  amount: number
  currency: string
  effectiveDate: Date
  endDate?: Date
  notes?: string
  metadata?: Record<string, unknown>
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
    costType: {
      type: String,
      // NOTE: 'salary' intentionally removed - salary comes from Users.monthlySalary
      enum: ['subscription', 'equipment', 'training', 'benefit', 'other'],
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
    effectiveDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    metadata: {
      type: Schema.Types.Mixed,
      validate: {
        validator: function(v: unknown) {
          if (!v) return true
          return JSON.stringify(v).length <= 10240
        },
        message: 'Metadata too large (max 10KB)',
      },
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
employeeCostSchema.index({ employeeId: 1, costType: 1 })
employeeCostSchema.index({ effectiveDate: 1, costType: 1 })
employeeCostSchema.index({ createdBy: 1, effectiveDate: 1 })

export const EmployeeCostModel = models.EmployeeCost ?? model<EmployeeCostDocument>('EmployeeCost', employeeCostSchema)

/**
 * Valid employee cost types (salary is NOT included - it comes from Users.monthlySalary)
 */
export const EMPLOYEE_COST_TYPES = ['subscription', 'equipment', 'training', 'benefit', 'other'] as const
export type EmployeeCostType = typeof EMPLOYEE_COST_TYPES[number]

export type EmployeeCost = {
  id: string
  employeeId: string
  costType: EmployeeCostType
  amount: number
  currency: string
  effectiveDate: string
  endDate?: string
  notes?: string
  metadata?: Record<string, unknown>
  createdBy: string
  createdAt: string
  updatedAt: string
}

export function toEmployeeCost(doc: EmployeeCostDocument): EmployeeCost {
  return {
    id: doc._id.toString(),
    employeeId: doc.employeeId,
    costType: doc.costType,
    amount: doc.amount,
    currency: doc.currency,
    effectiveDate: doc.effectiveDate.toISOString(),
    endDate: doc.endDate?.toISOString(),
    notes: doc.notes,
    metadata: doc.metadata as Record<string, unknown> | undefined,
    createdBy: doc.createdBy,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}

export type CreateEmployeeCostInput = {
  employeeId: string
  costType: EmployeeCostType
  amount: number
  currency?: string
  effectiveDate: Date
  endDate?: Date
  notes?: string
  metadata?: Record<string, unknown>
}

export type UpdateEmployeeCostInput = {
  employeeId?: string
  costType?: EmployeeCostType
  amount?: number
  currency?: string
  effectiveDate?: Date
  endDate?: Date | null
  notes?: string
  metadata?: Record<string, unknown>
}
