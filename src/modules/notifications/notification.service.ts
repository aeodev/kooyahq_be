import { notificationRepository, type CreateNotificationInput } from './notification.repository'
import { userService } from '../users/user.service'
import type { Notification } from './notification.model'
import { SocketEmitter } from '../../utils/socket-emitter'

export type NotificationWithData = Notification & {
  actor?: {
    id: string
    name: string
    email: string
    profilePic?: string
  }
}

export const notificationService = {
  async create(input: CreateNotificationInput): Promise<Notification> {
    return notificationRepository.create(input)
  },

  async createPostCreatedNotification(authorId: string, postId: string): Promise<void> {
    // Notify all users about new post (team announcement)
    // For now, we'll skip this to avoid spam. Can be enabled later if needed.
  },

  async createCommentNotification(postAuthorId: string, commentAuthorId: string, postId: string, commentId: string): Promise<void> {
    // Don't notify if user commented on their own post
    if (postAuthorId === commentAuthorId) {
      return
    }

    const notification = await notificationRepository.create({
      userId: postAuthorId,
      type: 'comment',
      postId,
      commentId,
    })

    const unreadCount = await notificationRepository.getUnreadCount(postAuthorId)
    SocketEmitter.emitToUser(postAuthorId, 'notification:new', {
      notification,
      unreadCount,
    })
  },

  async createReactionNotification(postAuthorId: string, reactionAuthorId: string, postId: string, reactionId: string): Promise<void> {
    // Don't notify if user reacted to their own post
    if (postAuthorId === reactionAuthorId) {
      return
    }

    const notification = await notificationRepository.create({
      userId: postAuthorId,
      type: 'reaction',
      postId,
      reactionId,
    })

    const unreadCount = await notificationRepository.getUnreadCount(postAuthorId)
    SocketEmitter.emitToUser(postAuthorId, 'notification:new', {
      notification,
      unreadCount,
    })
  },

  async createMentionNotification(mentionedUserIds: string[], mentionerId: string, postId?: string, commentId?: string): Promise<void> {
    // Don't notify if user mentioned themselves
    const filteredUserIds = mentionedUserIds.filter((id) => id !== mentionerId)

    const notifications = await Promise.all(
      filteredUserIds.map((userId) =>
        notificationRepository.create({
          userId,
          type: 'mention',
          postId,
          commentId,
          mentionId: mentionerId,
        })
      )
    )

    // Emit socket events for each notification
    await Promise.all(
      notifications.map(async (notification) => {
        const unreadCount = await notificationRepository.getUnreadCount(notification.userId)
        SocketEmitter.emitToUser(notification.userId, 'notification:new', {
          notification,
          unreadCount,
        })
      })
    )
  },

  async findByUserId(userId: string, unreadOnly?: boolean): Promise<NotificationWithData[]> {
    const notifications = await notificationRepository.findByUserId(userId, unreadOnly)
    
    // Get actor info for mentions, card_comment, card_assigned, card_moved, and board_member_added
    const actorIds = [...new Set(
      notifications
        .filter((n) => n.mentionId && (n.type === 'mention' || n.type === 'card_comment' || n.type === 'card_assigned' || n.type === 'card_moved' || n.type === 'board_member_added' || n.type === 'game_invitation'))
        .map((n) => n.mentionId!)
    )]
    
    const actors = await Promise.all(
      actorIds.map(async (id) => {
        const actor = await userService.getPublicProfile(id)
        return { id, actor }
      })
    )

    const actorMap = new Map(
      actors.filter((a) => a.actor).map((a) => [a.id, a.actor!])
    )

    return notifications.map((notification) => {
      const notificationWithData: NotificationWithData = { ...notification }
      
      if (notification.mentionId && (notification.type === 'mention' || notification.type === 'card_comment' || notification.type === 'card_assigned' || notification.type === 'card_moved' || notification.type === 'board_member_added' || notification.type === 'game_invitation')) {
        const actor = actorMap.get(notification.mentionId)
        if (actor) {
          notificationWithData.actor = {
            id: actor.id,
            name: actor.name,
            email: actor.email,
            profilePic: actor.profilePic,
          }
        }
      }
      
      return notificationWithData
    })
  },

  async markAsRead(id: string, userId: string): Promise<Notification | undefined> {
    return notificationRepository.markAsRead(id, userId)
  },

  async markAllAsRead(userId: string): Promise<number> {
    return notificationRepository.markAllAsRead(userId)
  },

  async getUnreadCount(userId: string): Promise<number> {
    return notificationRepository.getUnreadCount(userId)
  },

  async createSystemNotificationBroadcast(title: string, message?: string): Promise<void> {
    const users = await userService.findAll()
    
    const notifications = await Promise.all(
      users.map((user) =>
        notificationRepository.create({
          userId: user.id,
          type: 'system',
          title,
        })
      )
    )

    // Emit socket events for each notification
    await Promise.all(
      notifications.map(async (notification) => {
        const unreadCount = await notificationRepository.getUnreadCount(notification.userId)
        SocketEmitter.emitToUser(notification.userId, 'notification:new', {
          notification,
          unreadCount,
        })
      })
    )
  },

  async createCardAssignmentNotification(assigneeId: string, cardId: string, assignedById: string, cardReporterId?: string, boardPrefix?: string, ticketKey?: string): Promise<void> {
    // Don't notify if user assigned themselves
    if (assigneeId === assignedById) {
      return
    }

    const url = boardPrefix && ticketKey ? `/workspace/${boardPrefix}/${ticketKey}` : undefined

    const notificationPromises: Promise<Notification>[] = []

    // Notify new assignee
    notificationPromises.push(
      notificationRepository.create({
        userId: assigneeId,
        type: 'card_assigned',
        cardId,
        mentionId: assignedById, // Use mentionId to track who assigned
        url,
      })
    )

    // Notify reporter if exists and not the assigner or new assignee
    if (cardReporterId && cardReporterId !== assignedById && cardReporterId !== assigneeId) {
      notificationPromises.push(
        notificationRepository.create({
          userId: cardReporterId,
          type: 'card_assigned',
          cardId,
          mentionId: assignedById,
          url,
        })
      )
    }

    const notifications = await Promise.all(notificationPromises)

    // Emit socket events for each notification
    await Promise.all(
      notifications.map(async (notification) => {
        const unreadCount = await notificationRepository.getUnreadCount(notification.userId)
        SocketEmitter.emitToUser(notification.userId, 'notification:new', {
          notification,
          unreadCount,
        })
      })
    )
  },

  async createCardCommentNotification(cardId: string, commenterId: string, commentId: string, cardAssigneeId?: string, cardReporterId?: string, boardPrefix?: string, ticketKey?: string): Promise<void> {
    const url = boardPrefix && ticketKey ? `/workspace/${boardPrefix}/${ticketKey}` : undefined

    const notificationPromises: Promise<Notification>[] = []

    // Notify card assignee if exists and not the commenter
    if (cardAssigneeId && cardAssigneeId !== commenterId) {
      notificationPromises.push(
        notificationRepository.create({
          userId: cardAssigneeId,
          type: 'card_comment',
          cardId,
          commentId,
          mentionId: commenterId, // Use mentionId to track who commented
          url,
        })
      )
    }

    // Notify reporter if exists and not the commenter
    if (cardReporterId && cardReporterId !== commenterId && cardReporterId !== cardAssigneeId) {
      notificationPromises.push(
        notificationRepository.create({
          userId: cardReporterId,
          type: 'card_comment',
          cardId,
          commentId,
          mentionId: commenterId,
          url,
        })
      )
    }

    const notifications = await Promise.all(notificationPromises)

    // Emit socket events for each notification
    await Promise.all(
      notifications.map(async (notification) => {
        const unreadCount = await notificationRepository.getUnreadCount(notification.userId)
        SocketEmitter.emitToUser(notification.userId, 'notification:new', {
          notification,
          unreadCount,
        })
      })
    )
  },

  async createCardMovedNotification(cardId: string, movedById: string, cardAssigneeId?: string, cardReporterId?: string, boardPrefix?: string, ticketKey?: string): Promise<void> {
    const url = boardPrefix && ticketKey ? `/workspace/${boardPrefix}/${ticketKey}` : undefined

    const notificationPromises: Promise<Notification>[] = []

    // Notify card assignee if exists and not the mover
    if (cardAssigneeId && cardAssigneeId !== movedById) {
      notificationPromises.push(
        notificationRepository.create({
          userId: cardAssigneeId,
          type: 'card_moved',
          cardId,
          mentionId: movedById, // Use mentionId to track who moved
          url,
        })
      )
    }

    // Notify reporter if exists and not the mover
    if (cardReporterId && cardReporterId !== movedById && cardReporterId !== cardAssigneeId) {
      notificationPromises.push(
        notificationRepository.create({
          userId: cardReporterId,
          type: 'card_moved',
          cardId,
          mentionId: movedById,
          url,
        })
      )
    }

    const notifications = await Promise.all(notificationPromises)

    // Emit socket events for each notification
    await Promise.all(
      notifications.map(async (notification) => {
        const unreadCount = await notificationRepository.getUnreadCount(notification.userId)
        SocketEmitter.emitToUser(notification.userId, 'notification:new', {
          notification,
          unreadCount,
        })
      })
    )
  },

  async createBoardMemberNotification(userId: string, boardId: string, addedById: string): Promise<void> {
    // Don't notify if user added themselves
    if (userId === addedById) {
      return
    }

    const notification = await notificationRepository.create({
      userId,
      type: 'board_member_added',
      boardId,
      mentionId: addedById, // Use mentionId to track who added them
    })

    const unreadCount = await notificationRepository.getUnreadCount(userId)
    SocketEmitter.emitToUser(userId, 'notification:new', {
      notification,
      unreadCount,
    })
  },

  async createGameInvitationNotification(invitedUserId: string, inviterId: string, gameType: string): Promise<void> {
    // Don't notify if user invited themselves
    if (invitedUserId === inviterId) {
      return
    }

    const notification = await notificationRepository.create({
      userId: invitedUserId,
      type: 'game_invitation',
      title: `Game invitation: ${gameType}`,
      mentionId: inviterId, // Use mentionId to track who invited
    })

    const unreadCount = await notificationRepository.getUnreadCount(invitedUserId)
    SocketEmitter.emitToUser(invitedUserId, 'notification:new', {
      notification,
      unreadCount,
    })
  },
}



