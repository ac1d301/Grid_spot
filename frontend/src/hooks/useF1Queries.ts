// React Query hooks over the backend F1 gateway. The backend already caches upstream
// data, so frontend cadence is conservative. Cadence per data type:
//   calendar  -> long (schedule is near-static; winners settle hours after a race)
//   standings -> medium (settle once per race weekend)
//   live      -> short, and only while a session is actually live
import { useQuery } from '@tanstack/react-query';
import { f1Api, currentSeason } from '@/services/f1';
import { getRaceStatus } from '@/lib/datetime';
import { usePageVisible } from '@/hooks/usePageVisible';

export const qk = {
  calendar: (year: number) => ['calendar', year] as const,
  driverStandings: (year: number) => ['standings', 'drivers', year] as const,
  constructorStandings: (year: number) => ['standings', 'constructors', year] as const,
  // session widgets, keyed by sessionKey
  results: (k: number) => ['session', k, 'results'] as const,
  laps: (k: number, drivers?: number[]) => ['session', k, 'laps', drivers?.join(',') ?? 'all'] as const,
  qualifying: (k: number) => ['session', k, 'qualifying'] as const,
  strategy: (k: number) => ['session', k, 'strategy'] as const,
  sectors: (k: number) => ['session', k, 'sectors'] as const,
  weather: (k: number) => ['session', k, 'weather'] as const,
  raceControl: (k: number) => ['session', k, 'racecontrol'] as const,
  radio: (k: number) => ['session', k, 'radio'] as const,
  live: (k: number) => ['session', k, 'live'] as const,
  driverProfile: (id: string, year: number) => ['profile', 'driver', id, year] as const,
  constructorProfile: (id: string, year: number) => ['profile', 'constructor', id, year] as const,
  telemetry: (k: number, d: number, lap: number) => ['session', k, 'telemetry', d, lap] as const,
  trackmap: (k: number, at?: string) => ['session', k, 'trackmap', at ?? 'live'] as const,
};

// Completed/upcoming session data is static history: cache hard, never poll.
const STATIC = { staleTime: 24 * 60 * 60_000, gcTime: 60 * 60_000 } as const;

export function useCalendar(year = currentSeason()) {
  // Schedule is near-static; winners settle hours after a race. Live freshness is handled
  // separately by useLiveCalendar, so this caches hard — but self-heal if the backend
  // briefly degraded the calendar to empty during a cold start.
  return useQuery({
    queryKey: qk.calendar(year),
    queryFn: () => f1Api.getCalendar(year),
    staleTime: 60 * 60_000,
    refetchInterval: (q) => (!q.state.data?.races?.length && q.state.dataUpdateCount < 6 ? 10_000 : false),
  });
}

// Shares the calendar cache, but short-polls (60s) only while a session is live,
// so we don't hammer the backend off-weekend.
export function useLiveCalendar(year = currentSeason()) {
  return useQuery({
    queryKey: qk.calendar(year),
    queryFn: () => f1Api.getCalendar(year),
    staleTime: 60_000,
    refetchInterval: (query) => {
      const data = query.state.data;
      // Self-heal a cold-start degraded (empty) calendar, then fall back to live/idle cadence.
      if (!data?.races?.length && query.state.dataUpdateCount < 6) return 10_000;
      const anyLive = data?.races?.some((r) => getRaceStatus(r.sessions) === 'live');
      return anyLive ? 60_000 : 30 * 60_000;
    },
  });
}

// While the list is empty (e.g. the backend briefly degraded standings to [] during a cold
// start), poll so it self-heals once the cache warms; stop once we have data OR after a few
// tries (so a *legitimately* empty list — e.g. pre-season — doesn't poll forever).
const refetchWhileEmpty =
  <T,>(ms = 10_000, maxPolls = 6) =>
  (query: { state: { data?: T[]; dataUpdateCount: number } }) =>
    !(Array.isArray(query.state.data) && query.state.data.length) && query.state.dataUpdateCount < maxPolls ? ms : false;

export function useDriverStandings(year = currentSeason(), career = false) {
  // Standings only change after a race. Cache for 5min; don't background-poll (a refetch
  // fires on remount/refocus-as-needed instead of every 5min for every visitor).
  return useQuery({
    queryKey: [...qk.driverStandings(year), career ? 'career' : 'season'] as const,
    queryFn: () => f1Api.getDriverStandings(year, { career }),
    staleTime: 5 * 60_000,
    refetchInterval: refetchWhileEmpty(),
  });
}

