"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeEntryAuditModel = void 0;
exports.toAuditLog = toAuditLog;
const mongoose_1 = require("mongoose");
const auditSchema = new mongoose_1.Schema({
    userId: {
        type: String,
        required: true,
        index: true,
    },
    entryId: {
        type: String,
        index: true,
    },
    action: {
        type: String,
        enum: ['start_timer', 'pause_timer', 'resume_timer', 'stop_timer', 'create_entry', 'update_entry', 'delete_entry', 'log_manual'],
        required: true,
        index: true,
    },
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
        default: {},
    },
    timestamp: {
        type: Date,
        required: true,
        default: Date.now,
        index: true,
    },
}, {
    timestamps: true,
});
// Compound index for date range queries
auditSchema.index({ userId: 1, timestamp: -1 });
auditSchema.index({ timestamp: -1 });
exports.TimeEntryAuditModel = mongoose_1.models.TimeEntryAudit ?? (0, mongoose_1.model)('TimeEntryAudit', auditSchema);
function toAuditLog(doc) {
    return {
        id: doc.id,
        userId: doc.userId,
        entryId: doc.entryId,
        action: doc.action,
        metadata: doc.metadata || {},
        timestamp: doc.timestamp.toISOString(),
        createdAt: doc.createdAt?.toISOString() || doc.timestamp.toISOString(),
        updatedAt: doc.updatedAt?.toISOString() || doc.timestamp.toISOString(),
    };
}
