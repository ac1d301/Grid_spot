// Merges authoritative championship standings (Jolpica) with live driver metadata
// (OpenF1). The standings LIST is Jolpica-driven, so it auto-includes every scoring
// driver for the season — no hardcoded roster. OpenF1 supplies headshot, team colour
// and acronym for each driver.
//
// OpenF1 driver_number <-> Jolpica driver mapping, in priority order:
//   1. Jolpica permanentNumber === OpenF1 driver_number
//   2. acronym fallback: OpenF1 name_acronym === first 3 letters of Jolpica familyName
//   3. no match: keep the Jolpica row, enrichment fields null
const jolpica = require('./jolpica');
const openf1 = require('./openf1');
const { buildCalendar } = require('./calendar');
const { cachedFetch } = require('./cache');
const T = require('../config/cacheTtls');

const acronymOf = (familyName = '') => familyName.slice(0, 3).toUpperCase();

// Build the OpenF1 driver index from the most recent meeting that has started
// (the latest /drivers?year= response is sparse/duplicated, so we key off a session).
async function openf1DriverIndex(year) {
  const cal = await buildCalendar(year);
  const started = cal.races.filter((r) => r.status !== 'upcoming');
  const ref = started[started.length - 1] || cal.races[cal.races.length - 1];

  let rows = [];
  if (ref) {
    const lastSession = ref.sessions[ref.sessions.length - 1];
    if (lastSession?.session_key) {
      try {
        rows = await openf1.getDrivers({ session_key: lastSession.session_key });
      } catch {
        /* fall through to meeting_key */
      }
    }
    if (!rows.length) {
      try {
        rows = await openf1.getDrivers({ meeting_key: ref.meeting_key });
      } catch {
        /* leave rows empty; enrichment becomes null */
      }
    }
  }

  const byNumber = new Map();
  const byAcronym = new Map();
  for (const d of rows) {
    if (d.driver_number != null) byNumber.set(Number(d.driver_number), d);
    if (d.name_acronym) byAcronym.set(d.name_acronym.toUpperCase(), d);
  }
  return { byNumber, byAcronym };
}

async function driverStandings(year) {
  return cachedFetch(`merged:driverStandings:${year}`, T.STANDINGS, async () => {
    const rows = await jolpica.driverStandings(year); // authoritative

    let idx = { byNumber: new Map(), byAcronym: new Map() };
    try {
      idx = await openf1DriverIndex(year); // enrichment is best-effort
    } catch {
      /* enrichment unavailable */
    }

    return rows.map((r) => {
      const d = r.Driver || {};
      const num = parseInt(d.permanentNumber, 10);
      const of =
        (Number.isInteger(num) && idx.byNumber.get(num)) ||
        idx.byAcronym.get(acronymOf(d.familyName)) ||
        null;
      // last constructor = current team (handles mid-season switches)
      const constructor = r.Constructors?.[r.Constructors.length - 1]?.name || null;

      return {
        position: parseInt(r.position, 10),
        points: parseFloat(r.points),
        wins: parseInt(r.wins, 10),
        driverId: d.driverId,
        givenName: d.givenName,
        familyName: d.familyName,
        nationality: d.nationality,
        permanentNumber: Number.isInteger(num) ? num : (of?.driver_number ?? null),
        driver_number: of?.driver_number ?? (Number.isInteger(num) ? num : null),
        name_acronym: of?.name_acronym || acronymOf(d.familyName),
        team: of?.team_name || constructor,
        teamColor: of?.team_colour ? `#${of.team_colour}` : null,
        headshot_url: of?.headshot_url || null,
      };
    });
  });
}

// Run async tasks with bounded concurrency (keeps us under Jolpica's burst limit).
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

// Driver standings enriched with career wins/podiums/poles (Jolpica). The expensive
// part is the per-driver career queries, but each is individually cached 12h, so only
// the first call (or once every 12h) actually hits upstream; refreshes are cache hits.
// A failed career lookup degrades to zeros rather than failing the whole response.
async function driverStandingsWithCareer(year, opts = {}) {
  return cachedFetch(`merged:driverStandingsCareer:${year}`, T.STANDINGS, async () => {
    const base = await driverStandings(year);
    // Concurrency 1: one driver's 4-call burst at a time. Higher concurrency trips
    // Jolpica's rate limit and silently zeroes out career stats. Each driver's career
    // is cached 12h individually, so this full sweep only runs on a cold cache.
    // `opts.priority` lets the background warmer run this at LOW priority so it never
    // starves an on-demand profile request sharing the Jolpica queue.
    return mapLimit(base, 1, async (d) => {
      let career = { careerWins: 0, careerPodiums: 0, careerPoles: 0 };
      if (d.driverId) {
        try {
          career = await jolpica.careerStats(d.driverId, opts);
        } catch {
          /* leave zeros */
        }
      }
      return { ...d, ...career };
    });
  });
}

async function constructorStandings(year) {
  return cachedFetch(`merged:constructorStandings:${year}`, T.STANDINGS, async () => {
    const rows = await jolpica.constructorStandings(year);
    return rows.map((r) => ({
      position: parseInt(r.position, 10),
      points: parseFloat(r.points),
      wins: parseInt(r.wins, 10),
      constructorId: r.Constructor?.constructorId,
      name: r.Constructor?.name,
      nationality: r.Constructor?.nationality,
    }));
  });
}

module.exports = {
  driverStandings,
  driverStandingsWithCareer,
  constructorStandings,
  openf1DriverIndex,
};
