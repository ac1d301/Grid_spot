// Live F1 news via Google News RSS (key-free). Fetched server-side, parsed, and cached
// so the client can poll cheaply. No XML dependency — Google News RSS has a stable shape
// we parse with focused regexes.
const axios = require('axios');
const { cachedFetch } = require('./cache');
const T = require('../config/cacheTtls');

const UA = 'Mozilla/5.0 (compatible; GridSpot/1.0)';
const feedUrl = (q) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;

// Each category is a different Google News query window.
const QUERIES = {
  trending: 'formula 1 when:7d',
  latest: 'formula 1 when:2d',
  history: 'formula 1 when:120d',
};

function decode(s = '') {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function parse(xml) {
  return xml
    .split('<item>')
    .slice(1)
    .map((chunk) => {
      const get = (re) => (chunk.match(re) || [])[1] || '';
      let title = decode(get(/<title>([\s\S]*?)<\/title>/)).trim();
      const link = decode(get(/<link>([\s\S]*?)<\/link>/)).trim();
      const pubDate = get(/<pubDate>([\s\S]*?)<\/pubDate>/).trim();
      const source = decode(get(/<source[^>]*>([\s\S]*?)<\/source>/)).trim();
      // Google News appends " - Source" to titles; strip it when we have the source.
      if (source && title.endsWith(` - ${source}`)) title = title.slice(0, -(source.length + 3)).trim();
      let published = null;
      if (pubDate) {
        const d = new Date(pubDate);
        if (!Number.isNaN(d.getTime())) published = d.toISOString();
      }
      return { title, link, source: source || null, published };
    })
    .filter((x) => x.title && x.link);
}

async function getNews(category = 'trending', limit = 30) {
  const key = QUERIES[category] ? category : 'trending';
  const cap = Math.min(Math.max(parseInt(limit, 10) || 30, 1), 100);
  const items = await cachedFetch(`news:${key}`, T.NEWS, async () => {
    const res = await axios.get(feedUrl(QUERIES[key]), { timeout: 10000, headers: { 'User-Agent': UA } });
    return parse(res.data);
  });
  return { category: key, count: items.length, items: items.slice(0, cap) };
}

module.exports = { getNews };
