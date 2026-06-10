// Frontend F1 API layer. Talks ONLY to our backend gateway (which fronts OpenF1 +
// Jolpica with caching). No direct calls to api.openf1.org anymore. All timestamps
// returned are UTC ISO strings; format them with src/lib/datetime.ts.
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { SEASON_YEAR } from '../lib/constants';

// ---- Response types (mirror the backend contract) ----
export interface CalendarSession {
  session_key: number;
  name: string; // "Practice 1" | "Qualifying" | "Sprint" | "Race" ...
  type: string; // "Practice" | "Qualifying" | "Sprint" | "Race"
  date_start: string; // UTC ISO
  date_end: string; // UTC ISO
}

export interface CalendarRace {
  round: number;
  meeting_key: number;
  name: string; // e.g. "Australia Grand Prix"
  country: string;
  location: string;
  circuit: string;
  circuit_key?: number;
  isSprint: boolean;
  status: 'upcoming' | 'live' | 'completed';
  race_start: string | null;
  race_end: string | null;
  winner: string | null;
  sessions: CalendarSession[];
}

export interface CalendarResponse {
  season: number;
  totalRounds: number;
  races: CalendarRace[];
}

export interface DriverStanding {
  position: number;
  points: number;
  wins: number;
  driverId: string;
  givenName: string;
  familyName: string;
  nationality: string;
  permanentNumber: number | null;
  driver_number: number | null;
  name_acronym: string;
  team: string | null;
  teamColor: string | null;
  headshot_url: string | null;
  // Present only when fetched with { career: true }
  careerWins?: number;
  careerPodiums?: number;
  careerPoles?: number;
}

export interface ConstructorStanding {
  position: number;
  points: number;
  wins: number;
  constructorId: string;
  name: string;
  nationality: string;
}

export interface DriverCareer {
  driver_number: number;
  driverId: string;
  name: string;
  headshot_url: string | null;
  careerWins: number;
  careerPodiums: number;
  careerPoles: number;
}

// ---- Race Center session-data types ----
export interface DriverRef {
  driver_number: number;
  name: string | null;
  acronym: string | null;
  team: string | null;
  color: string | null;
  headshot: string | null;
}

export interface SessionResultRow extends DriverRef {
  position: number | null;
  teamColor: string | null;
  driverId: string | null;
  points: number;
  laps: number | null;
  gap: number | string | null;
  dnf: boolean;
  dns: boolean;
  dsq: boolean;
  is_fastest_lap: boolean;
}
export interface ResultsResponse {
  session_key: number;
  status: string;
  fastest_lap: (DriverRef & { lap_number: number; lap_duration: number }) | null;
  classification: SessionResultRow[];
}

export interface LapPoint {
  lap_number: number;
  lap_duration: number | null;
  sectors: [number | null, number | null, number | null];
  is_pit_out_lap: boolean;
  st_speed: number | null;
}
export interface DriverLaps {
  driver_number: number;
  name: string | null;
  acronym: string | null;
  color: string | null;
  laps: LapPoint[];
  raw_count: number;
}
export interface LapsResponse { session_key: number; drivers: DriverLaps[] }

export interface QualiPhase {
  time: number;
  sectors: [number | null, number | null, number | null];
}
export interface QualiRow {
  driver_number: number;
  name: string | null;
  acronym: string | null;
  color: string | null;
  position: number | null;
  q1: QualiPhase | null;
  q2: QualiPhase | null;
  q3: QualiPhase | null;
}
export interface QualifyingResponse { session_key: number; drivers: QualiRow[] }

export interface Stint {
  stint_number: number;
  compound: string | null;
  lap_start: number;
  lap_end: number;
  tyre_age_at_start: number | null;
  laps_on_tyre: number | null;
}
export interface PitStop { lap_number: number; pit_duration: number | null }
export interface DriverStrategy extends DriverRef { stints: Stint[]; pit_stops: PitStop[] }
export interface StrategyResponse { session_key: number; drivers: DriverStrategy[] }

