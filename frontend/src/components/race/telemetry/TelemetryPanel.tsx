import { useEffect, useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useLaps, useResults } from '@/hooks/useF1Queries';
import { assignDriverColors } from '@/lib/f1-colors';
import { topDriverNumbers } from '@/lib/session-helpers';
import { LapTelemetryChart } from './LapTelemetryChart';
import { TrackMap } from './TrackMap';

// Lazy-loaded Telemetry tab: multi-select drivers + one lap, overlaying their speed
// traces so you can compare them. Track map below (often empty — location data is sparse).
export default function TelemetryPanel({ sessionKey, isLive }: { sessionKey: number; isLive: boolean }) {
  const { data } = useLaps(sessionKey); // reuses the cached laps query
  const { data: results } = useResults(sessionKey); // reuses the cached results query
  const drivers = useMemo(() => data?.drivers ?? [], [data]);
  const colorOf = useMemo(() => assignDriverColors(drivers), [drivers]);
  const nameOf = (n: number) => drivers.find((d) => d.driver_number === n)?.name ?? `#${n}`;

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [lap, setLap] = useState<number | undefined>();

  // Seed the session's top 3 (by classification position) + a mid lap;
  // fall back to the drivers with the most laps if results aren't available.
  useEffect(() => {
    if (drivers.length && selected.size === 0) {
      const byLaps = [...drivers].sort((a, b) => b.laps.length - a.laps.length).map((d) => d.driver_number);
      const top = topDriverNumbers(results?.classification, drivers, 3, byLaps);
      setSelected(new Set(top));
      const maxLaps = Math.max(...drivers.map((d) => d.laps.length));
      setLap(Math.max(1, Math.round(maxLaps / 2)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drivers, results]);

  const toggle = (n: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(n) ? next.delete(n) : next.add(n);
      return next;
    });

  const maxLap = Math.max(1, ...drivers.map((d) => (d.laps.length ? d.laps[d.laps.length - 1].lap_number : 0)));
  const lapOptions = Array.from({ length: maxLap }, (_, i) => i + 1);
  const chosen = [...selected];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-start">
        <div className="flex-1 min-w-[260px]">
          <Label className="text-xs">Drivers (select 2+ to compare)</Label>
          <div className="flex flex-wrap gap-1 mt-1">
            {drivers.map((d) => {
              const on = selected.has(d.driver_number);
              return (
                <button key={d.driver_number} onClick={() => toggle(d.driver_number)} type="button">
                  <Badge
                    variant={on ? 'default' : 'outline'}
                    style={on ? { backgroundColor: colorOf.get(d.driver_number)?.line, color: '#000' } : undefined}
                    className="cursor-pointer"
                  >
                    {d.name ?? `#${d.driver_number}`}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <Label className="text-xs">Lap</Label>
          <Select value={lap != null ? String(lap) : ''} onValueChange={(v) => setLap(Number(v))}>
            <SelectTrigger className="w-28"><SelectValue placeholder="Lap" /></SelectTrigger>
            <SelectContent className="max-h-72">
              {lapOptions.map((l) => (
                <SelectItem key={l} value={String(l)}>Lap {l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <LapTelemetryChart sessionKey={sessionKey} drivers={chosen} lap={lap} colorOf={colorOf} nameOf={nameOf} />
        <TrackMap sessionKey={sessionKey} isLive={isLive} />
      </div>
    </div>
  );
}
