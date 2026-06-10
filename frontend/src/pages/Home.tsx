import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowRight, Flag, MapPin, Trophy, UserPlus, User, Clock, Gauge,
  Calendar, MessageSquare, Newspaper, Radio,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLiveCalendar, useNews, useDriverStandings, useConstructorStandings } from '@/hooks/useF1Queries';
import { SEASON_YEAR } from '@/lib/constants';
import { formatISTDate, formatISTDateTime, formatCountdown } from '@/lib/datetime';
import { NewsCard } from '@/components/news/NewsCard';
import type { CalendarRace, CalendarSession, DriverStanding, ConstructorStanding } from '@/services/f1';

// Weekend span = earliest session start -> latest session end.
const weekendStart = (r: CalendarRace) => r.sessions[0]?.date_start ?? r.race_start ?? '';
const weekendEnd = (r: CalendarRace) => r.sessions[r.sessions.length - 1]?.date_end ?? r.race_end ?? '';
const weekendRange = (r: CalendarRace) => `${formatISTDate(weekendStart(r))} – ${formatISTDate(weekendEnd(r))}`;

// The session happening right now, else the next upcoming one, else the last.
const ongoingOrNext = (r: CalendarRace): CalendarSession | undefined => {
  const now = Date.now();
  const sorted = [...r.sessions].sort((a, b) => +new Date(a.date_start) - +new Date(b.date_start));
  return (
    sorted.find((s) => now >= +new Date(s.date_start) && now <= +new Date(s.date_end)) ??
    sorted.find((s) => +new Date(s.date_start) > now) ??
    sorted[sorted.length - 1]
  );
};

const FEATURES = [
  { to: '/race-center', icon: Gauge, title: 'Race Center', blurb: 'Live timing, telemetry & results' },
  { to: '/race-calendar', icon: Calendar, title: 'Race Calendar', blurb: `Full ${SEASON_YEAR} schedule in IST` },
  { to: '/ratings', icon: Trophy, title: 'Driver Stats', blurb: 'Standings & career records' },
  { to: '/forum', icon: MessageSquare, title: 'Forum', blurb: 'Join the paddock chat' },
  { to: '/news', icon: Newspaper, title: 'News', blurb: 'Latest F1 headlines' },
];

