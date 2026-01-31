import { Schema, model, models, type Document } from 'mongoose'

import type { RecurringFrequency, RecurringStatus } from '../recurring-expenses/recurring-expense.model'

export interface RecurringEmployeeCostDocument extends Document {
  employeeId: string
  amount: number
  currency: string
  vendor?: string
  category?: string
  frequency: RecurringFrequency
  startDate: Date
  endDate?: Date
  status: RecurringStatus
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

const recurringEmployeeCostSchema = new Schema<RecurringEmployeeCostDocument>(
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
    frequency: {
      type: String,
      enum: ['weekly', 'biweekly', 'monthly'],
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
      enum: ['active', 'paused', 'ended'],
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

recurringEmployeeCostSchema.index({ status: 1, startDate: 1 })

export const RecurringEmployeeCostModel = models.RecurringEmployeeCost ?? model<RecurringEmployeeCostDocument>('RecurringEmployeeCost', recurringEmployeeCostSchema)

export type RecurringEmployeeCost = {
  id: string
  employeeId: string
  amount: number
  currency: string
  vendor?: string
  category?: string
  frequency: RecurringFrequency
  startDate: string
  endDate?: string
  status: RecurringStatus
  createdBy: string
  createdAt: string
  updatedAt: string
}

export function toRecurringEmployeeCost(doc: RecurringEmployeeCostDocument): RecurringEmployeeCost {
  return {
    id: doc._id.toString(),
    employeeId: doc.employeeId,
    amount: doc.amount,
    currency: doc.currency,
    vendor: doc.vendor,
    category: doc.category,
    frequency: doc.frequency,
    startDate: doc.startDate.toISOString(),
    endDate: doc.endDate?.toISOString(),
    status: doc.status,
    createdBy: doc.createdBy,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}

export type CreateRecurringEmployeeCostInput = {
  employeeId: string
  amount: number
  currency?: string
  vendor?: string
  category?: string
  frequency: RecurringFrequency
  startDate: Date
  endDate?: Date
  status?: RecurringStatus
}

export type UpdateRecurringEmployeeCostInput = {
  employeeId?: string
  amount?: number
  currency?: string
  vendor?: string | null
  category?: string | null
  frequency?: RecurringFrequency
  startDate?: Date
  endDate?: Date | null
  status?: RecurringStatus
}
