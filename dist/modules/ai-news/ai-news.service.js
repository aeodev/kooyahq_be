"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchNewsFeeds = fetchNewsFeeds;
exports.fetchTweets = fetchTweets;
const RSS_FEEDS = {
    openai: 'https://openai.com/news/rss.xml',
    techcrunch: 'https://techcrunch.com/category/artificial-intelligence/feed/',
    'google-ai': 'https://blog.google/technology/ai/rss/',
};
const TWITTER_ACCOUNTS = {
    sama: 'sama',
    wangzjeff: 'wangzjeff',
    mattpocockuk: 'mattpocockuk',
    KaranVaidya6: 'KaranVaidya6',
    chetaslua: 'chetaslua',
    MaximeRivest: 'MaximeRivest',
};
async function fetchNewsFeeds() {
    const items = [];
    for (const [source, url] of Object.entries(RSS_FEEDS)) {
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                },
            });
            if (!response.ok)
                continue;
            const xml = await response.text();
            const parsed = parseRSS(xml, source);
            items.push(...parsed);
        }
        catch (error) {
            console.error(`Error fetching ${source}:`, error);
        }
    }
    return items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}
async function fetchTweets() {
    const items = [];
    for (const [handle, username] of Object.entries(TWITTER_ACCOUNTS)) {
        try {
            // Try RSS-Bridge format (free public instance)
            const rssBridgeUrl = `https://rss-bridge.herokuapp.com/?action=display&bridge=Twitter&u=${username}&format=Json`;
            const response = await fetch(rssBridgeUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                },
            });
            if (response.ok) {
                const data = (await response.json());
                if (data.items && Array.isArray(data.items)) {
                    const tweets = data.items.slice(0, 10).map((item) => ({
                        id: `tweet-${handle}-${Date.now()}-${Math.random()}`,
                        type: 'tweet',
                        title: item.title || '',
                        content: cleanTweetContent(item.content || item.title || ''),
                        author: extractAuthorName(item.title || item.content || ''),
                        authorHandle: username,
                        source: handle,
                        url: item.uri || `https://twitter.com/${username}`,
                        publishedAt: item.timestamp ? new Date(item.timestamp * 1000).toISOString() : new Date().toISOString(),
                        avatarUrl: undefined,
                        verified: true,
                    }));
                    items.push(...tweets);
                }
            }
        }
        catch (error) {
            console.error(`Error fetching tweets for ${handle}:`, error);
        }
    }
    return items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}
function parseRSS(xml, source) {
    const items = [];
    try {
        // Simple RSS parser using regex (lightweight approach)
        const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
        let match;
        while ((match = itemRegex.exec(xml)) !== null) {
            const itemXml = match[1];
            const titleMatch = itemXml.match(/<title[^>]*>(.*?)<\/title>/is);
            const linkMatch = itemXml.match(/<link[^>]*>(.*?)<\/link>/is);
            const pubDateMatch = itemXml.match(/<pubDate[^>]*>(.*?)<\/pubDate>/is);
            const descriptionMatch = itemXml.match(/<description[^>]*>(.*?)<\/description>/is);
            const imageMatch = itemXml.match(/<media:content[^>]*url="([^"]*)"[^>]*>/i) ||
                itemXml.match(/<enclosure[^>]*url="([^"]*)"[^>]*>/i);
            const title = titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : '';
            const link = linkMatch ? linkMatch[1].trim() : '';
            const pubDate = pubDateMatch ? pubDateMatch[1].trim() : new Date().toISOString();
            const description = descriptionMatch ? cleanDescription(decodeHtmlEntities(descriptionMatch[1])) : '';
            const imageUrl = imageMatch ? imageMatch[1] : undefined;
            if (title && link) {
                items.push({
                    id: `news-${source}-${Date.now()}-${Math.random()}`,
                    type: 'news',
                    title,
                    content: description,
                    author: getSourceAuthor(source),
                    source,
                    url: link,
                    publishedAt: parseDate(pubDate),
                    imageUrl,
                });
            }
        }
    }
    catch (error) {
        console.error('Error parsing RSS:', error);
    }
    return items;
}
function cleanDescription(html) {
    // Remove HTML tags and decode entities
    return html
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 300);
}
function cleanTweetContent(content) {
    return content
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
function stripCDATA(str) {
    // Remove CDATA wrapper: <![CDATA[...]]>
    return str.replace(/<!\[CDATA\[(.*?)\]\]>/gis, '$1');
}
function decodeHtmlEntities(str) {
    // First strip CDATA if present
    let cleaned = stripCDATA(str);
    // Decode numeric HTML entities like &#8217;
    cleaned = cleaned.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec));
    // Decode hex entities like &#x27;
    cleaned = cleaned.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    // Then decode named HTML entities
    return cleaned
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .trim();
}
function extractAuthorName(text) {
    const match = text.match(/^([^:]+):/);
    return match ? match[1].trim() : '';
}
function getSourceAuthor(source) {
    const authors = {
        openai: 'OpenAI',
        techcrunch: 'TechCrunch',
        'google-ai': 'Google AI',
    };
    return authors[source] || source;
}
function parseDate(dateStr) {
    try {
        return new Date(dateStr).toISOString();
    }
    catch {
        return new Date().toISOString();
    }
}
