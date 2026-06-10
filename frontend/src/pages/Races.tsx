import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, Trophy, Timer, Flag, CheckCircle, AlertCircle } from 'lucide-react';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useLiveCalendar } from '@/hooks/useF1Queries';
import { f1Api } from '@/services/f1';
import { SEASON_YEAR } from '@/lib/constants';
import { formatISTDateTime, formatISTTime, formatCountdown } from '@/lib/datetime';
import type { CalendarRace, CalendarSession } from '@/services/f1';

type OpenF1Driver = { driver_number: number; full_name: string; name_acronym?: string };
type OpenF1Result = { position: number | string; driver_number: number };

function sessionStatus(s: CalendarSession): 'live' | 'completed' | 'upcoming' {
  const now = Date.now();
  const start = new Date(s.date_start).getTime();
  const end = new Date(s.date_end).getTime();
  if (now >= start && now <= end) return 'live';
  if (now > end) return 'completed';
  return 'upcoming';
}

// Fetch drivers (for names) + winners per session for one weekend, via the backend
// OpenF1 passthrough. Only sessions that have already started are queried.
function useWeekendResults(weekend?: CalendarRace) {
  return useQuery({
    queryKey: ['weekendResults', weekend?.meeting_key],
    enabled: !!weekend,
    staleTime: 60_000,
    queryFn: async () => {
      const drivers = await f1Api
        .openf1<OpenF1Driver[]>('drivers', { meeting_key: weekend!.meeting_key })
        .catch(() => [] as OpenF1Driver[]);
      const byNumber: Record<number, OpenF1Driver> = {};
      for (const d of drivers) byNumber[d.driver_number] = d;

      const winners: Record<string, { number: number; name: string }> = {};
      await Promise.all(
        weekend!.sessions
          .filter((s) => new Date(s.date_start).getTime() <= Date.now())
          .map(async (s) => {
            try {
              const res = await f1Api.openf1<OpenF1Result[]>('session_result', {
                session_key: s.session_key,
              });
              const w = res.find((r) => Number(r.position) === 1);
              if (w) winners[s.name] = { number: w.driver_number, name: byNumber[w.driver_number]?.full_name || '' };
            } catch {
              /* ignore individual session failures */
            }
          })
      );
      return { byNumber, winners };
    },
  });
}