export interface SectorLeader extends DriverRef { time?: number; speed?: number }
export interface SectorsResponse {
  session_key: number;
  fastest_sectors: { s1: SectorLeader | null; s2: SectorLeader | null; s3: SectorLeader | null };
  speed_trap: SectorLeader | null;
}

export interface WeatherSample {
  date: string;
  air: number; track: number; humidity: number; pressure: number;
  wind_speed: number; wind_direction: number; rainfall: number;
}
export interface WeatherResponse { session_key: number; latest: WeatherSample | null; series: WeatherSample[] }

export interface RaceControlEntry {
  date: string; category: string; flag: string | null; scope: string | null;
  sector: number | null; driver_number: number | null; lap_number: number | null; message: string;
}
export interface RaceControlResponse { session_key: number; current_flag: string | null; log: RaceControlEntry[] }

export interface RadioClip extends DriverRef { date: string; recording_url: string }
export interface RadioResponse { session_key: number; clips: RadioClip[] }

export interface LiveEntry extends DriverRef {
  position: number | null;
  gap_to_leader: number | string | null;
  interval: number | string | null;
  drs: boolean;
  as_of: string;
}
export interface LiveResponse {
  session_key: number; status: string; is_race: boolean;
  current_flag: string | null; updated_at: string; leaderboard: LiveEntry[];
}

// ---- News ----
export interface NewsItem {
  title: string;
  link: string;
  source: string | null;
  published: string | null;
}
export interface NewsResponse { category: string; count: number; items: NewsItem[] }

// ---- Telemetry types ----
export interface TelemetryPoint {
  date: string; speed: number; throttle: number; brake: number;
  n_gear: number; rpm: number; drs: number | null;
}
export interface TelemetryLapResponse {
  session_key: number; driver_number: number; lap_number: number;
  count: number; points: TelemetryPoint[];
}
export interface TrackCar { driver_number: number; acronym: string | null; color: string | null; x: number; y: number; date: string }
export interface TrackMapResponse {
  session_key: number; at: string;
  bounds: { minX: number; maxX: number; minY: number; maxY: number } | null;
  count: number; positions: TrackCar[];
}

// ---- Profile types ----
export interface SeasonResultRow {
  round: number; raceName: string; circuit: string; date: string;
  grid: number | null; position: number | null; points: number | null;
  status: string; constructor: string | null; constructorId: string | null;
}
export interface DriverProfile {
  driverId: string;
  season: number;
  driver: { driverId: string; name: string; nationality: string; number: number | null; dateOfBirth: string | null } | null;
  career: { careerWins: number; careerPodiums: number; careerPoles: number };
  currentTeam: string | null;
  seasonPoints: number;
  seasonResults: SeasonResultRow[];
  teammate: { teammateId: string; raceHeadToHead: { driver: number; teammate: number } } | null;
}
export interface ConstructorProfile {
  constructorId: string;
  season: number;
  constructor: { constructorId: string; name: string; nationality: string } | null;
  season_position: number | null;
  season_points: number | null;
  season_wins: number | null;
  lineup: { driverId: string; name: string; number: number | null }[];
}

// 30s timeout: the very first career-standings call on a cold backend cache fans
// out per-driver Jolpica queries; every later call is served from cache in <1s.
const http = axios.create({ baseURL: API_BASE_URL, timeout: 30_000 });

export function currentSeason(): number {
  return SEASON_YEAR;
}

