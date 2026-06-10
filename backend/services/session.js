// Computed per-session views built on the cached OpenF1 client. Each view is one
// cachedFetch wrapping openf1.get(...) calls + a pure transform, so the *computed*
// shape is cached (not just raw upstream). All timestamps stay UTC ISO.
const openf1 = require('./openf1');
const { cachedFetch } = require('./cache');
const { resolveSession, ttlByStatus } = require('./sessionMeta');
const standings = require('./standings');
const T = require('../config/cacheTtls');

// Evenly-spaced downsample preserving first & last. Shared with telemetry.js.
function downsample(arr, n) {
  if (!Array.isArray(arr) || arr.length <= n) return arr || [];
  const step = (arr.length - 1) / (n - 1);
  const out = [];
  for (let i = 0; i < n; i++) out.push(arr[Math.round(i * step)]);
  return out;
}

// driver_number -> { driver_number, name, acronym, team, color, headshot, country }
async function driverMap(sessionKey) {
  const rows = await openf1.getDrivers({ session_key: sessionKey }); // cached 1h
  const m = new Map();
  for (const d of rows || []) {
    m.set(Number(d.driver_number), {
      driver_number: Number(d.driver_number),
      name: d.full_name || null,
      acronym: d.name_acronym || null,
      team: d.team_name || null,
      color: d.team_colour ? `#${d.team_colour}` : null,
      headshot: d.headshot_url || null,
      country: d.country_code || null,
    });
  }
  return m;
}
const decorate = (m, num) =>
  m.get(Number(num)) || {
    driver_number: Number(num), name: null, acronym: null,
    team: null, color: null, headshot: null, country: null,
  };

// driver_number -> Ergast driverId (best-effort, via cached standings). Enables
// results -> driver-profile links. Returns empty map on failure.
async function driverIdMap(year) {
  if (!year) return new Map();
  try {
    const list = await standings.driverStandings(year);
    const m = new Map();
    for (const d of list) if (d.driver_number != null) m.set(Number(d.driver_number), d.driverId);
    return m;
  } catch {
    return new Map();
  }
}

// 1. Classification + fastest lap
async function results(sessionKey) {
  const meta = await resolveSession(sessionKey);
  const ttl = ttlByStatus(meta?.status, T.SESSION_RESULT, T.LAPS_DONE);
  return cachedFetch(`session:results:${sessionKey}`, ttl, async () => {
    const [res, dm, laps, idMap] = await Promise.all([
      openf1.getSessionResult(sessionKey),
      driverMap(sessionKey),
      openf1.get('/laps', { session_key: sessionKey }, ttl),
      driverIdMap(meta?.year),
    ]);

    let fastest = null;
    for (const l of laps || []) {
      const d = l.lap_duration;
      if (typeof d === 'number' && d > 0 && (!fastest || d < fastest.lap_duration)) {
        fastest = { driver_number: Number(l.driver_number), lap_number: l.lap_number, lap_duration: d };
      }
    }

    // Qualifying returns gap_to_leader as an array [Q1,Q2,Q3]; collapse to the final
    // phase's gap (last finite value) so it's always a number or null for the client.
    const normGap = (g) =>
      Array.isArray(g) ? (g.filter((x) => typeof x === 'number').pop() ?? null) : (g ?? null);

    const classification = (res || [])
      .slice()
      .sort((a, b) => (a.position ?? 999) - (b.position ?? 999))
      .map((r) => {
        const d = decorate(dm, r.driver_number);
        return {
          position: r.position ?? null,
          ...d,
          teamColor: d.color,
          driverId: idMap.get(Number(r.driver_number)) || null,
          points: r.points ?? 0,
          laps: r.number_of_laps ?? null,
          gap: normGap(r.gap_to_leader),
          dnf: !!r.dnf, dns: !!r.dns, dsq: !!r.dsq,
          is_fastest_lap: !!fastest && Number(r.driver_number) === fastest.driver_number,
        };
      });

    return {
      session_key: Number(sessionKey),
      status: meta?.status || 'unknown',
      fastest_lap: fastest ? { ...decorate(dm, fastest.driver_number), ...fastest } : null,
      classification,
    };
  });
}

