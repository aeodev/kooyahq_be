"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeEntryRepository = void 0;
const time_entry_model_1 = require("./time-entry.model");
class TimeEntryRepository {
    async create(input) {
        const startTime = new Date();
        const doc = new time_entry_model_1.TimeEntryModel({
            ...input,
            duration: 0,
            startTime,
            isActive: true,
        });
        await doc.save();
        return (0, time_entry_model_1.toTimeEntry)(doc);
    }
    async findById(id) {
        const doc = await time_entry_model_1.TimeEntryModel.findById(id);
        return doc ? (0, time_entry_model_1.toTimeEntry)(doc) : undefined;
    }
    async findByUserId(userId) {
        const docs = await time_entry_model_1.TimeEntryModel.find({ userId }).sort({ createdAt: -1 });
        return docs.map(time_entry_model_1.toTimeEntry);
    }
    async findActiveByUserId(userId) {
        const doc = await time_entry_model_1.TimeEntryModel.findOne({ userId, isActive: true });
        return doc ? (0, time_entry_model_1.toTimeEntry)(doc) : undefined;
    }
    async findAllActive() {
        const docs = await time_entry_model_1.TimeEntryModel.find({ isActive: true }).sort({ createdAt: -1 });
        return docs.map(time_entry_model_1.toTimeEntry);
    }
    async findAllToday() {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        const docs = await time_entry_model_1.TimeEntryModel.find({
            createdAt: { $gte: startOfDay, $lte: endOfDay },
        }).sort({ createdAt: -1 });
        return docs.map(time_entry_model_1.toTimeEntry);
    }
    async update(id, userId, updates) {
        const doc = await time_entry_model_1.TimeEntryModel.findOne({ _id: id, userId });
        if (!doc) {
            throw new Error('Time entry not found or access denied');
        }
        if (updates.startTime) {
            doc.startTime = new Date(updates.startTime);
        }
        if (updates.endTime !== undefined) {
            doc.endTime = updates.endTime ? new Date(updates.endTime) : undefined;
        }
        if (updates.duration !== undefined) {
            doc.duration = updates.duration;
        }
        if (updates.isActive !== undefined) {
            doc.isActive = updates.isActive;
        }
        if (updates.isPaused !== undefined) {
            doc.isPaused = updates.isPaused;
        }
        if (updates.pausedDuration !== undefined) {
            doc.pausedDuration = updates.pausedDuration;
        }
        if (updates.lastPausedAt !== undefined) {
            doc.lastPausedAt = updates.lastPausedAt ? new Date(updates.lastPausedAt) : undefined;
        }
        if (updates.projects) {
            doc.projects = updates.projects;
        }
        if (updates.task) {
            doc.task = updates.task;
        }
        if (updates.status) {
            doc.status = updates.status;
        }
        await doc.save();
        return (0, time_entry_model_1.toTimeEntry)(doc);
    }
    async delete(id, userId) {
        const result = await time_entry_model_1.TimeEntryModel.deleteOne({ _id: id, userId });
        if (result.deletedCount === 0) {
            throw new Error('Time entry not found or access denied');
        }
    }
    async pauseActiveTimer(userId) {
        const doc = await time_entry_model_1.TimeEntryModel.findOne({ userId, isActive: true, isPaused: false });
        if (!doc) {
            return null;
        }
        const now = new Date();
        doc.isPaused = true;
        doc.lastPausedAt = now;
        await doc.save();
        return (0, time_entry_model_1.toTimeEntry)(doc);
    }
    async resumeActiveTimer(userId) {
        const doc = await time_entry_model_1.TimeEntryModel.findOne({ userId, isActive: true, isPaused: true });
        if (!doc || !doc.lastPausedAt) {
            return null;
        }
        const now = new Date();
        const pauseDurationMs = now.getTime() - doc.lastPausedAt.getTime();
        const pauseDurationMinutes = Math.floor(pauseDurationMs / 60000);
        doc.isPaused = false;
        doc.pausedDuration = (doc.pausedDuration || 0) + pauseDurationMinutes;
        doc.lastPausedAt = undefined;
        await doc.save();
        return (0, time_entry_model_1.toTimeEntry)(doc);
    }
    async stopActiveTimer(userId) {
        const doc = await time_entry_model_1.TimeEntryModel.findOne({ userId, isActive: true });
        if (!doc) {
            return null;
        }
        const endTime = new Date();
        const startTime = doc.startTime;
        // Calculate actual work duration (excluding paused time)
        let workDurationMs = endTime.getTime() - startTime.getTime();
        // If currently paused, add the current pause duration
        if (doc.isPaused && doc.lastPausedAt) {
            const currentPauseMs = endTime.getTime() - doc.lastPausedAt.getTime();
            doc.pausedDuration = (doc.pausedDuration || 0) + Math.floor(currentPauseMs / 60000);
        }
        // Subtract total paused time
        workDurationMs -= (doc.pausedDuration || 0) * 60000;
        const durationMinutes = Math.floor(workDurationMs / 60000);
        doc.isActive = false;
        doc.isPaused = false;
        doc.endTime = endTime;
        doc.duration = durationMinutes;
        doc.lastPausedAt = undefined;
        await doc.save();
        return (0, time_entry_model_1.toTimeEntry)(doc);
    }
    async stopAllActiveTimers(userId) {
        const docs = await time_entry_model_1.TimeEntryModel.find({ userId, isActive: true });
        const stopped = [];
        for (const doc of docs) {
            const endTime = new Date();
            const startTime = doc.startTime;
            let workDurationMs = endTime.getTime() - startTime.getTime();
            if (doc.isPaused && doc.lastPausedAt) {
                const currentPauseMs = endTime.getTime() - doc.lastPausedAt.getTime();
                doc.pausedDuration = (doc.pausedDuration || 0) + Math.floor(currentPauseMs / 60000);
            }
            workDurationMs -= (doc.pausedDuration || 0) * 60000;
            const durationMinutes = Math.floor(workDurationMs / 60000);
            doc.isActive = false;
            doc.isPaused = false;
            doc.endTime = endTime;
            doc.duration = durationMinutes;
            doc.lastPausedAt = undefined;
            await doc.save();
            stopped.push((0, time_entry_model_1.toTimeEntry)(doc));
        }
        return stopped;
    }
    async updateDuration(id, durationMinutes) {
        const doc = await time_entry_model_1.TimeEntryModel.findById(id);
        if (!doc) {
            throw new Error('Time entry not found');
        }
        doc.duration = durationMinutes;
        await doc.save();
        return (0, time_entry_model_1.toTimeEntry)(doc);
    }
    async findByDateRange(userId, startDate, endDate) {
        const query = {
            createdAt: { $gte: startDate, $lte: endDate },
            isActive: false, // Only completed entries for analytics
        };
        if (userId) {
            query.userId = userId;
        }
        const docs = await time_entry_model_1.TimeEntryModel.find(query).sort({ createdAt: -1 });
        return docs.map(time_entry_model_1.toTimeEntry);
    }
    async findByUserIdAndDateRange(userId, startDate, endDate) {
        const docs = await time_entry_model_1.TimeEntryModel.find({
            userId,
            createdAt: { $gte: startDate, $lte: endDate },
        }).sort({ createdAt: -1 });
        return docs.map(time_entry_model_1.toTimeEntry);
    }
}
exports.TimeEntryRepository = TimeEntryRepository;
