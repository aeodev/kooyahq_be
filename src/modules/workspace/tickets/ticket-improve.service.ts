import { Readable } from 'node:stream'
import { openRouterService, type OpenRouterMessage, type OpenRouterMessageContentPart } from '../../../lib/openrouter'
import { getStorageObject, isStoragePath } from '../../../lib/storage'
import { sanitizeHtmlContent } from '../../../utils/rich-text-sanitizer'
import { buildTicketImprovePrompt, TICKET_IMPROVE_SYSTEM_PROMPT } from '../../ai-assistant/prompts/ticket-improve.prompt'

type TicketImproveInput = {
  title: string
  description?: unknown
  acceptanceCriteria?: Array<{ text?: string; completed?: boolean; isCompleted?: boolean }>
  attachments?: Array<{ url?: string; type?: string; name?: string }>
}

type TicketImproveResult = {
  description: string
  acceptanceCriteria: Array<{ text: string; completed: boolean }>
}

const MAX_IMAGES = 3
const MAX_IMAGE_BYTES = 2 * 1024 * 1024
const MAX_CRITERIA = 10
const IMAGE_EXT_PATTERN = /\.(png|jpe?g|webp|gif|bmp|svg|tiff?)$/i
const MEDIA_PATH_PATTERN = /\/api\/media\/file\?path=([^&]+)/i

const isImageType = (type?: string) => Boolean(type && type.toLowerCase().startsWith('image/'))

const extractRichTextContent = (value: unknown): string => {
  if (!value) return ''
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed) as { content?: unknown }
        if (parsed && typeof parsed.content === 'string') {
          return parsed.content
        }
      } catch {
        return value
      }
    }
    return value
  }
  if (typeof value === 'object' && value !== null) {
    const candidate = value as { content?: unknown }
    if (typeof candidate.content === 'string') {
      return candidate.content
    }
  }
  return ''
}

const extractImageSourcesFromHtml = (html: string): string[] => {
  if (!html) return []
  const sources: string[] = []
  const regex = /<img[^>]+src=["']([^"']+)["']/gi
  let match = regex.exec(html)
  while (match) {
    if (match[1]) {
      sources.push(match[1])
    }
    match = regex.exec(html)
  }
  return sources
}

type ImagePlaceholder = {
  placeholder: string
  src: string
  tag: string
}

const extractImageTagsFromHtml = (html: string): Array<{ tag: string; src: string }> => {
  if (!html) return []
  const tags: Array<{ tag: string; src: string }> = []
  const regex = /<img\b[^>]*>/gi
  let match = regex.exec(html)
  while (match) {
    const tag = match[0]
    const srcMatch = tag.match(/src=["']([^"']+)["']/i)
    const src = srcMatch?.[1]
    if (src) {
      tags.push({ tag, src })
    }
    match = regex.exec(html)
  }
  return tags
}

const replaceImagesWithPlaceholders = (html: string): { html: string; placeholders: ImagePlaceholder[] } => {
  if (!html) return { html, placeholders: [] }
  const placeholders: ImagePlaceholder[] = []
  let index = 0

  const replaced = html.replace(/<img\b[^>]*>/gi, (tag) => {
    const srcMatch = tag.match(/src=["']([^"']+)["']/i)
    const src = srcMatch?.[1]
    if (!src) return tag
    index += 1
    const placeholder = `[[IMAGE_${index}]]`
    placeholders.push({ placeholder, src, tag })
    return placeholder
  })

  return { html: replaced, placeholders }
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const applyImageLayout = (html: string, placeholders: ImagePlaceholder[]): string => {
  if (!placeholders.length) return html

  const bySrc = new Map<string, ImagePlaceholder[]>()
  placeholders.forEach((item) => {
    const queue = bySrc.get(item.src) || []
    queue.push(item)
    bySrc.set(item.src, queue)
  })

  const usedPlaceholders = new Set<string>()

  let normalized = html.replace(/<img\b[^>]*>/gi, (tag) => {
    const srcMatch = tag.match(/src=["']([^"']+)["']/i)
    const src = srcMatch?.[1]
    if (!src) return ''
    const queue = bySrc.get(src)
    if (!queue || queue.length === 0) return ''
    const next = queue.shift()
    if (!next) return ''
    usedPlaceholders.add(next.placeholder)
    return next.tag
  })

  for (const item of placeholders) {
    const pattern = new RegExp(escapeRegExp(item.placeholder), 'g')
    let replacedOnce = false
    normalized = normalized.replace(pattern, () => {
      if (usedPlaceholders.has(item.placeholder)) return ''
      if (replacedOnce) return ''
      replacedOnce = true
      usedPlaceholders.add(item.placeholder)
      return item.tag
    })
  }

  const missingTags = placeholders.filter((item) => !usedPlaceholders.has(item.placeholder))
  if (missingTags.length === 0) return normalized

  const appended = missingTags.map((item) => `<p>${item.tag}</p>`).join('')
  if (!normalized.trim()) return appended
  return `${normalized}\n${appended}`
}

const extractStoragePathFromUrl = (url: string): string | null => {
  if (!url) return null
  if (isStoragePath(url)) return url
  const match = url.match(MEDIA_PATH_PATTERN)
  if (!match) return null
  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

const streamToBuffer = async (stream: Readable, maxBytes: number): Promise<Buffer | null> => {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let total = 0

    stream.on('data', (chunk: Buffer) => {
      total += chunk.length
      if (total > maxBytes) {
        stream.destroy()
        resolve(null)
        return
      }
      chunks.push(chunk)
    })

    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', (error) => reject(error))
  })
}

