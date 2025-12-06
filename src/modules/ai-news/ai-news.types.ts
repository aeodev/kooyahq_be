export type NewsSource =
  | 'openai'
  | 'techcrunch'
  | 'google-ai'
  | 'reddit'
  | 'reddit-artificial'
  | 'hackernews'
  | 'devto-ai'
  | 'devto-ml'
  | 'arxiv'

export interface NewsItem {
  id: string
  type: 'news'
  title: string
  content: string
  author?: string
  source: NewsSource
  url: string
  publishedAt: string
  imageUrl?: string
}

export type NewsFilter = 'all' | 'news' | NewsSource

export interface NewsResponse {
  status: 'success' | 'error'
  data: NewsItem[]
  hasMore: boolean
  total: number
  filter: NewsFilter
}
