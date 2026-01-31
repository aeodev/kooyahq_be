import type { NextFunction, Request, Response } from 'express'
import { chatService } from './chat.service'
import { createHttpError } from '../../utils/http-error'

export async function getConversations(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id
  const page = req.query.page ? parseInt(String(req.query.page), 10) : undefined
  const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined
  const archived = req.query.archived === 'true'

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const result = archived
      ? await chatService.getArchivedConversations(userId, { page, limit })
      : await chatService.getConversations(userId, { page, limit })
    res.json({
      status: 'success',
      data: result.conversations,
      pagination: {
        total: result.total,
        page: page || 1,
        limit: limit || 50,
      },
    })
  } catch (error) {
    next(error)
  }
}

export async function getConversation(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id
  const { id } = req.params

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const conversation = await chatService.getConversation(id, userId)
    res.json({
      status: 'success',
      data: conversation,
    })
  } catch (error: any) {
    if (error.message === 'Conversation not found') {
      return next(createHttpError(404, error.message))
    }
    next(error)
  }
}

export async function createDirectConversation(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id
  const { userId: otherUserId } = req.body

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  if (!otherUserId || typeof otherUserId !== 'string') {
    return next(createHttpError(400, 'Other user ID is required'))
  }

  if (userId === otherUserId) {
    return next(createHttpError(400, 'Cannot create conversation with yourself'))
  }

  try {
    const conversation = await chatService.createDirectConversation(userId, otherUserId)
    res.status(201).json({
      status: 'success',
      data: conversation,
    })
  } catch (error) {
    next(error)
  }
}

export async function createGroupConversation(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id
  const { name, description, avatar, participants, admins } = req.body

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  if (!name || typeof name !== 'string' || !name.trim()) {
    return next(createHttpError(400, 'Group name is required'))
  }

  if (!Array.isArray(participants) || participants.length < 1) {
    return next(createHttpError(400, 'At least one participant is required'))
  }

  try {
    const conversation = await chatService.createGroupConversation(userId, {
      type: 'group',
      participants,
      name: name.trim(),
      description: description?.trim(),
      avatar,
      createdBy: userId,
      admins,
    })
    res.status(201).json({
      status: 'success',
      data: conversation,
    })
  } catch (error) {
    next(error)
  }
}

export async function updateConversation(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id
  const { id } = req.params
  const { name, description, avatar, admins } = req.body

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const conversation = await chatService.updateGroup(id, userId, {
      name: name?.trim(),
      description: description?.trim(),
      avatar,
      admins,
    })
    res.json({
      status: 'success',
      data: conversation,
    })
  } catch (error: any) {
    if (error.message === 'Conversation not found or access denied') {
      return next(createHttpError(404, error.message))
    }
    if (error.message === 'Only group conversations can be updated') {
      return next(createHttpError(400, error.message))
    }
    if (error.message === 'Failed to update conversation or insufficient permissions') {
      return next(createHttpError(403, error.message))
    }
    next(error)
  }
}

export async function addGroupMember(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id
  const { id } = req.params
  const { userId: memberUserId } = req.body

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  if (!memberUserId || typeof memberUserId !== 'string') {
    return next(createHttpError(400, 'User ID is required'))
  }

  try {
    const conversation = await chatService.addGroupMember(id, userId, memberUserId)
    res.json({
      status: 'success',
      data: conversation,
    })
  } catch (error: any) {
    if (error.message === 'Conversation not found or access denied') {
      return next(createHttpError(404, error.message))
    }
    if (error.message === 'Only admins can add members') {
      return next(createHttpError(403, error.message))
    }
    next(error)
  }
}

export async function removeGroupMember(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id
  const { id, userId: memberUserId } = req.params

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const conversation = await chatService.removeGroupMember(id, userId, memberUserId)
    res.json({
      status: 'success',
      data: conversation,
    })
  } catch (error: any) {
    if (error.message === 'Conversation not found or access denied') {
      return next(createHttpError(404, error.message))
    }
    if (error.message === 'Only admins can remove members' || error.message === 'Cannot remove yourself') {
      return next(createHttpError(403, error.message))
    }
    next(error)
  }
}

export async function leaveGroup(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id
  const { id } = req.params

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    await chatService.leaveGroup(id, userId)
    res.json({
      status: 'success',
      message: 'Left group successfully',
    })
  } catch (error: any) {
    if (error.message === 'Conversation not found or access denied') {
      return next(createHttpError(404, error.message))
    }
    if (error.message === 'Only group conversations can be left') {
      return next(createHttpError(400, error.message))
    }
    if (error.message === 'Cannot leave group as the only admin') {
      return next(createHttpError(400, error.message))
    }
    next(error)
  }
}

