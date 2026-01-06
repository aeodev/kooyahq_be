import { Request, Response } from 'express'
import { env } from '../../config/env'
import { boardService } from '../workspace/boards/board.service'
import { ticketService } from '../workspace/tickets/ticket.service'

const SITE_NAME = 'KooyaHQ'
const DEFAULT_TITLE = 'Home | KooyaHQ'
const DEFAULT_DESCRIPTION = 'Overview of tasks, updates, and recent activity.'
const DEFAULT_IMAGE_PATH = '/og/home.jpg'
const MAX_DESCRIPTION_LENGTH = 180

type SeoMeta = {
  title: string
  description: string
  canonical: string
  imageUrl: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value
  return `${value.slice(0, Math.max(0, maxLength - 3)).trim()}...`
}

function extractPlainText(input: unknown): string {
  const chunks: string[] = []

  const visit = (node: unknown) => {
    if (!node) return
    if (typeof node === 'string') {
      chunks.push(node)
      return
    }
    if (Array.isArray(node)) {
      node.forEach(visit)
      return
    }
    if (typeof node === 'object') {
      const record = node as Record<string, unknown>
      if (typeof record.text === 'string') {
        chunks.push(record.text)
      }
      if (Array.isArray(record.content)) {
        record.content.forEach(visit)
      }
      if (Array.isArray(record.children)) {
        record.children.forEach(visit)
      }
    }
  }

  visit(input)
  return chunks.join(' ').replace(/\s+/g, ' ').trim()
}

function getBaseUrl(req: Request): string {
  const envUrl = env.clientUrls[0]
  if (envUrl) {
    return envUrl.replace(/\/$/, '')
  }
  const proto = (req.get('x-forwarded-proto') || req.protocol || 'https').toString()
  const host = req.get('host') || 'hq.kooyaai.com'
  return `${proto}://${host}`
}

function renderHtml(meta: SeoMeta): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(meta.title)}</title>
    <meta name="description" content="${escapeHtml(meta.description)}" />
    <meta property="og:title" content="${escapeHtml(meta.title)}" />
    <meta property="og:description" content="${escapeHtml(meta.description)}" />
    <meta property="og:image" content="${escapeHtml(meta.imageUrl)}" />
    <meta property="og:url" content="${escapeHtml(meta.canonical)}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <link rel="canonical" href="${escapeHtml(meta.canonical)}" />
  </head>
  <body></body>
