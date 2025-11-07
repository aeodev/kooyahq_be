"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeEntryAuditRepository = void 0;
const time_entry_audit_model_1 = require("./time-entry-audit.model");
class TimeEntryAuditRepository {
    async create(input) {
        const doc = new time_entry_audit_model_1.TimeEntryAuditModel({
            ...input,
            timestamp: new Date(),
        });
        await doc.save();
        return (0, time_entry_audit_model_1.toAuditLog)(doc);
    }
    async findByUserId(userId, startDate, endDate) {
        const query = { userId };
        if (startDate || endDate) {
            const timestampQuery = {};
            if (startDate) {
                timestampQuery.$gte = startDate;
            }
            if (endDate) {
                timestampQuery.$lte = endDate;
            }
            query.timestamp = timestampQuery;
        }
        const docs = await time_entry_audit_model_1.TimeEntryAuditModel.find(query).sort({ timestamp: -1 });
        return docs.map(time_entry_audit_model_1.toAuditLog);
    }
    async findByEntryId(entryId) {
        const docs = await time_entry_audit_model_1.TimeEntryAuditModel.find({ entryId }).sort({ timestamp: -1 });
        return docs.map(time_entry_audit_model_1.toAuditLog);
    }
    async findByDateRange(startDate, endDate) {
        const docs = await time_entry_audit_model_1.TimeEntryAuditModel.find({
            timestamp: { $gte: startDate, $lte: endDate },
        }).sort({ timestamp: -1 });
        return docs.map(time_entry_audit_model_1.toAuditLog);
    }
    async findByAction(action, startDate, endDate) {
        const query = { action };
        if (startDate || endDate) {
            const timestampQuery = {};
            if (startDate) {
                timestampQuery.$gte = startDate;
            }
            if (endDate) {
                timestampQuery.$lte = endDate;
            }
            query.timestamp = timestampQuery;
        }
        const docs = await time_entry_audit_model_1.TimeEntryAuditModel.find(query).sort({ timestamp: -1 });
        return docs.map(time_entry_audit_model_1.toAuditLog);
    }
}
exports.TimeEntryAuditRepository = TimeEntryAuditRepository;
