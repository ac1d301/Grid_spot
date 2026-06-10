// Computed F1 endpoints built on the OpenF1 + Jolpica services.
//   GET /api/calendar?year=               -> normalized race calendar (auto season)
//   GET /api/standings/drivers?year=      -> merged official + enriched driver standings
//   GET /api/standings/constructors?year= -> constructor standings
//   GET /api/drivers/:driverNumber/career -> career wins/podiums/poles
const express = require('express');
const router = express.Router();
const { resolveYear } = require('../services/season');
const { buildCalendar } = require('../services/calendar');
const standings = require('../services/standings');
const jolpica = require('../services/jolpica');

const fail = (res, code, msg, err) =>
  res.status(code).json({
    message: msg,
    error: process.env.NODE_ENV === 'development' ? err?.message : undefined,
  });

router.get('/calendar', async (req, res) => {
  let year = null;
  try {
    year = await resolveYear(req.query.year);
    res.json(await buildCalendar(year));
  } catch (e) {
    // The calendar is called on every page; never 502 it. Degrade to an empty-but-valid shape
    // (the frontend uses `data?.races ?? []`) and let the client self-heal once the warm lands.
    if (process.env.NODE_ENV === 'development') console.warn('calendar degraded:', e.message);
    res.set('Cache-Control', 'public, max-age=15');
    res.json({ season: year ?? new Date().getUTCFullYear(), totalRounds: 0, races: [], degraded: true });
  }
});

router.get('/standings/drivers', async (req, res) => {
  let year = null;
  try {
    year = await resolveYear(req.query.year);
    const withCareer = req.query.career === '1' || req.query.career === 'true';
    const data = withCareer
      ? await standings.driverStandingsWithCareer(year)
      : await standings.driverStandings(year);
    res.json({ season: year, standings: data });
  } catch (e) {
    // Degrade gracefully on a cold-cache/upstream blip (Jolpica rate-limit) instead of 502:
    // return an empty list (200) so the client shows a clean state and self-heals on its next
    // poll once the warm cache lands. Short cache so a CDN doesn't pin the empty result.
    if (process.env.NODE_ENV === 'development') console.warn('driver standings degraded:', e.message);
    res.set('Cache-Control', 'public, max-age=15');
    res.json({ season: year, standings: [], degraded: true });
  }
});

router.get('/standings/constructors', async (req, res) => {
  let year = null;
  try {
    year = await resolveYear(req.query.year);
    res.json({ season: year, standings: await standings.constructorStandings(year) });
  } catch (e) {
    if (process.env.NODE_ENV === 'development') console.warn('constructor standings degraded:', e.message);
    res.set('Cache-Control', 'public, max-age=15');
    res.json({ season: year, standings: [], degraded: true });
  }
});

router.get('/drivers/:driverNumber/career', async (req, res) => {
  const num = parseInt(req.params.driverNumber, 10);
  try {
    const year = await resolveYear(req.query.year);
    const list = await standings.driverStandings(year);
    const match = list.find((d) => d.driver_number === num);
    if (!match?.driverId) return fail(res, 404, 'Driver not found for season', null);

    const career = await jolpica.careerStats(match.driverId);
    res.json({
      driver_number: num,
      driverId: match.driverId,
      name: `${match.givenName} ${match.familyName}`,
      headshot_url: match.headshot_url,
      ...career,
    });
  } catch (e) {
    // Degrade to zeroed career rather than 502 on a cold-cache/Jolpica blip.
    if (process.env.NODE_ENV === 'development') console.warn('career degraded:', e.message);
    res.set('Cache-Control', 'public, max-age=15');
    res.json({ driver_number: num, careerWins: 0, careerPodiums: 0, careerPoles: 0, degraded: true });
  }
});

module.exports = router;
