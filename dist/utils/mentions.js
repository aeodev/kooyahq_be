"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractMentions = extractMentions;
function extractMentions(content) {
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
