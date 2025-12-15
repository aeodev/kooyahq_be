import { userRepository } from '../users/user.repository'
import { projectRepository } from '../projects/project.repository'
import type { PublicUser } from '../users/user.model'
import { PERMISSIONS, type Permission } from '../auth/rbac/permissions'

const USER_MANAGEMENT_PERMS: Permission[] = [
  PERMISSIONS.SYSTEM_FULL_ACCESS,
  PERMISSIONS.USERS_VIEW,
  PERMISSIONS.USERS_MANAGE,
  PERMISSIONS.PROJECTS_VIEW,
  PERMISSIONS.PROJECTS_MANAGE,
  PERMISSIONS.SYSTEM_LOGS,
]

function hasUserManagementAccess(user: PublicUser) {
  return Array.isArray(user.permissions) && user.permissions.some((perm) => USER_MANAGEMENT_PERMS.includes(perm as Permission))
}

export const userManagementService = {
  async getStats() {
    const [users, projects] = await Promise.all([
      userRepository.findAll(),
      projectRepository.findAll(),
    ])

    const totalUsers = users.length
    const totalAdmins = users.filter(hasUserManagementAccess).length
    const totalRegularUsers = totalUsers - totalAdmins
    const totalProjects = projects.length

    // Recent activity count (last 7 days) - users created in last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const recentActivityCount = users.filter((u) => {
      const createdAt = new Date(u.createdAt)
      return createdAt >= sevenDaysAgo
    }).length

    // New users this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    const newUsersThisMonth = users.filter((u) => {
      const createdAt = new Date(u.createdAt)
      return createdAt >= startOfMonth
    }).length

    return {
      totalUsers,
      totalAdmins,
      totalRegularUsers,
      totalProjects,
      recentActivityCount,
      newUsersThisMonth,
    }
  },

  async exportUsers(format: 'csv' | 'json'): Promise<string | PublicUser[]> {
    const users = await userRepository.findAll()

    if (format === 'json') {
      return users
    }

    // CSV format
    const headers = ['ID', 'Name', 'Email', 'Position', 'Has Admin Access', 'Status', 'Created At']
    const rows = users.map((user) => [
      user.id,
      user.name,
      user.email,
      user.position || '',
      hasUserManagementAccess(user) ? 'Yes' : 'No',
      user.status || 'online',
      user.createdAt,
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n')

    return csvContent
  },
}


