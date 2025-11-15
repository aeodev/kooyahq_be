"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllTodayEntries = getAllTodayEntries;
exports.getMyEntries = getMyEntries;
exports.getActiveTimer = getActiveTimer;
exports.startTimer = startTimer;
exports.getDayEndedStatus = getDayEndedStatus;
exports.pauseTimer = pauseTimer;
exports.resumeTimer = resumeTimer;
exports.stopTimer = stopTimer;
exports.endDay = endDay;
exports.logManualEntry = logManualEntry;
exports.updateEntry = updateEntry;
exports.deleteEntry = deleteEntry;
exports.getAnalytics = getAnalytics;
exports.getMyEntriesByDateRange = getMyEntriesByDateRange;
const time_entry_service_1 = require("./time-entry.service");
const service = new time_entry_service_1.TimeEntryService();
async function getAllTodayEntries(req, res) {
    const entries = await service.getAllTodayEntries();
    const requestingUserId = req.user.id;
    // Set canEdit for each entry
    const entriesWithEdit = entries.map(entry => ({
        ...entry,
        canEdit: entry.userId === requestingUserId,
    }));
    res.json({ status: 'success', data: entriesWithEdit });
}
async function getMyEntries(req, res) {
    const userId = req.user.id;
    const entries = await service.getUserEntries(userId);
    res.json({ status: 'success', data: entries });
}
async function getActiveTimer(req, res) {
    const userId = req.user.id;
    const timer = await service.getActiveTimer(userId);
    if (!timer) {
        return res.json({ status: 'success', data: null });
    }
    res.json({ status: 'success', data: timer });
}
async function startTimer(req, res) {
    const userId = req.user.id;
    const input = req.body;
    if (!input.projects || !Array.isArray(input.projects) || input.projects.length === 0) {
        return res.status(400).json({ status: 'error', message: 'Projects array is required' });
    }
    // Task is optional - allow empty string
    const entry = await service.startTimer(userId, input);
    res.json({ status: 'success', data: entry });
}
async function getDayEndedStatus(req, res) {
    const userId = req.user.id;
    const today = new Date();
    const dayEndedAt = await service.getDayEndedAt(userId, today);
    res.json({
        status: 'success',
        data: {
            dayEnded: dayEndedAt !== null,
            endedAt: dayEndedAt?.toISOString() || null
        }
    });
}
async function pauseTimer(req, res) {
    const userId = req.user.id;
    const entry = await service.pauseTimer(userId);
    if (!entry) {
        return res.status(404).json({ status: 'error', message: 'No active timer found' });
    }
    res.json({ status: 'success', data: entry });
}
async function resumeTimer(req, res) {
    const userId = req.user.id;
    const entry = await service.resumeTimer(userId);
    if (!entry) {
        return res.status(404).json({ status: 'error', message: 'No paused timer found' });
    }
    res.json({ status: 'success', data: entry });
}
async function stopTimer(req, res) {
    const userId = req.user.id;
    const entry = await service.stopTimer(userId);
    if (!entry) {
        return res.status(404).json({ status: 'error', message: 'No active timer found' });
    }
    res.json({ status: 'success', data: entry });
}
async function endDay(req, res) {
    const userId = req.user.id;
    const entries = await service.endDay(userId);
    res.json({ status: 'success', data: entries, message: 'All timers stopped for the day' });
}
async function logManualEntry(req, res) {
    const userId = req.user.id;
    const input = req.body;
    if (!input.projects || !Array.isArray(input.projects) || input.projects.length === 0) {
        return res.status(400).json({ status: 'error', message: 'Projects array is required' });
    }
    if (!input.task || !input.task.trim()) {
        return res.status(400).json({ status: 'error', message: 'Task description is required' });
    }
    if (!input.duration || input.duration <= 0) {
        return res.status(400).json({ status: 'error', message: 'Duration must be greater than 0' });
    }
    const entry = await service.logManualEntry(userId, input);
    res.json({ status: 'success', data: entry });
}
async function updateEntry(req, res) {
    const userId = req.user.id;
    const entryId = req.params.id;
    const updates = req.body;
    const entry = await service.update(userId, entryId, updates);
    res.json({ status: 'success', data: entry });
}
async function deleteEntry(req, res) {
    const userId = req.user.id;
    const entryId = req.params.id;
    await service.delete(userId, entryId);
    res.json({ status: 'success', message: 'Time entry deleted' });
}
async function getAnalytics(req, res) {
    const userId = req.query.userId === 'me' ? req.user.id : req.query.userId || null;
    let startDate = req.query.startDate ? new Date(req.query.startDate) : new Date();
    let endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
    // Default to last 15 days if no dates provided
    if (!req.query.startDate) {
        startDate.setDate(startDate.getDate() - 15);
        startDate.setHours(0, 0, 0, 0);
    }
    else {
        // Normalize provided startDate to beginning of day
        startDate.setHours(0, 0, 0, 0);
    }
    if (!req.query.endDate) {
        endDate.setHours(23, 59, 59, 999);
    }
    else {
        // Normalize provided endDate to end of day
        endDate.setHours(23, 59, 59, 999);
    }
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ status: 'error', message: 'Invalid date format' });
    }
    if (startDate > endDate) {
        return res.status(400).json({ status: 'error', message: 'Start date must be before end date' });
    }
    const analytics = await service.getAnalytics(userId, startDate, endDate);
    res.json({ status: 'success', data: analytics });
}
async function getMyEntriesByDateRange(req, res) {
    const userId = req.user.id;
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date();
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
    // Default to today if no dates provided
    if (!req.query.startDate) {
        startDate.setHours(0, 0, 0, 0);
    }
    if (!req.query.endDate) {
        endDate.setHours(23, 59, 59, 999);
    }
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ status: 'error', message: 'Invalid date format' });
    }
    if (startDate > endDate) {
        return res.status(400).json({ status: 'error', message: 'Start date must be before end date' });
    }
    const entries = await service.getUserEntriesByDateRange(userId, startDate, endDate);
    res.json({ status: 'success', data: entries });
}
