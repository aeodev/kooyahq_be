"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.announcementRepository = void 0;
const announcement_model_1 = require("./announcement.model");
exports.announcementRepository = {
    async create(input) {
        const doc = await announcement_model_1.AnnouncementModel.create({
            title: input.title,
            content: input.content,
            authorId: input.authorId,
            isActive: input.isActive ?? true,
        });
        return (0, announcement_model_1.toAnnouncement)(doc);
    },
    async findAll(onlyActive = true) {
        const filter = {};
        if (onlyActive) {
            filter.isActive = true;
        }
        const docs = await announcement_model_1.AnnouncementModel.find(filter)
            .sort({ createdAt: -1 })
            .limit(50)
            .exec();
        return docs.map(announcement_model_1.toAnnouncement);
    },
    async findById(id) {
        const doc = await announcement_model_1.AnnouncementModel.findById(id).exec();
        return doc ? (0, announcement_model_1.toAnnouncement)(doc) : undefined;
    },
    async update(id, updates) {
        const doc = await announcement_model_1.AnnouncementModel.findByIdAndUpdate(id, updates, { new: true }).exec();
        return doc ? (0, announcement_model_1.toAnnouncement)(doc) : undefined;
    },
    async delete(id) {
        const result = await announcement_model_1.AnnouncementModel.deleteOne({ _id: id }).exec();
        return result.deletedCount > 0;
    },
};
