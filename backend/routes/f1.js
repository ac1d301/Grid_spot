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
  try {
    const year = await resolveYear(req.query.year);
    res.json(await buildCalendar(year));
  } catch (e) {
    fail(res, 502, 'Failed to build calendar', e);
  }
});

router.get('/standings/drivers', async (req, res) => {
  try {
    const year = await resolveYear(req.query.year);
    const withCareer = req.query.career === '1' || req.query.career === 'true';
    const data = withCareer
      ? await standings.driverStandingsWithCareer(year)
      : await standings.driverStandings(year);
    res.json({ season: year, standings: data });
  } catch (e) {
    fail(res, 502, 'Failed to build driver standings', e);
  }
});

router.get('/standings/constructors', async (req, res) => {
  try {
    const year = await resolveYear(req.query.year);
    res.json({ season: year, standings: await standings.constructorStandings(year) });
  } catch (e) {
    fail(res, 502, 'Failed to build constructor standings', e);
  }
});

router.get('/drivers/:driverNumber/career', async (req, res) => {
  try {
    const year = await resolveYear(req.query.year);
    const num = parseInt(req.params.driverNumber, 10);
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
    fail(res, 502, 'Failed to fetch career stats', e);
  }
});

module.exports = router;
