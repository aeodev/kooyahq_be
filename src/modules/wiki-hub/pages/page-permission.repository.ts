import {
  PagePermissionModel,
  toPagePermission,
  type PagePermission,
} from './page-permission.model'

export type CreatePagePermissionInput = {
  pageId: string
  userId: string
  role: 'view' | 'edit' | 'comment' | 'admin'
  workspaceId: string
}

export class PagePermissionRepository {
  async grantPermission(input: CreatePagePermissionInput): Promise<PagePermission> {
    // Check if permission already exists
    const existing = await PagePermissionModel.findOne({
      pageId: input.pageId,
      userId: input.userId,
    }).exec()

    if (existing) {
      // Update existing permission
      existing.role = input.role
      await existing.save()
      return toPagePermission(existing)
    }

    const permission = await PagePermissionModel.create({
      pageId: input.pageId,
      userId: input.userId,
      role: input.role,
      workspaceId: input.workspaceId,
    })
    return toPagePermission(permission)
  }

  async revokePermission(pageId: string, userId: string): Promise<boolean> {
    const result = await PagePermissionModel.deleteOne({ pageId, userId }).exec()
    return result.deletedCount === 1
  }

  async getUserPermissions(userId: string, workspaceId: string): Promise<PagePermission[]> {
    const permissions = await PagePermissionModel.find({ userId, workspaceId })
      .sort({ createdAt: -1 })
      .exec()
    return permissions.map(toPagePermission)
  }

  async getPagePermissions(pageId: string): Promise<PagePermission[]> {
    const permissions = await PagePermissionModel.find({ pageId })
      .sort({ role: 1, createdAt: -1 })
      .exec()
    return permissions.map(toPagePermission)
  }

  async checkPermission(
    pageId: string,
    userId: string,
    requiredRole: 'view' | 'edit' | 'comment' | 'admin',
  ): Promise<boolean> {
    const permission = await PagePermissionModel.findOne({ pageId, userId }).exec()

    if (!permission) {
      return false
    }

    // Role hierarchy: view < comment < edit < admin
    const roleHierarchy: Record<string, number> = {
      view: 1,
      comment: 2,
      edit: 3,
      admin: 4,
    }

    const userRoleLevel = roleHierarchy[permission.role] || 0
    const requiredRoleLevel = roleHierarchy[requiredRole] || 0

    return userRoleLevel >= requiredRoleLevel
  }

  async hasAnyPermission(pageId: string, userId: string): Promise<boolean> {
    const permission = await PagePermissionModel.findOne({ pageId, userId }).exec()
    return !!permission
  }
}

export const pagePermissionRepository = new PagePermissionRepository()
