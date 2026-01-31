import { Schema, model, models, type Document } from 'mongoose'

export const RECURRING_FREQUENCIES = ['weekly', 'biweekly', 'monthly'] as const
export type RecurringFrequency = typeof RECURRING_FREQUENCIES[number]

export const RECURRING_STATUSES = ['active', 'paused', 'ended'] as const
export type RecurringStatus = typeof RECURRING_STATUSES[number]

export interface RecurringExpenseDocument extends Document {
  amount: number
  currency: string
  vendor?: string
  category?: string
  notes?: string
  frequency: RecurringFrequency
  startDate: Date
  endDate?: Date
  status: RecurringStatus
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

const recurringExpenseSchema = new Schema<RecurringExpenseDocument>(
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
    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    frequency: {
      type: String,
      enum: RECURRING_FREQUENCIES,
      required: true,
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      index: true,
    },
    status: {
      type: String,
      enum: RECURRING_STATUSES,
      default: 'active',
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

recurringExpenseSchema.index({ status: 1, startDate: 1 })

export const RecurringExpenseModel = models.RecurringExpense ?? model<RecurringExpenseDocument>('RecurringExpense', recurringExpenseSchema)

export type RecurringExpense = {
  id: string
  amount: number
  currency: string
  vendor?: string
  category?: string
  notes?: string
  frequency: RecurringFrequency
  startDate: string
  endDate?: string
  status: RecurringStatus
  createdBy: string
  createdAt: string
  updatedAt: string
}

export function toRecurringExpense(doc: RecurringExpenseDocument): RecurringExpense {
  return {
    id: doc._id.toString(),
    amount: doc.amount,
    currency: doc.currency,
    vendor: doc.vendor,
    category: doc.category,
    notes: doc.notes,
    frequency: doc.frequency,
    startDate: doc.startDate.toISOString(),
    endDate: doc.endDate?.toISOString(),
    status: doc.status,
    createdBy: doc.createdBy,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}

export type CreateRecurringExpenseInput = {
  amount: number
  currency?: string
  vendor?: string
  category?: string
  notes?: string
  frequency: RecurringFrequency
  startDate: Date
  endDate?: Date
  status?: RecurringStatus
}

export type UpdateRecurringExpenseInput = {
  amount?: number
  currency?: string
  vendor?: string | null
  category?: string | null
  notes?: string | null
  frequency?: RecurringFrequency
  startDate?: Date
  endDate?: Date | null
  status?: RecurringStatus
}
