"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectMentions = detectMentions;
exports.validateTags = validateTags;
function detectMentions(content) {
    const mentionRegex = /@(\w+)/g;
    const matches = content.matchAll(mentionRegex);
    const mentions = [];
    for (const match of matches) {
        if (match[1]) {
            mentions.push(match[1].toLowerCase());
        }
    }
    return [...new Set(mentions)];
}
function validateTags(tags) {
    if (!Array.isArray(tags)) {
        return false;
    }
    return tags.every((tag) => {
        return typeof tag === 'string' && tag.trim().length > 0 && tag.length <= 50;
    });
}
