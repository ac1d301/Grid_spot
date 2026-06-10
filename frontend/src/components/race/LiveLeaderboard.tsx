import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useLive } from '@/hooks/useF1Queries';
import { formatGap } from '@/lib/datetime';
import { flagClass, driverColor } from '@/lib/f1-colors';
import { WidgetShell } from './WidgetShell';

export function LiveLeaderboard({ sessionKey, isLive }: { sessionKey?: number; isLive: boolean }) {
  const { data, isLoading, isError, isFetching, dataUpdatedAt } = useLive(sessionKey, isLive, true);
  const board = data?.leaderboard ?? [];

  return (
    <WidgetShell
      title="Live Timing"
      icon={isLive ? <span className="h-2.5 w-2.5 rounded-full bg-red-600 animate-pulse" /> : null}
      isLoading={isLoading}
      isError={isError}
      isEmpty={!board.length}
      emptyText={isLive ? 'Waiting for timing data…' : 'Session is not live'}
      skeletonRows={10}
      className="lg:col-span-2"
    >
      <div className="flex items-center justify-between mb-2">
        {data?.current_flag ? (
          <Badge className={flagClass(data.current_flag)}>{data.current_flag}</Badge>
        ) : <span />}
        <span className="text-xs text-muted-foreground">
          {isFetching ? 'Updating…' : dataUpdatedAt ? `Updated ${new Date(dataUpdatedAt).toLocaleTimeString('en-IN')}` : ''}
        </span>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">P</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead className="text-right">Gap</TableHead>
              <TableHead className="text-right">Interval</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {board.map((e) => (
              <TableRow key={e.driver_number}>
                <TableCell className="font-bold tabular-nums">{e.position ?? '—'}</TableCell>
                <TableCell>
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-4 w-1.5 rounded" style={{ background: driverColor(e.color) }} />
                    <span className="font-mono font-semibold">{e.acronym ?? `#${e.driver_number}`}</span>
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">{formatGap(e.gap_to_leader)}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{formatGap(e.interval)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </WidgetShell>
  );
}
