"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DayEndRepository = void 0;
const day_end_model_1 = require("./day-end.model");
class DayEndRepository {
    async create(userId, endedAt) {
        const doc = new day_end_model_1.DayEndModel({
            userId,
            endedAt,
        });
        await doc.save();
        return (0, day_end_model_1.toDayEnd)(doc);
    }
    async findByUserIdAndDate(userId, date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        const doc = await day_end_model_1.DayEndModel.findOne({
            userId,
            endedAt: { $gte: startOfDay, $lte: endOfDay },
        }).sort({ endedAt: -1 });
        return doc ? (0, day_end_model_1.toDayEnd)(doc) : null;
    }
    async getLastDayEndedAt(userId, date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        const doc = await day_end_model_1.DayEndModel.findOne({
            userId,
            endedAt: { $gte: startOfDay, $lte: endOfDay },
        }).sort({ endedAt: -1 });
        return doc ? doc.endedAt : null;
    }
}
exports.DayEndRepository = DayEndRepository;
