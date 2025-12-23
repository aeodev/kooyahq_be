import type { PublicUser } from '../../users/user.model'

// New granular permission catalog (backend source of truth)
export const PERMISSIONS = {
  SYSTEM_FULL_ACCESS: 'system:fullAccess',

  USERS_VIEW: 'users:view',
  USERS_MANAGE: 'users:manage',

  PROJECTS_VIEW: 'projects:view',
  PROJECTS_MANAGE: 'projects:manage',

  SYSTEM_LOGS: 'system:logs',

  SERVER_MANAGEMENT_VIEW: 'serverManagement:view',
  SERVER_MANAGEMENT_USE: 'serverManagement:use',
  SERVER_MANAGEMENT_ELEVATED_USE: 'serverManagement:elevatedUse',
  SERVER_MANAGEMENT_MANAGE: 'serverManagement:manage',

  BOARD_FULL_ACCESS: 'board:fullAccess',
  BOARD_VIEW: 'board:view',
  BOARD_CREATE: 'board:create',
  BOARD_UPDATE: 'board:update',
  BOARD_DELETE: 'board:delete',

  ANNOUNCEMENT_FULL_ACCESS: 'announcement:fullAccess',
  ANNOUNCEMENT_READ: 'announcement:read',
  ANNOUNCEMENT_CREATE: 'announcement:create',
  ANNOUNCEMENT_UPDATE: 'announcement:update',
  ANNOUNCEMENT_DELETE: 'announcement:delete',

  AI_NEWS_FULL_ACCESS: 'ai-news:fullAccess',
  AI_NEWS_READ: 'ai-news:read',
  AI_NEWS_REFRESH: 'ai-news:refresh',

  GALLERY_FULL_ACCESS: 'gallery:fullAccess',
  GALLERY_READ: 'gallery:read',
  GALLERY_CREATE: 'gallery:create',
  GALLERY_BULK_CREATE: 'gallery:bulkCreate',
  GALLERY_UPDATE: 'gallery:update',
  GALLERY_DELETE: 'gallery:delete',
  GALLERY_APPROVE: 'gallery:approve',

  MEDIA_FULL_ACCESS: 'media:fullAccess',
  MEDIA_UPLOAD: 'media:upload',
  MEDIA_READ: 'media:read',
  MEDIA_DELETE: 'media:delete',

  POST_FULL_ACCESS: 'post:fullAccess',
  POST_READ: 'post:read',
  POST_CREATE: 'post:create',
  POST_UPDATE: 'post:update',
  POST_DELETE: 'post:delete',
  POST_COMMENT_READ: 'post-comment:read',
  POST_COMMENT_CREATE: 'post-comment:create',
  POST_COMMENT_UPDATE: 'post-comment:update',
  POST_COMMENT_DELETE: 'post-comment:delete',
  POST_REACT: 'post:react',
  POST_POLL_VOTE: 'post:pollVote',

  NOTIFICATION_FULL_ACCESS: 'notification:fullAccess',
  NOTIFICATION_READ: 'notification:read',
  NOTIFICATION_COUNT: 'notification:count',
  NOTIFICATION_UPDATE: 'notification:update',

  PRESENCE_FULL_ACCESS: 'presence:fullAccess',
  PRESENCE_READ: 'presence:read',
  PRESENCE_UPDATE: 'presence:update',

  MEET_FULL_ACCESS: 'meet:fullAccess',
  MEET_TOKEN: 'meet:token',

  TIME_ENTRY_FULL_ACCESS: 'time-entry:fullAccess',
  TIME_ENTRY_READ: 'time-entry:read',
  TIME_ENTRY_ANALYTICS: 'time-entry:analytics',
  TIME_ENTRY_CREATE: 'time-entry:create',
  TIME_ENTRY_UPDATE: 'time-entry:update',
  TIME_ENTRY_DELETE: 'time-entry:delete',

  GAME_FULL_ACCESS: 'game:fullAccess',
  GAME_READ: 'game:read',
  GAME_PLAY: 'game:play',
  GAME_INVITE: 'game:invite',
  GAME_CLEANUP: 'game:cleanup',

  LINK_PREVIEW_FETCH: 'link-preview:fetch',
  CESIUM_TOKEN: 'cesium:token',
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

export const DEFAULT_NEW_USER_PERMISSIONS: Permission[] = [
  PERMISSIONS.AI_NEWS_READ,
  PERMISSIONS.GALLERY_READ,
  PERMISSIONS.GAME_FULL_ACCESS,
  PERMISSIONS.MEDIA_UPLOAD,
  PERMISSIONS.MEDIA_READ,
  PERMISSIONS.MEDIA_DELETE,
  PERMISSIONS.POST_READ,
  PERMISSIONS.POST_CREATE,
  PERMISSIONS.POST_UPDATE,
  PERMISSIONS.POST_DELETE,
  PERMISSIONS.POST_COMMENT_READ,
  PERMISSIONS.POST_COMMENT_CREATE,
  PERMISSIONS.POST_COMMENT_UPDATE,
  PERMISSIONS.POST_COMMENT_DELETE,
  PERMISSIONS.POST_REACT,
  PERMISSIONS.POST_POLL_VOTE,
  PERMISSIONS.NOTIFICATION_READ,
  PERMISSIONS.NOTIFICATION_COUNT,
  PERMISSIONS.LINK_PREVIEW_FETCH,
]

export type AuthUser = PublicUser & {
  permissions: Permission[]
}

const SUPER_PERMISSIONS: Permission[] = [PERMISSIONS.SYSTEM_FULL_ACCESS]

// Map of prefix -> fullAccess permission for that prefix
const FULL_ACCESS_BY_PREFIX: Record<string, Permission> = Object.values(PERMISSIONS).reduce((acc, perm) => {
  const [prefix, action] = (perm as string).split(':')
  if (action === 'fullAccess') {
    acc[prefix] = perm as Permission
  }
  return acc
}, {} as Record<string, Permission>)

export function buildAuthUser(user: PublicUser): AuthUser {
  const permissions = Array.isArray((user as any).permissions)
    ? ((user as any).permissions.filter(Boolean) as Permission[])
    : []

  return {
    ...user,
    permissions,
  }
}

export function hasPermission(entity: { permissions?: Permission[] }, permission: Permission) {
  const permissions = Array.isArray(entity.permissions) ? (entity.permissions as Permission[]) : []

  if (permissions.some((perm) => SUPER_PERMISSIONS.includes(perm))) {
    return true
  }

  if (permissions.includes(permission)) {
    return true
  }

  // Allow prefix-based fullAccess to satisfy scoped permissions (e.g., board:fullAccess -> board:read/create/update/delete)
  const [targetPrefix] = (permission as string).split(':')
  const fullForPrefix = FULL_ACCESS_BY_PREFIX[targetPrefix]
  if (fullForPrefix && permissions.includes(fullForPrefix)) {
    return true
  }

  return false
}