const Home = () => {
  const { user, isAuthenticated } = useAuth();
  const { data, isLoading: calLoading } = useLiveCalendar(SEASON_YEAR);
  const races = useMemo(() => data?.races ?? [], [data]);
  const { data: newsData, isLoading: newsLoading } = useNews('trending', 6);
  const news = newsData?.items ?? [];
  const { data: drivers, isLoading: driversLoading } = useDriverStandings(SEASON_YEAR);
  const { data: constructors, isLoading: constructorsLoading } = useConstructorStandings(SEASON_YEAR);

  const currentRace = useMemo(() => races.find((r) => r.status === 'live'), [races]);
  const nextRace = useMemo(
    () =>
      races
        .filter((r) => r.status === 'upcoming')
        .sort((a, b) => +new Date(weekendStart(a)) - +new Date(weekendStart(b)))[0],
    [races]
  );

  // Live-ticking countdown to the next race (pure epoch math).
  const [countdown, setCountdown] = useState('');
  useEffect(() => {
    const target = nextRace?.race_start;
    if (!target) { setCountdown(''); return; }
    const tick = () => setCountdown(formatCountdown(target).text);
    tick();
    const interval = setInterval(tick, 60_000);
    return () => clearInterval(interval);
  }, [nextRace?.race_start]);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-zinc-900 via-black to-zinc-900 text-white">
        <div className="absolute inset-0 bg-[url('/f1-hero-bg.jpg')] bg-cover bg-center opacity-15" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <div className="container relative z-10 mx-auto px-4 py-20 md:py-24">
          <div className="max-w-3xl">
            {currentRace ? (
              <Link
                to={`/race/${currentRace.meeting_key}`}
                className="inline-flex items-center gap-2 rounded-full border border-red-500/40 bg-red-600/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-red-300 mb-5 transition-colors hover:bg-red-600/30"
              >
                <span className="h-2 w-2 rounded-full bg-red-500 race-pulse" /> Race weekend live — {currentRace.name}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : nextRace ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold tracking-wide text-zinc-300 mb-5">
                <Clock className="h-3.5 w-3.5 text-red-400" /> Next: {nextRace.name}
                {countdown && <span className="font-bold text-red-400">· {countdown}</span>}
              </div>
            ) : null}

            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
              GRID <span className="text-red-600">SPOT</span>
            </h1>
            <p className="mt-4 max-w-2xl text-lg md:text-xl text-zinc-300">
              Your Formula 1 hub — live race timing, championship standings, telemetry and the
              community paddock, all in one place.
            </p>
            {isAuthenticated && user && (
              <p className="mt-3 text-sm text-zinc-400">
                Welcome back, <span className="font-semibold text-white">{user.username || user.email}</span>.
              </p>
            )}

            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/race-center">
                <Button size="lg" className="bg-red-600 hover:bg-red-700"><Gauge className="mr-2 h-5 w-5" /> Race Center</Button>
              </Link>
              <Link to="/ratings">
                <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white hover:text-black"><Trophy className="mr-2 h-5 w-5" /> Standings</Button>
              </Link>
              <Link to="/forum">
                <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white hover:text-black"><MessageSquare className="mr-2 h-5 w-5" /> Forum</Button>
              </Link>
            </div>
          </div>
        </div>
        <div className="h-1 f1-gradient" />
      </section>

      {/* ── Race spotlight ─────────────────────────────────── */}
      <section className="container mx-auto px-4 py-16">
        {calLoading ? (
          <Skeleton className="h-56 w-full rounded-xl" />
        ) : currentRace ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <LiveRaceCard race={currentRace} />
            {nextRace && <NextRaceCard race={nextRace} countdown={countdown} />}
          </div>
        ) : nextRace ? (
          <NextRaceCard race={nextRace} countdown={countdown} wide />
        ) : (
          <SeasonCompleteCard />
        )}
      </section>

      {/* ── Championship snapshot ──────────────────────────── */}
      <section className="bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <SectionHeader
            eyebrow={`${SEASON_YEAR} Season`}
            title={<>Championship <span className="text-red-600">Standings</span></>}
            ctaLabel="Full standings"
            ctaTo="/ratings"
          />
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Drivers */}
            <Card className="lg:col-span-2">
              <CardContent className="p-4 sm:p-5">
                <div className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  <Trophy className="h-4 w-4 text-red-500" /> Drivers
                </div>
                {driversLoading ? (
                  <RowSkeletons n={5} />
                ) : drivers && drivers.length ? (
                  <div className="divide-y divide-border/60">
                    {drivers.slice(0, 5).map((d) => <DriverRow key={d.driverId || `${d.position}-${d.familyName}`} d={d} />)}
                  </div>
                ) : (
                  <p className="py-6 text-center text-sm text-muted-foreground">Standings unavailable.</p>
                )}
              </CardContent>
            </Card>
            {/* Constructors */}
            <Card>
              <CardContent className="p-4 sm:p-5">
                <div className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  <Flag className="h-4 w-4 text-red-500" /> Constructors
                </div>
                {constructorsLoading ? (
                  <RowSkeletons n={3} />
                ) : constructors && constructors.length ? (
                  <div className="divide-y divide-border/60">
                    {constructors.slice(0, 5).map((c) => <ConstructorRow key={c.constructorId || `${c.position}-${c.name}`} c={c} />)}
                  </div>
                ) : (
                  <p className="py-6 text-center text-sm text-muted-foreground">Standings unavailable.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ── Latest news ────────────────────────────────────── */}
      <section className="container mx-auto px-4 py-16">
        <SectionHeader
          eyebrow={<><Radio className="h-4 w-4 animate-pulse" /> Live feed</>}
          title={<>Latest <span className="text-red-600">F1 News</span></>}
          ctaLabel="All news"
          ctaTo="/news"
        />
        {newsLoading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-44 rounded-lg" />)}
          </div>
        ) : news.length ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {news.slice(0, 6).map((item) => <NewsCard key={item.link} item={item} />)}
          </div>
        ) : (
          <Card><CardContent className="py-10 text-center text-muted-foreground">No news right now — check back soon.</CardContent></Card>
        )}
      </section>

      {/* ── Explore grid ───────────────────────────────────── */}
      <section className="bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <h2 className="mb-6 text-2xl font-bold">Explore the paddock</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {FEATURES.map((f) => <FeatureCard key={f.to} {...f} />)}
          </div>
        </div>
      </section>

      {/* ── Community CTA (signed-out only) ────────────────── */}
      {!isAuthenticated && (
        <section className="bg-gradient-to-br from-zinc-900 via-black to-zinc-900 py-16 text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold">Join the <span className="text-red-600">community</span></h2>
            <p className="mx-auto mt-3 max-w-2xl text-zinc-300">
              Create a free account to join the forum, follow the championship, and dive into live race data.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/register"><Button size="lg" className="bg-red-600 hover:bg-red-700 px-8"><UserPlus className="mr-2 h-5 w-5" /> Create Account</Button></Link>
              <Link to="/login"><Button size="lg" variant="outline" className="border-white/30 px-8 text-white hover:bg-white hover:text-black"><User className="mr-2 h-5 w-5" /> Sign In</Button></Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

/* ───────────────────────── presentational helpers (only used here) ───────────────────────── */

function SectionHeader({ eyebrow, title, ctaLabel, ctaTo }: {
  eyebrow: React.ReactNode; title: React.ReactNode; ctaLabel: string; ctaTo: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <span className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-red-500">{eyebrow}</span>
        <h2 className="text-2xl font-bold md:text-3xl">{title}</h2>
      </div>
      <Link to={ctaTo}>
        <Button variant="outline" size="sm">{ctaLabel} <ArrowRight className="ml-2 h-4 w-4" /></Button>
      </Link>
    </div>
  );
}

function LiveRaceCard({ race }: { race: CalendarRace }) {
  const session = ongoingOrNext(race);
  return (
    <Link to={`/race/${race.meeting_key}`} className="block">
      <Card className="h-full overflow-hidden border-red-500/40 bg-gradient-to-br from-red-900/40 to-black transition-shadow hover:shadow-2xl hover:shadow-red-900/30">
        <CardContent className="p-6 text-white">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500 race-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-red-300">Race weekend live</span>
            {race.isSprint && <Badge className="bg-orange-600 text-white">Sprint</Badge>}
          </div>
          <h3 className="text-2xl font-bold">{race.name}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-300"><MapPin className="h-4 w-4" /> {race.location}, {race.country}</p>
          <div className="mt-5 space-y-1.5 text-sm">
            <Row label="Weekend" value={weekendRange(race)} />
            {session && <Row label="On track now / next" value={session.name} />}
            {session && <Row label="Time" value={formatISTDateTime(session.date_start, { weekday: true })} />}
          </div>
          <div className="mt-5 inline-flex items-center text-sm font-semibold text-red-300">
            Open Race Center <ArrowRight className="ml-1.5 h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function NextRaceCard({ race, countdown, wide = false }: { race: CalendarRace; countdown: string; wide?: boolean }) {
  const session = ongoingOrNext(race);
  return (
    <Card className={`overflow-hidden ${wide ? 'mx-auto max-w-4xl' : 'h-full'}`}>
      <div className="grid md:grid-cols-2">
        <div className="bg-gradient-to-br from-zinc-900 to-black p-6 text-white">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-red-400">
            <Flag className="h-4 w-4" /> Next Race · Round {race.round}
          </div>
          <h3 className="text-2xl font-bold">{race.name}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-300"><MapPin className="h-4 w-4" /> {race.location}, {race.country}</p>
          <p className="mt-1 text-sm text-zinc-400">{race.circuit}</p>
          {race.isSprint && <Badge className="mt-3 bg-orange-600 text-white">Sprint Weekend</Badge>}
        </div>
        <div className="flex flex-col justify-center gap-4 p-6">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Lights out in</div>
            <div className="text-3xl font-extrabold tabular-nums text-red-600">{countdown || '—'}</div>
          </div>
          <div className="text-sm">
            <Row label="Weekend" value={weekendRange(race)} divider />
            {session && <Row label="Next session" value={session.name} divider />}
            {session && <Row label="Starts" value={formatISTDateTime(session.date_start, { weekday: true })} />}
          </div>
          <div className="flex gap-2">
            <Link to="/race-center" className="flex-1"><Button className="w-full bg-red-600 hover:bg-red-700">Race Center <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
            <Link to="/race-calendar" className="flex-1"><Button variant="outline" className="w-full">Calendar</Button></Link>
          </div>
        </div>
      </div>
    </Card>
  );
}

function SeasonCompleteCard() {
  return (
    <Card className="mx-auto max-w-2xl">
      <CardContent className="py-16 text-center">
        <Flag className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="text-xl font-bold">Season complete</h3>
        <p className="mt-1 text-muted-foreground">No upcoming races for {SEASON_YEAR}. See the full calendar and final standings.</p>
        <div className="mt-5 flex justify-center gap-2">
          <Link to="/race-calendar"><Button variant="outline">Calendar</Button></Link>
          <Link to="/ratings"><Button className="bg-red-600 hover:bg-red-700">Final Standings</Button></Link>
        </div>
      </CardContent>
    </Card>
  );
}

// A light row used inside the dark race cards.
function Row({ label, value, divider }: { label: string; value: string; divider?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 py-1.5 ${divider ? 'border-b border-border/60' : ''}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}

function MiniAvatar({ photo, name, color }: { photo: string | null; name: string; color: string }) {
  const [broken, setBroken] = useState(false);
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('');
  if (!photo || broken) {
    return <div className="grid h-9 w-9 place-items-center rounded-full text-xs font-bold text-white" style={{ background: color }}>{initials}</div>;
  }
  return <img src={photo} alt={name} loading="lazy" decoding="async" onError={() => setBroken(true)} className="h-9 w-9 rounded-full bg-white object-cover object-top" style={{ boxShadow: `0 0 0 2px ${color}` }} />;
}

function DriverRow({ d }: { d: DriverStanding }) {
  const name = `${d.givenName} ${d.familyName}`;
  const color = d.teamColor || '#6b7280';
  const inner = (
    <div className="flex items-center gap-3 py-2">
      <span className="w-5 text-center text-sm font-bold text-muted-foreground tabular-nums">{d.position}</span>
      <MiniAvatar photo={d.headshot_url} name={name} color={color} />
      <span className="h-8 w-1 rounded-full" style={{ background: color }} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold leading-tight group-hover:text-red-600">{name}</div>
        <div className="truncate text-xs text-muted-foreground">{d.team ?? '—'}</div>
      </div>
      <span className="font-bold tabular-nums">{d.points}</span>
    </div>
  );
  return d.driverId
    ? <Link to={`/driver/${d.driverId}`} className="group block rounded-md px-1 transition-colors hover:bg-accent">{inner}</Link>
    : inner;
}

function ConstructorRow({ c }: { c: ConstructorStanding }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="w-5 text-center text-sm font-bold text-muted-foreground tabular-nums">{c.position}</span>
      {c.position === 1 ? <Trophy className="h-4 w-4 text-yellow-500" /> : <span className="w-4" />}
      <div className="min-w-0 flex-1 truncate font-semibold">{c.name}</div>
      <span className="font-bold tabular-nums">{c.points}</span>
    </div>
  );
}

function FeatureCard({ to, icon: Icon, title, blurb }: { to: string; icon: React.ComponentType<{ className?: string }>; title: string; blurb: string }) {
  return (
    <Link to={to}>
      <Card className="h-full transition-all hover:-translate-y-1 hover:border-red-500/40 hover:shadow-lg">
        <CardContent className="flex flex-col gap-2 p-5">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-red-600/10 text-red-600"><Icon className="h-5 w-5" /></span>
          <div className="font-bold">{title}</div>
          <div className="text-xs text-muted-foreground">{blurb}</div>
        </CardContent>
      </Card>
    </Link>
  );
}

function RowSkeletons({ n }: { n: number }) {
  return (
    <div className="space-y-2">
      {[...Array(n)].map((_, i) => <Skeleton key={i} className="h-11 w-full rounded-md" />)}
    </div>
  );
}

export default Home;
