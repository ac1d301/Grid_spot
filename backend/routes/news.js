// Live F1 news: /api/news?category=trending|latest|history&limit=
const express = require('express');
const router = express.Router();
const { getNews } = require('../services/news');

router.get('/news', async (req, res) => {
  try {
    res.json(await getNews(req.query.category, req.query.limit));
  } catch (e) {
    // Google News RSS is often slow or blocked from datacenter IPs (e.g. Render). Degrade
    // gracefully: return an empty feed (200) so the home page shows a clean "no news" state
    // instead of erroring. Mark it short-cacheable so a CDN doesn't pin the empty result.
    if (process.env.NODE_ENV === 'development') console.warn('news failed:', e.message);
    res.set('Cache-Control', 'public, max-age=30');
    res.json({ category: req.query.category || 'trending', count: 0, items: [], degraded: true });
  }
});

module.exports = router;
