import { workspaceRepository, type CreateWorkspaceInput } from './workspace.repository'

/**
 * Generate a URL-safe slug from workspace name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Generate a unique slug, checking for conflicts
 */
async function generateUniqueSlug(name: string, existingSlug?: string): Promise<string> {
  if (existingSlug) {
    const existing = await workspaceRepository.findBySlug(existingSlug)
    if (!existing) {
      return existingSlug.toLowerCase()
    }
  }

  let baseSlug = generateSlug(name)
  let slug = baseSlug
  let counter = 1

  while (await workspaceRepository.findBySlug(slug)) {
    slug = `${baseSlug}-${counter}`
    counter++
  }

  return slug.toLowerCase()
}

export class WorkspaceService {
  async create(data: CreateWorkspaceInput): Promise<import('./workspace.model').Workspace> {
    const slug = await generateUniqueSlug(data.name, data.slug)
    return workspaceRepository.create({ ...data, slug })
  }

  async findById(id: string) {
    return workspaceRepository.findById(id)
  }

  async findBySlug(slug: string) {
    return workspaceRepository.findBySlug(slug)
  }

  async findByUserId(userId: string) {
    return workspaceRepository.findByUserId(userId)
  }

  async update(
    id: string,
    updates: Partial<{
      name: string
      slug: string
      members: Array<{
        userId: string
        role: 'owner' | 'admin' | 'member'
        joinedAt: Date
      }>
    }>,
  ) {
    return workspaceRepository.update(id, updates)
  }

  async delete(id: string) {
    return workspaceRepository.delete(id)
  }
}

export const workspaceService = new WorkspaceService()

