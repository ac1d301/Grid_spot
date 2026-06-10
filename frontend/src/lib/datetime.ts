// Shared date/time utilities for the F1 portal.
//
// Correctness model — read this before changing anything:
//   * Inputs are always UTC instants (ISO strings like "2026-03-08T05:00:00+00:00",
//     or Date objects). `new Date(iso)` parses them to a real instant.
//   * ALL comparisons / countdowns are done on epoch milliseconds (getTime()).
//     An instant is an instant — this is timezone-independent and needs no conversion.
//   * Only DISPLAY is zoned, via Intl.DateTimeFormat({ timeZone: 'Asia/Kolkata' }).
//   * We NEVER reconstruct a Date from a localized string. The old code did
//     `new Date(d.toLocaleString("en-US",{timeZone:"Asia/Kolkata"}))`, which
//     produced an IST wall-clock string then re-parsed it as browser-local time —
//     wrong for every non-IST user. That whole class of bug is gone here.

const IST_TZ = 'Asia/Kolkata';
const LOCALE = 'en-IN';

const toDate = (utc: string | Date): Date => (utc instanceof Date ? utc : new Date(utc));
const isValid = (d: Date): boolean => !Number.isNaN(d.getTime());

/** "08 Mar 2026" */
export function formatISTDate(utc: string | Date): string {
  const d = toDate(utc);
  if (!isValid(d)) return 'TBA';
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: IST_TZ,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

/** "10:30 AM IST" */
export function formatISTTime(utc: string | Date): string {
  const d = toDate(utc);
  if (!isValid(d)) return 'TBA';
  const t = new Intl.DateTimeFormat(LOCALE, {
    timeZone: IST_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
  return `${t} IST`;
}

/** "Sun, 08 Mar 2026, 10:30 AM IST" (weekday optional) */
export function formatISTDateTime(
  utc: string | Date,
  opts: { weekday?: boolean } = {}
): string {
  const d = toDate(utc);
  if (!isValid(d)) return 'TBA';
  const formatted = new Intl.DateTimeFormat(LOCALE, {
    timeZone: IST_TZ,
    ...(opts.weekday ? { weekday: 'short' } : {}),
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
  return `${formatted} IST`;
}

/**
 * Countdown from now to a future UTC instant. Pure epoch math, timezone-independent.
 * Returns { expired, text }; past targets => { expired:true }.
 */
export function formatCountdown(targetUtc: string | Date): { expired: boolean; text: string } {
  const target = toDate(targetUtc).getTime();
  if (Number.isNaN(target)) return { expired: true, text: 'TBA' };
  const diff = target - Date.now();
  if (diff <= 0) return { expired: true, text: 'Live / Started' };
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (d > 0) return { expired: false, text: `${d}d ${h}h ${m}m` };
  if (h > 0) return { expired: false, text: `${h}h ${m}m` };
  return { expired: false, text: `${m}m` };
}

/** Lap/sector duration in seconds → "1:23.456" (or "23.456" under a minute). null → "—". */
export function formatLapTime(seconds: number | null | undefined): string {
  if (seconds == null || Number.isNaN(seconds)) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return m > 0 ? `${m}:${s.toFixed(3).padStart(6, '0')}` : s.toFixed(3);
}

/** Gap to leader: number (seconds) → "+1.234"; strings ("1 LAP") pass through; arrays
 *  (qualifying Q1/Q2/Q3) collapse to the last finite value; anything else → "—". */
export function formatGap(gap: unknown): string {
  if (Array.isArray(gap)) {
    const last = [...gap].reverse().find((x) => typeof x === 'number');
    return formatGap(last ?? null);
  }
  if (gap == null) return '—';
  if (typeof gap === 'string') return gap;
  if (typeof gap !== 'number' || Number.isNaN(gap)) return '—';
  return gap === 0 ? 'Leader' : `+${gap.toFixed(3)}`;
}

/** Relative time like "5m ago", "3h ago", "2d ago". Future/invalid → formatted IST date. */
export function formatRelative(utc: string | null | undefined): string {
  if (!utc) return '';
  const t = new Date(utc).getTime();
  if (Number.isNaN(t)) return '';
  const diff = Date.now() - t;
  if (diff < 0) return formatISTDate(utc);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return formatISTDate(utc);
}

export type SessionLike = { date_start: string; date_end: string; session_name?: string };
export type RaceStatus = 'upcoming' | 'live' | 'completed';

/**
 * Status of a race weekend from its sessions. All comparisons on epoch ms.
 * "live" = now within [earliest session start, latest session end + grace].
 * The grace window keeps a weekend "live" for a few hours after the race for
 * post-race coverage. Replaces the three divergent determineRaceStatus copies.
 */
export function getRaceStatus(sessions: SessionLike[], graceMs = 4 * 3_600_000): RaceStatus {
  if (!sessions || !sessions.length) return 'upcoming';
  const now = Date.now();
  const starts = sessions.map((s) => new Date(s.date_start).getTime());
  const ends = sessions.map((s) => new Date(s.date_end).getTime());
  const first = Math.min(...starts);
  const last = Math.max(...ends) + graceMs;
  if (now < first) return 'upcoming';
  if (now > last) return 'completed';
  return 'live';
}
