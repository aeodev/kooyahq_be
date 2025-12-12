import { pageVersionRepository } from './page-version.repository'
import { pageRepository } from '../pages/page.repository'
import { pageService } from '../pages/page.service'
import type { PageVersion } from './page-version.model'
import type { Page } from '../pages/page.model'
import * as diff from 'diff'

export class PageVersionService {
  /**
   * Get version history for a page
   */
  async getVersionHistory(pageId: string, userId: string): Promise<PageVersion[]> {
    const page = await pageRepository.findById(pageId)
    if (!page) {
      throw new Error('Page not found')
    }

    // Check view permission
    const canView = await pageService.canView(pageId, userId, page.workspaceId)
    if (!canView) {
      throw new Error('User does not have permission to view this page')
    }

    return pageVersionRepository.getVersions(pageId)
  }

  /**
   * Restore a version
   */
  async restoreVersion(
    pageId: string,
    versionId: string,
    userId: string,
  ): Promise<Page | null> {
    const page = await pageRepository.findById(pageId)
    if (!page) {
      return null
    }

    // Check edit permission
    const canEdit = await pageService.canEdit(pageId, userId, page.workspaceId)
    if (!canEdit) {
      throw new Error('User does not have permission to restore this version')
    }

    const version = await pageVersionRepository.restoreVersion(pageId, versionId)
    if (!version) {
      return null
    }

    // Update page with version content
    const updatedPage = await pageRepository.update(pageId, {
      content: version.content,
    })

    // Create new version from restoration
    const latestVersion = await pageVersionRepository.getLatestVersion(pageId)
    const newVersionNumber = latestVersion
      ? this.incrementVersion(latestVersion.versionNumber)
      : '1.0'

    await pageVersionRepository.createVersion({
      pageId,
      versionNumber: newVersionNumber,
      content: version.content,
      editorId: userId,
      changeSummary: `Restored from version ${version.versionNumber}`,
    })

    return updatedPage
  }

  /**
   * Compare two versions
   */
  async compareVersions(
    pageId: string,
    versionNumber1: string,
    versionNumber2: string,
    userId: string,
  ): Promise<{
    version1: PageVersion | null
    version2: PageVersion | null
    diff: string
  }> {
    const page = await pageRepository.findById(pageId)
    if (!page) {
      throw new Error('Page not found')
    }

    // Check view permission
    const canView = await pageService.canView(pageId, userId, page.workspaceId)
    if (!canView) {
      throw new Error('User does not have permission to view this page')
    }

    const { version1, version2 } = await pageVersionRepository.compareVersions(
      pageId,
      versionNumber1,
      versionNumber2,
    )

    // Generate diff using diff library
    const text1 = this.extractTextFromRichText(version1?.content || {})
    const text2 = this.extractTextFromRichText(version2?.content || {})

    const diffResult = diff.diffLines(text1, text2)
    const diffText = diffResult
      .map((part) => {
        const prefix = part.added ? '+' : part.removed ? '-' : ' '
        return `${prefix} ${part.value}`
      })
      .join('')

    return {
      version1,
      version2,
      diff: diffText,
    }
  }

  /**
   * Extract plain text from RichTextDoc
   */
  private extractTextFromRichText(content: any): string {
    if (typeof content === 'string') {
      return content.replace(/<[^>]*>/g, '').trim()
    }

    if (content && typeof content === 'object') {
      if (content.type === 'html' && typeof content.content === 'string') {
        return content.content.replace(/<[^>]*>/g, '').trim()
      }
      if (content.ops && Array.isArray(content.ops)) {
        return content.ops
          .map((op: any) => (typeof op.insert === 'string' ? op.insert : ''))
          .join('')
          .trim()
      }
      return JSON.stringify(content).replace(/<[^>]*>/g, '').trim()
    }

    return ''
  }

  /**
   * Increment version number
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

export const pageVersionService = new PageVersionService()
