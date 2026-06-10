import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Trophy, Award, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDriverProfile } from '@/hooks/useF1Queries';
import { SEASON_YEAR } from '@/lib/constants';

const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) => (
  <Card>
    <CardContent className="p-4 text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </CardContent>
  </Card>
);

const DriverProfile = () => {
  const { driverId } = useParams();
  const { data, isLoading, isError } = useDriverProfile(driverId, SEASON_YEAR);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (isError || !data?.driver) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-xl font-semibold mb-4">Couldn’t load this driver.</p>
        <Link to="/ratings" className="text-red-500 hover:underline">← Back to standings</Link>
      </div>
    );
  }

  const d = data.driver;
  const h2h = data.teammate?.raceHeadToHead;

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-br from-zinc-900 via-black to-zinc-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <Link to="/ratings" className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white mb-3">
            <ArrowLeft className="h-4 w-4" /> Standings
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold">{d.name}</h1>
          <p className="text-zinc-300 mt-1">
            {d.number != null && <span className="font-mono mr-2">#{d.number}</span>}
            {data.currentTeam} • {d.nationality} • {SEASON_YEAR}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<Trophy className="h-5 w-5 text-yellow-500" />} label="Career Wins" value={data.career.careerWins} />
          <StatCard icon={<Award className="h-5 w-5 text-orange-500" />} label="Career Podiums" value={data.career.careerPodiums} />
          <StatCard icon={<Star className="h-5 w-5 text-purple-500" />} label="Career Poles" value={data.career.careerPoles} />
          <StatCard icon={<Trophy className="h-5 w-5 text-green-500" />} label={`${SEASON_YEAR} Points`} value={data.seasonPoints} />
        </div>

        {h2h && data.teammate && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-lg">Teammate Head-to-Head</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-semibold">{d.name.split(' ').pop()}</span>
                <span className="text-muted-foreground">vs</span>
                <Link to={`/driver/${data.teammate.teammateId}`} className="font-semibold hover:underline capitalize">
                  {data.teammate.teammateId.replace(/_/g, ' ')}
                </Link>
              </div>
              <div className="flex h-6 rounded overflow-hidden">
                <div className="bg-green-600 flex items-center justify-center text-xs text-white"
                  style={{ width: `${(h2h.driver / Math.max(1, h2h.driver + h2h.teammate)) * 100}%` }}>{h2h.driver}</div>
                <div className="bg-zinc-500 flex items-center justify-center text-xs text-white"
                  style={{ width: `${(h2h.teammate / Math.max(1, h2h.driver + h2h.teammate)) * 100}%` }}>{h2h.teammate}</div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Race finishes ahead of teammate this season</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-lg">{SEASON_YEAR} Results</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Rd</TableHead><TableHead>Grand Prix</TableHead>
                  <TableHead className="text-right">Grid</TableHead><TableHead className="text-right">Finish</TableHead>
                  <TableHead className="text-right">Pts</TableHead><TableHead className="hidden sm:table-cell">Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {data.seasonResults.map((r) => (
                    <TableRow key={r.round}>
                      <TableCell className="tabular-nums">{r.round}</TableCell>
                      <TableCell>{r.raceName}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.grid ?? '—'}</TableCell>
                      <TableCell className="text-right font-bold tabular-nums">{r.position ?? '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.points ?? 0}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{r.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DriverProfile;
