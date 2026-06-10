// OpenF1 API client. All calls go through the shared TTL cache AND a small concurrency
// limiter + retry, because OpenF1 rate-limits bursts: a Race Center tab fires ~7 widgets
// (each 1-3 OpenF1 calls) at once, which without throttling trips the limit and returns
// 429/timeout -> empty widgets. The limiter caps in-flight requests and spaces them out so
// we stay under the limit; retry recovers the occasional 429/5xx/timeout. Cache hits bypass
// the limiter entirely (they never reach the fetcher).
const axios = require('axios');
const { cachedFetch } = require('./cache');
const T = require('../config/cacheTtls');

const BASE = process.env.OPENF1_BASE || 'https://api.openf1.org/v1';
const http = axios.create({ baseURL: BASE, timeout: 12000 });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- concurrency limiter + spacing -----------------------------------------
const MAX_CONCURRENT = 3;
const MIN_SPACING_MS = 150; // >=150ms between request starts (≈ a few req/s, under OpenF1's limit)
let active = 0;
let lastStart = 0;
const queue = [];

function pump() {
  while (active < MAX_CONCURRENT && queue.length) runNext();
}
async function runNext() {
  const item = queue.shift();
  active += 1;
  const wait = Math.max(0, MIN_SPACING_MS - (Date.now() - lastStart));
  lastStart = Date.now() + wait; // reserve this slot so concurrent starts stay spaced
  if (wait) await sleep(wait);
  try {
    item.resolve(await item.task());
  } catch (err) {
    item.reject(err);
  } finally {
    active -= 1;
    pump();
  }
}
function schedule(task) {
  return new Promise((resolve, reject) => {
    queue.push({ task, resolve, reject });
    pump();
  });
}
// ---------------------------------------------------------------------------

// One throttled GET with retry on transient failures (429 / 503 / 5xx / timeout). 404 and
// other 4xx are NOT retried (genuine "no data" — e.g. a session with no team radio).
async function request(p, params) {
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await http.get(p, { params });
      return res.data;
    } catch (err) {
      lastErr = err;
      const status = err.response?.status;
      const timedOut = !status && (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT');
      const retriable = status === 429 || status === 503 || status === 502 || (status >= 500) || timedOut;
      if (!retriable) throw err;
      await sleep(400 * (attempt + 1) + Math.floor(Math.random() * 200));
    }
  }
  throw lastErr;
}

const keyFor = (path, params) =>
  `openf1:${path}?${new URLSearchParams(params || {}).toString()}`;

async function get(path, params = {}, ttl = T.PASSTHROUGH_DEFAULT) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return cachedFetch(keyFor(p, params), ttl, () => schedule(() => request(p, params)));
}

const getSessions = (year) => get('/sessions', { year }, T.SESSIONS_RAW);
const getDrivers = (query) => get('/drivers', query, T.DRIVERS); // { session_key } | { meeting_key }
const getSessionResult = (sessionKey) =>
  get('/session_result', { session_key: sessionKey }, T.SESSION_RESULT);

module.exports = { get, getSessions, getDrivers, getSessionResult, keyFor, BASE };
