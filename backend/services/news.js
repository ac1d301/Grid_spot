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

// Direct F1-site RSS feeds, used as a fallback. Google News RSS is frequently blocked or
// throttled from datacenter IPs (e.g. Render) even though it works from home connections;
// these publisher feeds are reachable from datacenters and parse with the same `parse()`.
// First non-empty feed wins.
const FALLBACK_FEEDS = [
  { url: 'https://www.motorsport.com/rss/f1/news/', source: 'Motorsport.com' },
  { url: 'https://www.autosport.com/rss/f1/news/', source: 'Autosport' },
  { url: 'https://www.the-race.com/feed/', source: 'The Race' },
  { url: 'https://www.racefans.net/feed/', source: 'RaceFans' },
  { url: 'https://feeds.bbci.co.uk/sport/formula1/rss.xml', source: 'BBC Sport' },
];

async function fetchFeed(url, timeout = 7000) {
  const res = await axios.get(url, {
    timeout,
    headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/xml, text/xml, */*' },
  });
  return parse(res.data);
}

async function getNews(category = 'trending', limit = 30) {
  const key = QUERIES[category] ? category : 'trending';
  const cap = Math.min(Math.max(parseInt(limit, 10) || 30, 1), 100);
  const items = await cachedFetch(`news:${key}`, T.NEWS, async () => {
    // Primary: Google News (best F1 filtering by recency window). Short timeout so a blocked
    // datacenter IP fails fast and we move on to the publisher feeds.
    try {
      const g = await fetchFeed(feedUrl(QUERIES[key]), 6000);
      if (g.length) return g;
    } catch {
      /* Google News unreachable from here — fall through to publisher feeds. */
    }
    for (const f of FALLBACK_FEEDS) {
      try {
        const feed = await fetchFeed(f.url);
        if (feed.length) return feed.map((it) => ({ ...it, source: it.source || f.source }));
      } catch {
        /* try the next source */
      }
    }
    return [];
  });
  return { category: key, count: items.length, items: items.slice(0, cap) };
}

module.exports = { getNews };
