// Generic OpenF1 passthrough gateway.
//
// Previously this ignored the requested path and hardcoded every call to
// `${OPENF1_BASE}/races`. It now forwards the REAL sub-path + query string to
// OpenF1, caches each endpoint with an appropriate TTL, de-dupes concurrent
// identical requests, and serves stale data on upstream failure (via the cache
// layer) so the route never crashes.
const express = require('express');
const router = express.Router();
const openf1 = require('../services/openf1');
const T = require('../config/cacheTtls');

function ttlFor(path) {
  if (path.startsWith('/session_result')) return T.SESSION_RESULT;
  if (path.startsWith('/position')) return T.POSITION;
  if (path.startsWith('/sessions')) return T.SESSIONS_RAW;
  if (path.startsWith('/drivers')) return T.DRIVERS;
  return T.PASSTHROUGH_DEFAULT;
}

router.get('/*', async (req, res) => {
  const subPath = '/' + (req.params[0] || '');
  try {
    const data = await openf1.get(subPath, req.query, ttlFor(subPath));
    res.json(data);
  } catch (err) {
    const upstream = err.response?.status;
    console.error(`OpenF1 gateway error [${subPath}]:`, err.message);
    res.status(upstream === 404 ? 404 : 502).json({
      message: 'OpenF1 upstream error',
      path: subPath,
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

module.exports = router;
