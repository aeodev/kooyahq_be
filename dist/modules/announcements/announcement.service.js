"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.announcementService = void 0;
const announcement_repository_1 = require("./announcement.repository");
const user_repository_1 = require("../users/user.repository");
exports.announcementService = {
    async create(input) {
        const announcement = await announcement_repository_1.announcementRepository.create(input);
        const author = await user_repository_1.userRepository.findById(input.authorId);
        if (!author) {
            throw new Error('Author not found');
        }
        return {
            ...announcement,
            author: {
                id: author.id,
                name: author.name,
                email: author.email,
            },
        };
    },
    async findAll(onlyActive = true) {
        const announcements = await announcement_repository_1.announcementRepository.findAll(onlyActive);
        const authorIds = [...new Set(announcements.map((a) => a.authorId))];
        const authors = await Promise.all(authorIds.map(async (id) => {
            const user = await user_repository_1.userRepository.findById(id);
            return user ? { id: user.id, name: user.name, email: user.email } : null;
        }));
        const authorMap = new Map(authors.filter(Boolean).map((a) => [a.id, a]));
        return announcements.map((announcement) => ({
            ...announcement,
            author: authorMap.get(announcement.authorId) || {
                id: announcement.authorId,
                name: 'Unknown',
                email: '',
            },
        }));
    },
    async findById(id) {
        const announcement = await announcement_repository_1.announcementRepository.findById(id);
        if (!announcement) {
            return undefined;
        }
        const author = await user_repository_1.userRepository.findById(announcement.authorId);
        if (!author) {
            return undefined;
        }
        return {
            ...announcement,
            author: {
                id: author.id,
                name: author.name,
                email: author.email,
            },
        };
    },
    async update(id, updates) {
        const announcement = await announcement_repository_1.announcementRepository.update(id, updates);
        if (!announcement) {
            return undefined;
        }
        const author = await user_repository_1.userRepository.findById(announcement.authorId);
        if (!author) {
            return undefined;
        }
        return {
            ...announcement,
            author: {
                id: author.id,
                name: author.name,
                email: author.email,
            },
        };
    },
    async delete(id) {
        return announcement_repository_1.announcementRepository.delete(id);
    },
};
