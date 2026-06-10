import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Trophy, Award, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DriverCard } from '@/components/DriverCard';
import { useDriverStandings } from '@/hooks/useF1Queries';
import { SEASON_YEAR } from '@/lib/constants';
import { driverColor } from '@/lib/f1-colors';
import type { DriverStanding as ApiDriverStanding } from '@/services/f1';

interface DriverStanding extends ApiDriverStanding {
  careerWins: number;
  careerPodiums: number;
  careerPoles: number;
}

type SortKey = 'points' | 'name' | 'careerWins' | 'careerPodiums' | 'careerPoles';
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'points', label: 'Season Points' },
  { key: 'careerWins', label: 'Career Wins' },
  { key: 'careerPodiums', label: 'Career Podiums' },
  { key: 'careerPoles', label: 'Career Poles' },
  { key: 'name', label: 'Name' },
];

const MEDAL_RING: Record<number, string> = {
  1: 'ring-2 ring-yellow-400 md:-translate-y-4',
  2: 'ring-2 ring-zinc-300',
  3: 'ring-2 ring-amber-600',
};

// Larger "podium" card for the championship top 3.
function PodiumCard({ d, loading }: { d: DriverStanding; loading: boolean }) {
  const color = driverColor(d.teamColor);
  const name = `${d.givenName} ${d.familyName}`;
  const initials = `${d.givenName?.[0] ?? ''}${d.familyName?.[0] ?? ''}`;
  const inner = (
    <div className={`relative rounded-2xl border bg-card overflow-hidden transition-all hover:shadow-2xl ${MEDAL_RING[d.position] ?? ''}`}>
      <div className="relative px-5 pt-5 pb-4 text-center" style={{ background: `linear-gradient(160deg, ${color}33, transparent 75%)` }}>
        <span className="absolute top-3 left-4 text-sm font-black px-2 py-0.5 rounded-full bg-black/70 text-white">P{d.position}</span>
        <span className="absolute top-3 right-4 text-2xl font-black" style={{ color }}>#{d.permanentNumber}</span>
        {d.headshot_url ? (
          <img src={d.headshot_url} alt={name} className="h-28 w-28 rounded-full object-cover object-top mx-auto bg-white"
            style={{ boxShadow: `0 0 0 4px ${color}` }} onError={(e) => ((e.currentTarget.style.display = 'none'))} />
        ) : (
          <div className="h-28 w-28 rounded-full grid place-items-center text-2xl font-black text-white mx-auto" style={{ background: color }}>{initials}</div>
        )}
        <h3 className="mt-3 text-xl font-bold">{name}</h3>
        <p className="text-xs text-muted-foreground">{d.team}</p>
        <div className="absolute bottom-0 left-0 right-0 h-1.5" style={{ background: color }} />
      </div>
      <div className="p-5">
        <div className="text-center mb-4">
          <span className="text-4xl font-black tabular-nums">{d.points}</span>
          <span className="text-sm text-muted-foreground ml-1">PTS</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div><div className="flex items-center justify-center gap-1 font-bold"><Trophy className="h-4 w-4 text-yellow-500" />{loading ? '…' : d.careerWins}</div><div className="text-[10px] uppercase text-muted-foreground">Wins</div></div>
          <div><div className="flex items-center justify-center gap-1 font-bold"><Award className="h-4 w-4 text-orange-500" />{loading ? '…' : d.careerPodiums}</div><div className="text-[10px] uppercase text-muted-foreground">Podiums</div></div>
          <div><div className="flex items-center justify-center gap-1 font-bold"><Star className="h-4 w-4 text-purple-500" />{loading ? '…' : d.careerPoles}</div><div className="text-[10px] uppercase text-muted-foreground">Poles</div></div>
        </div>
      </div>
    </div>
  );
  return d.driverId ? <Link to={`/driver/${d.driverId}`} className="block">{inner}</Link> : inner;
}

