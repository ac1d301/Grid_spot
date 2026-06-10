import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, MapPin, Trophy, Flag, Timer } from 'lucide-react';
import { useCalendar } from '@/hooks/useF1Queries';
import { SEASON_YEAR } from '@/lib/constants';
import { formatISTDate, formatCountdown } from '@/lib/datetime';
import type { CalendarRace } from '@/services/f1';

// Weekend span = earliest session start -> latest session end.
const weekendStart = (r: CalendarRace) => r.sessions[0]?.date_start ?? r.race_start ?? '';
const weekendEnd = (r: CalendarRace) =>
  r.sessions[r.sessions.length - 1]?.date_end ?? r.race_end ?? '';

const STATUS_BADGE: Record<CalendarRace['status'], { text: string; class: string }> = {
  live: { text: 'LIVE', class: 'bg-red-600 text-white animate-pulse' },
  completed: { text: 'FINISHED', class: 'bg-green-900 text-white' },
  upcoming: { text: 'UPCOMING', class: 'bg-blue-800 text-white' },
};

const RaceCalendar = () => {
  const { id } = useParams(); // optional round number from /races/:id
  const navigate = useNavigate();
  const { data, isLoading, isError } = useCalendar(SEASON_YEAR);
  const races = useMemo(() => data?.races ?? [], [data]);
  const totalRounds = data?.totalRounds ?? races.length;

  const nextRace = useMemo(
    () =>
      races
        .filter((r) => r.status === 'upcoming')
        .sort((a, b) => new Date(weekendStart(a)).getTime() - new Date(weekendStart(b)).getTime())[0],
    [races]
  );

  const focusedRound = id ? parseInt(id, 10) : undefined;

  // Live-ticking countdown to the next race (pure epoch math; minute resolution).
  const [countdown, setCountdown] = useState('');
  useEffect(() => {
    if (!nextRace?.race_start) return;
    const tick = () => setCountdown(formatCountdown(nextRace.race_start!).text);
    tick();
    const interval = setInterval(tick, 60_000);
    return () => clearInterval(interval);
  }, [nextRace?.race_start]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-12 w-2/3 mx-auto mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-56" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {SEASON_YEAR} FORMULA 1 <span className="text-red-600">CALENDAR</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            {totalRounds} Races Around the World{' '}
            <span className="text-sm">(all times IST)</span>
          </p>
          {isError && (
            <Badge variant="outline" className="text-orange-600 mt-2">
              Couldn’t reach the calendar service — please try again shortly.
            </Badge>
          )}
        </div>

        {/* Next Race Highlight */}
        {nextRace && (
          <Card className="mb-8 bg-red-900/20 text-white border-red-500 shadow-2xl">
            <CardHeader className="text-center pb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Flag className="h-8 w-8" />
                <CardTitle className="text-3xl font-bold">NEXT RACE</CardTitle>
              </div>
              <div className="text-5xl font-bold mb-2">{nextRace.name.toUpperCase()}</div>
              <p className="text-xl opacity-90 flex items-center justify-center gap-2">
                <MapPin className="h-5 w-5" />
                {nextRace.location}, {nextRace.country}
              </p>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="grid md:grid-cols-3 gap-4 text-lg">
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Calendar className="h-5 w-5" />
                    <span className="font-semibold">Race Weekend</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {formatISTDate(weekendStart(nextRace))} – {formatISTDate(weekendEnd(nextRace))}
                  </div>
                </div>

                <div className="bg-white/10 rounded-lg p-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Timer className="h-5 w-5" />
                    <span className="font-semibold">Time Remaining</span>
                  </div>
                  <div className="text-2xl font-bold">{countdown}</div>
                </div>

                <div className="bg-white/10 rounded-lg p-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <MapPin className="h-5 w-5" />
                    <span className="font-semibold">Circuit</span>
                  </div>
                  <div className="text-lg font-bold">{nextRace.circuit}</div>
                </div>
              </div>

              {nextRace.isSprint && (
                <div className="bg-orange-500/20 border border-orange-400/30 rounded-lg p-3">
                  <Badge className="bg-orange-500 text-white">Sprint Weekend</Badge>
                  <p className="text-sm mt-1">
                    This weekend features a Sprint Qualifying and Sprint Race
                  </p>
                </div>
              )}

              <div className="text-lg font-semibold">
                Round {nextRace.round} of {totalRounds}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Full Calendar Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {races.map((race) => {
            const status = STATUS_BADGE[race.status];
            const isFocused = focusedRound === race.round || nextRace?.round === race.round;

            return (
              <Card
                key={race.round}
                onClick={() => navigate(`/race/${race.meeting_key}`)}
                className={`relative transition-all duration-300 hover:scale-105 cursor-pointer ${
                  isFocused
                    ? 'border-red-500 shadow-md shadow-red-500/20 bg-red-900/20'
                    : 'border-border'
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-lg font-bold text-muted-foreground">Round {race.round}</div>
                    <Badge className={`text-xs ${status.class}`}>{status.text}</Badge>
                  </div>

                  <CardTitle className={`text-lg leading-tight ${isFocused ? 'text-red-600' : ''}`}>
                    {race.name}
                  </CardTitle>

                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {race.location}, {race.country}
                  </div>
                </CardHeader>

                <CardContent className="pt-2">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {formatISTDate(weekendStart(race))} – {formatISTDate(weekendEnd(race))}
                      </span>
                    </div>

                    <div className="text-xs text-muted-foreground">{race.circuit}</div>

                    {race.isSprint && (
                      <Badge variant="outline" className="text-xs bg-yellow-500 text-white">
                        Sprint Weekend
                      </Badge>
                    )}

                    {race.status === 'completed' && race.winner && (
                      <div className="flex items-center gap-2 text-sm">
                        <Trophy className="h-4 w-4 text-yellow-500" />
                        <span className="font-semibold text-red-600">Winner: {race.winner}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Calendar Summary */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {races.filter((r) => r.status === 'completed').length}
              </div>
              <div className="text-sm text-muted-foreground">Races Completed</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {races.filter((r) => r.status !== 'completed').length}
              </div>
              <div className="text-sm text-muted-foreground">Races Remaining</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">
                {races.filter((r) => r.isSprint).length}
              </div>
              <div className="text-sm text-muted-foreground">Sprint Weekends</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RaceCalendar;
