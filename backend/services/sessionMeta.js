// Resolves a session_key to its meeting/season/status by scanning the cached calendar.
// Drives adaptive TTLs (short while live, long once completed) and friendly validation.
// Cheap: buildCalendar is already cached 12h.
const { buildCalendar } = require('./calendar');
const { getCurrentSeason } = require('./season');

// Short TTL while a session is live/upcoming, long once it's completed (immutable).
function ttlByStatus(status, liveTtl, doneTtl) {
  return status === 'completed' ? doneTtl : liveTtl;
}

// session_key -> { year, meeting_key, name, type, status, date_start, date_end, isRace }
// or null if the key isn't found in the current ±1 seasons (services then fall back to
// short TTLs and skip race-only guards, still serving whatever OpenF1 returns).
async function resolveSession(sessionKey) {
  const key = Number(sessionKey);
  if (!Number.isInteger(key)) return null;
  const base = await getCurrentSeason();
  for (const year of [base, base - 1, base + 1]) {
    let cal;
    try {
      cal = await buildCalendar(year);
    } catch {
      continue;
    }
    for (const race of cal.races) {
      const s = race.sessions.find((x) => x.session_key === key);
      if (s) {
        return {
          year,
          meeting_key: race.meeting_key,
          name: s.name,
          type: s.type,
          status: race.status,
          date_start: s.date_start,
          date_end: s.date_end,
          isRace: s.type === 'Race' || s.type === 'Sprint',
        };
      }
    }
  }
  return null;
}

module.exports = { resolveSession, ttlByStatus };
