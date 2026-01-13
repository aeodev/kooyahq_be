import { adminActivityRepository, type CreateAdminActivityInput } from './admin-activity.repository'
import type { AdminActivity } from './admin-activity.model'

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /passphrase/i,
  /secret/i,
  /token/i,
  /ssh/i,
  /private/i,
  /credential/i,
  /api[-_]?key/i,
  /access[-_]?key/i,
  /command/i,
  /salary/i,
]

const MAX_ARRAY_ITEMS = 12
const MAX_STRING_LENGTH = 140
const MAX_OBJECT_KEYS = 20

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key))
}

function truncateString(value: string): string {
  if (value.length <= MAX_STRING_LENGTH) return value
  return `${value.slice(0, MAX_STRING_LENGTH)}...`
}

function sanitizeArray(values: unknown[], depth: number): unknown {
  const hasObject = values.some((value) => typeof value === 'object' && value !== null)
  if (hasObject) {
    return `[${values.length} items]`
  }
  const sanitized = values.slice(0, MAX_ARRAY_ITEMS).map((value) => sanitizeValue(value, depth + 1))
  if (values.length > MAX_ARRAY_ITEMS) {
    sanitized.push(`+${values.length - MAX_ARRAY_ITEMS} more`)
  }
  return sanitized
}

function sanitizeObject(values: Record<string, unknown>, depth: number): Record<string, unknown> {
  const entries = Object.entries(values)
  const limited = entries.slice(0, MAX_OBJECT_KEYS)
  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of limited) {
    sanitized[key] = isSensitiveKey(key) ? '[redacted]' : sanitizeValue(value, depth + 1)
  }

  if (entries.length > MAX_OBJECT_KEYS) {
    sanitized.__truncated = `+${entries.length - MAX_OBJECT_KEYS} more`
  }

  return sanitized
}

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value
  if (typeof value === 'string') return truncateString(value)
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return sanitizeArray(value, depth)
  if (typeof value === 'object') {
    if (depth >= 2) return '[object]'
    return sanitizeObject(value as Record<string, unknown>, depth)
  }
  return '[unavailable]'
}

function sanitizeChanges(changes?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!changes) return undefined
  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(changes)) {
    sanitized[key] = isSensitiveKey(key) ? '[redacted]' : sanitizeValue(value)
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined
}

function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value
}

function humanizeLabel(value: string): string {
  return value
    .replace(/[_\.]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
}

function titleCase(value: string): string {
  return value
    .split(' ')
    .filter(Boolean)
    .map((word) => capitalize(word))
    .join(' ')
}

function joinTitleParts(...parts: Array<string | undefined>): string {
  return parts.filter((part) => part && part.trim()).join(' ')
}

function isFromToChange(value: unknown): value is { from?: unknown; to?: unknown } {
  return Boolean(
    value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      ('from' in (value as Record<string, unknown>) || 'to' in (value as Record<string, unknown>))
  )
}

function getValueTypeSuffix(value: unknown): string | undefined {
  if (Array.isArray(value)) return 'list'
  if (value && typeof value === 'object') return 'details'
  return undefined
}

function getPrimaryChange(changes?: Record<string, unknown>) {
  if (!changes) return undefined

  if (Array.isArray(changes.fields)) {
    const fields = (changes.fields as unknown[])
      .map((field) => String(field))
      .filter((field) => field && !isSensitiveKey(field))
    if (!fields.length) return undefined
    return { label: fields[0], value: undefined, extraCount: Math.max(fields.length - 1, 0) }
  }

  const keys = Object.keys(changes).filter(
    (key) => key !== 'fields' && key !== '__truncated' && !isSensitiveKey(key)
  )
  if (!keys.length) return undefined
  const primaryKey = keys[0]
  return {
    label: primaryKey,
    value: changes[primaryKey],
    extraCount: Math.max(keys.length - 1, 0),
  }
}

function buildDetailLabel(label: string, value: unknown, includeChangeVerb: boolean): string {
  const cleanLabel = titleCase(humanizeLabel(label))
  const typeSource = isFromToChange(value) ? value.to ?? value.from : value
  const suffix = getValueTypeSuffix(typeSource)

  let changeVerb = ''
  if (includeChangeVerb && isFromToChange(value)) {
    const fromValue = value.from
    const toValue = value.to
    if (fromValue == null && toValue != null) {
      changeVerb = 'Added'
    } else if (fromValue != null && toValue == null) {
      changeVerb = 'Removed'
    }
  }

  const labelWithSuffix = suffix ? `${cleanLabel} ${suffix}` : cleanLabel
  return changeVerb ? `${changeVerb} ${labelWithSuffix}` : labelWithSuffix
}

function buildTitle(action: string, changes?: Record<string, unknown>): string {
  const [verb, ...rest] = action.split('_')
  const verbLabel =
    verb === 'create' ? 'Created' : verb === 'update' ? 'Updated' : verb === 'delete' ? 'Deleted' : capitalize(verb)
  const noun = rest.map(capitalize).join(' ')
  const baseTitle = joinTitleParts(verbLabel, noun)

  const primary = getPrimaryChange(changes)
  if (!primary) return baseTitle

  const includeChangeVerb = verb === 'update'
  const detail = buildDetailLabel(primary.label, primary.value, includeChangeVerb)
  const detailWithCount = primary.extraCount ? `${detail} +${primary.extraCount}` : detail

  return joinTitleParts(baseTitle, `(${detailWithCount})`)
}

function buildSummary(changes?: Record<string, unknown>): string | undefined {
  if (!changes) return undefined
  const fieldList = Array.isArray(changes.fields)
    ? (changes.fields as unknown[]).map((item) => String(item))
    : Object.keys(changes)

  if (!fieldList.length) return undefined
  const preview = fieldList.slice(0, 4).join(', ')
  const more = fieldList.length > 4 ? ` (+${fieldList.length - 4} more)` : ''
  return `Changed ${preview}${more}`
}

export const adminActivityService = {
  async logActivity(input: CreateAdminActivityInput): Promise<AdminActivity> {
    const sanitizedChanges = sanitizeChanges(input.changes)
    const title = input.title?.trim() || buildTitle(input.action, sanitizedChanges)
    const summary = input.summary?.trim() || buildSummary(sanitizedChanges)

    return adminActivityRepository.create({
      ...input,
      title,
      summary,
      changes: sanitizedChanges,
    })
  },

  async getActivity(params: {
    limit?: number
    startDate?: Date
    endDate?: Date
    action?: string
  }): Promise<AdminActivity[]> {
    if (params.action) {
      return adminActivityRepository.findByAction(params.action as any, params.limit)
    }
    return adminActivityRepository.findAll(params.limit, params.startDate, params.endDate)
  },
}



