// Current F1 season, auto-detected. Shows 2026 now and rolls to 2027 automatically.
// `VITE_SEASON_YEAR` remains an optional override for QA/testing only.
export function detectCurrentSeason(now: Date = new Date()): number {
  const y = now.getUTCFullYear();
  // The season finishes in early December. From December onward, surface the
  // upcoming season (its calendar is already published in OpenF1). Jan–Nov of a
  // given year already IS that year's season.
  return now.getUTCMonth() === 11 ? y + 1 : y;
}

export const SEASON_YEAR: number = (() => {
  const env = Number(import.meta?.env?.VITE_SEASON_YEAR);
  if (!Number.isNaN(env) && env > 2000) return env; // explicit override only
  return detectCurrentSeason();
})();