const Races = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data, isLoading } = useLiveCalendar(SEASON_YEAR);
  const totalRounds = data?.totalRounds ?? 0;

  // Re-render every second so countdowns/live badges stay current.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Target weekend: live > next upcoming > most recent completed.
  const weekend = useMemo(() => {
    const races = data?.races ?? [];
    const live = races.find((r) => r.status === 'live');
    const upcoming = races
      .filter((r) => r.status === 'upcoming')
      .sort((a, b) => new Date(a.sessions[0]?.date_start ?? 0).getTime() - new Date(b.sessions[0]?.date_start ?? 0).getTime())[0];
    const completed = [...races].filter((r) => r.status === 'completed').pop();
    return live ?? upcoming ?? completed;
  }, [data]);

  const { data: resultsData } = useWeekendResults(weekend);

  if (!authLoading && !isAuthenticated) return <Navigate to="/login" replace />;

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="mb-8 bg-zinc-900 border-zinc-800">
            <CardHeader>
              <div className="h-8 bg-zinc-800 rounded w-1/2 mx-auto animate-pulse" />
            </CardHeader>
            <CardContent>
              <LoadingSkeleton lines={5} />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!weekend) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="mb-8 bg-zinc-900 border-zinc-800">
            <CardContent className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <p className="text-zinc-100 font-medium">No race data available</p>
              <p className="text-zinc-400 text-sm mt-2">Please check back during race weekends</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const sessions = [...weekend.sessions].sort(
    (a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime()
  );
  const nextSession = sessions.find((s) => new Date(s.date_start).getTime() > Date.now());

  const statusTitle =
    weekend.status === 'live' ? 'RACE WEEKEND LIVE' : weekend.status === 'upcoming' ? 'NEXT RACE' : 'LAST RACE';
  const statusBadge =
    weekend.status === 'live'
      ? { text: 'LIVE', class: 'bg-red-600 text-white animate-pulse' }
      : weekend.status === 'completed'
      ? { text: 'FINISHED', class: 'bg-green-900 text-white' }
      : null;

  const getWinner = (sessionName: string) => {
    const w = resultsData?.winners[sessionName];
    if (!w) return '—';
    if (sessionName === 'Race') return w.name ? `#${w.number} ${w.name}` : `Driver #${w.number}`;
    return w.name || `Driver #${w.number}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-zinc-900 via-black to-zinc-900 text-white shadow-2xl shadow-red-900/20">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center pb-8 border-b border-zinc-800/50">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Flag className="h-6 w-6 text-red-400" />
              <h1 className="text-3xl md:text-4xl font-bold text-zinc-100">{statusTitle}</h1>
              {statusBadge && <Badge className={`text-sm font-bold ${statusBadge.class}`}>{statusBadge.text}</Badge>}
            </div>

            <div className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-red-400 via-red-500 to-red-600 bg-clip-text text-transparent mb-4">
              {weekend.country.toUpperCase()} GRAND PRIX
            </div>

            <p className="text-zinc-300 text-lg flex items-center justify-center gap-2 mb-4">
              <MapPin className="h-4 w-4 text-red-400" />
              {weekend.circuit} • {weekend.location}
            </p>

            <p className="text-red-400 text-sm font-semibold">
              Round {weekend.round} of {totalRounds} • {SEASON_YEAR}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Session Schedule */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-xl font-semibold flex items-center gap-2 text-zinc-100">
                <Clock className="h-5 w-5 text-red-400" />
                Session Schedule (IST)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {sessions.map((session) => {
                const isNext = nextSession?.session_key === session.session_key;
                const status = sessionStatus(session);
                const countdown = formatCountdown(session.date_start);

                return (
                  <div
                    key={session.session_key}
                    className={`rounded-lg p-4 border transition-all ${
                      status === 'live'
                        ? 'bg-red-500/20 border-red-500/50 shadow-red-500/30 shadow-lg animate-pulse'
                        : isNext
                        ? 'bg-red-500/10 border-red-500/30 shadow-red-500/20 shadow-lg'
                        : status === 'completed'
                        ? 'bg-red-900/10 border-red-800/30'
                        : 'bg-zinc-800/30 border-zinc-700/50'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-zinc-100">{session.name}</span>
                      <div className="flex gap-2">
                        {status === 'completed' && (
                          <Badge className="bg-red-800/20 text-red-400 border border-red-700/30 text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            DONE
                          </Badge>
                        )}
                        {status === 'live' && (
                          <Badge className="bg-red-600 text-white text-xs animate-pulse font-bold">LIVE NOW</Badge>
                        )}
                        {isNext && status === 'upcoming' && (
                          <Badge className="bg-red-500 text-white font-bold text-xs">NEXT UP</Badge>
                        )}
                      </div>
                    </div>

                    <div className="text-sm text-zinc-400 mb-1">
                      {formatISTDateTime(session.date_start, { weekday: true })}
                    </div>

                    <div className="text-lg font-bold mb-2 text-zinc-200">{formatISTTime(session.date_start)}</div>

                    <div className="flex items-center gap-2">
                      <Timer className={`h-4 w-4 ${status === 'live' ? 'text-red-400 animate-pulse' : 'text-red-400'}`} />
                      <span className={`font-mono text-sm font-medium ${status === 'live' ? 'text-red-400 font-bold' : 'text-red-400'}`}>
                        {status === 'completed' ? 'Completed' : status === 'live' ? 'In progress' : countdown.text}
                      </span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Results and Track Info */}
          <div className="space-y-6">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-xl font-semibold flex items-center gap-2 text-zinc-100">
                  <Trophy className="h-5 w-5 text-red-400" />
                  Session Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['Practice 1', 'Practice 2', 'Practice 3'].map((p) => (
                    <div key={p} className="flex justify-between items-center py-3 border-b border-zinc-700/30">
                      <span className="text-sm font-medium text-zinc-300">{p} (Fastest):</span>
                      <span className="font-bold text-zinc-100">{getWinner(p)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center py-3 border-b border-zinc-700/30">
                    <span className="text-sm font-medium text-zinc-300">Qualifying (Pole):</span>
                    <span className="font-bold text-zinc-100">{getWinner('Qualifying')}</span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="text-sm font-medium text-zinc-300">Race Winner:</span>
                    <div className="text-right">
                      <span className="font-bold text-red-400 text-lg block">{getWinner('Race')}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Track Info */}
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2 text-zinc-100">
                  <MapPin className="h-5 w-5 text-red-400" />
                  {weekend.circuit}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Location:</span>
                    <span className="font-bold text-zinc-200">{weekend.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Country:</span>
                    <span className="font-bold text-zinc-200">{weekend.country}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Season:</span>
                    <span className="font-bold text-zinc-200">{SEASON_YEAR}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Sprint:</span>
                    <span className="font-bold text-zinc-200">{weekend.isSprint ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Races;
