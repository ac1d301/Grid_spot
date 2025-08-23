
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { SEASON_YEAR, OPENF1_BASE_URL } from '@/lib/constants';

const BASE_URL = OPENF1_BASE_URL;
const CURRENT_SEASON = SEASON_YEAR;

interface Session {
  session_name: string;
  session_type: string;
  country: string;
  location: string;
  circuit_short_name: string;
  circuit_full_name: string;
  date: string;
  start_time: string;
  end_time: string;
  round: number;
  year: number;
}

interface Driver {
  driver_number: number;
  broadcast_name: string;
  full_name: string;
  name_acronym: string;
  team_name: string;
  team_color: string;
  first_name: string;
  last_name: string;
  country_code: string;
}

interface Result {
  position: number;
  driver_number: number;
  broadcast_name: string;
  team_name: string;
  status: string;
  lap_time_ms: number;
  lap_number: number;
  stints: number;
  compound: string;
  total_laps: number;
}

export const useCurrentSeasonRaces = () => {
  return useQuery({
    queryKey: ['races', CURRENT_SEASON],
    queryFn: async () => {
      const response = await axios.get<Session[]>(`${BASE_URL}/sessions`, {
        params: { year: CURRENT_SEASON },
      });
      
      // Group sessions by round to create race weekends
      const raceWeekends = new Map<number, any>();
      
      response.data.forEach(session => {
        if (!raceWeekends.has(session.round)) {
          raceWeekends.set(session.round, {
            round: session.round,
            raceName: session.circuit_full_name,
            circuitId: session.circuit_short_name,
            Circuit: {
              circuitId: session.circuit_short_name,
              circuitName: session.circuit_full_name,
              Location: {
                locality: session.location,
                country: session.country
              }
            },
            date: session.date,
            time: session.start_time,
            sessions: {}
          });
        }

        const race = raceWeekends.get(session.round);
        race.sessions[session.session_name.toLowerCase()] = {
          date: session.date,
          time: session.start_time
        };
      });

      return Array.from(raceWeekends.values())
        .sort((a, b) => a.round - b.round);
    },
  });
};

export const useRaceResults = (round: number) => {
  return useQuery({
    queryKey: ['raceResults', round],
    queryFn: async () => {
      const response = await axios.get<Result[]>(`${BASE_URL}/results`, {
        params: { round, year: CURRENT_SEASON },
      });
      
      // Get driver details for each result
      const driversResponse = await axios.get<Driver[]>(`${BASE_URL}/drivers`, {
        params: { year: CURRENT_SEASON },
      });
      const driversMap = new Map(driversResponse.data.map(d => [d.driver_number, d]));

      const results = response.data.map(result => ({
        position: result.position,
        Driver: {
          driverId: result.driver_number.toString(),
          permanentNumber: result.driver_number,
          code: driversMap.get(result.driver_number)?.name_acronym || '',
          givenName: driversMap.get(result.driver_number)?.first_name || '',
          familyName: driversMap.get(result.driver_number)?.last_name || '',
          nationality: driversMap.get(result.driver_number)?.country_code || ''
        },
        Constructor: {
          constructorId: result.team_name.toLowerCase().replace(/\s+/g, '_'),
          name: result.team_name
        },
        Time: {
          millis: result.lap_time_ms,
          time: formatTime(result.lap_time_ms)
        },
        status: result.status,
        laps: result.total_laps
      }));

      return {
        round,
        Results: results
      };
    },
    enabled: !!round,
  });
};

export const useDriverStandings = () => {
  return useQuery({
    queryKey: ['driverStandings'],
    queryFn: async () => {
      // Get all results to calculate standings
      const response = await axios.get<Result[]>(`${BASE_URL}/results`, {
        params: { year: CURRENT_SEASON },
      });
      const driversResponse = await axios.get<Driver[]>(`${BASE_URL}/drivers`, {
        params: { year: CURRENT_SEASON },
      });
      
      // Calculate points based on F1 scoring system
      const pointsSystem = {
        1: 25, 2: 18, 3: 15, 4: 12, 5: 10,
        6: 8, 7: 6, 8: 4, 9: 2, 10: 1
      };

      const standings = new Map<number, any>();

      response.data.forEach(result => {
        const points = pointsSystem[result.position as keyof typeof pointsSystem] || 0;
        const driver = driversResponse.data.find(d => d.driver_number === result.driver_number);

        if (!driver) return;

        if (!standings.has(driver.driver_number)) {
          standings.set(driver.driver_number, {
            position: 0,
            points: 0,
            wins: 0,
            Driver: {
              driverId: driver.driver_number.toString(),
              permanentNumber: driver.driver_number,
              code: driver.name_acronym,
              givenName: driver.first_name,
              familyName: driver.last_name,
              nationality: driver.country_code
            },
            Constructors: [{
              constructorId: driver.team_name.toLowerCase().replace(/\s+/g, '_'),
              name: driver.team_name
            }]
          });
        }

        const standing = standings.get(driver.driver_number);
        standing.points += points;
        if (result.position === 1) standing.wins++;
      });

      // Sort by points and assign positions
      return Array.from(standings.values())
        .sort((a, b) => b.points - a.points)
        .map((standing, index) => ({
          ...standing,
          position: index + 1
        }));
    },
  });
};

// Helper function to format milliseconds to MM:SS.sss
const formatTime = (ms: number): string => {
  if (!ms) return '';
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(3);
  return `${minutes}:${(Number(seconds) < 10 ? '0' : '')}${seconds}`;
};

// Note: Constructor standings are not directly available in OpenF1 API
// We would need to calculate them from race results if needed
