// Per-session data endpoints: /api/session/:sessionKey/*
const express = require('express');
const router = express.Router();
const session = require('../services/session');
const telemetry = require('../services/telemetry');
const { resolveSession } = require('../services/sessionMeta');

const fail = (res, code, msg, err) =>
  res.status(code).json({ message: msg, error: process.env.NODE_ENV === 'development' ? err?.message : undefined });

// Status-aware HTTP caching: a completed session's data is immutable (cache hard); while a
// session is live/upcoming it changes every few seconds (short cache so polling still works
// and a CDN can't fan out one client's live snapshot). `live` is never cached.
function setSessionCache(res, view, status) {
  if (view === 'live') return res.set('Cache-Control', 'no-store');
  if (status === 'completed') return res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
  res.set('Cache-Control', 'public, max-age=15'); // live/upcoming/unknown
}

const parseDrivers = (q) =>
  q ? String(q).split(',').map((s) => parseInt(s, 10)).filter(Number.isInteger) : null;

// Cheap guard: reject non-numeric session keys before any upstream call.
router.use('/session/:sessionKey', (req, res, next) => {
  if (!/^\d+$/.test(req.params.sessionKey)) return fail(res, 400, 'sessionKey must be numeric', null);
  next();
});

const views = {
  results: (k) => session.results(k),
  laps: (k, q) => session.laps(k, { drivers: parseDrivers(q.drivers), includeRaw: q.raw === '1' }),
  qualifying: (k) => session.qualifying(k),
  strategy: (k) => session.strategy(k),
  sectors: (k) => session.sectors(k),
  weather: (k, q) => session.weather(k, { points: Math.min(parseInt(q.points, 10) || 60, 200) }),
  racecontrol: (k) => session.raceControl(k),
  radio: (k) => session.radio(k),
  live: (k) => session.live(k),
};

for (const [name, fn] of Object.entries(views)) {
  router.get(`/session/:sessionKey/${name}`, async (req, res) => {
    try {
      const data = await fn(req.params.sessionKey, req.query);
      const meta = await resolveSession(req.params.sessionKey).catch(() => null); // cached, cheap
      setSessionCache(res, name, meta?.status);
      res.json(data);
    } catch (e) {
      fail(res, e.response?.status === 404 ? 404 : 502, `Failed: session ${name}`, e);
    }
  });
}

// Telemetry (opt-in, capped, windowed)
router.get('/session/:sessionKey/telemetry/lap', async (req, res) => {
  const driver = parseInt(req.query.driver, 10);
  const lap = parseInt(req.query.lap, 10);
  if (!Number.isInteger(driver) || !Number.isInteger(lap)) {
    return fail(res, 400, 'driver and lap are required integers', null);
  }
  try {
    const data = await telemetry.lapTelemetry(req.params.sessionKey, driver, lap, {
      points: Math.min(parseInt(req.query.points, 10) || 300, 400),
    });
    res.set('Cache-Control', 'public, max-age=21600, stale-while-revalidate=86400'); // a lap's telemetry is immutable
    res.json(data);
  } catch (e) {
    fail(res, 502, 'Failed: lap telemetry', e);
  }
});

router.get('/session/:sessionKey/trackmap', async (req, res) => {
  try {
    const data = await telemetry.trackSnapshot(req.params.sessionKey, req.query.at);
    // A specific historical snapshot (?at=) is immutable; the live map (no ?at) polls ~4s.
    res.set('Cache-Control', req.query.at ? 'public, max-age=3600' : 'no-store');
    res.json(data);
  } catch (e) {
    fail(res, 502, 'Failed: trackmap', e);
  }
});

module.exports = router;
