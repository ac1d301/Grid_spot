// Current-season auto-detection. Returns the current calendar year, falling back
// to the most recent year that actually has session data (covers the off-season
// gap before a new season's data is published). `resolveYear` honors an explicit
// `?year=` query param when valid, else auto-detects.
const openf1 = require('./openf1');
const { cachedFetch } = require('./cache');
const T = require('../config/cacheTtls');

async function getCurrentSeason() {
  return cachedFetch('season:current', T.SEASON_DETECT, async () => {
    const thisYear = new Date().getUTCFullYear();
    for (let y = thisYear; y >= thisYear - 2; y--) {
      try {
        const sessions = await openf1.getSessions(y);
        if (Array.isArray(sessions) && sessions.length) return y;
      } catch {
        // try the previous year
      }
    }
    return thisYear;
  });
}

async function resolveYear(qYear) {
  const n = parseInt(qYear, 10);
  if (Number.isInteger(n) && n >= 1950 && n <= 2100) return n;
  return getCurrentSeason();
}

module.exports = { getCurrentSeason, resolveYear };
