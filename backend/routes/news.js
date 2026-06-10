// Live F1 news: /api/news?category=trending|latest|history&limit=
const express = require('express');
const router = express.Router();
const { getNews } = require('../services/news');

router.get('/news', async (req, res) => {
  try {
    res.json(await getNews(req.query.category, req.query.limit));
  } catch (e) {
    res.status(502).json({
      message: 'Failed to load news',
      error: process.env.NODE_ENV === 'development' ? e.message : undefined,
    });
  }
});

module.exports = router;
