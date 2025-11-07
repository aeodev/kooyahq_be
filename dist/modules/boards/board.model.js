"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BoardModel = void 0;
exports.toBoard = toBoard;
const mongoose_1 = require("mongoose");
const boardSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    type: {
        type: String,
        required: true,
        enum: ['kanban', 'sprint'],
    },
    ownerId: {
        type: String,
        required: true,
    },
    memberIds: {
        type: [String],
        default: [],
    },
    columns: {
        type: [String],
        required: true,
    },
    columnLimits: {
        type: Map,
        of: Number,
        default: {},
    },
    sprintStartDate: {
        type: Date,
    },
    sprintEndDate: {
        type: Date,
    },
    sprintGoal: {
        type: String,
        trim: true,
    },
}, {
    timestamps: true,
});
exports.BoardModel = mongoose_1.models.Board ?? (0, mongoose_1.model)('Board', boardSchema);
function toBoard(doc) {
    let columnLimits = undefined;
    if (doc.columnLimits && doc.columnLimits instanceof Map) {
        columnLimits = {};
        for (const [key, value] of doc.columnLimits.entries()) {
            columnLimits[key] = Number(value);
        }
    }
    return {
        id: doc.id,
        name: doc.name,
        type: doc.type,
        ownerId: doc.ownerId,
        memberIds: doc.memberIds || [],
        columns: doc.columns,
        columnLimits,
        sprintStartDate: doc.sprintStartDate?.toISOString(),
        sprintEndDate: doc.sprintEndDate?.toISOString(),
        sprintGoal: doc.sprintGoal,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
    };
}