const Ratings = () => {
  const [sortBy, setSortBy] = useState<SortKey>('points');
  const [search, setSearch] = useState('');
  const [team, setTeam] = useState('all');

  const seasonQuery = useDriverStandings(SEASON_YEAR, false);
  const careerQuery = useDriverStandings(SEASON_YEAR, true);
  const data = careerQuery.data ?? seasonQuery.data;
  const isLoading = !data && !(seasonQuery.isError && careerQuery.isError);
  const isError = !data && seasonQuery.isError && careerQuery.isError;
  const careerLoading = !careerQuery.data && !careerQuery.isError;

  const standings: DriverStanding[] = useMemo(
    () =>
      (data ?? []).map((d) => ({
        ...d,
        permanentNumber: d.permanentNumber ?? d.driver_number ?? 0,
        team: d.team ?? 'Unknown',
        careerWins: d.careerWins ?? 0,
        careerPodiums: d.careerPodiums ?? 0,
        careerPoles: d.careerPoles ?? 0,
      })),
    [data]
  );

  const teams = useMemo(() => [...new Set(standings.map((d) => d.team).filter(Boolean))].sort() as string[], [standings]);
  const top3 = useMemo(() => [...standings].sort((a, b) => a.position - b.position).slice(0, 3), [standings]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return standings.filter((d) => {
      const hay = `${d.givenName} ${d.familyName} ${d.team} ${d.name_acronym ?? ''}`.toLowerCase();
      return (!q || hay.includes(q)) && (team === 'all' || d.team === team);
    });
  }, [standings, search, team]);

  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        switch (sortBy) {
          case 'points': return b.points - a.points;
          case 'name': return `${a.givenName} ${a.familyName}`.localeCompare(`${b.givenName} ${b.familyName}`);
          case 'careerWins': return b.careerWins - a.careerWins;
          case 'careerPodiums': return b.careerPodiums - a.careerPodiums;
          case 'careerPoles': return b.careerPoles - a.careerPoles;
          default: return 0;
        }
      }),
    [filtered, sortBy]
  );

  const showPodium = !search.trim() && team === 'all' && top3.length === 3;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-gradient-to-br from-zinc-900 via-black to-zinc-900 text-white py-12">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl md:text-5xl font-bold">{SEASON_YEAR} <span className="text-red-600">DRIVERS</span></h1>
            <p className="text-zinc-300 mt-2">Loading championship standings…</p>
          </div>
        </div>
        <div className="container mx-auto px-4 py-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[...Array(12)].map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero — matches the site (dark zinc + red accent) */}
      <div className="bg-gradient-to-br from-zinc-900 via-black to-zinc-900 text-white">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-4xl md:text-5xl font-bold">
            {SEASON_YEAR} <span className="text-red-600">DRIVERS</span>
          </h1>
          <p className="text-zinc-300 mt-2 flex items-center gap-3 flex-wrap">
            Championship standings — auto-updating.
            {careerLoading && <Badge variant="outline" className="text-zinc-300 border-zinc-600 animate-pulse">Updating career stats…</Badge>}
            {isError && <Badge variant="outline" className="text-orange-400 border-orange-500/40">Showing latest available data</Badge>}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Podium */}
        {showPodium && (
          <section>
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">Championship Leaders</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:items-start pt-4">
              {/* order P2, P1, P3 on desktop for a podium feel */}
              {[top3[1], top3[0], top3[2]].map((d) => d && <PodiumCard key={d.permanentNumber} d={d} loading={careerLoading} />)}
            </div>
          </section>
        )}

        {/* Controls */}
        <section className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="relative lg:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search driver or team…" className="pl-9" />
          </div>
          <Select value={team} onValueChange={setTeam}>
            <SelectTrigger className="lg:w-52"><SelectValue placeholder="All teams" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All teams</SelectItem>
              {teams.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex flex-wrap gap-2 lg:ml-auto">
            {SORTS.map((s) => (
              <Button key={s.key} size="sm" variant={sortBy === s.key ? 'default' : 'outline'} onClick={() => setSortBy(s.key)}>
                {s.label}
              </Button>
            ))}
          </div>
        </section>

        {/* Grid */}
        <section>
          <p className="text-sm text-muted-foreground mb-4">{sorted.length} of {standings.length} drivers</p>
          {sorted.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center">No drivers match your search.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {sorted.map((d) => (
                <DriverCard
                  key={d.permanentNumber}
                  rank={d.position}
                  driverNumber={d.permanentNumber}
                  driverId={d.driverId}
                  driverName={`${d.givenName} ${d.familyName}`}
                  acronym={d.name_acronym}
                  photo={d.headshot_url}
                  team={d.team}
                  teamColor={d.teamColor}
                  nationality={d.nationality}
                  points={d.points}
                  seasonWins={d.wins}
                  careerWins={d.careerWins}
                  careerPodiums={d.careerPodiums}
                  careerPoles={d.careerPoles}
                  careerLoading={careerLoading}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Ratings;
