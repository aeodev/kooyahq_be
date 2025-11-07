"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = void 0;
const notification_repository_1 = require("./notification.repository");
const user_service_1 = require("../users/user.service");
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
        await notification_repository_1.notificationRepository.create({
            userId: postAuthorId,
            type: 'comment',
            postId,
            commentId,
        });
    },
    async createReactionNotification(postAuthorId, reactionAuthorId, postId, reactionId) {
        // Don't notify if user reacted to their own post
        if (postAuthorId === reactionAuthorId) {
            return;
        }
        await notification_repository_1.notificationRepository.create({
            userId: postAuthorId,
            type: 'reaction',
            postId,
            reactionId,
        });
    },
    async createMentionNotification(mentionedUserIds, mentionerId, postId, commentId) {
        // Don't notify if user mentioned themselves
        const filteredUserIds = mentionedUserIds.filter((id) => id !== mentionerId);
        await Promise.all(filteredUserIds.map((userId) => notification_repository_1.notificationRepository.create({
            userId,
            type: 'mention',
            postId,
            commentId,
            mentionId: mentionerId,
        })));
    },
    async findByUserId(userId, unreadOnly) {
        const notifications = await notification_repository_1.notificationRepository.findByUserId(userId, unreadOnly);
        // Get actor info for mentions, card_comment, card_assigned, and board_member_added
        const actorIds = [...new Set(notifications
                .filter((n) => n.mentionId && (n.type === 'mention' || n.type === 'card_comment' || n.type === 'card_assigned' || n.type === 'board_member_added'))
                .map((n) => n.mentionId))];
        const actors = await Promise.all(actorIds.map(async (id) => {
            const actor = await user_service_1.userService.getPublicProfile(id);
            return { id, actor };
        }));
        const actorMap = new Map(actors.filter((a) => a.actor).map((a) => [a.id, a.actor]));
        return notifications.map((notification) => {
            const notificationWithData = { ...notification };
            if (notification.mentionId && (notification.type === 'mention' || notification.type === 'card_comment' || notification.type === 'card_assigned' || notification.type === 'board_member_added')) {
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
        await Promise.all(users.map((user) => notification_repository_1.notificationRepository.create({
            userId: user.id,
            type: 'system',
            title,
        })));
    },
    async createCardAssignmentNotification(assigneeId, cardId, assignedById) {
        // Don't notify if user assigned themselves
        if (assigneeId === assignedById) {
            return;
        }
        await notification_repository_1.notificationRepository.create({
            userId: assigneeId,
            type: 'card_assigned',
            cardId,
            mentionId: assignedById, // Use mentionId to track who assigned
        });
    },
    async createCardCommentNotification(cardId, commenterId, commentId, cardAssigneeId, cardBoardOwnerId) {
        const notifications = [];
        // Notify card assignee if exists and not the commenter
        if (cardAssigneeId && cardAssigneeId !== commenterId) {
            notifications.push(notification_repository_1.notificationRepository.create({
                userId: cardAssigneeId,
                type: 'card_comment',
                cardId,
                commentId,
                mentionId: commenterId, // Use mentionId to track who commented
            }));
        }
        // Notify board owner (card creator) if exists and not the commenter
        if (cardBoardOwnerId && cardBoardOwnerId !== commenterId && cardBoardOwnerId !== cardAssigneeId) {
            notifications.push(notification_repository_1.notificationRepository.create({
                userId: cardBoardOwnerId,
                type: 'card_comment',
                cardId,
                commentId,
                mentionId: commenterId,
            }));
        }
        await Promise.all(notifications);
    },
    async createBoardMemberNotification(userId, boardId, addedById) {
        // Don't notify if user added themselves
        if (userId === addedById) {
            return;
        }
        await notification_repository_1.notificationRepository.create({
            userId,
            type: 'board_member_added',
            boardId,
            mentionId: addedById, // Use mentionId to track who added them
        });
    },
};
