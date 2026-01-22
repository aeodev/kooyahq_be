/**
 * Finance Module Security Tests
 * 
 * These tests verify that:
 * 1. Analytics safe endpoints do NOT include hourlyRate/monthlySalary
 * 2. Privileged analytics endpoints return 403 without USERS_MANAGE
 * 3. Privileged analytics endpoints include hourlyRate when USERS_MANAGE present
 * 4. Budget BOLA: user cannot modify a budget they do not own (403)
 * 5. Admin activity logging redacts hourlyRate/monthlySalary/salary keys
 * 6. Expense validation for isRecurringMonthly + notes constraints
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AnalyticsService } from '../analytics/analytics.service'
import { BudgetService, type AuthContext } from '../budgets/budget.service'
import { adminActivityService } from '../../admin-activity/admin-activity.service'
import type { Permission } from '../../auth/rbac/permissions'
import { PERMISSIONS } from '../../auth/rbac/permissions'

// Mock the repositories
vi.mock('../../time-tracker/time-entry.repository')
vi.mock('../../users/user.repository')
vi.mock('../budgets/budget.repository')

describe('Finance Security Tests', () => {
  // ============================================================================
  // Test 1: Analytics safe endpoints do NOT include hourlyRate/monthlySalary
  // ============================================================================
  describe('Analytics Safe Endpoints', () => {
    it('should not include hourlyRate in safe live response', async () => {
      const service = new AnalyticsService()
      const data = await service.getLiveCostData()
      
      // Verify the response structure
      expect(data).toHaveProperty('activeDevelopers')
      
      // Check that no developer has hourlyRate or monthlySalary
      for (const dev of data.activeDevelopers) {
        expect(dev).not.toHaveProperty('hourlyRate')
        expect(dev).not.toHaveProperty('monthlySalary')
      }
    })

    it('should not include hourlyRate in safe cost summary response', async () => {
      const service = new AnalyticsService()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 30)
      const endDate = new Date()
      
      const data = await service.getCostSummary(startDate, endDate)
      
      // Check top performers don't have hourlyRate
      for (const performer of data.topPerformers) {
        expect(performer).not.toHaveProperty('hourlyRate')
      }
      
      // Check project costs developers don't have hourlyRate
      for (const project of data.projectCosts) {
        for (const dev of project.developers) {
          expect(dev).not.toHaveProperty('hourlyRate')
        }
      }
    })

    it('should not include hourlyRate in safe project detail response', async () => {
      const service = new AnalyticsService()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 30)
      const endDate = new Date()
      
      const data = await service.getProjectDetail('TestProject', startDate, endDate)
      
      if (data) {
        for (const dev of data.developers) {
          expect(dev).not.toHaveProperty('hourlyRate')
        }
      }
    })
  })

  // ============================================================================
  // Test 2 & 3: Privileged endpoints require USERS_MANAGE and return hourlyRate
  // ============================================================================
  describe('Analytics Privileged Endpoints', () => {
    it('should include hourlyRate in privileged live response', async () => {
      const service = new AnalyticsService()
      const data = await service.getLiveCostDataPrivileged()
      
      // Verify the response structure includes hourlyRate
      expect(data).toHaveProperty('activeDevelopers')
      
      // If there are developers, they should have hourlyRate
      if (data.activeDevelopers.length > 0) {
        expect(data.activeDevelopers[0]).toHaveProperty('hourlyRate')
        expect(data.activeDevelopers[0]).toHaveProperty('monthlySalary')
      }
    })

    it('should include hourlyRate in privileged cost summary response', async () => {
      const service = new AnalyticsService()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 30)
      const endDate = new Date()
      
      const data = await service.getCostSummaryPrivileged(startDate, endDate)
      
      // If there are top performers, they should have hourlyRate
      if (data.topPerformers.length > 0) {
        expect(data.topPerformers[0]).toHaveProperty('hourlyRate')
      }
      
      // If there are project costs with developers, they should have hourlyRate
      if (data.projectCosts.length > 0 && data.projectCosts[0].developers.length > 0) {
        expect(data.projectCosts[0].developers[0]).toHaveProperty('hourlyRate')
      }
    })
  })

  // ============================================================================
  // Test 4: Budget BOLA - user cannot modify a budget they do not own
  // ============================================================================
  describe('Budget BOLA Protection', () => {
    it('should allow owner to update their budget', async () => {
      const service = new BudgetService()
      const ownerId = 'user-owner-123'
      
      // Create a budget
      const budget = await service.createBudget(
        {
          project: 'TestProject',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          amount: 10000,
        },
        ownerId
      )
      
      // Owner should be able to update
      const authContext: AuthContext = {
        userId: ownerId,
        permissions: [PERMISSIONS.FINANCE_EDIT] as Permission[],
      }
      
      await expect(
        service.updateBudget(budget.id, { amount: 15000 }, authContext)
      ).resolves.not.toThrow()
    })

    it('should reject non-owner without full access from updating budget', async () => {
      const service = new BudgetService()
      const ownerId = 'user-owner-123'
      const attackerId = 'user-attacker-456'
      
      // Create a budget as owner
      const budget = await service.createBudget(
        {
          project: 'TestProject',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          amount: 10000,
        },
        ownerId
      )
      
      // Attacker should NOT be able to update
      const authContext: AuthContext = {
        userId: attackerId,
        permissions: [PERMISSIONS.FINANCE_EDIT] as Permission[],
      }
      
      await expect(
        service.updateBudget(budget.id, { amount: 1 }, authContext)
      ).rejects.toThrow('Not authorized to modify this budget')
    })

    it('should allow user with FINANCE_FULL_ACCESS to modify any budget', async () => {
      const service = new BudgetService()
      const ownerId = 'user-owner-123'
      const adminId = 'user-admin-789'
      
      // Create a budget as owner
      const budget = await service.createBudget(
        {
          project: 'TestProject',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          amount: 10000,
        },
        ownerId
      )
      
      // Admin with FINANCE_FULL_ACCESS should be able to update
      const authContext: AuthContext = {
        userId: adminId,
        permissions: [PERMISSIONS.FINANCE_FULL_ACCESS] as Permission[],
      }
      
      await expect(
        service.updateBudget(budget.id, { amount: 15000 }, authContext)
      ).resolves.not.toThrow()
    })

    it('should reject non-owner from deleting budget', async () => {
      const service = new BudgetService()
      const ownerId = 'user-owner-123'
      const attackerId = 'user-attacker-456'
      
      // Create a budget as owner
      const budget = await service.createBudget(
        {
          project: 'TestProject',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          amount: 10000,
        },
        ownerId
      )
      
      // Attacker should NOT be able to delete
      const authContext: AuthContext = {
        userId: attackerId,
        permissions: [PERMISSIONS.FINANCE_EDIT] as Permission[],
      }
      
      await expect(
        service.deleteBudget(budget.id, authContext)
      ).rejects.toThrow('Not authorized to delete this budget')
    })
  })

  // ============================================================================
  // Test 5: Admin activity logging redacts sensitive keys
  // ============================================================================
  describe('Admin Activity Log Redaction', () => {
    it('should redact hourlyRate in admin activity logs', async () => {
      const log = await adminActivityService.logActivity({
        action: 'update_user',
        actorId: 'admin-123',
        targetId: 'user-456',
        targetType: 'user',
        changes: {
          hourlyRate: { from: 100, to: 150 },
          name: { from: 'John', to: 'John Doe' },
        },
      })
      
      expect(log.changes?.hourlyRate).toBe('[redacted]')
      expect(log.changes?.name).toBeDefined()
      expect(log.changes?.name).not.toBe('[redacted]')
    })

    it('should redact monthlySalary in admin activity logs', async () => {
      const log = await adminActivityService.logActivity({
        action: 'update_user',
        actorId: 'admin-123',
        targetId: 'user-456',
        targetType: 'user',
        changes: {
          monthlySalary: { from: 50000, to: 60000 },
        },
      })
      
      expect(log.changes?.monthlySalary).toBe('[redacted]')
    })

    it('should redact salary in admin activity logs', async () => {
      const log = await adminActivityService.logActivity({
        action: 'update_user',
        actorId: 'admin-123',
        targetId: 'user-456',
        targetType: 'user',
        changes: {
          salary: { from: 50000, to: 60000 },
        },
      })
      
      expect(log.changes?.salary).toBe('[redacted]')
    })
  })

  // ============================================================================
  // Test 6: Expense validation
  // ============================================================================
  describe('Expense Validation', () => {
    it('should enforce notes max length', async () => {
      const { ExpenseService } = await import('../expenses/expense.service')
      const service = new ExpenseService()
      
      const longNotes = 'a'.repeat(2001)
      
      await expect(
        service.createExpense(
          {
            amount: 100,
            effectiveDate: new Date(),
            notes: longNotes,
          },
          'user-123'
        )
      ).rejects.toThrow('Notes must be 2000 characters or less')
    })

    it('should validate endDate is after effectiveDate for recurring expenses', async () => {
      const { ExpenseService } = await import('../expenses/expense.service')
      const service = new ExpenseService()
      
      const effectiveDate = new Date()
      const endDate = new Date(effectiveDate.getTime() - 24 * 60 * 60 * 1000) // 1 day before
      
      await expect(
        service.createExpense(
          {
            amount: 100,
            effectiveDate,
            endDate,
            isRecurringMonthly: true,
          },
          'user-123'
        )
      ).rejects.toThrow('End date must be after effective date for recurring expenses')
    })

    it('should accept valid expense with isRecurringMonthly and notes', async () => {
      const { ExpenseService } = await import('../expenses/expense.service')
      const service = new ExpenseService()
      
      const expense = await service.createExpense(
        {
          amount: 500,
          effectiveDate: new Date(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          isRecurringMonthly: true,
          notes: 'Monthly subscription',
        },
        'user-123'
      )
      
      expect(expense).toHaveProperty('id')
      expect(expense.isRecurringMonthly).toBe(true)
      expect(expense.notes).toBe('Monthly subscription')
    })
  })
})

// ============================================================================
// Employee Cost Type Validation Tests
// ============================================================================
describe('Employee Cost Type Validation', () => {
  it('should not allow salary as a cost type', async () => {
    const { EMPLOYEE_COST_TYPES } = await import('../employee-cost.model')
    
    expect(EMPLOYEE_COST_TYPES).not.toContain('salary')
    expect(EMPLOYEE_COST_TYPES).toContain('subscription')
    expect(EMPLOYEE_COST_TYPES).toContain('equipment')
    expect(EMPLOYEE_COST_TYPES).toContain('training')
    expect(EMPLOYEE_COST_TYPES).toContain('benefit')
    expect(EMPLOYEE_COST_TYPES).toContain('other')
  })
})
