import { Schema, model, models, type Document } from 'mongoose'

/**
 * Expense Model
 * 
 * IMPORTANT PRODUCT RULES:
 * - `notes` is the free text field (NOT description)
 * - Salary is NOT tracked as an expense type. Salary comes from Users.monthlySalary ONLY.
 */
export interface ExpenseDocument extends Document {
  amount: number
  currency: string
  category?: string
  vendor?: string
  notes?: string // Free text field (renamed from description)
  effectiveDate: Date
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
}

export type UpdateExpenseInput = {
  amount?: number
  currency?: string
  category?: string
  vendor?: string
  notes?: string
  effectiveDate?: Date
}