export async function getMessages(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id
  const { id } = req.params
  const page = req.query.page ? parseInt(String(req.query.page), 10) : undefined
  const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined
  const before = req.query.before ? String(req.query.before) : undefined

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const result = await chatService.getMessages(id, userId, { page, limit, before })
    res.json({
      status: 'success',
      data: result.messages,
      pagination: {
        total: result.total,
        hasMore: result.hasMore,
        page: page || 1,
        limit: limit || 50,
      },
    })
  } catch (error: any) {
    if (error.message === 'Conversation not found or access denied') {
      return next(createHttpError(404, error.message))
    }
    next(error)
  }
}

export async function sendMessage(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id
  const { id } = req.params
  const { content, type, attachments, replyTo } = req.body

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  // Allow empty content if attachments exist
  const hasAttachments = attachments && Array.isArray(attachments) && attachments.length > 0
  const hasContent = content && typeof content === 'string' && content.trim()
  
  if (!hasContent && !hasAttachments) {
    return next(createHttpError(400, 'Message content or attachments are required'))
  }

  try {
    const messageContent = hasContent ? content.trim() : ''
    const messageType = hasAttachments && !hasContent ? 'image' : (type || 'text')
    
    const message = await chatService.sendMessage(id, userId, {
      conversationId: id,
      senderId: userId,
      content: messageContent,
      type: messageType,
      attachments,
      replyTo,
    })
    res.status(201).json({
      status: 'success',
      data: message,
    })
  } catch (error: any) {
    if (error.message === 'Conversation not found or access denied') {
      return next(createHttpError(404, error.message))
    }
    if (error.message === 'Message content is required' || error.message === 'Message content too long') {
      return next(createHttpError(400, error.message))
    }
    next(error)
  }
}

export async function updateMessage(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id
  const { id } = req.params
  const { content } = req.body

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  if (!content || typeof content !== 'string' || !content.trim()) {
    return next(createHttpError(400, 'Message content is required'))
  }

  try {
    const { chatRepository } = await import('./chat.repository')
    const updated = await chatRepository.update(id, userId, { content: content.trim() })
    if (!updated) {
      return next(createHttpError(404, 'Message not found or unauthorized'))
    }
    res.json({
      status: 'success',
      data: updated,
    })
  } catch (error) {
    next(error)
  }
}

export async function deleteMessage(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id
  const { id } = req.params

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const { chatRepository } = await import('./chat.repository')
    const deleted = await chatRepository.delete(id, userId)
    if (!deleted) {
      return next(createHttpError(404, 'Message not found or unauthorized'))
    }
    res.json({
      status: 'success',
      message: 'Message deleted',
    })
  } catch (error) {
    next(error)
  }
}

export async function markConversationAsRead(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id
  const { id } = req.params

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    await chatService.markAsRead(id, userId)
    res.json({
      status: 'success',
      message: 'Conversation marked as read',
    })
  } catch (error: any) {
    if (error.message === 'Conversation not found or access denied') {
      return next(createHttpError(404, error.message))
    }
    next(error)
  }
}

export async function getUnreadCount(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id
  const { id } = req.params

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const count = await chatService.getUnreadCount(id, userId)
    res.json({
      status: 'success',
      data: { count },
    })
  } catch (error) {
    next(error)
  }
}

export async function getTeamContacts(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id
  const userEmail = req.user?.email

  if (!userId || !userEmail) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const teamMembers = await chatService.getTeamContacts(userId, userEmail)
    res.json({
      status: 'success',
      data: teamMembers,
    })
  } catch (error) {
    next(error)
  }
}

export async function archiveConversation(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id
  const { id } = req.params

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const conversation = await chatService.archiveConversation(id, userId)
    res.json({
      status: 'success',
      data: conversation,
    })
  } catch (error: any) {
    if (error.message === 'Conversation not found or access denied') {
      return next(createHttpError(404, error.message))
    }
    next(error)
  }
}

export async function unarchiveConversation(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id
  const { id } = req.params

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    const conversation = await chatService.unarchiveConversation(id, userId)
    res.json({
      status: 'success',
      data: conversation,
    })
  } catch (error: any) {
    if (error.message === 'Conversation not found or access denied') {
      return next(createHttpError(404, error.message))
    }
    next(error)
  }
}

export async function deleteConversation(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id
  const { id } = req.params

  if (!userId) {
    return next(createHttpError(401, 'Unauthorized'))
  }

  try {
    await chatService.deleteConversation(id, userId)
    res.json({
      status: 'success',
      message: 'Conversation deleted',
    })
  } catch (error: any) {
    if (error.message === 'Conversation not found or access denied') {
      return next(createHttpError(404, error.message))
    }
    next(error)
  }
}
