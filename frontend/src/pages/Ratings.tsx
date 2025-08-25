import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DriverCard } from '@/components/DriverCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface DriverStanding {
  driverId: string;
  permanentNumber: number;
  givenName: string;
  familyName: string;
  nationality: string;
  team: string;
  teamColor: string;
  position: number;
  points: number;
  wins: number;
  careerWins: number;
  careerPodiums: number;
  careerPoles: number;
  headshot_url: string;
}

interface FilterOptions {
  team?: string;
  nationality?: string;
  minPoints?: number;
  maxPoints?: number;
  minCareerWins?: number;
  maxCareerWins?: number;
  minCareerPodiums?: number;
  maxCareerPodiums?: number;
  minCareerPoles?: number;
  maxCareerPoles?: number;
}

type OpenF1Session = {
  session_key: number;
  session_name?: string;     // "Race", "Sprint", etc.
  session_type?: string;     // "Race", "Sprint", etc.
};

type OpenF1Result = {
  driver_number?: number;
  position?: number | string;         // sometimes string ("R", "DQ") or number
  fastest_lap_rank?: number;
  fastest_lap?: number;               // sometimes used as a boolean-ish 1
  fastest_lap_time_ms?: number;
  best_lap_time_ms?: number;
  best_lap_time?: number;
  fastest_lap_time?: number;
};

