"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = void 0;
const notification_repository_1 = require("./notification.repository");
const user_service_1 = require("../users/user.service");
const socket_emitter_1 = require("../../utils/socket-emitter");
exports.notificationService = {
    async create(input) {
        return notification_repository_1.notificationRepository.create(input);
    },
    async createPostCreatedNotification(authorId, postId) {
        // Notify all users about new post (team announcement)
        // For now, we'll skip this to avoid spam. Can be enabled later if needed.
    },
    async createCommentNotification(postAuthorId, commentAuthorId, postId, commentId) {
        // Don't notify if user commented on their own post
        if (postAuthorId === commentAuthorId) {
            return;
        }
        const notification = await notification_repository_1.notificationRepository.create({
            userId: postAuthorId,
            type: 'comment',
            postId,
            commentId,
        });
        const unreadCount = await notification_repository_1.notificationRepository.getUnreadCount(postAuthorId);
        socket_emitter_1.SocketEmitter.emitToUser(postAuthorId, 'notification:new', {
            notification,
            unreadCount,
        });
    },
    async createReactionNotification(postAuthorId, reactionAuthorId, postId, reactionId) {
        // Don't notify if user reacted to their own post
        if (postAuthorId === reactionAuthorId) {
            return;
        }
        const notification = await notification_repository_1.notificationRepository.create({
            userId: postAuthorId,
            type: 'reaction',
            postId,
            reactionId,
        });
        const unreadCount = await notification_repository_1.notificationRepository.getUnreadCount(postAuthorId);
        socket_emitter_1.SocketEmitter.emitToUser(postAuthorId, 'notification:new', {
            notification,
            unreadCount,
        });
    },
    async createMentionNotification(mentionedUserIds, mentionerId, postId, commentId) {
        // Don't notify if user mentioned themselves
        const filteredUserIds = mentionedUserIds.filter((id) => id !== mentionerId);
        const notifications = await Promise.all(filteredUserIds.map((userId) => notification_repository_1.notificationRepository.create({
            userId,
            type: 'mention',
            postId,
            commentId,
            mentionId: mentionerId,
        })));
        // Emit socket events for each notification
        await Promise.all(notifications.map(async (notification) => {
            const unreadCount = await notification_repository_1.notificationRepository.getUnreadCount(notification.userId);
            socket_emitter_1.SocketEmitter.emitToUser(notification.userId, 'notification:new', {
                notification,
                unreadCount,
            });
        }));
    },
    async findByUserId(userId, unreadOnly) {
        const notifications = await notification_repository_1.notificationRepository.findByUserId(userId, unreadOnly);
        // Get actor info for mentions, card_comment, card_assigned, and board_member_added
        const actorIds = [...new Set(notifications
                .filter((n) => n.mentionId && (n.type === 'mention' || n.type === 'card_comment' || n.type === 'card_assigned' || n.type === 'board_member_added' || n.type === 'game_invitation'))
                .map((n) => n.mentionId))];
        const actors = await Promise.all(actorIds.map(async (id) => {
            const actor = await user_service_1.userService.getPublicProfile(id);
            return { id, actor };
        }));
        const actorMap = new Map(actors.filter((a) => a.actor).map((a) => [a.id, a.actor]));
        return notifications.map((notification) => {
            const notificationWithData = { ...notification };
            if (notification.mentionId && (notification.type === 'mention' || notification.type === 'card_comment' || notification.type === 'card_assigned' || notification.type === 'board_member_added' || notification.type === 'game_invitation')) {
                const actor = actorMap.get(notification.mentionId);
                if (actor) {
                    notificationWithData.actor = {
                        id: actor.id,
                        name: actor.name,
                        email: actor.email,
                        profilePic: actor.profilePic,
                    };
                }
            }
            return notificationWithData;
        });
    },
    async markAsRead(id, userId) {
        return notification_repository_1.notificationRepository.markAsRead(id, userId);
    },
    async markAllAsRead(userId) {
        return notification_repository_1.notificationRepository.markAllAsRead(userId);
    },
    async getUnreadCount(userId) {
        return notification_repository_1.notificationRepository.getUnreadCount(userId);
    },
    async createSystemNotificationBroadcast(title, message) {
        const users = await user_service_1.userService.findAll();
        const notifications = await Promise.all(users.map((user) => notification_repository_1.notificationRepository.create({
            userId: user.id,
            type: 'system',
            title,
        })));
        // Emit socket events for each notification
        await Promise.all(notifications.map(async (notification) => {
            const unreadCount = await notification_repository_1.notificationRepository.getUnreadCount(notification.userId);
            socket_emitter_1.SocketEmitter.emitToUser(notification.userId, 'notification:new', {
                notification,
                unreadCount,
            });
        }));
    },
    async createCardAssignmentNotification(assigneeId, cardId, assignedById) {
        // Don't notify if user assigned themselves
        if (assigneeId === assignedById) {
            return;
        }
        const notification = await notification_repository_1.notificationRepository.create({
            userId: assigneeId,
            type: 'card_assigned',
            cardId,
            mentionId: assignedById, // Use mentionId to track who assigned
        });
        const unreadCount = await notification_repository_1.notificationRepository.getUnreadCount(assigneeId);
        socket_emitter_1.SocketEmitter.emitToUser(assigneeId, 'notification:new', {
            notification,
            unreadCount,
        });
    },
    async createCardCommentNotification(cardId, commenterId, commentId, cardAssigneeId, cardBoardOwnerId) {
        const notificationPromises = [];
        // Notify card assignee if exists and not the commenter
        if (cardAssigneeId && cardAssigneeId !== commenterId) {
            notificationPromises.push(notification_repository_1.notificationRepository.create({
                userId: cardAssigneeId,
                type: 'card_comment',
                cardId,
                commentId,
                mentionId: commenterId, // Use mentionId to track who commented
            }));
        }
        // Notify board owner (card creator) if exists and not the commenter
        if (cardBoardOwnerId && cardBoardOwnerId !== commenterId && cardBoardOwnerId !== cardAssigneeId) {
            notificationPromises.push(notification_repository_1.notificationRepository.create({
                userId: cardBoardOwnerId,
                type: 'card_comment',
                cardId,
                commentId,
                mentionId: commenterId,
            }));
        }
        const notifications = await Promise.all(notificationPromises);
        // Emit socket events for each notification
        await Promise.all(notifications.map(async (notification) => {
            const unreadCount = await notification_repository_1.notificationRepository.getUnreadCount(notification.userId);
            socket_emitter_1.SocketEmitter.emitToUser(notification.userId, 'notification:new', {
                notification,
                unreadCount,
            });
        }));
    },
    async createBoardMemberNotification(userId, boardId, addedById) {
        // Don't notify if user added themselves
        if (userId === addedById) {
            return;
        }
        const notification = await notification_repository_1.notificationRepository.create({
            userId,
            type: 'board_member_added',
            boardId,
            mentionId: addedById, // Use mentionId to track who added them
        });
        const unreadCount = await notification_repository_1.notificationRepository.getUnreadCount(userId);
        socket_emitter_1.SocketEmitter.emitToUser(userId, 'notification:new', {
            notification,
            unreadCount,
        });
    },
    async createGameInvitationNotification(invitedUserId, inviterId, gameType) {
        // Don't notify if user invited themselves
        if (invitedUserId === inviterId) {
            return;
        }
        const notification = await notification_repository_1.notificationRepository.create({
            userId: invitedUserId,
            type: 'game_invitation',
            title: `Game invitation: ${gameType}`,
            mentionId: inviterId, // Use mentionId to track who invited
        });
        const unreadCount = await notification_repository_1.notificationRepository.getUnreadCount(invitedUserId);
        socket_emitter_1.SocketEmitter.emitToUser(invitedUserId, 'notification:new', {
            notification,
            unreadCount,
        });
    },
};
