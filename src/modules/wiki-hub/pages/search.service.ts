import { pageRepository } from './page.repository'
import { aiService } from '../ai/ai.service'
import type { Page } from './page.model'

export class SearchService {
  /**
   * AI-powered semantic search
   */
  async semanticSearch(query: string, workspaceId: string): Promise<Page[]> {
    try {
      // Get all pages in workspace
      const allPages = await pageRepository.findByWorkspaceId(workspaceId)

      if (allPages.length === 0) {
        return []
      }

      // Use AI service for semantic search
      return await aiService.semanticSearch(query, allPages)
    } catch (error) {
      console.error('Error in semantic search:', error)
      // Fallback to keyword search
      return this.keywordSearch(query, workspaceId)
    }
  }

  /**
   * Traditional keyword search
   */
  async keywordSearch(query: string, workspaceId: string): Promise<Page[]> {
    return pageRepository.search(workspaceId, query)
  }

  /**
   * Suggest related pages based on content similarity
   */
  async suggestRelatedPages(pageId: string): Promise<Page[]> {
    try {
      const page = await pageRepository.findById(pageId)
      if (!page) {
        return []
      }

      // Get all other pages in the same workspace
      const allPages = await pageRepository.findByWorkspaceId(page.workspaceId)
      const otherPages = allPages.filter((p) => p.id !== pageId)

      if (otherPages.length === 0) {
        return []
      }

      // Use semantic search to find similar pages
      const pageText = `${page.title} ${this.extractTextFromRichText(page.content)}`
      const related = await aiService.semanticSearch(pageText, otherPages)

      // Filter out the current page and return top 5
      return related.filter((p) => p.id !== pageId).slice(0, 5)
    } catch (error) {
      console.error('Error suggesting related pages:', error)
      return []
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
}

export const searchService = new SearchService()