// 2. Cleaned per-driver lap series for charting
async function laps(sessionKey, { drivers, includeRaw = false } = {}) {
  const meta = await resolveSession(sessionKey);
  const ttl = ttlByStatus(meta?.status, T.LAPS_LIVE, T.LAPS_DONE);
  const want = drivers && drivers.length ? new Set(drivers.map(Number)) : null;
  const cacheKey = `session:laps:${sessionKey}:${want ? [...want].sort().join('-') : 'all'}:${includeRaw ? 'raw' : 'clean'}`;
  return cachedFetch(cacheKey, ttl, async () => {
    const [rows, dm] = await Promise.all([
      openf1.get('/laps', { session_key: sessionKey }, ttl),
      driverMap(sessionKey),
    ]);
    const byDriver = new Map();
    for (const l of rows || []) {
      const n = Number(l.driver_number);
      if (want && !want.has(n)) continue;
      if (!byDriver.has(n)) byDriver.set(n, []);
      byDriver.get(n).push({
        lap_number: l.lap_number,
        lap_duration: l.lap_duration ?? null,
        sectors: [l.duration_sector_1 ?? null, l.duration_sector_2 ?? null, l.duration_sector_3 ?? null],
        is_pit_out_lap: !!l.is_pit_out_lap,
        st_speed: l.st_speed ?? null,
      });
    }
    const out = [];
    for (const [driver_number, all] of byDriver) {
      all.sort((a, b) => a.lap_number - b.lap_number);
      const charted = all.filter((x) => typeof x.lap_duration === 'number' && x.lap_duration > 0 && !x.is_pit_out_lap);
      const d = decorate(dm, driver_number);
      out.push({ driver_number, name: d.name, acronym: d.acronym, color: d.color, laps: includeRaw ? all : charted, raw_count: all.length });
    }
    out.sort((a, b) => a.driver_number - b.driver_number);
    return { session_key: Number(sessionKey), drivers: out };
  });
}

// 3. Tyre strategy (stints + pit stops)
async function strategy(sessionKey) {
  return cachedFetch(`session:strategy:${sessionKey}`, T.STINTS, async () => {
    const [stints, pits, dm] = await Promise.all([
      openf1.get('/stints', { session_key: sessionKey }, T.STINTS),
      openf1.get('/pit', { session_key: sessionKey }, T.PIT),
      driverMap(sessionKey),
    ]);
    const pitByDriver = new Map();
    for (const p of pits || []) {
      const n = Number(p.driver_number);
      if (!pitByDriver.has(n)) pitByDriver.set(n, []);
      pitByDriver.get(n).push({ lap_number: p.lap_number, pit_duration: p.pit_duration ?? null });
    }
    const stintByDriver = new Map();
    for (const s of stints || []) {
      const n = Number(s.driver_number);
      if (!stintByDriver.has(n)) stintByDriver.set(n, []);
      stintByDriver.get(n).push({
        stint_number: s.stint_number,
        compound: s.compound ?? null,
        lap_start: s.lap_start,
        lap_end: s.lap_end,
        tyre_age_at_start: s.tyre_age_at_start ?? null,
        laps_on_tyre: s.lap_end != null && s.lap_start != null ? s.lap_end - s.lap_start + 1 : null,
      });
    }
    const out = [];
    for (const [driver_number, d] of dm) {
      const sl = (stintByDriver.get(driver_number) || []).sort((a, b) => a.stint_number - b.stint_number);
      const pl = (pitByDriver.get(driver_number) || []).sort((a, b) => a.lap_number - b.lap_number);
      if (!sl.length && !pl.length) continue;
      out.push({ ...d, stints: sl, pit_stops: pl });
    }
    out.sort((a, b) => a.driver_number - b.driver_number);
    return { session_key: Number(sessionKey), drivers: out };
  });
}

