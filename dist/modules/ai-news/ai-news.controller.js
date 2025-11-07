"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAINews = getAINews;
const ai_news_service_1 = require("./ai-news.service");
const http_error_1 = require("../../utils/http-error");
async function getAINews(req, res) {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const [newsItems, tweets] = await Promise.all([
            (0, ai_news_service_1.fetchNewsFeeds)(),
            (0, ai_news_service_1.fetchTweets)(),
        ]);
        const allItems = [...newsItems, ...tweets].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
        const paginatedItems = allItems.slice(offset, offset + limit);
        const hasMore = offset + limit < allItems.length;
        res.json({
            status: 'success',
            data: paginatedItems,
            hasMore,
            total: allItems.length,
        });
    }
    catch (error) {
        console.error('Error fetching AI news:', error);
        throw new http_error_1.HttpError(500, 'Failed to fetch AI news');
    }
}
