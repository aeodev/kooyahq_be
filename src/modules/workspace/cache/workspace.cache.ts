import type { Workspace } from '../workspace/workspace.model'
import { deleteKeys, getJson, setJson } from '../../../lib/redis'

const workspaceKey = (id: string) => `workspace:${id}`
const userWorkspacesKey = (userId: string) => `workspace:user:${userId}`

export const workspaceCache = {
  async getWorkspace(id: string): Promise<Workspace | null> {
    return getJson<Workspace>(workspaceKey(id))
  },

  async setWorkspace(workspace: Workspace): Promise<void> {
    await setJson(workspaceKey(workspace.id), workspace)
  },

  async deleteWorkspace(id: string): Promise<void> {
    await deleteKeys(workspaceKey(id))
  },

  async getUserWorkspaces(userId: string): Promise<Workspace[] | null> {
    return getJson<Workspace[]>(userWorkspacesKey(userId))
  },

  async setUserWorkspaces(userId: string, workspaces: Workspace[]): Promise<void> {
    await setJson(userWorkspacesKey(userId), workspaces)
  },

  async invalidateUserWorkspaceLists(userIds: string[]): Promise<void> {
    if (!Array.isArray(userIds) || userIds.length === 0) return
    const keys = userIds.map(userWorkspacesKey)
    await deleteKeys(keys)
  },
}
