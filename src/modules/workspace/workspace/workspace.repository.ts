import { WorkspaceModel, toWorkspace, type Workspace } from './workspace.model'

export type CreateWorkspaceInput = {
  name: string
  slug: string
  members: Array<{
    userId: string
    role: 'owner' | 'admin' | 'member'
    joinedAt: Date
  }>
}

export class WorkspaceRepository {
  async create(data: CreateWorkspaceInput): Promise<Workspace> {
    const workspace = await WorkspaceModel.create(data)
    return toWorkspace(workspace)
  }

  async findById(id: string): Promise<Workspace | null> {
    const workspace = await WorkspaceModel.findById(id)
    return workspace ? toWorkspace(workspace) : null
  }

  async findBySlug(slug: string): Promise<Workspace | null> {
    const workspace = await WorkspaceModel.findOne({ slug: slug.toLowerCase() })
    return workspace ? toWorkspace(workspace) : null
  }

  async findByUserId(userId: string): Promise<Workspace[]> {
    const workspaces = await WorkspaceModel.find({
      'members.userId': userId,
    }).sort({ updatedAt: -1 })
    return workspaces.map(toWorkspace)
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
  ): Promise<Workspace | null> {
    const workspace = await WorkspaceModel.findByIdAndUpdate(id, updates, { new: true })
    return workspace ? toWorkspace(workspace) : null
  }

  async delete(id: string): Promise<boolean> {
    const result = await WorkspaceModel.deleteOne({ _id: id })
    return result.deletedCount === 1
  }
}

export const workspaceRepository = new WorkspaceRepository()