// 3b. Qualifying — per-driver Q1/Q2/Q3, each with its lap's sector breakdown. The phase
// best time (session_result.duration[i]) equals one of the driver's lap_durations, so we
// match it back to /laps to recover that lap's three sector times.
async function qualifying(sessionKey) {
  const meta = await resolveSession(sessionKey);
  const ttl = ttlByStatus(meta?.status, T.SESSION_RESULT, T.LAPS_DONE);
  return cachedFetch(`session:qualifying:${sessionKey}`, ttl, async () => {
    const [res, dm, allLaps] = await Promise.all([
      openf1.getSessionResult(sessionKey),
      driverMap(sessionKey),
      openf1.get('/laps', { session_key: sessionKey }, ttl),
    ]);
    const num = (v) => (typeof v === 'number' && v > 0 ? v : null);

    const lapsByDriver = new Map();
    for (const l of allLaps || []) {
      const n = Number(l.driver_number);
      if (!lapsByDriver.has(n)) lapsByDriver.set(n, []);
      lapsByDriver.get(n).push(l);
    }

    // For a phase best-time, find the matching lap and return { time, sectors:[s1,s2,s3] }.
    const phase = (driverLaps, t) => {
      const time = num(t);
      if (time == null) return null;
      const lap = (driverLaps || []).find(
        (l) => typeof l.lap_duration === 'number' && Math.abs(l.lap_duration - time) < 0.05
      );
      return {
        time,
        sectors: lap
          ? [num(lap.duration_sector_1), num(lap.duration_sector_2), num(lap.duration_sector_3)]
          : [null, null, null],
      };
    };

    const drivers = (res || [])
      .slice()
      .sort((a, b) => (a.position ?? 999) - (b.position ?? 999))
      .map((r) => {
        const d = decorate(dm, r.driver_number);
        const dur = Array.isArray(r.duration) ? r.duration : [];
        const dl = lapsByDriver.get(Number(r.driver_number));
        return {
          ...d,
          position: r.position ?? null,
          q1: phase(dl, dur[0]),
          q2: phase(dl, dur[1]),
          q3: phase(dl, dur[2]),
        };
      });
    return { session_key: Number(sessionKey), drivers };
  });
}

// 4. Fastest sectors + speed trap
async function sectors(sessionKey) {
  return cachedFetch(`session:sectors:${sessionKey}`, T.SECTORS, async () => {
    const [rows, dm] = await Promise.all([
      openf1.get('/laps', { session_key: sessionKey }, T.SECTORS),
      driverMap(sessionKey),
    ]);
    const best = { s1: null, s2: null, s3: null };
    let speedTrap = null;
    for (const l of rows || []) {
      const cand = [['s1', l.duration_sector_1], ['s2', l.duration_sector_2], ['s3', l.duration_sector_3]];
      for (const [k, v] of cand) {
        if (typeof v === 'number' && v > 0 && (!best[k] || v < best[k].time)) {
          best[k] = { driver_number: Number(l.driver_number), time: v };
        }
      }
      if (typeof l.st_speed === 'number' && (!speedTrap || l.st_speed > speedTrap.speed)) {
        speedTrap = { driver_number: Number(l.driver_number), speed: l.st_speed };
      }
    }
    const dec = (x) => (x ? { ...decorate(dm, x.driver_number), ...x } : null);
    return {
      session_key: Number(sessionKey),
      fastest_sectors: { s1: dec(best.s1), s2: dec(best.s2), s3: dec(best.s3) },
      speed_trap: dec(speedTrap),
    };
  });
}