const normalizeCriteria = (criteria?: Array<{ text?: string }>) => {
  if (!Array.isArray(criteria)) return []
  return criteria
    .map((item) => (typeof item?.text === 'string' ? item.text.trim() : ''))
    .filter((text) => text.length > 0)
}

const normalizeAcceptanceCriteria = (items: unknown): Array<{ text: string; completed: boolean }> => {
  if (!Array.isArray(items)) return []
  const result: Array<{ text: string; completed: boolean }> = []
  for (const item of items) {
    if (result.length >= MAX_CRITERIA) break
    if (typeof item === 'string') {
      const text = item.trim()
      if (text) {
        result.push({ text, completed: false })
      }
      continue
    }
    if (item && typeof item === 'object') {
      const text = typeof (item as { text?: unknown }).text === 'string' ? (item as { text?: string }).text!.trim() : ''
      if (text) {
        result.push({ text, completed: false })
      }
    }
  }
  return result
}

const parseJsonResponse = (content: string | null): any => {
  if (!content) return null
  const trimmed = content.trim()
  if (!trimmed) return null
  try {
    return JSON.parse(trimmed)
  } catch {
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start >= 0 && end > start) {
      const candidate = trimmed.slice(start, end + 1)
      try {
        return JSON.parse(candidate)
      } catch {
        return null
      }
    }
    return null
  }
}

const buildImageParts = async (sources: string[]): Promise<OpenRouterMessageContentPart[]> => {
  const uniqueSources = Array.from(new Set(sources.map((src) => src.trim()).filter(Boolean)))
  const parts: OpenRouterMessageContentPart[] = []

  for (const source of uniqueSources) {
    if (parts.length >= MAX_IMAGES) break
    if (source.startsWith('data:')) {
      continue
    }
    const storagePath = extractStoragePathFromUrl(source)
    if (storagePath) {
      try {
        const object = await getStorageObject(storagePath)
        if (object.contentLength && object.contentLength > MAX_IMAGE_BYTES) {
          continue
        }
        const buffer = await streamToBuffer(object.stream, MAX_IMAGE_BYTES)
        if (!buffer) continue
        const contentType = object.contentType || 'image/png'
        const dataUrl = `data:${contentType};base64,${buffer.toString('base64')}`
        parts.push({ type: 'image_url', image_url: { url: dataUrl } })
      } catch {
        continue
      }
      continue
    }
    if (/^https?:\/\//i.test(source)) {
      parts.push({ type: 'image_url', image_url: { url: source } })
    }
  }

  return parts
}

export async function improveTicketContent(input: TicketImproveInput): Promise<TicketImproveResult> {
  const descriptionHtml = extractRichTextContent(input.description)
  const acceptanceCriteria = normalizeCriteria(input.acceptanceCriteria)

  const attachments = Array.isArray(input.attachments) ? input.attachments : []
  const attachmentSources = attachments.flatMap((attachment) => {
    if (!attachment?.url) return []
    const url = attachment.url
    if (isImageType(attachment.type) || IMAGE_EXT_PATTERN.test(url)) {
      return [url]
    }
    return []
  })

  const descriptionImages = extractImageSourcesFromHtml(descriptionHtml)
  const imageParts = await buildImageParts([...attachmentSources, ...descriptionImages])

  const { html: descriptionWithPlaceholders, placeholders } = replaceImagesWithPlaceholders(descriptionHtml)

  const prompt = buildTicketImprovePrompt({
    title: input.title,
    description: descriptionWithPlaceholders,
    acceptanceCriteria,
    imagePlaceholders: placeholders.map((item) => item.placeholder),
  })

  const messages: OpenRouterMessage[] = [
    { role: 'system', content: TICKET_IMPROVE_SYSTEM_PROMPT },
    {
      role: 'user',
      content: imageParts.length > 0 ? [{ type: 'text', text: prompt }, ...imageParts] : prompt,
    },
  ]

  const response = await openRouterService.createChatCompletion({ messages })
  const parsed = parseJsonResponse(response.content)

  const descriptionRaw = typeof parsed?.description === 'string' ? parsed.description : ''
  const criteria = normalizeAcceptanceCriteria(parsed?.acceptanceCriteria)

  if (!descriptionRaw.trim() && criteria.length === 0) {
    throw new Error('Invalid AI response')
  }

  const mergedDescription = applyImageLayout(descriptionRaw, placeholders)
  const description = sanitizeHtmlContent(mergedDescription)

  return {
    description,
    acceptanceCriteria: criteria,
  }
}
