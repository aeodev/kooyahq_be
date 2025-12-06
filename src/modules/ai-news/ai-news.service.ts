import Parser from 'rss-parser'
import { createHash } from 'crypto'
import type { NewsItem, NewsSource } from './ai-news.types'

const parser = new Parser({
  timeout: 10000,
  customFields: { item: ['media:content', 'enclosure'] },
})

const RSS_FEEDS: Record<NewsSource, string> = {
  openai: 'https://openai.com/news/rss.xml',
  techcrunch: 'https://techcrunch.com/category/artificial-intelligence/feed/',
  'google-ai': 'https://blog.google/technology/ai/rss/',
  reddit: 'https://www.reddit.com/r/MachineLearning/.rss',
  'reddit-artificial': 'https://www.reddit.com/r/artificial/.rss',
  hackernews: 'https://news.ycombinator.com/rss',
  'devto-ai': 'https://dev.to/feed/tag/ai',
  'devto-ml': 'https://dev.to/feed/tag/machinelearning',
  arxiv: 'http://arxiv.org/rss/cs.AI',
}

const SOURCE_AUTHORS: Record<NewsSource, string> = {
  openai: 'OpenAI',
  techcrunch: 'TechCrunch',
  'google-ai': 'Google AI',
  reddit: 'Reddit r/MachineLearning',
  'reddit-artificial': 'Reddit r/artificial',
  hackernews: 'Hacker News',
  'devto-ai': 'Dev.to AI',
  'devto-ml': 'Dev.to ML',
  arxiv: 'ArXiv AI',
}

const generateId = (url: string, title: string): string =>
  createHash('md5').update(`${url}:${title}`).digest('hex').slice(0, 16)

const cleanHtml = (html: string): string =>
  (html || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300)

const extractImageUrl = (item: any): string | undefined =>
  item['media:content']?.[0]?.$.url || item.enclosure?.url || undefined

async function fetchFeed(source: NewsSource, url: string): Promise<NewsItem[]> {
  const feed = await parser.parseURL(url)

  return (feed.items || [])
    .filter(item => item.link && item.title)
    .map(item => ({
      id: generateId(item.link!, item.title!),
      type: 'news' as const,
      title: item.title!,
      content: cleanHtml(item.contentSnippet || item.content || ''),
      author: SOURCE_AUTHORS[source],
      source,
      url: item.link!,
      publishedAt: item.pubDate
        ? new Date(item.pubDate).toISOString()
        : new Date().toISOString(),
      imageUrl: extractImageUrl(item),
    }))
}

export async function fetchAllNews(): Promise<NewsItem[]> {
  const results = await Promise.allSettled(
    Object.entries(RSS_FEEDS).map(([source, url]) =>
      fetchFeed(source as NewsSource, url)
    )
  )

  const items = results
    .filter((r): r is PromiseFulfilledResult<NewsItem[]> => r.status === 'fulfilled')
    .flatMap(r => r.value)

  // Log failed feeds
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      const source = Object.keys(RSS_FEEDS)[i]
      console.error(`Failed to fetch ${source}:`, r.reason)
    }
  })

  // Deduplicate by normalized URL
  const seen = new Set<string>()
  const unique = items.filter(item => {
    const key = item.url.toLowerCase().split('?')[0]
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Sort newest first
  return unique.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  )
}
