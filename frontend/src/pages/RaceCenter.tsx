import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, ArrowLeft } from 'lucide-react';
import { useCalendar, useLiveCalendar } from '@/hooks/useF1Queries';
import { SEASON_YEAR } from '@/lib/constants';
import { getRaceStatus, formatISTDate, formatISTDateTime, formatCountdown } from '@/lib/datetime';
import type { CalendarRace, CalendarSession } from '@/services/f1';
import { ResultsTable } from '@/components/race/ResultsTable';
import { LapTimeChart } from '@/components/race/LapTimeChart';
import { QualiComparison } from '@/components/race/QualiComparison';
import { StrategyPanel } from '@/components/race/StrategyPanel';
import { SectorsSpeedPanel } from '@/components/race/SectorsSpeedPanel';
import { WeatherPanel } from '@/components/race/WeatherPanel';
import { RaceControlLog } from '@/components/race/RaceControlLog';
import { LiveLeaderboard } from '@/components/race/LiveLeaderboard';

// Heavy telemetry (recharts + SVG + windowed car_data) loads only when its tab opens.
const TelemetryPanel = lazy(() => import('@/components/race/telemetry/TelemetryPanel'));

const sessionLive = (s?: CalendarSession) => {
  if (!s) return false;
  const now = Date.now();
  return now >= +new Date(s.date_start) && now <= +new Date(s.date_end);
};

function pickPrimary(sessions: CalendarSession[], param: string | null): number | undefined {
  if (!sessions.length) return undefined;
  const byParam = param && sessions.find((s) => s.session_key === Number(param));
  if (byParam) return byParam.session_key;
  const live = sessions.find(sessionLive);
  if (live) return live.session_key;
  const race = sessions.find((s) => s.type === 'Race');
  if (race) return race.session_key;
  const started = [...sessions].reverse().find((s) => +new Date(s.date_start) <= Date.now());
  return (started ?? sessions[0]).session_key;
}

