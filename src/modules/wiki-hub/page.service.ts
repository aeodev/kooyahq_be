import { pageRepository, type CreatePageInput, type UpdatePageInput } from './page.repository'
import { pageVersionRepository } from './page-version.repository'
import { pagePermissionRepository } from './page-permission.repository'
import { workspaceService } from '../workspace/workspace/workspace.service'
import type { Page } from './page.model'

export class PageService {
  /**
   * Create a new page
   */
  async createPage(input: CreatePageInput, userId: string): Promise<Page> {
    // Verify user is a member of the workspace
    const workspace = await workspaceService.findById(input.workspaceId)
    if (!workspace) {
      throw new Error('Workspace not found')
    }

    const isMember = workspace.members.some((m) => m.userId === userId)
    if (!isMember) {
      throw new Error('User is not a member of this workspace')
    }

    const page = await pageRepository.create({
      ...input,
      authorId: userId,
    })

    // Auto-create initial version
    await this.createVersion(page.id, page.content, userId, 'Initial version')

    return page
  }

  /**
   * Update a page
   */
  async updatePage(
    pageId: string,
    updates: UpdatePageInput,
    userId: string,
  ): Promise<Page | null> {
    const page = await pageRepository.findById(pageId)
    if (!page) {
      return null
    }

    // Check permissions
    const canEdit = await this.canEdit(pageId, userId, page.workspaceId)
    if (!canEdit) {
      throw new Error('User does not have permission to edit this page')
    }

    // Get current version number
    const latestVersion = await pageVersionRepository.getLatestVersion(pageId)
    const currentVersion = latestVersion
      ? this.incrementVersion(latestVersion.versionNumber)
      : '1.0'

    // Update page
    const updatedPage = await pageRepository.update(pageId, updates)

    if (updatedPage && updates.content) {
      // Create new version
      await this.createVersion(
        pageId,
        updates.content,
        userId,
        `Updated: ${updates.title || 'content'}`,
      )
    }

    return updatedPage
  }

  /**
   * Delete a page (soft delete)
   */
  async deletePage(pageId: string, userId: string): Promise<boolean> {
    const page = await pageRepository.findById(pageId)
    if (!page) {
      return false
    }

    // Check permissions - only author or admin can delete
    const canAdmin = await this.canAdmin(pageId, userId, page.workspaceId)
    if (!canAdmin && page.authorId !== userId) {
      throw new Error('User does not have permission to delete this page')
    }

    return await pageRepository.softDelete(pageId)
  }

  /**
   * Get a page by ID
   */
  async getPage(pageId: string, userId: string): Promise<Page | null> {
    const page = await pageRepository.findById(pageId)
    if (!page) {
      return null
    }

    // Check view permission
    const canView = await this.canView(pageId, userId, page.workspaceId)
    if (!canView) {
      throw new Error('User does not have permission to view this page')
    }

    return page
  }

  /**
   * List pages in a workspace
   */
  async listPages(workspaceId: string, userId: string): Promise<Page[]> {
    // Verify user is a member of the workspace
    const workspace = await workspaceService.findById(workspaceId)
    if (!workspace) {
      throw new Error('Workspace not found')
    }

    const isMember = workspace.members.some((m) => m.userId === userId)
    if (!isMember) {
      throw new Error('User is not a member of this workspace')
    }

    return pageRepository.findByWorkspaceId(workspaceId)
  }

  /**
   * Search pages
   */
  async searchPages(workspaceId: string, query: string, userId: string): Promise<Page[]> {
    // Verify user is a member of the workspace
    const workspace = await workspaceService.findById(workspaceId)
    if (!workspace) {
      throw new Error('Workspace not found')
    }

    const isMember = workspace.members.some((m) => m.userId === userId)
    if (!isMember) {
      throw new Error('User is not a member of this workspace')
    }

    return pageRepository.search(workspaceId, query)
  }

  /**
   * Pin a page
   */
  async pinPage(pageId: string, userId: string): Promise<Page | null> {
    const page = await pageRepository.findById(pageId)
    if (!page) {
      return null
    }

    const canEdit = await this.canEdit(pageId, userId, page.workspaceId)
    if (!canEdit) {
      throw new Error('User does not have permission to pin this page')
    }

    return pageRepository.pinPage(pageId)
  }

