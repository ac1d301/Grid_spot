import { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { compoundColor } from '@/lib/f1-colors';
import type { DriverStrategy } from '@/services/f1';

// Pit stops grouped by driver (rows are already ordered by finishing position by the parent):
// how many stops each driver made, and for every stop the lap + the tyre fitted.
export function PitStopsTable({ drivers }: { drivers: DriverStrategy[] }) {
  const rows = useMemo(
    () =>
      drivers
        .map((d) => {
          const stops = [...d.pit_stops]
            .sort((a, b) => a.lap_number - b.lap_number)
            .map((p) => {
              // fitted tyre = compound of the stint that starts at (lap+1)-ish; best-effort
              const fit = d.stints.find((s) => s.lap_start === p.lap_number + 1 || s.lap_start === p.lap_number);
              return { lap: p.lap_number, duration: p.pit_duration, compound: fit?.compound ?? null };
            });
          return { who: d.acronym ?? d.name ?? `#${d.driver_number}`, count: stops.length, stops };
        })
        .filter((r) => r.count > 0),
    [drivers]
  );

  if (!rows.length) return <p className="py-4 text-sm text-muted-foreground">No pit stops recorded for this session.</p>;

  return (
    <div className="max-h-80 overflow-y-auto overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Driver</TableHead>
            <TableHead className="text-center">Stops</TableHead>
            <TableHead>Pit stops — lap &amp; tyre fitted</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.who}>
              <TableCell className="font-mono font-semibold align-top">{r.who}</TableCell>
              <TableCell className="text-center align-top">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-sm font-bold tabular-nums">
                  {r.count}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1.5">
                  {r.stops.map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-1.5 py-0.5 text-xs">
                      <span className="font-semibold tabular-nums">L{s.lap}</span>
                      <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: compoundColor(s.compound) }} />
                      <span>{s.compound ?? 'UNKNOWN'}</span>
                      {s.duration != null && <span className="text-muted-foreground">· {s.duration.toFixed(1)}s</span>}
                    </span>
                  ))}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
