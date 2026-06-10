import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Trophy, Flag, ArrowRight } from 'lucide-react';
import { useLiveCalendar } from '@/hooks/useF1Queries';
import { SEASON_YEAR } from '@/lib/constants';
import { formatISTDate, getRaceStatus } from '@/lib/datetime';
import type { CalendarRace } from '@/services/f1';

const STATUS = {
  live: { text: 'LIVE', class: 'bg-red-600 text-white animate-pulse' },
  completed: { text: 'FINISHED', class: 'bg-green-900 text-white' },
  upcoming: { text: 'UPCOMING', class: 'bg-blue-800 text-white' },
} as const;

const weekendStart = (r: CalendarRace) => r.sessions[0]?.date_start ?? r.race_start ?? '';
const weekendEnd = (r: CalendarRace) => r.sessions[r.sessions.length - 1]?.date_end ?? r.race_end ?? '';

const RaceCenterIndex = () => {
  const { data, isLoading } = useLiveCalendar(SEASON_YEAR);
  const races = useMemo(() => data?.races ?? [], [data]);

  const featured = useMemo(() => {
    const live = races.find((r) => r.status === 'live');
    const next = races
      .filter((r) => r.status === 'upcoming')
      .sort((a, b) => +new Date(weekendStart(a)) - +new Date(weekendStart(b)))[0];
    return live ?? next;
  }, [races]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-40 w-full" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-br from-zinc-900 via-black to-zinc-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl md:text-4xl font-bold">Race Center</h1>
          <p className="text-zinc-300 mt-1">
            Pick a {SEASON_YEAR} race for results, lap charts, tyre strategy, telemetry and more.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Featured (live or next) */}
        {featured && (
          <Link to={`/race/${featured.meeting_key}`}>
            <Card className="bg-red-900/15 border-red-500/40 hover:border-red-500 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Flag className="h-5 w-5 text-red-400" />
                  <CardTitle className="text-xl">{featured.status === 'live' ? 'Live Now' : 'Next Race'}</CardTitle>
                  <Badge className={STATUS[featured.status].class}>{STATUS[featured.status].text}</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="text-2xl font-bold">{featured.name}</div>
                  <p className="text-muted-foreground flex items-center gap-1 text-sm">
                    <MapPin className="h-4 w-4" /> {featured.circuit} • {featured.location}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Round {featured.round} • {formatISTDate(weekendStart(featured))} – {formatISTDate(weekendEnd(featured))} IST
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-red-500 font-semibold">
                  Open <ArrowRight className="h-4 w-4" />
                </span>
              </CardContent>
            </Card>
          </Link>
        )}

        {/* All races */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {races.map((race) => {
            const status = STATUS[getRaceStatus(race.sessions)];
            return (
              <Link key={race.meeting_key} to={`/race/${race.meeting_key}`}>
                <Card className="h-full hover:scale-[1.02] hover:border-red-500/50 transition-all cursor-pointer">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-muted-foreground">Round {race.round}</span>
                      <Badge className={`text-xs ${status.class}`}>{status.text}</Badge>
                    </div>
                    <CardTitle className="text-base leading-tight">{race.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {race.location}, {race.country}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatISTDate(weekendStart(race))}</p>
                    {race.isSprint && <Badge variant="outline" className="text-xs bg-yellow-500 text-white">Sprint</Badge>}
                    {race.status === 'completed' && race.winner && (
                      <p className="text-sm flex items-center gap-1 font-semibold text-red-600">
                        <Trophy className="h-4 w-4 text-yellow-500" /> {race.winner}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RaceCenterIndex;