export const f1Api = {
  async getCalendar(year: number = SEASON_YEAR): Promise<CalendarResponse> {
    const { data } = await http.get<CalendarResponse>('/calendar', { params: { year } });
    return data;
  },

  async getDriverStandings(
    year: number = SEASON_YEAR,
    opts: { career?: boolean } = {}
  ): Promise<DriverStanding[]> {
    const params: Record<string, unknown> = { year };
    if (opts.career) params.career = 1;
    const { data } = await http.get<{ season: number; standings: DriverStanding[] }>(
      '/standings/drivers',
      // Career fetches can take ~25s on a cold backend cache (one-time); give them room.
      { params, timeout: opts.career ? 90_000 : 30_000 }
    );
    return data.standings;
  },

  async getConstructorStandings(year: number = SEASON_YEAR): Promise<ConstructorStanding[]> {
    const { data } = await http.get<{ season: number; standings: ConstructorStanding[] }>(
      '/standings/constructors',
      { params: { year } }
    );
    return data.standings;
  },

  async getDriverCareer(driverNumber: number, year: number = SEASON_YEAR): Promise<DriverCareer> {
    const { data } = await http.get<DriverCareer>(`/drivers/${driverNumber}/career`, {
      params: { year },
    });
    return data;
  },

  // ---- Race Center session views ----
  async getResults(sessionKey: number): Promise<ResultsResponse> {
    return (await http.get<ResultsResponse>(`/session/${sessionKey}/results`)).data;
  },
  async getLaps(sessionKey: number, drivers?: number[]): Promise<LapsResponse> {
    return (await http.get<LapsResponse>(`/session/${sessionKey}/laps`, {
      params: drivers?.length ? { drivers: drivers.join(',') } : undefined,
    })).data;
  },
  async getQualifying(sessionKey: number): Promise<QualifyingResponse> {
    return (await http.get<QualifyingResponse>(`/session/${sessionKey}/qualifying`)).data;
  },
  async getStrategy(sessionKey: number): Promise<StrategyResponse> {
    return (await http.get<StrategyResponse>(`/session/${sessionKey}/strategy`)).data;
  },
  async getSectors(sessionKey: number): Promise<SectorsResponse> {
    return (await http.get<SectorsResponse>(`/session/${sessionKey}/sectors`)).data;
  },
  async getWeather(sessionKey: number): Promise<WeatherResponse> {
    return (await http.get<WeatherResponse>(`/session/${sessionKey}/weather`)).data;
  },
  async getRaceControl(sessionKey: number): Promise<RaceControlResponse> {
    return (await http.get<RaceControlResponse>(`/session/${sessionKey}/racecontrol`)).data;
  },
  async getRadio(sessionKey: number): Promise<RadioResponse> {
    return (await http.get<RadioResponse>(`/session/${sessionKey}/radio`)).data;
  },
  async getLive(sessionKey: number): Promise<LiveResponse> {
    return (await http.get<LiveResponse>(`/session/${sessionKey}/live`)).data;
  },

  // ---- Telemetry (opt-in, heavy) ----
  async getTelemetryLap(sessionKey: number, driver: number, lap: number): Promise<TelemetryLapResponse> {
    return (await http.get<TelemetryLapResponse>(`/session/${sessionKey}/telemetry/lap`, {
      params: { driver, lap }, timeout: 45_000,
    })).data;
  },
  async getTrackMap(sessionKey: number, at?: string): Promise<TrackMapResponse> {
    return (await http.get<TrackMapResponse>(`/session/${sessionKey}/trackmap`, {
      params: at ? { at } : undefined,
    })).data;
  },

  // ---- Profiles ----
  async getDriverProfile(driverId: string, year: number = SEASON_YEAR): Promise<DriverProfile> {
    return (await http.get<DriverProfile>(`/profile/driver/${driverId}`, { params: { year } })).data;
  },
  async getConstructorProfile(constructorId: string, year: number = SEASON_YEAR): Promise<ConstructorProfile> {
    return (await http.get<ConstructorProfile>(`/profile/constructor/${constructorId}`, { params: { year } })).data;
  },

  // ---- News ----
  async getNews(category = 'trending', limit = 30): Promise<NewsResponse> {
    return (await http.get<NewsResponse>('/news', { params: { category, limit } })).data;
  },

  // Generic OpenF1 passthrough for anything not yet first-classed.
  async openf1<T = unknown>(path: string, params?: Record<string, unknown>): Promise<T> {
    const clean = path.replace(/^\/+/, '');
    const { data } = await http.get<T>(`/openf1/${clean}`, { params });
    return data;
  },
};
