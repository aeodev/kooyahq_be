import sanitizeHtml from 'sanitize-html'

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p',
    'br',
    'strong',
    'em',
    'u',
    's',
    'a',
    'ul',
    'ol',
    'li',
    'blockquote',
    'pre',
    'code',
    'h1',
    'h2',
    'h3',
    'span',
    'div',
    'img',
    'video',
    'iframe',
  ],
  allowedAttributes: {
    '*': ['class', 'style'],
    a: ['href', 'target', 'rel', 'class', 'style'],
    img: ['src', 'alt', 'width', 'height', 'class', 'style'],
    video: ['src', 'controls', 'width', 'height', 'poster', 'class', 'style'],
    iframe: ['src', 'allow', 'allowfullscreen', 'frameborder', 'width', 'height', 'title', 'class', 'style'],
    li: ['class', 'style', 'data-list', 'data-checked'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: {
    img: ['http', 'https', 'data', 'blob'],
    video: ['http', 'https', 'blob'],
    iframe: ['http', 'https'],
  },
  allowedStyles: {
    '*': {
      color: [/^#([0-9a-f]{3}|[0-9a-f]{6})$/i, /^rgb\(/i, /^hsl\(/i, /^var\(--/i],
      'background-color': [/^#([0-9a-f]{3}|[0-9a-f]{6})$/i, /^rgb\(/i, /^hsl\(/i, /^var\(--/i],
    },
  },
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        rel: attribs.rel ? `${attribs.rel} noopener noreferrer` : 'noopener noreferrer',
      },
    }),
  },
}

export function sanitizeHtmlContent(content: string): string {
  if (!content) return ''
  return sanitizeHtml(content, SANITIZE_OPTIONS)
}

type HtmlRichTextDoc = {
  type: 'html'
  content: string
}

const EMPTY_DOC: HtmlRichTextDoc = { type: 'html', content: '' }

const isHtmlRichTextDoc = (value: unknown): value is HtmlRichTextDoc => {
  if (!value || typeof value !== 'object') return false
  const candidate = value as HtmlRichTextDoc
  return candidate.type === 'html' && typeof candidate.content === 'string'
}

const parseRichTextDocString = (value: string): HtmlRichTextDoc | null => {
  const trimmed = value.trim()
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null

  try {
    const parsed = JSON.parse(trimmed)
    if (isHtmlRichTextDoc(parsed)) {
      return parsed
    }
    if (parsed && typeof parsed === 'object' && typeof parsed.content === 'string') {
      return { type: 'html', content: parsed.content }
    }
  } catch (error) {
    return null
  }

  return null
}

export function sanitizeRichTextDoc(value: unknown): HtmlRichTextDoc {
  if (!value) return { ...EMPTY_DOC }

  if (typeof value === 'string') {
    const parsed = parseRichTextDocString(value)
    return {
      type: 'html',
      content: sanitizeHtmlContent(parsed ? parsed.content : value),
    }
  }

  if (isHtmlRichTextDoc(value)) {
    return {
      type: 'html',
      content: sanitizeHtmlContent(value.content),
    }
  }

  if (typeof value === 'object' && typeof (value as { content?: unknown }).content === 'string') {
    return {
      type: 'html',
      content: sanitizeHtmlContent(String((value as { content?: unknown }).content ?? '')),
    }
  }

  return { ...EMPTY_DOC }
}