// 5. Weather (latest + downsampled series)
async function weather(sessionKey, { points = 60 } = {}) {
  return cachedFetch(`session:weather:${sessionKey}:${points}`, T.WEATHER_LIVE, async () => {
    const rows = await openf1.get('/weather', { session_key: sessionKey }, T.WEATHER_LIVE);
    const sorted = (rows || []).slice().sort((a, b) => new Date(a.date) - new Date(b.date));
    const map = (w) => ({
      date: w.date, air: w.air_temperature, track: w.track_temperature,
      humidity: w.humidity, pressure: w.pressure, wind_speed: w.wind_speed,
      wind_direction: w.wind_direction, rainfall: w.rainfall,
    });
    const latest = sorted.length ? map(sorted[sorted.length - 1]) : null;
    return { session_key: Number(sessionKey), latest, series: downsample(sorted, points).map(map) };
  });
}

// 6. Race control log (newest-first) + current track flag
async function raceControl(sessionKey) {
  return cachedFetch(`session:racecontrol:${sessionKey}`, T.RACE_CONTROL, async () => {
    const rows = await openf1.get('/race_control', { session_key: sessionKey }, T.RACE_CONTROL);
    const log = (rows || [])
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map((r) => ({
        date: r.date, category: r.category, flag: r.flag ?? null, scope: r.scope ?? null,
        sector: r.sector ?? null, driver_number: r.driver_number ?? null,
        lap_number: r.lap_number ?? null, message: r.message,
      }));
    const current_flag = log.find((e) => e.category === 'Flag' && e.scope === 'Track')?.flag ?? null;
    return { session_key: Number(sessionKey), current_flag, log };
  });
}

// 7. Team radio (joined with driver)
async function radio(sessionKey) {
  return cachedFetch(`session:radio:${sessionKey}`, T.RADIO, async () => {
    const [rows, dm] = await Promise.all([
      openf1.get('/team_radio', { session_key: sessionKey }, T.RADIO),
      driverMap(sessionKey),
    ]);
    const clips = (rows || [])
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map((r) => ({ date: r.date, recording_url: r.recording_url, ...decorate(dm, r.driver_number) }));
    return { session_key: Number(sessionKey), clips };
  });
}

// 8. Live leaderboard: latest position + intervals (race only) + current flag
function latestPerDriver(rows) {
  const m = new Map();
  for (const r of rows || []) {
    const n = Number(r.driver_number);
    const prev = m.get(n);
    if (!prev || new Date(r.date) > new Date(prev.date)) m.set(n, r);
  }
  return m;
}
async function live(sessionKey) {
  const meta = await resolveSession(sessionKey);
  return cachedFetch(`session:live:${sessionKey}`, T.LIVE, async () => {
    const [posRows, intRows, rc, dm] = await Promise.all([
      openf1.get('/position', { session_key: sessionKey }, T.POSITION),
      meta?.isRace ? openf1.get('/intervals', { session_key: sessionKey }, T.LIVE) : Promise.resolve([]),
      raceControl(sessionKey),
      driverMap(sessionKey),
    ]);
    const latestPos = latestPerDriver(posRows);
    const latestInt = latestPerDriver(intRows);
    const leaderboard = [];
    for (const [driver_number, p] of latestPos) {
      const iv = latestInt.get(driver_number);
      const d = decorate(dm, driver_number);
      leaderboard.push({
        position: p.position ?? null,
        ...d,
        gap_to_leader: iv?.gap_to_leader ?? null,
        interval: iv?.interval ?? null,
        drs: false, // OpenF1 DRS lives in car_data (heavy); omitted from the cheap live view
        as_of: p.date,
      });
    }
    leaderboard.sort((a, b) => (a.position ?? 999) - (b.position ?? 999));
    return {
      session_key: Number(sessionKey),
      status: meta?.status || 'unknown',
      is_race: !!meta?.isRace,
      current_flag: rc.current_flag,
      updated_at: new Date().toISOString(),
      leaderboard,
    };
  });
}

module.exports = {
  results, laps, qualifying, strategy, sectors, weather, raceControl, radio, live,
  driverMap, decorate, downsample,
};
