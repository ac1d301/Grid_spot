// In-memory TTL cache with in-flight request de-duplication and stale-while-error.
//
// `cachedFetch` is the only primitive the rest of the backend uses to talk to
// upstream APIs:
//   - Fresh hit  -> returns cached value immediately.
//   - In-flight  -> N concurrent identical requests collapse to ONE upstream call
//                   (important on cold starts where a burst arrives at once).
//   - Upstream failure -> serve the last good value (up to STALE_MAX) instead of
//                   propagating the error, so a flaky upstream never takes the API down.
//
// Memory-only: state is lost on process restart and is per-process. Across MULTIPLE
// instances each process keeps its own cache, so upstream load multiplies by instance
// count. The storage is isolated behind the `store` seam below: to share one cache across
// instances, replace `createMemoryStore()` with a Redis-backed store of the same shape
// (the accessors become async — a change localized to this file). See SCALING.md.
const { STALE_MAX } = require('../config/cacheTtls');

// ---- storage seam ----------------------------------------------------------
function createMemoryStore() {
  const map = new Map(); // key -> { value, expires, storedAt }
  return {
    getEntry: (key) => map.get(key),
    set: (key, value, ttl) => map.set(key, { value, expires: Date.now() + ttl, storedAt: Date.now() }),
    sweep: (maxAge) => {
      const now = Date.now();
      for (const [key, entry] of map) if (now - entry.storedAt > maxAge) map.delete(key);
    },
  };
}
const store = createMemoryStore();
// ---------------------------------------------------------------------------

const inflight = new Map(); // key -> Promise

function getFresh(key) {
  const entry = store.getEntry(key);
  return entry && Date.now() < entry.expires ? entry.value : undefined;
}

function getStale(key) {
  const entry = store.getEntry(key);
  return entry && Date.now() - entry.storedAt < STALE_MAX ? entry.value : undefined;
}

function set(key, value, ttl) {
  store.set(key, value, ttl);
}

async function cachedFetch(key, ttl, fetcher) {
  const fresh = getFresh(key);
  if (fresh !== undefined) return fresh;

  if (inflight.has(key)) return inflight.get(key);

  const promise = (async () => {
    try {
      const value = await fetcher();
      set(key, value, ttl);
      return value;
    } catch (err) {
      const stale = getStale(key);
      if (stale !== undefined) {
        console.warn(`[cache] upstream failed for ${key}, serving stale: ${err.message}`);
        return stale;
      }
      throw err;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}

// Periodically evict entries older than STALE_MAX so the store can't grow unbounded.
const timer = setInterval(() => store.sweep(STALE_MAX), 60 * 60 * 1000);
if (timer.unref) timer.unref(); // never keep the process alive just for the sweeper

module.exports = { cachedFetch, getFresh, getStale, set };
