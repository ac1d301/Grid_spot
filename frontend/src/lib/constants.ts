export const SEASON_YEAR: number = (() => {
  const envValue = import.meta?.env?.VITE_SEASON_YEAR;
  const parsed = Number(envValue);
  if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  return 2024;
})();

export const OPENF1_BASE_URL = 'https://api.openf1.org/v1';

