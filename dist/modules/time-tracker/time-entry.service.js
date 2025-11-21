"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeEntryService = void 0;
const time_entry_repository_1 = require("./time-entry.repository");
const time_entry_audit_repository_1 = require("./time-entry-audit.repository");
const day_end_repository_1 = require("./day-end.repository");
const user_repository_1 = require("../users/user.repository");
const http_error_1 = require("../../utils/http-error");
const socket_emitter_1 = require("../../utils/socket-emitter");
class TimeEntryService {
    timeEntryRepo = new time_entry_repository_1.TimeEntryRepository();
    auditRepo = new time_entry_audit_repository_1.TimeEntryAuditRepository();
    dayEndRepo = new day_end_repository_1.DayEndRepository();
    async logAudit(userId, action, entryId, metadata) {
        try {
            await this.auditRepo.create({
                userId,
                entryId,
                action: action,
                metadata,
            });
        }
        catch (error) {
            // Don't fail the main operation if audit logging fails
            console.error('Failed to log audit:', error);
        }
    }
    async startTimer(userId, input) {
        // Stop any existing active timer for this user
        await this.timeEntryRepo.stopActiveTimer(userId);
        const entry = await this.timeEntryRepo.create({
            userId,
            projects: input.projects,
            task: (input.task !== undefined && input.task !== null) ? String(input.task).trim() : '', // Ensure task is always a string, even if empty
            isOvertime: input.isOvertime ?? false,
        });
        await this.logAudit(userId, 'start_timer', entry.id, {
            projects: input.projects,
            task: input.task,
        });
        const publicEntry = await this.toPublicTimeEntry(entry, userId);
        // Emit socket event for real-time updates
        socket_emitter_1.SocketEmitter.emitTimeEntryUpdate(socket_emitter_1.TimeEntrySocketEvents.TIMER_STARTED, publicEntry, userId);
        return publicEntry;
    }
    async pauseTimer(userId) {
        const entry = await this.timeEntryRepo.pauseActiveTimer(userId);
        if (!entry) {
            return null;
        }
        await this.logAudit(userId, 'pause_timer', entry.id, {
            duration: entry.duration,
            pausedDuration: entry.pausedDuration,
        });
        const publicEntry = await this.toPublicTimeEntry(entry, userId);
        // Emit socket event for real-time updates
        socket_emitter_1.SocketEmitter.emitTimeEntryUpdate(socket_emitter_1.TimeEntrySocketEvents.TIMER_PAUSED, publicEntry, userId);
        return publicEntry;
    }
    async resumeTimer(userId) {
        const entry = await this.timeEntryRepo.resumeActiveTimer(userId);
        if (!entry) {
            return null;
        }
        await this.logAudit(userId, 'resume_timer', entry.id, {
            duration: entry.duration,
            pausedDuration: entry.pausedDuration,
        });
        const publicEntry = await this.toPublicTimeEntry(entry, userId);
        // Emit socket event for real-time updates
        socket_emitter_1.SocketEmitter.emitTimeEntryUpdate(socket_emitter_1.TimeEntrySocketEvents.TIMER_RESUMED, publicEntry, userId);
        return publicEntry;
    }
    async stopTimer(userId) {
        const entry = await this.timeEntryRepo.stopActiveTimer(userId);
        if (!entry) {
            return null;
        }
        await this.logAudit(userId, 'stop_timer', entry.id, {
            duration: entry.duration,
            projects: entry.projects,
            task: entry.task,
        });
        const publicEntry = await this.toPublicTimeEntry(entry, userId);
        // Emit socket event for real-time updates
        socket_emitter_1.SocketEmitter.emitTimeEntryUpdate(socket_emitter_1.TimeEntrySocketEvents.TIMER_STOPPED, publicEntry, userId);
        return publicEntry;
    }
    async endDay(userId) {
        const entries = await this.timeEntryRepo.stopAllActiveTimers(userId);
        const endedAt = new Date();
        await this.dayEndRepo.create(userId, endedAt);
        return Promise.all(entries.map(entry => this.toPublicTimeEntry(entry, userId)));
    }
    async getDayEndedAt(userId, date) {
        return await this.dayEndRepo.getLastDayEndedAt(userId, date);
    }
    async getUserEntries(userId) {
        const entries = await this.timeEntryRepo.findByUserId(userId);
        const user = await user_repository_1.userRepository.findById(userId);
        return entries.map((entry) => ({
            ...entry,
            userName: user?.name || 'Unknown',
            userEmail: user?.email || '',
            canEdit: true,
        }));
    }
    async getAllTodayEntries() {
        const entries = await this.timeEntryRepo.findAllToday();
        const userIds = [...new Set(entries.map(e => e.userId))];
        const users = await Promise.all(userIds.map(id => user_repository_1.userRepository.findById(id)));
        const userMap = new Map(users.filter(Boolean).map(u => [u.id, u]));
        return entries.map((entry) => {
            const user = userMap.get(entry.userId);
            return {
                ...entry,
                userName: user?.name || 'Unknown',
                userEmail: user?.email || '',
                canEdit: false, // Will be set by controller based on requesting user
            };
        });
    }
    async update(userId, entryId, updates) {
        const entry = await this.timeEntryRepo.findById(entryId);
        if (!entry) {
            throw new http_error_1.HttpError(404, 'Time entry not found');
        }
        if (entry.userId !== userId) {
            throw new http_error_1.HttpError(403, 'Access denied');
        }
        const oldValue = {
            projects: entry.projects,
            task: entry.task,
            duration: entry.duration,
        };
        const updated = await this.timeEntryRepo.update(entryId, userId, updates);
        await this.logAudit(userId, 'update_entry', entryId, {
            oldValue,
            newValue: {
                projects: updated.projects,
                task: updated.task,
                duration: updated.duration,
                ...updates,
            },
        });
        const publicEntry = await this.toPublicTimeEntry(updated, userId);
        // Emit socket event for real-time updates
        socket_emitter_1.SocketEmitter.emitTimeEntryUpdate(socket_emitter_1.TimeEntrySocketEvents.UPDATED, publicEntry, userId);
        return publicEntry;
    }
    async delete(userId, entryId) {
        const entry = await this.timeEntryRepo.findById(entryId);
        if (!entry) {
            throw new http_error_1.HttpError(404, 'Time entry not found');
        }
        if (entry.userId !== userId) {
            throw new http_error_1.HttpError(403, 'Access denied');
        }
        await this.logAudit(userId, 'delete_entry', entryId, {
            projects: entry.projects,
            task: entry.task,
            duration: entry.duration,
        });
        await this.timeEntryRepo.delete(entryId, userId);
        // Emit socket event for real-time updates
        socket_emitter_1.SocketEmitter.emitTimeEntryUpdate(socket_emitter_1.TimeEntrySocketEvents.DELETED, { id: entryId }, userId);
    }
    async logManualEntry(userId, input) {
        const startTime = input.startTime ? new Date(input.startTime) : new Date();
        const endTime = input.endTime ? new Date(input.endTime) : new Date();
        const entry = await this.timeEntryRepo.create({
            userId,
            projects: input.projects,
            task: input.task,
            isOvertime: input.isOvertime ?? false,
        });
        // Immediately update with manual duration
        const updated = await this.timeEntryRepo.update(entry.id, userId, {
            duration: input.duration,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            isActive: false,
        });
        await this.logAudit(userId, 'log_manual', updated.id, {
            projects: input.projects,
            task: input.task,
            duration: input.duration,
        });
        const publicEntry = await this.toPublicTimeEntry(updated, userId);
        // Emit socket event for real-time updates
        socket_emitter_1.SocketEmitter.emitTimeEntryUpdate(socket_emitter_1.TimeEntrySocketEvents.CREATED, publicEntry, userId);
        return publicEntry;
    }
    async getActiveTimer(userId) {
        const entry = await this.timeEntryRepo.findActiveByUserId(userId);
        if (!entry) {
            return null;
        }
        return this.toPublicTimeEntry(entry, userId);
    }
    async getAnalytics(userId, startDate, endDate) {
        const entries = await this.timeEntryRepo.findByDateRange(userId, startDate, endDate);
        const userIds = [...new Set(entries.map(e => e.userId))];
        const users = await Promise.all(userIds.map(id => user_repository_1.userRepository.findById(id)));
        const userMap = new Map(users.filter(Boolean).map(u => [u.id, u]));
        // Calculate totals
        const totalHours = entries.reduce((sum, e) => sum + e.duration, 0) / 60;
        const totalOvertimeEntries = entries.filter((e) => e.isOvertime).length;
        // Group by user
        const userMap2 = new Map();
        entries.forEach((entry) => {
            const user = userMap.get(entry.userId);
            const existing = userMap2.get(entry.userId) || {
                userId: entry.userId,
                userName: user?.name || 'Unknown',
                userEmail: user?.email || '',
                hours: 0,
                entries: 0,
                overtimeEntries: 0,
                overtimeHours: 0,
            };
            existing.hours += entry.duration;
            existing.entries += 1;
            if (entry.isOvertime) {
                existing.overtimeEntries += 1;
                existing.overtimeHours += entry.duration;
            }
            userMap2.set(entry.userId, existing);
        });
        // Group by project
        const projectMap = new Map();
        entries.forEach((entry) => {
            entry.projects.forEach((project) => {
                const existing = projectMap.get(project) || { hours: 0, contributors: new Set() };
                existing.hours += entry.duration;
                existing.contributors.add(entry.userId);
                projectMap.set(project, existing);
            });
        });
        // Group by day
        const dayMap = new Map();
        entries.forEach((entry) => {
            const dateKey = new Date(entry.createdAt).toISOString().split('T')[0];
            const existing = dayMap.get(dateKey) || { hours: 0, entries: 0 };
            existing.hours += entry.duration;
            existing.entries += 1;
            dayMap.set(dateKey, existing);
        });
        return {
            totalHours,
            totalEntries: entries.length,
            totalOvertimeEntries,
            byUser: Array.from(userMap2.entries())
                .map(([userId, u]) => ({ userId, ...u, hours: u.hours / 60, overtimeHours: u.overtimeHours / 60 }))
                .sort((a, b) => b.hours - a.hours),
            byProject: Array.from(projectMap.entries())
                .sort((a, b) => b[1].hours - a[1].hours)
                .map(([project, data]) => ({
                project,
                hours: data.hours / 60,
                contributors: data.contributors.size,
            })),
            byDay: Array.from(dayMap.entries())
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([date, data]) => ({
                date,
                hours: data.hours / 60,
                entries: data.entries,
            })),
        };
    }
    async getUserEntriesByDateRange(userId, startDate, endDate) {
        const entries = await this.timeEntryRepo.findByUserIdAndDateRange(userId, startDate, endDate);
        const user = await user_repository_1.userRepository.findById(userId);
        return entries.map((entry) => ({
            ...entry,
            userName: user?.name || 'Unknown',
            userEmail: user?.email || '',
            canEdit: true,
        }));
    }
    async toPublicTimeEntry(entry, requestingUserId) {
        const user = await user_repository_1.userRepository.findById(entry.userId);
        // Calculate current duration for active timers using server time
        let calculatedEntry = { ...entry };
        if (entry.isActive && entry.startTime) {
            const now = new Date();
            const start = new Date(entry.startTime);
            // Calculate elapsed time
            let elapsedMs = now.getTime() - start.getTime();
            // Subtract paused duration if any
            const pausedMs = entry.pausedDuration || 0;
            // If currently paused, add current pause time
            if (entry.isPaused && entry.lastPausedAt) {
                const currentPauseMs = now.getTime() - new Date(entry.lastPausedAt).getTime();
                elapsedMs -= (pausedMs + currentPauseMs);
            }
            else {
                elapsedMs -= pausedMs;
            }
            // Update duration in minutes (for display consistency)
            calculatedEntry.duration = Math.max(0, Math.floor(elapsedMs / 60000));
        }
        return {
            ...calculatedEntry,
            userName: user?.name || 'Unknown',
            userEmail: user?.email || '',
            canEdit: entry.userId === requestingUserId,
        };
    }
}
exports.TimeEntryService = TimeEntryService;
