import { Schema, model, models, type Document } from 'mongoose'

/**
 * Budget Model
 * 
 * SECURITY: Budgets implement object-level authorization.
 * - createdBy field tracks ownership
 * - workspaceId/projectId enable scoping
 * - Authorization checks in service layer enforce access control
 */
export interface BudgetDocument extends Document {
  project: string | null // null for team-wide budgets
  workspaceId?: string // For workspace-level scoping
  startDate: Date
  endDate: Date
  amount: number
  currency: string
  alertThresholds: {
    warning: number // percentage (e.g., 80)
    critical: number // percentage (e.g., 95)
  }
  createdBy: string // Owner - required for BOLA
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
    workspaceId: {
      type: String,
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
        default: 80,
        min: 0,
        max: 100,
      },
      critical: {
        type: Number,
        default: 95,
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

// Compound indexes for common queries
budgetSchema.index({ project: 1, startDate: 1, endDate: 1 })
budgetSchema.index({ startDate: 1, endDate: 1 })
budgetSchema.index({ createdBy: 1, startDate: 1 })
budgetSchema.index({ workspaceId: 1, startDate: 1 })

export const BudgetModel = models.Budget ?? model<BudgetDocument>('Budget', budgetSchema)

export type Budget = {
  id: string
  project: string | null
  workspaceId?: string
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
    project: doc.project,
    workspaceId: doc.workspaceId,
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
  workspaceId?: string
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
  workspaceId?: string | null
  startDate?: Date
  endDate?: Date
  amount?: number
  currency?: string
  alertThresholds?: {
    warning?: number
    critical?: number
  }
}
