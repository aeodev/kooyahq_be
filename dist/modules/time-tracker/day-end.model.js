"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DayEndModel = void 0;
exports.toDayEnd = toDayEnd;
const mongoose_1 = require("mongoose");
const dayEndSchema = new mongoose_1.Schema({
    userId: {
        type: String,
        required: true,
        index: true,
    },
    endedAt: {
        type: Date,
        required: true,
        index: true,
    },
}, {
    timestamps: true,
});
exports.DayEndModel = mongoose_1.models.DayEnd ?? (0, mongoose_1.model)('DayEnd', dayEndSchema);
function toDayEnd(doc) {
    return {
        id: doc.id,
        userId: doc.userId,
        endedAt: doc.endedAt.toISOString(),
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
    };
}