  /**
   * Unpin a page
   */
  async unpinPage(pageId: string, userId: string): Promise<Page | null> {
    const page = await pageRepository.findById(pageId)
    if (!page) {
      return null
    }

    const canEdit = await this.canEdit(pageId, userId, page.workspaceId)
    if (!canEdit) {
      throw new Error('User does not have permission to unpin this page')
    }

    return pageRepository.unpinPage(pageId)
  }

  /**
   * Favorite a page
   */
  async favoritePage(pageId: string, userId: string): Promise<Page | null> {
    const page = await pageRepository.findById(pageId)
    if (!page) {
      return null
    }

    const canView = await this.canView(pageId, userId, page.workspaceId)
    if (!canView) {
      throw new Error('User does not have permission to view this page')
    }

    return pageRepository.addFavorite(pageId, userId)
  }

  /**
   * Unfavorite a page
   */
  async unfavoritePage(pageId: string, userId: string): Promise<Page | null> {
    const page = await pageRepository.findById(pageId)
    if (!page) {
      return null
    }

    return pageRepository.removeFavorite(pageId, userId)
  }

  /**
   * Get user's favorite pages
   */
  async getFavorites(workspaceId: string, userId: string): Promise<Page[]> {
    // Verify user is a member of the workspace
    const workspace = await workspaceService.findById(workspaceId)
    if (!workspace) {
      throw new Error('Workspace not found')
    }

    const isMember = workspace.members.some((m) => m.userId === userId)
    if (!isMember) {
      throw new Error('User is not a member of this workspace')
    }

    return pageRepository.getFavorites(workspaceId, userId)
  }

  /**
   * Check if user can view a page
   */
  async canView(pageId: string, userId: string, workspaceId: string): Promise<boolean> {
    // Check workspace membership first
    const workspace = await workspaceService.findById(workspaceId)
    if (!workspace) {
      return false
    }

    const isMember = workspace.members.some((m) => m.userId === userId)
    if (!isMember) {
      return false
    }

    // Check page-specific permissions
    const hasPermission = await pagePermissionRepository.hasAnyPermission(pageId, userId)
    if (hasPermission) {
      return true
    }

    // Default: workspace members can view
    return true
  }

  /**
   * Check if user can edit a page
   */
  async canEdit(pageId: string, userId: string, workspaceId: string): Promise<boolean> {
    const page = await pageRepository.findById(pageId)
    if (!page) {
      return false
    }

    // Author can always edit
    if (page.authorId === userId) {
      return true
    }

    // Check workspace role
    const workspace = await workspaceService.findById(workspaceId)
    if (!workspace) {
      return false
    }

    const member = workspace.members.find((m) => m.userId === userId)
    if (member && (member.role === 'owner' || member.role === 'admin')) {
      return true
    }

    // Check page-specific permissions
    return pagePermissionRepository.checkPermission(pageId, userId, 'edit')
  }

  /**
   * Check if user can admin a page
   */
  async canAdmin(pageId: string, userId: string, workspaceId: string): Promise<boolean> {
    const page = await pageRepository.findById(pageId)
    if (!page) {
      return false
    }

    // Author can admin
    if (page.authorId === userId) {
      return true
    }

    // Check workspace role
    const workspace = await workspaceService.findById(workspaceId)
    if (!workspace) {
      return false
    }

    const member = workspace.members.find((m) => m.userId === userId)
    if (member && member.role === 'owner') {
      return true
    }

    // Check page-specific permissions
    return pagePermissionRepository.checkPermission(pageId, userId, 'admin')
  }

  /**
   * Create a version for a page
   */
  private async createVersion(
    pageId: string,
    content: Record<string, any>,
    editorId: string,
    changeSummary?: string,
  ): Promise<void> {
    const latestVersion = await pageVersionRepository.getLatestVersion(pageId)
    const versionNumber = latestVersion
      ? this.incrementVersion(latestVersion.versionNumber)
      : '1.0'

    await pageVersionRepository.createVersion({
      pageId,
      versionNumber,
      content,
      editorId,
      changeSummary,
    })
  }

  /**
   * Increment version number (e.g., 1.0 -> 1.1, 1.9 -> 2.0)
   */
  private incrementVersion(version: string): string {
    const parts = version.split('.')
    if (parts.length !== 2) {
      return '1.0'
    }

    let major = parseInt(parts[0], 10)
    let minor = parseInt(parts[1], 10)

    minor += 1
    if (minor >= 10) {
      major += 1
      minor = 0
    }

    return `${major}.${minor}`
  }
}

export const pageService = new PageService()
