// Normalizes raw OpenF1 /sessions into a clean race calendar:
//   - groups sessions by meeting_key (one race weekend = one meeting)
//   - excludes pre-season testing meetings (no Race session, e.g. "Day 1/2/3")
//   - derives the round number by ordering meetings by their earliest session
//   - computes a status (upcoming | live | completed) from the current UTC time
//
// All timestamps stay as UTC ISO strings; the frontend formats them to IST.
const openf1 = require('./openf1');
const jolpica = require('./jolpica');
const { cachedFetch } = require('./cache');
const T = require('../config/cacheTtls');

// A real Grand Prix weekend has a Race session. Pre-season testing meetings
// (sessions named "Day 1/2/3", type "Practice") have none and are excluded.
function isTestingMeeting(sessions) {
  return !sessions.some((s) => s.session_type === 'Race');
}

function computeStatus(sessions, now = Date.now()) {
  const starts = sessions.map((s) => +new Date(s.date_start));
  const ends = sessions.map((s) => +new Date(s.date_end || s.date_start));
  const first = Math.min(...starts);
  const last = Math.max(...ends);
  if (now < first) return 'upcoming';
  if (now > last) return 'completed';
  return 'live';
}

async function buildCalendar(year) {
  return cachedFetch(`calendar:${year}`, T.CALENDAR, async () => {
    const sessions = await openf1.getSessions(year);

    const byMeeting = new Map();
    for (const s of sessions) {
      if (!byMeeting.has(s.meeting_key)) byMeeting.set(s.meeting_key, []);
      byMeeting.get(s.meeting_key).push(s);
    }

    const meetings = [];
    for (const [meetingKey, ss] of byMeeting) {
      if (isTestingMeeting(ss)) continue;
      ss.sort((a, b) => new Date(a.date_start) - new Date(b.date_start));
      const race = ss.find((s) => s.session_type === 'Race');
      const first = ss[0];
      meetings.push({
        meeting_key: meetingKey,
        name: `${first.country_name} Grand Prix`,
        country: first.country_name,
        location: first.location,
        circuit: first.circuit_short_name,
        circuit_key: first.circuit_key,
        _earliest: +new Date(first.date_start),
        race_start: race?.date_start || null,
        race_end: race?.date_end || null,
        // OpenF1 labels the sprint race as session_type "Race" with session_name "Sprint"
        // (and "Sprint Qualifying" as type "Qualifying"), so detect sprints by name too.
        isSprint: ss.some((s) => s.session_type === 'Sprint' || s.session_name === 'Sprint'),
        winner: null, // filled in elsewhere once results exist
        status: computeStatus(ss),
        sessions: ss.map((s) => ({
          name: s.session_name,
          type: s.session_type,
          date_start: s.date_start,
          date_end: s.date_end,
          session_key: s.session_key,
        })),
      });
    }

    meetings.sort((a, b) => a._earliest - b._earliest);
    meetings.forEach((m, i) => {
      m.round = i + 1;
      delete m._earliest;
    });

    // Enrich completed races with the winner from JOLPICA (one call), matched to each
    // race by date. OpenF1's 2026 session_result winners disagree with the official
    // standings (which are Jolpica-based), so we use Jolpica here for consistency. Races
    // Jolpica doesn't have (no date match within 2 days) simply show no winner.
    const completed = meetings.filter((m) => m.status === 'completed' && m.race_start);
    if (completed.length) {
      const winners = await jolpicaWinners(year);
      const TWO_DAYS = 2 * 24 * 60 * 60 * 1000;
      for (const m of completed) {
        const md = new Date(m.race_start).getTime();
        let best = null;
        let bestDiff = Infinity;
        for (const w of winners) {
          const diff = Math.abs(w.date - md);
          if (diff < bestDiff) { bestDiff = diff; best = w; }
        }
        m.winner = best && bestDiff <= TWO_DAYS ? best.name : null;
      }
    }

    return { season: year, totalRounds: meetings.length, races: meetings };
  });
}

// All race winners for a season from Jolpica: [{ date(ms), name }]. Empty on failure.
async function jolpicaWinners(year) {
  try {
    const data = await jolpica.getJson(`/${year}/results/1`, T.CALENDAR);
    const races = data?.MRData?.RaceTable?.Races || [];
    return races
      .map((r) => {
        const d = r.Results?.[0]?.Driver;
        return d ? { date: new Date(r.date).getTime(), name: `${d.givenName} ${d.familyName}` } : null;
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

module.exports = { buildCalendar, computeStatus, isTestingMeeting };
