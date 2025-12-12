import OpenAI from 'openai'
import { env } from '../../../config/env'
import type { RichTextDoc } from '../pages/page.model'
import type { Page } from '../pages/page.model'

// Initialize OpenAI client (only if API key is provided)
let openai: OpenAI | null = null
if (env.openaiApiKey) {
  openai = new OpenAI({
    apiKey: env.openaiApiKey,
  })
}

export interface ActionItem {
  text: string
  assignee?: string
  dueDate?: string
  priority?: 'high' | 'medium' | 'low'
}

export class AIService {
  /**
   * Summarize a long page content
   */
  async summarizePage(content: string | RichTextDoc): Promise<string> {
    if (!openai) {
      throw new Error('OpenAI API key not configured. AI features are disabled.')
    }

    try {
      const textContent = this.extractTextFromRichText(content)

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful assistant that summarizes long documents concisely. Provide a clear, structured summary.',
          },
          {
            role: 'user',
            content: `Please summarize the following content:\n\n${textContent}`,
          },
        ],
        max_tokens: 500,
        temperature: 0.3,
      })

      return response.choices[0]?.message?.content || 'Unable to generate summary'
    } catch (error) {
      console.error('Error summarizing page:', error)
      throw new Error('Failed to summarize page')
    }
  }

  /**
   * Extract action items from meeting notes or content
   */
  async extractActionItems(content: string | RichTextDoc): Promise<ActionItem[]> {
    if (!openai) {
      throw new Error('OpenAI API key not configured. AI features are disabled.')
    }

    try {
      const textContent = this.extractTextFromRichText(content)

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a helpful assistant that extracts action items from meeting notes or documents.
            Return a JSON array of action items with the following structure:
            [{"text": "action item description", "assignee": "name or email (optional)", "dueDate": "YYYY-MM-DD (optional)", "priority": "high|medium|low (optional)"}]
            Only return valid JSON, no additional text.`,
          },
          {
            role: 'user',
            content: `Extract action items from the following content:\n\n${textContent}`,
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 1000,
        temperature: 0.3,
      })

      const content = response.choices[0]?.message?.content || '{}'
      const parsed = JSON.parse(content)
      return Array.isArray(parsed) ? parsed : parsed.actionItems || []
    } catch (error) {
      console.error('Error extracting action items:', error)
      return []
    }
  }

  /**
   * Semantic search using embeddings
   */
  async semanticSearch(query: string, pages: Page[]): Promise<Page[]> {
    if (!openai) {
      // Fallback to keyword search if OpenAI is not configured
      return pages.filter(
        (page) =>
          page.title.toLowerCase().includes(query.toLowerCase()) ||
          this.extractTextFromRichText(page.content).toLowerCase().includes(query.toLowerCase()),
      )
    }

    try {
      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query)

      // Generate embeddings for all pages (in batches)
      const pageEmbeddings = await Promise.all(
        pages.map(async (page) => {
          const textContent = this.extractTextFromRichText(page.content)
          const embedding = await this.generateEmbedding(`${page.title}\n${textContent}`)
          return { page, embedding }
        }),
      )

      // Calculate cosine similarity
      const scoredPages = pageEmbeddings.map(({ page, embedding }) => {
        const similarity = this.cosineSimilarity(queryEmbedding, embedding)
        return { page, similarity }
      })

      // Sort by similarity and return top results
      return scoredPages
        .sort((a, b) => b.similarity - a.similarity)
        .filter((item) => item.similarity > 0.5) // Threshold for relevance
        .map((item) => item.page)
    } catch (error) {
      console.error('Error in semantic search:', error)
      // Fallback to keyword search
      return pages.filter(
        (page) =>
          page.title.toLowerCase().includes(query.toLowerCase()) ||
          this.extractTextFromRichText(page.content).toLowerCase().includes(query.toLowerCase()),
      )
    }
  }

  /**
   * Suggest improvements for page content
   */
  async suggestImprovements(content: string | RichTextDoc): Promise<string[]> {
    if (!openai) {
      throw new Error('OpenAI API key not configured. AI features are disabled.')
    }

    try {
      const textContent = this.extractTextFromRichText(content)

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a helpful assistant that suggests improvements for documentation.
            Return a JSON array of improvement suggestions as strings.
            Format: {"suggestions": ["suggestion 1", "suggestion 2", ...]}
            Only return valid JSON, no additional text.`,
          },
          {
            role: 'user',
            content: `Suggest improvements for the following content:\n\n${textContent}`,
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 500,
        temperature: 0.5,
      })

      const parsed = JSON.parse(response.choices[0]?.message?.content || '{}')
      return parsed.suggestions || []
    } catch (error) {
      console.error('Error suggesting improvements:', error)
      return []
    }
  }

  /**
   * Convert free-form notes into structured SOP format
   */
  async convertToSOP(content: string | RichTextDoc): Promise<RichTextDoc> {
    if (!openai) {
      throw new Error('OpenAI API key not configured. AI features are disabled.')
    }

    try {
      const textContent = this.extractTextFromRichText(content)

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a helpful assistant that converts free-form notes into structured Standard Operating Procedures (SOPs).
            Return a structured document with:
            - Title
            - Purpose/Overview
            - Prerequisites
            - Step-by-step instructions
            - Expected outcomes
            - Troubleshooting (if applicable)
            
            Format the response as HTML with proper headings and structure.`,
          },
          {
            role: 'user',
            content: `Convert the following notes into a structured SOP:\n\n${textContent}`,
          },
        ],
        max_tokens: 2000,
        temperature: 0.3,
      })

      const htmlContent = response.choices[0]?.message?.content || ''
      // Convert HTML to RichTextDoc format (assuming HTML string format)
      return {
        type: 'html',
        content: htmlContent,
      }
    } catch (error) {
      console.error('Error converting to SOP:', error)
      throw new Error('Failed to convert to SOP')
    }
  }

  /**
   * Generate embedding for text using OpenAI
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    if (!openai) {
      throw new Error('OpenAI API key not configured.')
    }

    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text.slice(0, 8000), // Limit text length
      })
      return response.data[0].embedding
    } catch (error) {
      console.error('Error generating embedding:', error)
      throw error
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i]
      normA += vecA[i] * vecA[i]
      normB += vecB[i] * vecB[i]
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
  }

  /**
   * Extract plain text from RichTextDoc
   */
  private extractTextFromRichText(content: string | RichTextDoc): string {
    if (typeof content === 'string') {
      // Remove HTML tags if present
      return content.replace(/<[^>]*>/g, '').trim()
    }

    if (content && typeof content === 'object') {
      // Handle RichTextDoc format
      if (content.type === 'html' && typeof content.content === 'string') {
        return content.content.replace(/<[^>]*>/g, '').trim()
      }
      // Handle Quill Delta format
      if (content.ops && Array.isArray(content.ops)) {
        return content.ops
          .map((op: any) => (typeof op.insert === 'string' ? op.insert : ''))
          .join('')
          .trim()
      }
      // Try to extract text from any string properties
      return JSON.stringify(content).replace(/<[^>]*>/g, '').trim()
    }

    return ''
  }
}

export const aiService = new AIService()
