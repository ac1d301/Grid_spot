// Central TTL constants (milliseconds) for the in-memory caching gateway.
// Tuned per data volatility: schedules are near-static, standings settle per race,
// live results change by the second.
const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;

module.exports = {
  CALENDAR: 12 * HOUR,        // normalized race calendar — schedule rarely changes
  SESSIONS_RAW: 6 * HOUR,     // raw /sessions list for a season
  STANDINGS: 10 * MIN,        // driver/constructor standings — settle after each race
  DRIVERS: 1 * HOUR,          // driver metadata (headshot, team colour, number)
  CAREER: 12 * HOUR,          // career totals — change at most once per weekend
  SEASON_DETECT: 6 * HOUR,    // auto-detected current season
  SESSION_RESULT: 30 * SEC,   // live-ish session results
  POSITION: 15 * SEC,         // live position data
  PASSTHROUGH_DEFAULT: 60 * SEC,
  STALE_MAX: 7 * 24 * HOUR,   // how long a stale value may be served on upstream failure

  // --- session-data views (Race Center) ---
  LAPS_LIVE: 30 * SEC,        // lap series while a session is live
  LAPS_DONE: 6 * HOUR,        // lap series for a completed session (immutable)
  STINTS: 5 * MIN,            // tyre stints
  PIT: 5 * MIN,               // pit stops
  SECTORS: 2 * MIN,           // fastest sectors / speed trap
  RACE_CONTROL: 30 * SEC,     // flags / safety car / messages
  WEATHER_LIVE: 60 * SEC,     // weather latest + series
  RADIO: 5 * MIN,             // team radio clips
  LIVE: 15 * SEC,             // /live leaderboard (== POSITION cadence)
  TELEMETRY: 6 * HOUR,        // a (driver,lap) telemetry window is immutable
  TRACKMAP: 60 * SEC,         // location snapshot near a timestamp
  PROFILE: 12 * HOUR,         // Jolpica-backed driver/constructor profiles
  NEWS: 15 * MIN,             // F1 news feed (auto-refreshed on the client)
};
