// Jolpica-backed driver & constructor profiles. All upstream calls go through
// jolpica.getJson (throttled ≥260ms, 429-retry) and are cached 12h.
const jolpica = require('./jolpica');
const { cachedFetch } = require('./cache');
const { getCurrentSeason } = require('./season');
const T = require('../config/cacheTtls');

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

async function driverProfile(driverId, year) {
  const season = year || (await getCurrentSeason());
  return cachedFetch(`profile:driver:${driverId}:${season}`, T.PROFILE, async () => {
    const [info, career, results] = await Promise.all([
      jolpica.getJson(`/drivers/${driverId}`, T.PROFILE).catch(() => null),
      jolpica.careerStats(driverId).catch(() => ({ careerWins: 0, careerPodiums: 0, careerPoles: 0 })),
      jolpica.getJson(`/${season}/drivers/${driverId}/results`, T.PROFILE).catch(() => null),
    ]);

    const driver = info?.MRData?.DriverTable?.Drivers?.[0] || null;
    const races = results?.MRData?.RaceTable?.Races || [];
    const seasonResults = races.map((r) => {
      const res = r.Results?.[0] || {};
      return {
        round: Number(r.round),
        raceName: r.raceName,
        circuit: r.Circuit?.circuitName,
        date: r.date,
        grid: num(res.grid),
        position: num(res.position),
        points: num(res.points),
        status: res.status,
        constructor: res.Constructor?.name || null,
        constructorId: res.Constructor?.constructorId || null,
      };
    });

    const teammate = await teammateH2H(season, driverId, seasonResults).catch(() => null);

    return {
      driverId,
      season,
      driver: driver
        ? {
            driverId: driver.driverId,
            name: `${driver.givenName} ${driver.familyName}`,
            nationality: driver.nationality,
            number: driver.permanentNumber ? Number(driver.permanentNumber) : null,
            dateOfBirth: driver.dateOfBirth || null,
          }
        : null,
      career,
      currentTeam: seasonResults.find((r) => r.constructor)?.constructor || null,
      seasonPoints: seasonResults.reduce((sum, r) => sum + (r.points || 0), 0),
      seasonResults,
      teammate,
    };
  });
}

// Compare driver vs current teammate over the season by per-race finishing position.
async function teammateH2H(season, driverId, seasonResults) {
  const constructorId = seasonResults.find((r) => r.constructorId)?.constructorId;
  if (!constructorId) return null;
  const data = await jolpica.getJson(`/${season}/constructors/${constructorId}/drivers`, T.PROFILE);
  const mates = (data?.MRData?.DriverTable?.Drivers || [])
    .map((d) => d.driverId)
    .filter((id) => id !== driverId);
  const mateId = mates[0];
  if (!mateId) return null;
  const mateData = await jolpica.getJson(`/${season}/drivers/${mateId}/results`, T.PROFILE);
  const mateByRound = new Map(
    (mateData?.MRData?.RaceTable?.Races || []).map((r) => [Number(r.round), num(r.Results?.[0]?.position)])
  );
  let driver = 0;
  let teammate = 0;
  for (const r of seasonResults) {
    const mp = mateByRound.get(r.round);
    if (mp != null && r.position != null) (r.position < mp ? driver++ : teammate++);
  }
  return { teammateId: mateId, raceHeadToHead: { driver, teammate } };
}

async function constructorProfile(constructorId, year) {
  const season = year || (await getCurrentSeason());
  return cachedFetch(`profile:constructor:${constructorId}:${season}`, T.PROFILE, async () => {
    const [info, standings, drivers] = await Promise.all([
      jolpica.getJson(`/constructors/${constructorId}`, T.PROFILE).catch(() => null),
      jolpica.getJson(`/${season}/constructors/${constructorId}/constructorStandings`, T.PROFILE).catch(() => null),
      jolpica.getJson(`/${season}/constructors/${constructorId}/drivers`, T.PROFILE).catch(() => null),
    ]);
    const constructor = info?.MRData?.ConstructorTable?.Constructors?.[0] || null;
    const standing = standings?.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings?.[0] || null;
    const lineup = (drivers?.MRData?.DriverTable?.Drivers || []).map((d) => ({
      driverId: d.driverId,
      name: `${d.givenName} ${d.familyName}`,
      number: d.permanentNumber ? Number(d.permanentNumber) : null,
    }));
    return {
      constructorId,
      season,
      constructor: constructor
        ? { constructorId: constructor.constructorId, name: constructor.name, nationality: constructor.nationality }
        : null,
      season_position: standing ? Number(standing.position) : null,
      season_points: standing ? num(standing.points) : null,
      season_wins: standing ? Number(standing.wins) : null,
      lineup,
    };
  });
}

module.exports = { driverProfile, constructorProfile };
