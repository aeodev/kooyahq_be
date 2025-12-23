import { Schema, model, models, type Document } from 'mongoose'
import type { NewsItem, NewsSource } from './ai-news.types'

export interface NewsItemDocument extends Document {
  id: string
  type: 'news'
  title: string
  content: string
  author?: string
  source: NewsSource
  url: string
  publishedAt: Date
  imageUrl?: string
  createdAt: Date
  updatedAt: Date
}

const newsItemSchema = new Schema<NewsItemDocument>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['news'],
      default: 'news',
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    author: {
      type: String,
    },
    source: {
      type: String,
      required: true,
      enum: [
        'openai',
        'techcrunch',
        'google-ai',
        'reddit',
        'reddit-artificial',
        'hackernews',
        'devto-ai',
        'devto-ml',
        'arxiv',
      ],
      index: true,
    },
    url: {
      type: String,
      required: true,
      unique: true,
      sparse: true,
      index: true,
    },
    publishedAt: {
      type: Date,
      required: true,
      index: true,
    },
    imageUrl: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
)

// Compound index for filtered queries (source + publishedAt)
newsItemSchema.index({ source: 1, publishedAt: -1 })

export const NewsItemModel =
  models.NewsItem ?? model<NewsItemDocument>('NewsItem', newsItemSchema)

