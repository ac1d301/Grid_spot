// Heavy, opt-in telemetry. NEVER fetches a full session — always windows by lap/time
// and downsamples server-side, with a hard point cap. OpenF1's range operators
// (date>=/date<=) must be passed RAW in the URL: axios's param encoder turns them into
// %3E%3D which OpenF1 404s on, so we embed them in the path string (empty params).
const openf1 = require('./openf1');
const { cachedFetch } = require('./cache');
const { driverMap, decorate, downsample } = require('./session');
const T = require('../config/cacheTtls');

const MAX_POINTS = 400;
const PAD_MS = 1500;
const iso = (ms) => new Date(ms).toISOString();

// car_data for ONE driver + ONE lap, windowed by that lap's time range, downsampled.
async function lapTelemetry(sessionKey, driver, lap, { points = 300 } = {}) {
  const n = Number(driver);
  const lapNo = Number(lap);
  const cap = Math.min(points, MAX_POINTS);
  return cachedFetch(`telemetry:lap:${sessionKey}:${n}:${lapNo}:${cap}`, T.TELEMETRY, async () => {
    const laps = await openf1.get('/laps', { session_key: sessionKey, driver_number: n }, T.LAPS_DONE);
    const row = (laps || []).find((l) => l.lap_number === lapNo);
    if (!row || !row.date_start) {
      return { session_key: Number(sessionKey), driver_number: n, lap_number: lapNo, count: 0, points: [], note: 'no telemetry window' };
    }
    const start = new Date(row.date_start).getTime() - PAD_MS;
    const durMs = typeof row.lap_duration === 'number' ? row.lap_duration * 1000 : 120000;
    const end = start + durMs + 2 * PAD_MS;

    // RAW operators in the path (no params object) so OpenF1 parses them.
    const path = `/car_data?driver_number=${n}&session_key=${sessionKey}&date>=${iso(start)}&date<=${iso(end)}`;
    const car = await openf1.get(path, {}, T.TELEMETRY);

    const sorted = (car || []).slice().sort((a, b) => new Date(a.date) - new Date(b.date));
    const pts = downsample(sorted, cap).map((c) => ({
      date: c.date, speed: c.speed, throttle: c.throttle, brake: c.brake,
      n_gear: c.n_gear, rpm: c.rpm, drs: c.drs,
    }));
    return { session_key: Number(sessionKey), driver_number: n, lap_number: lapNo, count: pts.length, points: pts };
  });
}

// /location snapshot near a timestamp, all drivers, for a 2D track map.
async function trackSnapshot(sessionKey, atIso, { windowMs = 4000 } = {}) {
  let at = atIso ? new Date(atIso).getTime() : Date.now();
  if (Number.isNaN(at)) at = Date.now(); // malformed/clipped timestamp → fall back to now
  return cachedFetch(`telemetry:track:${sessionKey}:${at}`, T.TRACKMAP, async () => {
    // OpenF1 only records /location for some (mostly recent/live) sessions; a 404 just
    // means no track-position data — return an empty snapshot rather than erroring.
    const path = `/location?session_key=${sessionKey}&date>=${iso(at - windowMs)}&date<=${iso(at + windowMs)}`;
    const [loc, dm] = await Promise.all([
      openf1.get(path, {}, T.TRACKMAP).catch(() => []),
      driverMap(sessionKey),
    ]);

    const latest = new Map();
    for (const p of loc || []) {
      const k = Number(p.driver_number);
      const prev = latest.get(k);
      if (!prev || new Date(p.date) > new Date(prev.date)) latest.set(k, p);
    }
    const positions = [...latest.values()]
      .filter((p) => typeof p.x === 'number' && typeof p.y === 'number')
      .map((p) => {
        const d = decorate(dm, p.driver_number);
        return { driver_number: Number(p.driver_number), acronym: d.acronym, color: d.color, x: p.x, y: p.y, date: p.date };
      });
    const xs = positions.map((p) => p.x);
    const ys = positions.map((p) => p.y);
    const bounds = positions.length
      ? { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }
      : null;
    return { session_key: Number(sessionKey), at: iso(at), bounds, count: positions.length, positions };
  });
}

module.exports = { lapTelemetry, trackSnapshot, MAX_POINTS };
