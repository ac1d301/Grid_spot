// Shared helpers for Race Center comparison widgets.
import type { SessionResultRow } from '@/services/f1';

/**
 * The default driver selection for a comparison chart: the top `n` of the session
 * by classification position (race = finishing order, practice/quali = best-lap order).
 *
 * Only returns drivers that also appear in `withData` (the laps/telemetry payload), so we
 * never default-select a driver who has no trace to plot. If classification is missing or
 * yields nothing, falls back to `fallback` (e.g. the legacy "most laps" ordering) so the
 * chart never renders empty.
 */
export function topDriverNumbers(
  classification: SessionResultRow[] | undefined,
  withData: Array<{ driver_number: number }>,
  n: number,
  fallback: number[] = []
): number[] {
  const have = new Set(withData.map((d) => d.driver_number));
  const ranked = (classification ?? [])
    .filter((r) => typeof r.position === 'number' && have.has(r.driver_number))
    .sort((a, b) => (a.position as number) - (b.position as number))
    .map((r) => r.driver_number);

  const out = ranked.slice(0, n);
  // Top up from the fallback if classification didn't give us enough (or any).
  if (out.length < n) {
    for (const dn of fallback) {
      if (out.length >= n) break;
      if (!out.includes(dn) && have.has(dn)) out.push(dn);
    }
  }
  return out;
}
