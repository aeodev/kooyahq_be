/**
 * Wiki Hub Module
 *
 * Centralized documentation hub for capturing company knowledge, SOPs,
 * project information, and making it actionable via AI and integration
 * with Workspace, Tasks, and Feed.
 */

// Module router
export * from './wiki-hub.router'

// Pages
export * from './pages/page.model'
export * from './pages/page.repository'
export * from './pages/page.service'
export * from './pages/page-tag.model'
export * from './pages/page-permission.model'
export * from './pages/page-attachment.model'
export * from './pages/page-backlink.model'
export * from './pages/page-permission.repository'
export * from './pages/search.service'

// Versions
export * from './versions/page-version.model'
export * from './versions/page-version.repository'
export * from './versions/page-version.service'

// Templates
export * from './templates/template.model'
export * from './templates/template.repository'

// AI
export * from './ai/ai.service'
