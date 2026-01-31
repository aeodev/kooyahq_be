import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate'
import { requirePermission } from '../../middleware/require-permission'
import { PERMISSIONS } from '../auth/rbac/permissions'
import {
  getConversations,
  getConversation,
  createDirectConversation,
  createGroupConversation,
  updateConversation,
  addGroupMember,
  removeGroupMember,
  leaveGroup,
  getMessages,
  sendMessage,
  updateMessage,
  deleteMessage,
  markConversationAsRead,
  getUnreadCount,
  getTeamContacts,
  archiveConversation,
  unarchiveConversation,
  deleteConversation,
} from './chat.controller'

export const chatRouter = Router()

// All routes require authentication
chatRouter.use(authenticate)

// Conversation routes
chatRouter.get(
  '/conversations',
  requirePermission(PERMISSIONS.CHAT_READ, PERMISSIONS.CHAT_FULL_ACCESS),
  getConversations
)

chatRouter.get(
  '/conversations/:id',
  requirePermission(PERMISSIONS.CHAT_READ, PERMISSIONS.CHAT_FULL_ACCESS),
  getConversation
)

chatRouter.post(
  '/conversations/direct',
  requirePermission(PERMISSIONS.CHAT_SEND, PERMISSIONS.CHAT_FULL_ACCESS),
  createDirectConversation
)

chatRouter.post(
  '/conversations/group',
  requirePermission(PERMISSIONS.CHAT_CREATE_GROUP, PERMISSIONS.CHAT_FULL_ACCESS),
  createGroupConversation
)

chatRouter.put(
  '/conversations/:id',
  requirePermission(PERMISSIONS.CHAT_MANAGE_GROUP, PERMISSIONS.CHAT_FULL_ACCESS),
  updateConversation
)

chatRouter.post(
  '/conversations/:id/members',
  requirePermission(PERMISSIONS.CHAT_MANAGE_GROUP, PERMISSIONS.CHAT_FULL_ACCESS),
  addGroupMember
)

chatRouter.delete(
  '/conversations/:id/members/:userId',
  requirePermission(PERMISSIONS.CHAT_MANAGE_GROUP, PERMISSIONS.CHAT_FULL_ACCESS),
  removeGroupMember
)

chatRouter.post(
  '/conversations/:id/leave',
  requirePermission(PERMISSIONS.CHAT_SEND, PERMISSIONS.CHAT_FULL_ACCESS),
  leaveGroup
)

// Message routes
chatRouter.get(
  '/conversations/:id/messages',
  requirePermission(PERMISSIONS.CHAT_READ, PERMISSIONS.CHAT_FULL_ACCESS),
  getMessages
)

chatRouter.post(
  '/conversations/:id/messages',
  requirePermission(PERMISSIONS.CHAT_SEND, PERMISSIONS.CHAT_FULL_ACCESS),
  sendMessage
)

chatRouter.put(
  '/messages/:id',
  requirePermission(PERMISSIONS.CHAT_SEND, PERMISSIONS.CHAT_FULL_ACCESS),
  updateMessage
)

chatRouter.delete(
  '/messages/:id',
  requirePermission(PERMISSIONS.CHAT_SEND, PERMISSIONS.CHAT_FULL_ACCESS),
  deleteMessage
)

// Read status routes
chatRouter.put(
  '/conversations/:id/read',
  requirePermission(PERMISSIONS.CHAT_READ, PERMISSIONS.CHAT_FULL_ACCESS),
  markConversationAsRead
)

chatRouter.get(
  '/conversations/:id/unread',
  requirePermission(PERMISSIONS.CHAT_READ, PERMISSIONS.CHAT_FULL_ACCESS),
  getUnreadCount
)

chatRouter.get(
  '/team-contacts',
  requirePermission(PERMISSIONS.CHAT_READ, PERMISSIONS.CHAT_FULL_ACCESS),
  getTeamContacts
)

// Archive/Delete routes
chatRouter.post(
  '/conversations/:id/archive',
  requirePermission(PERMISSIONS.CHAT_SEND, PERMISSIONS.CHAT_FULL_ACCESS),
  archiveConversation
)

chatRouter.post(
  '/conversations/:id/unarchive',
  requirePermission(PERMISSIONS.CHAT_SEND, PERMISSIONS.CHAT_FULL_ACCESS),
  unarchiveConversation
)

chatRouter.delete(
  '/conversations/:id',
  requirePermission(PERMISSIONS.CHAT_SEND, PERMISSIONS.CHAT_FULL_ACCESS),
  deleteConversation
)