const Ratings = () => {
  const [sortBy, setSortBy] = useState<'points' | 'name' | 'position' | 'careerWins' | 'careerPodiums' | 'careerPoles'>('points');
  const [page, setPage] = useState(1);
  const [standings, setStandings] = useState<DriverStanding[]>([]);
  const [filteredStandings, setFilteredStandings] = useState<DriverStanding[]>([]);
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [showFilters, setShowFilters] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const DRIVERS_PER_PAGE = 20;
  const currentYear = 2025;
  const totalPages = Math.ceil(filteredStandings.length / DRIVERS_PER_PAGE);

  // Official 2025 F1 Driver Standings with Career Stats (fallback cache)
  const OFFICIAL_2025_STANDINGS: DriverStanding[] = [
    {
      driverId: 'piastri',
      permanentNumber: 81,
      givenName: 'Oscar',
      familyName: 'Piastri',
      nationality: 'AUS',
      team: 'McLaren',
      teamColor: 'FF8000',
      position: 1,
      points: 284,
      wins: 8,
      careerWins: 8,
      careerPodiums: 15,
      careerPoles: 2,
      headshot_url: 'https://www.formula1.com/content/dam/fom-website/drivers/O/OSCPIA01_Oscar_Piastri/oscpia01.png.transform/1col/image.png'
    },
    {
      driverId: 'norris',
      permanentNumber: 4,
      givenName: 'Lando',
      familyName: 'Norris',
      nationality: 'GBR',
      team: 'McLaren',
      teamColor: 'FF8000',
      position: 2,
      points: 275,
      wins: 6,
      careerWins: 12,
      careerPodiums: 27,
      careerPoles: 3,
      headshot_url: 'https://www.formula1.com/content/dam/fom-website/drivers/L/LANNOR01_Lando_Norris/lannor01.png.transform/1col/image.png'
    },
    {
      driverId: 'max_verstappen',
      permanentNumber: 1,
      givenName: 'Max',
      familyName: 'Verstappen',
      nationality: 'NED',
      team: 'Red Bull Racing',
      teamColor: '3671C6',
      position: 3,
      points: 187,
      wins: 4,
      careerWins: 65,
      careerPodiums: 117,
      careerPoles: 44,
      headshot_url: 'https://www.formula1.com/content/dam/fom-website/drivers/M/MAXVER01_Max_Verstappen/maxver01.png.transform/1col/image.png'
    },
    {
      driverId: 'russell',
      permanentNumber: 63,
      givenName: 'George',
      familyName: 'Russell',
      nationality: 'GBR',
      team: 'Mercedes',
      teamColor: '27F4D2',
      position: 4,
      points: 172,
      wins: 3,
      careerWins: 3,
      careerPodiums: 14,
      careerPoles: 3,
      headshot_url: 'https://www.formula1.com/content/dam/fom-website/drivers/G/GEORUS01_George_Russell/georus01.png.transform/1col/image.png'
    },
    {
      driverId: 'leclerc',
      permanentNumber: 16,
      givenName: 'Charles',
      familyName: 'Leclerc',
      nationality: 'MON',
      team: 'Ferrari',
      teamColor: 'E8002D',
      position: 5,
      points: 151,
      wins: 2,
      careerWins: 7,
      careerPodiums: 35,
      careerPoles: 26,
      headshot_url: 'https://www.formula1.com/content/dam/fom-website/drivers/C/CHALEC01_Charles_Leclerc/chalec01.png.transform/1col/image.png'
    },
    {
      driverId: 'hamilton',
      permanentNumber: 44,
      givenName: 'Lewis',
      familyName: 'Hamilton',
      nationality: 'GBR',
      team: 'Ferrari',
      teamColor: 'E8002D',
      position: 6,
      points: 109,
      wins: 0,
      careerWins: 105,
      careerPodiums: 202,
      careerPoles: 104,
      headshot_url: 'https://www.formula1.com/content/dam/fom-website/drivers/L/LEWHAM01_Lewis_Hamilton/lewham01.png.transform/1col/image.png'
    },
    {
      driverId: 'antonelli',
      permanentNumber: 12,
      givenName: 'Andrea Kimi',
      familyName: 'Antonelli',
      nationality: 'ITA',
      team: 'Mercedes',
      teamColor: '27F4D2',
      position: 7,
      points: 64,
      wins: 0,
      careerWins: 0,
      careerPodiums: 1,
      careerPoles: 0,
      headshot_url: 'https://www.formula1.com/content/dam/fom-website/drivers/A/ANDANT01_Andrea_Kimi_Antonelli/andant01.png.transform/1col/image.png'
    },
    {
      driverId: 'albon',
      permanentNumber: 23,
      givenName: 'Alexander',
      familyName: 'Albon',
      nationality: 'THA',
      team: 'Williams',
      teamColor: '64C4FF',
      position: 8,
      points: 54,
      wins: 0,
      careerWins: 0,
      careerPodiums: 2,
      careerPoles: 0,
      headshot_url: 'https://www.formula1.com/content/dam/fom-website/drivers/A/ALEALB01_Alexander_Albon/alealb01.png.transform/1col/image.png'
    },
    {
      driverId: 'hulkenberg',
      permanentNumber: 27,
      givenName: 'Nico',
      familyName: 'Hulkenberg',
      nationality: 'GER',
      team: 'Kick Sauber',
      teamColor: '52E252',
      position: 9,
      points: 37,
      wins: 0,
      careerWins: 0,
      careerPodiums: 0,
      careerPoles: 1,
      headshot_url: 'https://www.formula1.com/content/dam/fom-website/drivers/N/NICHUL01_Nico_Hulkenberg/nichul01.png.transform/1col/image.png'
    },
    {
      driverId: 'ocon',
      permanentNumber: 31,
      givenName: 'Esteban',
      familyName: 'Ocon',
      nationality: 'FRA',
      team: 'Haas',
      teamColor: 'B6BABD',
      position: 10,
      points: 27,
      wins: 0,
      careerWins: 1,
      careerPodiums: 3,
      careerPoles: 0,
      headshot_url: 'https://www.formula1.com/content/dam/fom-website/drivers/E/ESTOCO01_Esteban_Ocon/estoco01.png.transform/1col/image.png'
    },
    {
      driverId: 'alonso',
      permanentNumber: 14,
      givenName: 'Fernando',
      familyName: 'Alonso',
      nationality: 'ESP',
      team: 'Aston Martin',
      teamColor: '229971',
      position: 11,
      points: 26,
      wins: 0,
      careerWins: 32,
      careerPodiums: 106,
      careerPoles: 22,
      headshot_url: 'https://www.formula1.com/content/dam/fom-website/drivers/F/FERALO01_Fernando_Alonso/feralo01.png.transform/1col/image.png'
    },
    {
      driverId: 'stroll',
      permanentNumber: 18,
      givenName: 'Lance',
      familyName: 'Stroll',
      nationality: 'CAN',
      team: 'Aston Martin',
      teamColor: '229971',
      position: 12,
      points: 26,
      wins: 0,
      careerWins: 0,
      careerPodiums: 3,
      careerPoles: 1,
      headshot_url: 'https://www.formula1.com/content/dam/fom-website/drivers/L/LANSTR01_Lance_Stroll/lanstr01.png.transform/1col/image.png'
    },
    {
      driverId: 'hadjar',
      permanentNumber: 6,
      givenName: 'Isack',
      familyName: 'Hadjar',
      nationality: 'FRA',
      team: 'Racing Bulls',
      teamColor: '6692FF',
      position: 13,
      points: 22,
      wins: 0,
      careerWins: 0,
      careerPodiums: 0,
      careerPoles: 0,
      headshot_url: 'https://www.formula1.com/content/dam/fom-website/drivers/I/ISAHAD01_Isack_Hadjar/isahad01.png.transform/1col/image.png'
    },
    {
      driverId: 'gasly',
      permanentNumber: 10,
      givenName: 'Pierre',
      familyName: 'Gasly',
      nationality: 'FRA',
      team: 'Alpine',
      teamColor: '0093CC',
      position: 14,
      points: 20,
      wins: 0,
      careerWins: 1,
      careerPodiums: 4,
      careerPoles: 0,
      headshot_url: 'https://www.formula1.com/content/dam/fom-website/drivers/P/PIEGAS01_Pierre_Gasly/piegas01.png.transform/1col/image.png'
    },
    {
      driverId: 'lawson',
      permanentNumber: 30,
      givenName: 'Liam',
      familyName: 'Lawson',
      nationality: 'NZL',
      team: 'Racing Bulls',
      teamColor: '6692FF',
      position: 15,
      points: 20,
      wins: 0,
      careerWins: 0,
      careerPodiums: 0,
      careerPoles: 0,
      headshot_url: 'https://www.formula1.com/content/dam/fom-website/drivers/L/LIALAW01_Liam_Lawson/lialaw01.png.transform/1col/image.png'
    },
    {
      driverId: 'sainz',
      permanentNumber: 55,
      givenName: 'Carlos',
      familyName: 'Sainz Jr',
      nationality: 'ESP',
      team: 'Williams',
      teamColor: '64C4FF',
      position: 16,
      points: 16,
      wins: 0,
      careerWins: 4,
      careerPodiums: 25,
      careerPoles: 6,
      headshot_url: 'https://www.formula1.com/content/dam/fom-website/drivers/C/CARSAI01_Carlos_Sainz/carsai01.png.transform/1col/image.png'
    },
    {
      driverId: 'bortoleto',
      permanentNumber: 5,
      givenName: 'Gabriel',
      familyName: 'Bortoleto',
      nationality: 'BRA',
      team: 'Kick Sauber',
      teamColor: '52E252',
      position: 17,
      points: 14,
      wins: 0,
      careerWins: 0,
      careerPodiums: 0,
      careerPoles: 0,
      headshot_url: 'https://www.formula1.com/content/dam/fom-website/drivers/G/GABORT01_Gabriel_Bortoleto/gabort01.png.transform/1col/image.png'
    },
    {
      driverId: 'tsunoda',
      permanentNumber: 22,
      givenName: 'Yuki',
      familyName: 'Tsunoda',
      nationality: 'JPN',
      team: 'Red Bull Racing',
      teamColor: '3671C6',
      position: 18,
      points: 10,
      wins: 0,
      careerWins: 0,
      careerPodiums: 0,
      careerPoles: 0,
      headshot_url: 'https://www.formula1.com/content/dam/fom-website/drivers/Y/YUKTSU01_Yuki_Tsunoda/yuktsu01.png.transform/1col/image.png'
    },
    {
      driverId: 'bearman',
      permanentNumber: 87,
      givenName: 'Oliver',
      familyName: 'Bearman',
      nationality: 'GBR',
      team: 'Haas',
      teamColor: 'B6BABD',
      position: 19,
      points: 8,
      wins: 0,
      careerWins: 0,
      careerPodiums: 0,
      careerPoles: 0,
      headshot_url: 'https://www.formula1.com/content/dam/fom-website/drivers/O/OLIBEA01_Oliver_Bearman/olibea01.png.transform/1col/image.png'
    },
    {
      driverId: 'colapinto',
      permanentNumber: 43,
      givenName: 'Franco',
      familyName: 'Colapinto',
      nationality: 'ARG',
      team: 'Alpine',
      teamColor: '0093CC',
      position: 20,
      points: 0,
      wins: 0,
      careerWins: 0,
      careerPodiums: 0,
      careerPoles: 0,
      headshot_url: 'https://www.formula1.com/content/dam/fom-website/drivers/F/FRACOL01_Franco_Colapinto/fracol01.png.transform/1col/image.png'
    },
    {
      driverId: 'doohan',
      permanentNumber: 7,
      givenName: 'Jack',
      familyName: 'Doohan',
      nationality: 'AUS',
      team: 'Alpine',
      teamColor: '0093CC',
      position: 21,
      points: 0,
      wins: 0,
      careerWins: 0,
      careerPodiums: 0,
      careerPoles: 0,
      headshot_url: 'https://www.formula1.com/content/dam/fom-website/drivers/J/JACDOO01_Jack_Doohan/jacdoo01.png.transform/1col/image.png'
    }
  ];

  // ---- Utils for points calculation ----
  const RACE_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
  const SPRINT_POINTS = [8, 7, 6, 5, 4, 3, 2, 1];

  const toNumericPos = (p: number | string | undefined): number | null => {
    if (p === undefined) return null;
    if (typeof p === 'number') return Number.isFinite(p) ? p : null;
    const n = parseInt(p as string, 10);
    return Number.isFinite(n) ? n : null; // "R", "DQ" -> NaN -> null
  };

  const detectFastestLapDriver = (results: OpenF1Result[]): number | null => {
    // Prefer fastest_lap_rank===1 or fastest_lap===1 among top10 finishers
    const classifiedTop10 = results.filter((r) => {
      const pos = toNumericPos(r.position);
      return pos !== null && pos >= 1 && pos <= 10;
    });

    const withExplicit = classifiedTop10.find((r) => r.fastest_lap_rank === 1 || r.fastest_lap === 1);
    if (withExplicit?.driver_number) return withExplicit.driver_number;

    // Otherwise, take min of time fields among top10
    let best: { driver: number; ms: number } | null = null;
    for (const r of classifiedTop10) {
      const ms =
        (typeof r.fastest_lap_time_ms === 'number' && r.fastest_lap_time_ms) ??
        (typeof r.best_lap_time_ms === 'number' && r.best_lap_time_ms) ??
        (typeof r.best_lap_time === 'number' && r.best_lap_time) ??
        (typeof r.fastest_lap_time === 'number' && r.fastest_lap_time) ??
        null;
      if (r.driver_number && typeof ms === 'number' && Number.isFinite(ms)) {
        if (!best || ms < best.ms) best = { driver: r.driver_number, ms };
      }
    }
    return best ? best.driver : null;
  };

  // ---- Live standings flow ----
  const fetchLiveStandings = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get both Race and Sprint sessions
      const urls = [
        `https://api.openf1.org/v1/sessions?year=${currentYear}&session_type=Race`,
        `https://api.openf1.org/v1/sessions?year=${currentYear}&session_type=Sprint`,
      ];

      const allSessions: OpenF1Session[] = [];
      for (const url of urls) {
        try {
          const r = await fetch(url);
          if (!r.ok) throw new Error(`Failed ${url}`);
          const sess = (await r.json()) as OpenF1Session[];
          // Safety: only keep Race or Sprint by either field
          const filtered = sess.filter(
            (s) =>
              (s.session_type && (s.session_type === 'Race' || s.session_type === 'Sprint')) ||
              (s.session_name && (s.session_name === 'Race' || s.session_name === 'Sprint'))
          );
          allSessions.push(...filtered);
        } catch {
          // continue; we'll just have fewer sessions
        }
      }

      // Aggregate driver points & wins across sessions
      const agg = new Map<number, { points: number; wins: number }>();

      // Process each session one by one (simple & reliable)
      for (const s of allSessions) {
        try {
          const rr = await fetch(`https://api.openf1.org/v1/session_result?session_key=${s.session_key}`);
          if (!rr.ok) continue;
          const results = (await rr.json()) as OpenF1Result[];

          const isSprint =
            (s.session_type && s.session_type === 'Sprint') ||
            (s.session_name && s.session_name === 'Sprint');

          if (isSprint) {
            // Sprint: top 8 get points 8..1, no fastest lap bonus, no "win" toward grand prix wins
            const sorted = results
              .map((r) => ({ ...r, _pos: toNumericPos(r.position) }))
              .filter((r) => r._pos !== null)
              .sort((a, b) => (a._pos! - b._pos!));

            for (const r of sorted.slice(0, 8)) {
              const dn = r.driver_number;
              const pos = r._pos!;
              if (!dn) continue;
              const inc = SPRINT_POINTS[pos - 1] ?? 0;
              if (inc <= 0) continue;

              const cur = agg.get(dn) || { points: 0, wins: 0 };
              cur.points += inc;
              agg.set(dn, cur);
            }
          } else {
            // Race: top 10 per RACE_POINTS + 1 for fastest lap if within top 10; winner gets +1 "wins"
            const sorted = results
              .map((r) => ({ ...r, _pos: toNumericPos(r.position) }))
              .filter((r) => r._pos !== null)
              .sort((a, b) => (a._pos! - b._pos!));

            // Assign race points
            sorted.slice(0, 10).forEach((r) => {
              const dn = r.driver_number;
              const pos = r._pos!;
              if (!dn) return;
              const inc = RACE_POINTS[pos - 1] ?? 0;

              const cur = agg.get(dn) || { points: 0, wins: 0 };
              cur.points += inc;
              if (pos === 1) cur.wins += 1;
              agg.set(dn, cur);
            });

            // Fastest lap bonus: +1 to fastest among *classified top-10 finishers*
            const flDriver = detectFastestLapDriver(results);
            if (flDriver) {
              const flRes = sorted.find((r) => r.driver_number === flDriver);
              if (flRes && flRes._pos && flRes._pos >= 1 && flRes._pos <= 10) {
                const cur = agg.get(flDriver) || { points: 0, wins: 0 };
                cur.points += 1;
                agg.set(flDriver, cur);
              }
            }
          }
        } catch {
          // ignore session failures
        }
      }

      // Merge with fallback list and sort
      const finalStandings = OFFICIAL_2025_STANDINGS
        .map((driver) => {
          const acc = agg.get(driver.permanentNumber);
          return {
            ...driver,
            // IMPORTANT: use ??, not || (0 is valid)
            points: acc?.points ?? driver.points,
            wins: acc?.wins ?? driver.wins,
          };
        })
        .sort((a, b) => b.points - a.points)
        .map((d, i) => ({ ...d, position: i + 1 }));

      setStandings(finalStandings);
      setFilteredStandings(finalStandings);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to calculate live standings:', err);
      setError('Using cached standings data');
      setStandings(OFFICIAL_2025_STANDINGS);
      setFilteredStandings(OFFICIAL_2025_STANDINGS);
    } finally {
      setLoading(false);
    }
  };

  // Load on mount + refresh
  useEffect(() => {
    fetchLiveStandings();
    const refreshInterval = setInterval(() => {
      fetchLiveStandings();
    }, 5 * 60 * 1000);
    return () => clearInterval(refreshInterval);
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...standings];

    if (filters.team) {
      filtered = filtered.filter(driver =>
        driver.team.toLowerCase().includes(filters.team!.toLowerCase())
      );
    }

    if (filters.nationality) {
      filtered = filtered.filter(driver =>
        driver.nationality === filters.nationality
      );
    }

    if (filters.minPoints !== undefined) {
      filtered = filtered.filter(driver => driver.points >= filters.minPoints!);
    }

    if (filters.maxPoints !== undefined) {
      filtered = filtered.filter(driver => driver.points <= filters.maxPoints!);
    }

    if (filters.minCareerWins !== undefined) {
      filtered = filtered.filter(driver => driver.careerWins >= filters.minCareerWins!);
    }

    if (filters.maxCareerWins !== undefined) {
      filtered = filtered.filter(driver => driver.careerWins <= filters.maxCareerWins!);
    }

    if (filters.minCareerPodiums !== undefined) {
      filtered = filtered.filter(driver => driver.careerPodiums >= filters.minCareerPodiums!);
    }

    if (filters.maxCareerPodiums !== undefined) {
      filtered = filtered.filter(driver => driver.careerPodiums <= filters.maxCareerPodiums!);
    }

    if (filters.minCareerPoles !== undefined) {
      filtered = filtered.filter(driver => driver.careerPoles >= filters.minCareerPoles!);
    }

    if (filters.maxCareerPoles !== undefined) {
      filtered = filtered.filter(driver => driver.careerPoles <= filters.maxCareerPoles!);
    }

    setFilteredStandings(filtered);
    setPage(1);
  }, [filters, standings]);

  // Handle card flip
  const handleCardFlip = (driverNumber: number) => {
    setFlippedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(driverNumber)) {
        newSet.delete(driverNumber);
      } else {
        newSet.add(driverNumber);
      }
      return newSet;
    });
  };

  // Get championship border style for top 3
  const getChampionshipBorder = (position: number) => {
    switch (position) {
      case 1:
        return 'border-4 border-yellow-400 shadow-lg shadow-yellow-400/20 ring-2 ring-yellow-300';
      case 2:
        return 'border-4 border-gray-400 shadow-lg shadow-gray-400/20 ring-2 ring-gray-300';
      case 3:
        return 'border-4 border-amber-600 shadow-lg shadow-amber-600/20 ring-2 ring-amber-500';
      default:
        return '';
    }
  };

  // Get championship badge for top 3
  const getChampionshipBadge = (position: number) => {
    switch (position) {
      case 1:
        return { text: 'CHAMPION LEADER', class: 'bg-yellow-500 text-black font-bold' };
      case 2:
        return { text: '2ND PLACE', class: 'bg-gray-400 text-white font-bold' };
      case 3:
        return { text: '3RD PLACE', class: 'bg-amber-600 text-white font-bold' };
      default:
        return null;
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({});
  };

  // Sort standings
  const sortedStandings = [...filteredStandings].sort((a, b) => {
    switch (sortBy) {
      case 'points':
        return b.points - a.points;
      case 'name':
        return `${a.givenName} ${a.familyName}`.localeCompare(`${b.givenName} ${b.familyName}`);
      case 'position':
        return a.position - b.position;
      case 'careerWins':
        return b.careerWins - a.careerWins;
      case 'careerPodiums':
        return b.careerPodiums - a.careerPodiums;
      case 'careerPoles':
        return b.careerPoles - a.careerPoles;
      default:
        return 0;
    }
  });

  const paginatedDrivers = sortedStandings.slice((page - 1) * DRIVERS_PER_PAGE, page * DRIVERS_PER_PAGE);

  // Get unique values for filter dropdowns
  const uniqueTeams = [...new Set(standings.map(d => d.team))].sort();
  const uniqueNationalities = [...new Set(standings.map(d => d.nationality))].sort();

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <section className="py-12 border-b border-border/50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                F1 DRIVERS <span className="f1-gradient bg-clip-text text-transparent">{currentYear}</span>
              </h1>
              <p className="text-xl text-muted-foreground">
                Loading championship standings...
              </p>
            </div>
          </div>
        </section>
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-80" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <section className="py-12 border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              F1 DRIVERS <span className="f1-gradient bg-clip-text text-transparent">{currentYear}</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Championship standings for the {currentYear} season
            </p>
            <div className="flex items-center justify-center gap-4 mt-2">
              <p className="text-sm text-muted-foreground">
                Showing {filteredStandings.length} of {standings.length} drivers
              </p>
              {/* {lastUpdated && (
                <p className="text-xs text-muted-foreground">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </p>
              )} */}
              {error && (
                <Badge variant="outline" className="text-orange-600">
                  {error}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 justify-center mb-6">
            <Button
              variant={sortBy === 'points' ? 'default' : 'outline'}
              onClick={() => { setSortBy('points'); setPage(1); }}
            >
              By Season Points
            </Button>
            <Button
              variant={sortBy === 'careerWins' ? 'default' : 'outline'}
              onClick={() => { setSortBy('careerWins'); setPage(1); }}
            >
              By Career Wins
            </Button>
            <Button
              variant={sortBy === 'careerPodiums' ? 'default' : 'outline'}
              onClick={() => { setSortBy('careerPodiums'); setPage(1); }}
            >
              By Career Podiums
            </Button>
            <Button
              variant={sortBy === 'careerPoles' ? 'default' : 'outline'}
              onClick={() => { setSortBy('careerPoles'); setPage(1); }}
            >
              By Career Poles
            </Button>
          </div>

          <div className="text-center mb-6">
            {Object.keys(filters).length > 0 && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="ml-2 text-destructive"
              >
                Clear All Filters
              </Button>
            )}
          </div>

          {showFilters && (
            <div className="bg-card p-6 rounded-lg border mb-6">
              <h3 className="text-lg font-semibold mb-4">Advanced Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="team-filter">Team</Label>
                  <Select value={filters.team || ''} onValueChange={(value) => setFilters(prev => ({ ...prev, team: value || undefined }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Teams" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Teams</SelectItem>
                      {uniqueTeams.map(team => (
                        <SelectItem key={team} value={team}>{team}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="nationality-filter">Nationality</Label>
                  <Select value={filters.nationality || ''} onValueChange={(value) => setFilters(prev => ({ ...prev, nationality: value || undefined }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Countries" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Countries</SelectItem>
                      {uniqueNationalities.map(nat => (
                        <SelectItem key={nat} value={nat}>{nat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="points-filter">Min Season Points</Label>
                  <Input
                    type="number"
                    placeholder="Min points"
                    value={filters.minPoints || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, minPoints: e.target.value ? parseInt(e.target.value) : undefined }))}
                  />
                </div>

                <div>
                  <Label htmlFor="points-filter-max">Max Season Points</Label>
                  <Input
                    type="number"
                    placeholder="Max points"
                    value={filters.maxPoints || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, maxPoints: e.target.value ? parseInt(e.target.value) : undefined }))}
                  />
                </div>

                <div>
                  <Label htmlFor="career-wins-filter">Min Career Wins</Label>
                  <Input
                    type="number"
                    placeholder="Min wins"
                    value={filters.minCareerWins || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, minCareerWins: e.target.value ? parseInt(e.target.value) : undefined }))}
                  />
                </div>

                <div>
                  <Label htmlFor="career-wins-filter-max">Max Career Wins</Label>
                  <Input
                    type="number"
                    placeholder="Max wins"
                    value={filters.maxCareerWins || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, maxCareerWins: e.target.value ? parseInt(e.target.value) : undefined }))}
                  />
                </div>

                <div>
                  <Label htmlFor="career-podiums-filter">Min Career Podiums</Label>
                  <Input
                    type="number"
                    placeholder="Min podiums"
                    value={filters.minCareerPodiums || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, minCareerPodiums: e.target.value ? parseInt(e.target.value) : undefined }))}
                  />
                </div>

                <div>
                  <Label htmlFor="career-podiums-filter-max">Max Career Podiums</Label>
                  <Input
                    type="number"
                    placeholder="Max podiums"
                    value={filters.maxCareerPodiums || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, maxCareerPodiums: e.target.value ? parseInt(e.target.value) : undefined }))}
                  />
                </div>

                <div>
                  <Label htmlFor="career-poles-filter">Min Career Poles</Label>
                  <Input
                    type="number"
                    placeholder="Min poles"
                    value={filters.minCareerPoles || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, minCareerPoles: e.target.value ? parseInt(e.target.value) : undefined }))}
                  />
                </div>

                <div>
                  <Label htmlFor="career-poles-filter-max">Max Career Poles</Label>
                  <Input
                    type="number"
                    placeholder="Max poles"
                    value={filters.maxCareerPoles || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, maxCareerPoles: e.target.value ? parseInt(e.target.value) : undefined }))}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
      
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {paginatedDrivers.map((driver) => {
            const badge = getChampionshipBadge(driver.position);
            return (
              <div 
                key={driver.permanentNumber} 
                className={`relative ${getChampionshipBorder(driver.position)} rounded-lg transition-all duration-300 hover:scale-105`}
              >
                {badge && (
                  <div className={`absolute -top-3 left-1/2 transform -translate-x-1/2 z-10 px-3 py-1 rounded-full text-xs ${badge.class} shadow-lg`}>
                    {badge.text}
                  </div>
                )}
                <DriverCard
                  driverNumber={driver.permanentNumber}
                  driverName={`${driver.givenName} ${driver.familyName}`}
                  photo={driver.headshot_url}
                  team={driver.team}
                  careerRacesWon={driver.careerWins}
                  careerPodiums={driver.careerPodiums}
                  currentSeasonPoints={driver.points}
                  position={driver.position}
                  nationality={driver.nationality}
                  isFlipped={flippedCards.has(driver.permanentNumber)}
                  onFlip={() => handleCardFlip(driver.permanentNumber)}
                />
              </div>
            );
          })}
        </div>
        
        {totalPages > 1 && (
          <div className="flex justify-center items-center mt-8 gap-4">
            <Button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              variant="outline"
            >
              Previous
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                Page {page} of {totalPages}
              </span>
            </div>
            <Button
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
              variant="outline"
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Ratings;
