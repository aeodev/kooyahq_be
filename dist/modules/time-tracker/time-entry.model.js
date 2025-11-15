"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeEntryModel = void 0;
exports.toTimeEntry = toTimeEntry;
const mongoose_1 = require("mongoose");
const timeEntrySchema = new mongoose_1.Schema({
    userId: {
        type: String,
        required: true,
        index: true,
    },
    projects: {
        type: [String],
        required: true,
        default: [],
    },
    task: {
        type: String,
        required: false, // Allow empty strings - we'll always provide a value (even if empty)
        trim: true,
        default: '', // Default to empty string
    },
    duration: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
    },
    startTime: {
        type: Date,
        required: true,
    },
    endTime: {
        type: Date,
    },
    isActive: {
        type: Boolean,
        default: false,
        index: true,
    },
    isPaused: {
        type: Boolean,
        default: false,
    },
    pausedDuration: {
        type: Number,
        default: 0,
        min: 0,
    },
    lastPausedAt: {
        type: Date,
    },
    isOvertime: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
});
exports.TimeEntryModel = mongoose_1.models.TimeEntry ?? (0, mongoose_1.model)('TimeEntry', timeEntrySchema);
function toTimeEntry(doc) {
    return {
        id: doc.id,
        userId: doc.userId,
        projects: doc.projects || [],
        task: doc.task,
        duration: doc.duration,
        startTime: doc.startTime?.toISOString() || null,
        endTime: doc.endTime?.toISOString() || null,
        isActive: doc.isActive ?? false,
        isPaused: doc.isPaused ?? false,
        pausedDuration: doc.pausedDuration ?? 0,
        lastPausedAt: doc.lastPausedAt?.toISOString() || null,
        isOvertime: doc.isOvertime ?? false,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
    };
}