</html>
`
}

function cleanPath(path: string): string {
  if (!path) return '/'
  const value = path.split('?')[0].split('#')[0]
  if (!value || value === '/') return '/'
  return value.replace(/\/+$/, '')
}

const STATIC_META_BY_PATH: Record<string, { title: string; description: string; imagePath: string }> = {
  '/': {
    title: 'Home | KooyaHQ',
    description: 'Overview of tasks, updates, and recent activity.',
    imagePath: '/og/home.jpg',
  },
  '/login': {
    title: 'Log In | KooyaHQ',
    description: 'Sign in to access your team workspace and tools.',
    imagePath: '/og/login.jpg',
  },
  '/signup': {
    title: 'Sign Up | KooyaHQ',
    description: 'Create a KooyaHQ account and get started quickly.',
    imagePath: '/og/signup.jpg',
  },
  '/workspace': {
    title: 'Workspace | KooyaHQ',
    description: 'Plan work with boards, tickets, and status.',
    imagePath: '/og/workspace.jpg',
  },
  '/time-tracker': {
    title: 'Time Tracker | KooyaHQ',
    description: 'Track time, focus sessions, and daily summaries.',
    imagePath: '/og/time-tracker.jpg',
  },
  '/gallery': {
    title: 'Gallery | KooyaHQ',
    description: 'Team images, uploads, and shared media.',
    imagePath: '/og/gallery.jpg',
  },
  '/ai-news': {
    title: 'AI News | KooyaHQ',
    description: 'Curated AI updates and quick reads.',
    imagePath: '/og/ai-news.jpg',
  },
  '/profile': {
    title: 'Profile | KooyaHQ',
    description: 'Manage your account, preferences, and profile.',
    imagePath: '/og/profile.jpg',
  },
  '/notifications': {
    title: 'Notifications | KooyaHQ',
    description: 'Alerts, mentions, and important updates.',
    imagePath: '/og/notifications.jpg',
  },
  '/feed': {
    title: 'Feed | KooyaHQ',
    description: 'Team posts, reactions, and conversations.',
    imagePath: '/og/feed.jpg',
  },
  '/games': {
    title: 'Games | KooyaHQ',
    description: 'Quick games and friendly challenges.',
    imagePath: '/og/games.jpg',
  },
  '/presence': {
    title: 'Presence | KooyaHQ',
    description: 'See who is online and active.',
    imagePath: '/og/presence.jpg',
  },
  '/user-management': {
    title: 'User Management | KooyaHQ',
    description: 'Manage users, roles, and access.',
    imagePath: '/og/user-management.jpg',
  },
  '/server-management': {
    title: 'Server Management | KooyaHQ',
    description: 'Monitor servers, projects, and health.',
    imagePath: '/og/server-management.jpg',
  },
  '/system-management': {
    title: 'System Management | KooyaHQ',
    description: 'Platform settings and system controls.',
    imagePath: '/og/system-management.jpg',
  },
  '/meet': {
    title: 'Meet | KooyaHQ',
    description: 'Start or join meetings fast.',
    imagePath: '/og/meet.jpg',
  },
  '/meet/files': {
    title: 'Meet Files | KooyaHQ',
    description: 'Recordings, files, and meeting history.',
    imagePath: '/og/meet-files.jpg',
  },
}

const STATIC_META_BY_PATTERN: Array<{ pattern: RegExp; meta: { title: string; description: string; imagePath: string } }> = [
  {
    pattern: /^\/games\/play\/[^/]+\/?$/,
    meta: {
      title: 'Play Game | KooyaHQ',
      description: 'Play a live game with teammates.',
      imagePath: '/og/play-game.jpg',
    },
  },
  {
    pattern: /^\/meet\/[^/]+\/join\/?$/,
    meta: {
      title: 'Meeting | KooyaHQ',
      description: 'Live meeting room for your team.',
      imagePath: '/og/meet-join.jpg',
    },
  },
  {
    pattern: /^\/meet\/[^/]+\/?$/,
    meta: {
      title: 'Pre-Join | KooyaHQ',
      description: 'Check audio and video before joining.',
      imagePath: '/og/meet-prejoin.jpg',
    },
  },
  {
    pattern: /^\/server-management\/projects\/[^/]+\/servers\/[^/]+\/?$/,
    meta: {
      title: 'Server Management | KooyaHQ',
      description: 'Monitor servers, projects, and health.',
      imagePath: '/og/server-management.jpg',
    },
  },
  {
    pattern: /^\/server-management\/projects\/[^/]+\/?$/,
    meta: {
      title: 'Server Management | KooyaHQ',
      description: 'Monitor servers, projects, and health.',
      imagePath: '/og/server-management.jpg',
    },
  },
  {
    pattern: /^\/workspace\/[^/]+\/[^/]+\/?$/,
    meta: {
      title: 'Ticket | KooyaHQ',
      description: 'Ticket details, status, and activity in one place.',
      imagePath: '/og/ticket.jpg',
    },
  },
  {
    pattern: /^\/workspace\/[^/]+\/?$/,
    meta: {
      title: 'Board | KooyaHQ',
      description: 'Board view for organizing tasks and flow.',
      imagePath: '/og/board.jpg',
    },
  },
]

function getStaticMeta(path: string) {
  const direct = STATIC_META_BY_PATH[path]
  if (direct) return direct
  return STATIC_META_BY_PATTERN.find((entry) => entry.pattern.test(path))?.meta
}

export async function getSeoMeta(req: Request, res: Response) {
  const pathParam = typeof req.query.path === 'string' ? req.query.path : '/'
  const path = cleanPath(pathParam)
  const baseUrl = getBaseUrl(req)
  const canonical = `${baseUrl}${path === '/' ? '' : path}`

  const staticMeta = getStaticMeta(path)
  let title = staticMeta?.title ?? DEFAULT_TITLE
  let description = staticMeta?.description ?? DEFAULT_DESCRIPTION
  let imagePath = staticMeta?.imagePath ?? DEFAULT_IMAGE_PATH

  try {
    const ticketMatch = path.match(/^\/workspace\/[^/]+\/([^/]+)\/?$/)
    if (ticketMatch) {
      const ticketKey = ticketMatch[1]
      const ticket = await ticketService.findByTicketKey(ticketKey)
      if (ticket) {
        title = `${ticket.ticketKey} ${ticket.title} | ${SITE_NAME}`
        const ticketText = extractPlainText(ticket.description)
        description = ticketText || description
        imagePath = '/og/ticket.jpg'
      }
    } else {
      const boardMatch = path.match(/^\/workspace\/([^/]+)\/?$/)
      if (boardMatch) {
        const boardKey = boardMatch[1]
        const board = await boardService.findByPrefixAnyWorkspace(boardKey)
        if (board) {
          title = `${board.prefix} | ${board.name} | ${SITE_NAME}`
          description = board.description?.trim() || description
          imagePath = '/og/board.jpg'
        }
      }
    }
  } catch (error) {
    console.error('SEO meta generation failed:', error)
  }

  const meta: SeoMeta = {
    title,
    description: truncate(description, MAX_DESCRIPTION_LENGTH),
    canonical,
    imageUrl: `${baseUrl}${imagePath}`,
  }

  res.setHeader('Content-Type', 'text/html; charset=UTF-8')
  res.status(200).send(renderHtml(meta))
}
