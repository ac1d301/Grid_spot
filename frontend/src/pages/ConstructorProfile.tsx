import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Users, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useConstructorProfile } from '@/hooks/useF1Queries';
import { SEASON_YEAR } from '@/lib/constants';

const ConstructorProfile = () => {
  const { constructorId } = useParams();
  const { data, isLoading, isError } = useConstructorProfile(constructorId, SEASON_YEAR);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <div className="grid grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      </div>
    );
  }
  if (isError || !data?.constructor) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-xl font-semibold mb-4">Couldn’t load this team.</p>
        <Link to="/ratings" className="text-red-500 hover:underline">← Back to standings</Link>
      </div>
    );
  }

  const c = data.constructor;
  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-br from-zinc-900 via-black to-zinc-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <Link to="/ratings" className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white mb-3">
            <ArrowLeft className="h-4 w-4" /> Standings
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold">{c.name}</h1>
          <p className="text-zinc-300 mt-1">{c.nationality} • {SEASON_YEAR}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="p-4 text-center">
            <div className="text-2xl font-bold tabular-nums">P{data.season_position ?? '—'}</div>
            <div className="text-xs text-muted-foreground">Championship</div>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <div className="text-2xl font-bold tabular-nums">{data.season_points ?? '—'}</div>
            <div className="text-xs text-muted-foreground">Points</div>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <div className="text-2xl font-bold tabular-nums flex items-center justify-center gap-1">
              <Trophy className="h-5 w-5 text-yellow-500" />{data.season_wins ?? 0}
            </div>
            <div className="text-xs text-muted-foreground">Wins</div>
          </CardContent></Card>
        </div>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5" /> {SEASON_YEAR} Lineup</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {data.lineup.map((d) => (
                <Link key={d.driverId} to={`/driver/${d.driverId}`}
                  className="px-4 py-2 rounded-lg bg-muted/40 hover:bg-muted font-medium">
                  {d.number != null && <span className="font-mono text-muted-foreground mr-2">#{d.number}</span>}
                  {d.name}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConstructorProfile;
