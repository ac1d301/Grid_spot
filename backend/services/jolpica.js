// Jolpica-F1 client (the community successor to the Ergast API). Source of truth
// for official championship standings and career totals — data OpenF1 does not
// expose. It is rate-limited, so every call is cached with a long TTL and benefits
// from the cache layer's stale-while-error behaviour.
const axios = require('axios');
const { cachedFetch } = require('./cache');
const T = require('../config/cacheTtls');

const BASE = process.env.JOLPICA_BASE || 'https://api.jolpi.ca/ergast/f1';
const http = axios.create({
  baseURL: BASE,
  timeout: 12000, // a bit generous: datacenter -> Jolpica latency is higher than from home
  headers: { Accept: 'application/json' },
});

// Global request throttle. Jolpica rate-limits at ~4 req/s; bursting past it returns
// 429s that would silently zero out career stats. We serialize all UPSTREAM calls with
// >=260ms spacing. Cache hits bypass this entirely (they never reach the fetcher).
//
// PRIORITY: on-demand requests (e.g. a user clicking a driver profile) are HIGH priority and
// jump ahead of the background cache-warmer's LOW-priority career sweep. Without this, a
// profile's ~8 calls queue behind the warmer's ~80 calls and the client times out.
//
// SPACING: Jolpica 429s above ~3 req/s (260ms spacing measurably tripped it, forcing long
// retry backoffs that stalled the whole queue). 400ms (~2.5 req/s) stays under the limit.
const MIN_SPACING_MS = 400;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let lastAt = 0;
let running = false;
const highQ = [];
const lowQ = [];

function schedule(task, { priority = 'high' } = {}) {
  return new Promise((resolve, reject) => {
    (priority === 'low' ? lowQ : highQ).push({ task, resolve, reject });
    pump();
  });
}
async function pump() {
  if (running) return;
  running = true;
  try {
    while (highQ.length || lowQ.length) {
      const item = highQ.shift() || lowQ.shift(); // high priority always runs first
      const wait = Math.max(0, MIN_SPACING_MS - (Date.now() - lastAt));
      if (wait) await sleep(wait);
      lastAt = Date.now();
      try {
        item.resolve(await item.task());
      } catch (e) {
        item.reject(e);
      }
    }
  } finally {
    running = false;
  }
}

// path is without the trailing ".json" (added here). limit=100 covers a full grid.
// Retries up to twice on 429/503 with backoff so a cold sweep that grazes the rate
// limit recovers instead of failing (and caching zeros).
function getJson(path, ttl = T.STANDINGS, opts = {}) {
  return cachedFetch(`jolpica:${path}`, ttl, async () => {
    // One throttled attempt. The retry BACKOFF happens OUTSIDE schedule() so a retrying call
    // doesn't hold the single serialized queue slot (which would block higher-priority
    // on-demand requests behind it); each retry simply re-queues by priority.
    const attemptOnce = () =>
      schedule(() => http.get(`${path}.json`, { params: { limit: 100 } }).then((r) => r.data), {
        priority: opts.priority,
      });
    let lastErr;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await attemptOnce();
      } catch (err) {
        lastErr = err;
        const status = err.response?.status;
        // Retry rate-limits, transient 5xx AND network timeouts (common from a datacenter on a
        // cold cache) — otherwise a single slow Jolpica call would 502 the whole endpoint.
        const timedOut = !status && (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT');
        if (status !== 429 && status !== 503 && !(status >= 500) && !timedOut) throw err;
        await sleep(800 * (attempt + 1));
      }
    }
    throw lastErr;
  });
}

async function driverStandings(year) {
  const data = await getJson(`/${year}/driverStandings`, T.STANDINGS);
  return data?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings || [];
}

async function constructorStandings(year) {
  const data = await getJson(`/${year}/constructorStandings`, T.STANDINGS);
  return data?.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings || [];
}

async function seasonDrivers(year) {
  const data = await getJson(`/${year}/drivers`, T.DRIVERS);
  return data?.MRData?.DriverTable?.Drivers || [];
}

// Career totals via Ergast "finishing position" filters. Each is a tiny response
// (we only read MRData.total) and is cached for 12h. 4 upstream calls per driver:
// wins = results/1; podiums = results/1 + results/2 + results/3; poles = qualifying/1.
async function careerStats(driverId, opts = {}) {
  const total = (d) => parseInt(d?.MRData?.total, 10) || 0;
  const [p1, p2, p3, poles] = await Promise.all([
    getJson(`/drivers/${driverId}/results/1`, T.CAREER, opts),
    getJson(`/drivers/${driverId}/results/2`, T.CAREER, opts),
    getJson(`/drivers/${driverId}/results/3`, T.CAREER, opts),
    getJson(`/drivers/${driverId}/qualifying/1`, T.CAREER, opts),
  ]);
  return {
    careerWins: total(p1),
    careerPoles: total(poles),
    careerPodiums: total(p1) + total(p2) + total(p3),
  };
}

module.exports = {
  getJson,
  driverStandings,
  constructorStandings,
  seasonDrivers,
  careerStats,
};
