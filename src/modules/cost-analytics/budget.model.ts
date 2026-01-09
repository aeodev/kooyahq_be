import { Schema, model, models, type Document } from 'mongoose'

export interface BudgetDocument extends Document {
  project: string | null // null for team-wide budgets
  startDate: Date
  endDate: Date
  amount: number
  currency: string
  alertThresholds: {
    warning: number // percentage (e.g., 80)
    critical: number // percentage (e.g., 100)
  }
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

const budgetSchema = new Schema<BudgetDocument>(
  {
    project: {
      type: String,
      default: null,
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
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
    alertThresholds: {
      warning: {
        type: Number,
        required: true,
        default: 80,
        min: 0,
        max: 100,
      },
      critical: {
        type: Number,
        required: true,
        default: 100,
        min: 0,
        max: 100,
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

// Compound index for finding active budgets by project
budgetSchema.index({ project: 1, startDate: 1, endDate: 1 })
budgetSchema.index({ startDate: 1, endDate: 1 })

export const BudgetModel = models.Budget ?? model<BudgetDocument>('Budget', budgetSchema)

export type Budget = {
  id: string
  project: string | null
  startDate: string
  endDate: string
  amount: number
  currency: string
  alertThresholds: {
    warning: number
    critical: number
  }
  createdBy: string
  createdAt: string
  updatedAt: string
}

export function toBudget(doc: BudgetDocument): Budget {
  return {
    id: doc._id.toString(),
    project: doc.project ?? null,
    startDate: doc.startDate.toISOString(),
    endDate: doc.endDate.toISOString(),
    amount: doc.amount,
    currency: doc.currency,
    alertThresholds: {
      warning: doc.alertThresholds.warning,
      critical: doc.alertThresholds.critical,
    },
    createdBy: doc.createdBy,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}

export type CreateBudgetInput = {
  project?: string | null
  startDate: Date
  endDate: Date
  amount: number
  currency?: string
  alertThresholds?: {
    warning?: number
    critical?: number
  }
}

export type UpdateBudgetInput = {
  project?: string | null
  startDate?: Date
  endDate?: Date
  amount?: number
  currency?: string
  alertThresholds?: {
    warning?: number
    critical?: number
  }
}
