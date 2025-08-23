import { useEffect, useState } from 'react';
import { SEASON_YEAR } from '@/lib/constants';
import { format, parseISO } from 'date-fns';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { f1Service } from '@/services/f1';
import { 
  MapPin, 
  Calendar, 
  Clock, 
  Info, 
  Trophy, 
  Timer,
  Flag,
  Users,
  History,
  ArrowRight,
  Gauge,
  Mountain,
  CircleDot
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Session {
  name: string;
  date: string;
  time: string;
  endTime: string;
  status: string;
  session_key: number;
  winner?: {
    name: string;
    team: string;
    time: string;
    gap: string;
    position: number;
    points: number;
  };
  fastestLap?: string;
}

interface Winner {
  name: string;
  team: string;
  time: string;
  gap: string;
  position: number;
  points: number;
  fastestLap?: {
    time: string;
    driver: string;
    lap: number;
  };
}

interface Race {
  round: number;
  raceName: string;
  Circuit: {
    circuitId: string;
    circuitName: string;
    Location: {
      locality: string;
      country: string;
    };
  };
  date: string;
  time: string;
  endTime: string;
  year: number;
  status: string;
  sessions: {
    [key: string]: Session;
  };
  circuitDetails: {
    name: string;
    shortName: string;
    location: string;
    country: string;
    type: string;
    length: string;
    lapRecord: string;
    turns: number;
    capacity: number;
    firstGP: string;
    direction: string;
    elevation: string;
    surfaceType: string;
    drsZones: number;
  };
  winner?: Winner;
}

interface RaceCalendarProps {
  year?: number;
  years?: number[];
}

// Helper to get country code for flag CDN
const countryNameToCode: Record<string, string> = {
  "Australia": "au",
  "Bahrain": "bh",
  "Saudi Arabia": "sa",
  "Azerbaijan": "az",
  "United States": "us",
  "Monaco": "mc",
  "Spain": "es",
  "Canada": "ca",
  "Austria": "at",
  "United Kingdom": "gb",
  "Hungary": "hu",
  "Belgium": "be",
  "Netherlands": "nl",
  "Italy": "it",
  "Singapore": "sg",
  "Japan": "jp",
  "Qatar": "qa",
  "Mexico": "mx",
  "Brazil": "br",
  "Abu Dhabi": "ae",
  // Add more as needed
};

function getFlagUrl(country: string) {
  const code = countryNameToCode[country] || '';
  return code ? `https://flagcdn.com/24x18/${code}.png` : null;
}

const RaceCalendar = ({ year = SEASON_YEAR, years }: RaceCalendarProps) => {
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRaceCalendar = async () => {
      setLoading(true);
      try {
        let allRaces: Race[] = [];
        if (years && years.length > 0) {
          for (const y of years) {
            const data = await f1Service.getRaceCalendar(y);
            allRaces = allRaces.concat(Array.isArray(data) ? data : []);
          }
        } else {
          const data = await f1Service.getRaceCalendar(year);
          allRaces = Array.isArray(data) ? data : [];
        }
        // Sort by date descending (most recent first)
        allRaces = allRaces.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setRaces(allRaces);
        setError(null);
      } catch (err) {
        setError('Failed to load race calendar');
      } finally {
        setLoading(false);
      }
    };
    fetchRaceCalendar();
  }, [year, years]);

  const formatDateTime = (dateStr: string | undefined, timeStr: string | undefined) => {
    if (!dateStr || !timeStr) return 'TBA';
    try {
      const date = parseISO(`${dateStr}T${timeStr}`);
      return format(date, 'MMM d, yyyy HH:mm');
    } catch {
      return 'TBA';
    }
  };

  const getSessionsList = (sessions: { [key: string]: Session }) => {
    const sessionOrder = ['practice1', 'practice2', 'practice3', 'qualifying', 'sprint', 'race'];
    return sessionOrder
      .filter(type => sessions[type])
      .map(type => ({
        type,
        name: sessions[type].name,
        datetime: formatDateTime(sessions[type].date, sessions[type].time),
        status: sessions[type].status
      }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="space-y-3">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="text-destructive font-medium">{error}</div>
        </CardContent>
      </Card>
    );
  }

  if (!loading && !error && races.length === 0) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="text-muted-foreground font-medium text-center">No races found for this year.</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-6">
        <Table>
          <TableHeader>
            <TableRow key="header">
              <TableHead key="year">Year</TableHead>
              <TableHead key="round">Round</TableHead>
              <TableHead key="race">Race</TableHead>
              <TableHead key="circuit">Circuit</TableHead>
              <TableHead key="date">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {races.map((race) => (
              <TableRow key={`${race.year}-${race.round}-${race.Circuit.circuitId}`}> 
                <TableCell key={`${race.year}-year`} className="font-medium">{race.year}</TableCell>
                <TableCell key={`${race.round}-round`} className="font-medium">
                  <div>
                    <div className="font-bold">Round {race.round} of {race.year}</div>
                  </div>
                </TableCell>
                <TableCell key={`${race.round}-race`}>
                  <div className="flex flex-col gap-1">
                    <div className="font-semibold">{race.raceName}</div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="mr-1 h-4 w-4" />
                      {getFlagUrl(race.Circuit.Location.country) && (
                        <img
                          src={getFlagUrl(race.Circuit.Location.country)!}
                          alt={race.Circuit.Location.country + ' flag'}
                          className="inline-block mr-1 h-4 w-6 rounded-sm border"
                          style={{ verticalAlign: 'middle' }}
                        />
                      )}
                      {race.Circuit.Location.locality}, {race.Circuit.Location.country}
                    </div>
                  </div>
                </TableCell>
                <TableCell key={`${race.round}-circuit`}>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="cursor-help">
                          <div className="font-medium">{race.Circuit.circuitName}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <span className="flex items-center">
                              <Info className="mr-1 h-3 w-3" />
                              {race.circuitDetails.type}
                            </span>
                            <span>•</span>
                            <span>{race.circuitDetails.length}</span>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="w-80">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <History className="h-4 w-4" />
                              First GP: {race.circuitDetails.firstGP}
                            </span>
                            <span className="flex items-center gap-2">
                              <ArrowRight className="h-4 w-4" />
                              {race.circuitDetails.direction}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <Timer className="h-4 w-4" />
                              Turns: {race.circuitDetails.turns}
                            </span>
                            <span className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              Capacity: {race.circuitDetails.capacity.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <Mountain className="h-4 w-4" />
                              Elevation: {race.circuitDetails.elevation}
                            </span>
                            <span className="flex items-center gap-2">
                              <CircleDot className="h-4 w-4" />
                              Surface: {race.circuitDetails.surfaceType}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <Flag className="h-4 w-4" />
                              DRS Zones: {race.circuitDetails.drsZones}
                            </span>
                            <span className="flex items-center gap-2">
                              <Gauge className="h-4 w-4" />
                              Lap Record: {race.circuitDetails.lapRecord}
                            </span>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell key={`${race.round}-date`}>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col gap-1 cursor-help">
                          <div className="flex items-center">
                            <Calendar className="mr-1 h-4 w-4" />
                            {race.date ? format(parseISO(race.date), 'EEEE, MMMM d, yyyy') : 'TBA'}
                          </div>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Clock className="mr-1 h-4 w-4" />
                            {race.time ? format(parseISO(race.time), 'HH:mm') : 'TBA'}
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="w-96">
                        <div className="space-y-2">
                          {getSessionsList(race.sessions).map((session) => (
                            <div key={`${race.round}-${session.type}-${session.datetime}`} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{session.name}:</span>
                                <span className="text-muted-foreground">{session.datetime}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default RaceCalendar; 