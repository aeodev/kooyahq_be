export interface LinkPreview {
  url: string
  title?: string
  description?: string
  image?: string
  siteName?: string
  author?: string
  publishedTime?: string
  type?: string
  favicon?: string
}

export interface LinkPreviewOptions {
  timeout?: number // milliseconds
  followRedirects?: boolean
  maxRedirects?: number
}

