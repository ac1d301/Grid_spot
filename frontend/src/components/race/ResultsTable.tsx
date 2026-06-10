import { Link } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trophy } from 'lucide-react';
import { useResults } from '@/hooks/useF1Queries';
import { formatGap } from '@/lib/datetime';
import { driverColor } from '@/lib/f1-colors';
import { WidgetShell } from './WidgetShell';

export function ResultsTable({ sessionKey, enabled }: { sessionKey?: number; enabled: boolean }) {
  const { data, isLoading, isError } = useResults(sessionKey, enabled);
  const rows = data?.classification ?? [];

  return (
    <WidgetShell
      title="Results"
      icon={<Trophy className="h-5 w-5 text-yellow-500" />}
      isLoading={isLoading}
      isError={isError}
      isEmpty={!rows.length}
      skeletonRows={8}
      className="lg:col-span-2"
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">P</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead className="hidden sm:table-cell">Team</TableHead>
              <TableHead className="text-right">Laps</TableHead>
              <TableHead className="text-right">Gap</TableHead>
              <TableHead className="text-right">Pts</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.driver_number}>
                <TableCell className="font-bold tabular-nums">{r.position ?? '—'}</TableCell>
                <TableCell>
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-4 w-1.5 rounded" style={{ background: driverColor(r.teamColor) }} />
                    {r.driverId ? (
                      <Link to={`/driver/${r.driverId}`} className="font-medium hover:underline">
                        {r.name ?? r.acronym}
                      </Link>
                    ) : (
                      <span className="font-medium">{r.name ?? r.acronym}</span>
                    )}
                    {r.is_fastest_lap && <Badge className="bg-purple-600 text-white text-[10px] px-1.5">FL</Badge>}
                    {r.dnf && <Badge variant="outline" className="text-[10px] text-red-500">DNF</Badge>}
                    {r.dsq && <Badge variant="outline" className="text-[10px] text-red-500">DSQ</Badge>}
                  </span>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{r.team ?? '—'}</TableCell>
                <TableCell className="text-right tabular-nums">{r.laps ?? '—'}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {r.position === 1 ? '—' : formatGap(r.gap)}
                </TableCell>
                <TableCell className="text-right font-bold tabular-nums">{r.points}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </WidgetShell>
  );
}