export function useConstructorStandings(year = currentSeason()) {
  return useQuery({
    queryKey: qk.constructorStandings(year),
    queryFn: () => f1Api.getConstructorStandings(year),
    staleTime: 5 * 60_000,
    refetchInterval: refetchWhileEmpty(),
  });
}

// ---- Race Center session widgets ----
// `enabled` is the widget's tab being mounted + the session having started.
export const useResults = (k?: number, enabled = true) =>
  useQuery({ queryKey: qk.results(k!), queryFn: () => f1Api.getResults(k!), enabled: !!k && enabled, ...STATIC });

export const useLaps = (k?: number, drivers?: number[], enabled = true) =>
  useQuery({ queryKey: qk.laps(k!, drivers), queryFn: () => f1Api.getLaps(k!, drivers), enabled: !!k && enabled, ...STATIC });

export const useStrategy = (k?: number, enabled = true) =>
  useQuery({ queryKey: qk.strategy(k!), queryFn: () => f1Api.getStrategy(k!), enabled: !!k && enabled, ...STATIC });

export const useQualifying = (k?: number, enabled = true) =>
  useQuery({ queryKey: qk.qualifying(k!), queryFn: () => f1Api.getQualifying(k!), enabled: !!k && enabled, ...STATIC });

export const useSectors = (k?: number, enabled = true) =>
  useQuery({ queryKey: qk.sectors(k!), queryFn: () => f1Api.getSectors(k!), enabled: !!k && enabled, ...STATIC });

export const useRaceControl = (k?: number, enabled = true) =>
  useQuery({ queryKey: qk.raceControl(k!), queryFn: () => f1Api.getRaceControl(k!), enabled: !!k && enabled, ...STATIC });

export const useRadio = (k?: number, enabled = true) =>
  useQuery({ queryKey: qk.radio(k!), queryFn: () => f1Api.getRadio(k!), enabled: !!k && enabled, ...STATIC });

// Weather: poll slowly (60s) while live, static when completed.
export function useWeather(k?: number, isLive = false, enabled = true) {
  const visible = usePageVisible();
  return useQuery({
    queryKey: qk.weather(k!),
    queryFn: () => f1Api.getWeather(k!),
    enabled: !!k && enabled,
    staleTime: isLive ? 30_000 : STATIC.staleTime,
    refetchInterval: isLive && visible ? 60_000 : false,
  });
}

// Live leaderboard: short poll, gated on live + tab visible + enabled.
export function useLive(k?: number, isLive = false, enabled = true) {
  const visible = usePageVisible();
  const active = !!k && enabled && isLive && visible;
  return useQuery({
    queryKey: qk.live(k!),
    queryFn: () => f1Api.getLive(k!),
    enabled: !!k && enabled && isLive,
    staleTime: 0,
    refetchInterval: active ? 13_000 : false,
  });
}

// ---- Telemetry (opt-in) ----
export const useTelemetryLap = (k?: number, driver?: number, lap?: number, enabled = true) =>
  useQuery({
    queryKey: qk.telemetry(k!, driver!, lap!),
    queryFn: () => f1Api.getTelemetryLap(k!, driver!, lap!),
    enabled: !!k && !!driver && !!lap && enabled,
    ...STATIC,
  });

export function useTrackMap(k?: number, at?: string, isLive = false, enabled = false) {
  const visible = usePageVisible();
  const polling = isLive && !at && visible && enabled;
  return useQuery({
    queryKey: qk.trackmap(k!, at),
    queryFn: () => f1Api.getTrackMap(k!, at),
    enabled: !!k && enabled,
    staleTime: at ? STATIC.staleTime : 0,
    refetchInterval: polling ? 4_000 : false,
  });
}

// ---- News (auto-refreshes every 5 min, but only while the tab is visible) ----
export function useNews(category = 'trending', limit = 30) {
  const visible = usePageVisible();
  return useQuery({
    queryKey: ['news', category, limit],
    queryFn: () => f1Api.getNews(category, limit),
    staleTime: 5 * 60_000,
    refetchInterval: visible ? 5 * 60_000 : false,
  });
}

// ---- Profiles ----
export const useDriverProfile = (id?: string, year = currentSeason()) =>
  useQuery({
    queryKey: qk.driverProfile(id!, year),
    queryFn: () => f1Api.getDriverProfile(id!, year),
    enabled: !!id,
    staleTime: 60 * 60_000,
  });

export const useConstructorProfile = (id?: string, year = currentSeason()) =>
  useQuery({
    queryKey: qk.constructorProfile(id!, year),
    queryFn: () => f1Api.getConstructorProfile(id!, year),
    enabled: !!id,
    staleTime: 60 * 60_000,
  });