const RaceCenter = () => {
  const { meetingKey } = useParams();
  const mk = Number(meetingKey);
  const [params] = useSearchParams();

  const { data, isLoading, isError } = useCalendar(SEASON_YEAR);
  useLiveCalendar(SEASON_YEAR); // keeps the shared calendar status fresh while live

  const race: CalendarRace | undefined = useMemo(
    () => data?.races.find((r) => r.meeting_key === mk),
    [data, mk]
  );
  const sessions = useMemo(
    () => [...(race?.sessions ?? [])].sort((a, b) => +new Date(a.date_start) - +new Date(b.date_start)),
    [race]
  );
  const weekendLive = race ? getRaceStatus(race.sessions) === 'live' : false;

  const [activeKey, setActiveKey] = useState<number | undefined>();
  const [liveTab, setLiveTab] = useState(false);
  const [telemetryTab, setTelemetryTab] = useState(false);
  useEffect(() => {
    if (sessions.length && activeKey == null) {
      setActiveKey(pickPrimary(sessions, params.get('session')));
      setLiveTab(weekendLive);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-2/3 mb-6" />
        <Skeleton className="h-10 w-full mb-6" />
        <div className="grid lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64" />)}
        </div>
      </div>
    );
  }

  if (isError || !race) {
    return (
      <div className="min-h-screen bg-background container mx-auto px-4 py-16 text-center">
        <p className="text-xl font-semibold mb-4">Couldn’t load this race.</p>
        <Link to="/race-calendar" className="text-red-500 hover:underline">← Back to calendar</Link>
      </div>
    );
  }

  const activeSession = sessions.find((s) => s.session_key === activeKey);
  const started = activeSession ? +new Date(activeSession.date_start) <= Date.now() : false;
  const activeLive = sessionLive(activeSession);
  const weekendStart = sessions[0]?.date_start;
  const weekendEnd = sessions[sessions.length - 1]?.date_end;

  const statusBadge =
    race.status === 'live' ? { text: 'LIVE', class: 'bg-red-600 text-white animate-pulse' }
    : race.status === 'completed' ? { text: 'FINISHED', class: 'bg-green-900 text-white' }
    : { text: 'UPCOMING', class: 'bg-blue-800 text-white' };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-zinc-900 via-black to-zinc-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <Link to="/race-calendar" className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white mb-3">
            <ArrowLeft className="h-4 w-4" /> Calendar
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl md:text-4xl font-bold">{race.name}</h1>
            <Badge className={statusBadge.class}>{statusBadge.text}</Badge>
            {race.isSprint && <Badge className="bg-orange-500 text-white">Sprint</Badge>}
          </div>
          <p className="text-zinc-300 mt-2 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-red-400" />
            {race.circuit} • {race.location}, {race.country}
          </p>
          <p className="text-sm text-zinc-400 mt-1">
            Round {race.round} of {data?.totalRounds} • {weekendStart && formatISTDate(weekendStart)} – {weekendEnd && formatISTDate(weekendEnd)} (IST)
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs
          value={telemetryTab ? 'TELEMETRY' : liveTab ? 'LIVE' : String(activeKey ?? '')}
          onValueChange={(v) => {
            if (v === 'LIVE') { setLiveTab(true); setTelemetryTab(false); }
            else if (v === 'TELEMETRY') { setTelemetryTab(true); setLiveTab(false); }
            else { setLiveTab(false); setTelemetryTab(false); setActiveKey(Number(v)); }
          }}
        >
          <TabsList className="flex-wrap h-auto">
            {weekendLive && (
              <TabsTrigger value="LIVE" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
                <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse mr-1.5" /> LIVE
              </TabsTrigger>
            )}
            {sessions.map((s) => (
              <TabsTrigger key={s.session_key} value={String(s.session_key)}>{s.name}</TabsTrigger>
            ))}
            <TabsTrigger value="TELEMETRY">Telemetry</TabsTrigger>
          </TabsList>

          {/* LIVE tab */}
          {weekendLive && (
            <TabsContent value="LIVE" className="mt-4">
              <div className="grid lg:grid-cols-2 gap-4">
                <LiveLeaderboard sessionKey={sessions.find(sessionLive)?.session_key ?? activeKey} isLive />
                <RaceControlLog sessionKey={sessions.find(sessionLive)?.session_key ?? activeKey} enabled />
                <WeatherPanel sessionKey={sessions.find(sessionLive)?.session_key ?? activeKey} isLive enabled />
              </div>
            </TabsContent>
          )}

          {/* Telemetry tab (lazy) — uses the currently-selected session */}
          <TabsContent value="TELEMETRY" className="mt-4">
            {activeKey && started ? (
              <Suspense fallback={<Skeleton className="h-[420px] w-full" />}>
                <TelemetryPanel sessionKey={activeKey} isLive={activeLive} />
              </Suspense>
            ) : (
              <Card><CardContent className="text-center py-16 text-muted-foreground">
                Select a session that has started to view telemetry.
              </CardContent></Card>
            )}
          </TabsContent>

          {/* Per-session tabs */}
          {sessions.map((s) => (
            <TabsContent key={s.session_key} value={String(s.session_key)} className="mt-4">
              {!started ? (
                <Card>
                  <CardContent className="text-center py-16">
                    <p className="text-lg font-semibold mb-2">{s.name} hasn’t started</p>
                    <p className="text-muted-foreground">{formatISTDateTime(s.date_start, { weekday: true })}</p>
                    <p className="text-red-500 font-bold mt-2">Starts in {formatCountdown(s.date_start).text}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid lg:grid-cols-2 gap-4">
                  {activeLive && <LiveLeaderboard sessionKey={s.session_key} isLive />}
                  <ResultsTable sessionKey={s.session_key} enabled />
                  {/* Event-appropriate widgets: race/sprint get the lap chart + the unified
                      race-strategy timeline (stints + pit stops); qualifying gets the Q1/Q2/Q3
                      comparison; practice gets neither. */}
                  {(s.type === 'Race' || s.type === 'Sprint') && <LapTimeChart sessionKey={s.session_key} enabled />}
                  {s.type === 'Qualifying' && <QualiComparison sessionKey={s.session_key} enabled />}
                  {(s.type === 'Race' || s.type === 'Sprint') && <StrategyPanel sessionKey={s.session_key} enabled />}
                  <SectorsSpeedPanel sessionKey={s.session_key} enabled />
                  <WeatherPanel sessionKey={s.session_key} isLive={activeLive} enabled />
                  <RaceControlLog sessionKey={s.session_key} enabled />
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

export default RaceCenter;
