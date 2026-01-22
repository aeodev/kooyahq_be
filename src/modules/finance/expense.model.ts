import { Schema, model, models, type Document } from 'mongoose'

/**
 * Expense Model
 * 
 * IMPORTANT PRODUCT RULES:
 * - `notes` is the free text field (NOT description)
 * - `isRecurringMonthly` is the ONLY recurrence toggle (monthly only, no other options)
 * - `endDate` is optional; if omitted for recurring, continues indefinitely
 * - Salary is NOT tracked as an expense type. Salary comes from Users.monthlySalary ONLY.
 */
export interface ExpenseDocument extends Document {
  amount: number
  currency: string
  category?: string
  vendor?: string
  notes?: string // Free text field (renamed from description)
  effectiveDate: Date
  endDate?: Date // Optional end date for recurring or range-based costs
  isRecurringMonthly: boolean // Monthly recurring toggle ONLY (no dropdown)
  projectId?: string // Scope to project if applicable
  workspaceId?: string // Scope to workspace if applicable
  metadata?: Record<string, unknown>
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

const MAX_NOTES_LENGTH = 2000 // Enforce max notes length

const expenseSchema = new Schema<ExpenseDocument>(
  {
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
    category: {
      type: String,
      trim: true,
      index: true,
    },
    vendor: {
      type: String,
      trim: true,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: MAX_NOTES_LENGTH,
    },
    effectiveDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      index: true,
    },
    isRecurringMonthly: {
      type: Boolean,
      default: false,
    },
    projectId: {
      type: String,
      index: true,
    },
    workspaceId: {
      type: String,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      validate: {
        validator: function(v: unknown) {
          // Limit metadata size to 10KB
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
expenseSchema.index({ effectiveDate: 1, category: 1 })
expenseSchema.index({ effectiveDate: 1, vendor: 1 })
expenseSchema.index({ projectId: 1, effectiveDate: 1 })
expenseSchema.index({ workspaceId: 1, effectiveDate: 1 })
expenseSchema.index({ createdBy: 1, effectiveDate: 1 })

export const ExpenseModel = models.Expense ?? model<ExpenseDocument>('Expense', expenseSchema)

export type Expense = {
  id: string
  amount: number
  currency: string
  category?: string
  vendor?: string
  notes?: string
  effectiveDate: string
  endDate?: string
  isRecurringMonthly: boolean
  projectId?: string
  workspaceId?: string
  metadata?: Record<string, unknown>
  createdBy: string
  createdAt: string
  updatedAt: string
}

export function toExpense(doc: ExpenseDocument): Expense {
  return {
    id: doc._id.toString(),
    amount: doc.amount,
    currency: doc.currency,
    category: doc.category,
    vendor: doc.vendor,
    notes: doc.notes,
    effectiveDate: doc.effectiveDate.toISOString(),
    endDate: doc.endDate?.toISOString(),
    isRecurringMonthly: doc.isRecurringMonthly,
    projectId: doc.projectId,
    workspaceId: doc.workspaceId,
    metadata: doc.metadata as Record<string, unknown> | undefined,
    createdBy: doc.createdBy,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}

export type CreateExpenseInput = {
  amount: number
  currency?: string
  category?: string
  vendor?: string
  notes?: string
  effectiveDate: Date
  endDate?: Date
  isRecurringMonthly?: boolean
  projectId?: string
  workspaceId?: string
  metadata?: Record<string, unknown>
}

export type UpdateExpenseInput = {
  amount?: number
  currency?: string
  category?: string
  vendor?: string
  notes?: string
  effectiveDate?: Date
  endDate?: Date | null // Allow clearing endDate
  isRecurringMonthly?: boolean
  projectId?: string | null
  workspaceId?: string | null
  metadata?: Record<string, unknown>
}
