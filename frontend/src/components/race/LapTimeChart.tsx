import { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { LineChart as LineIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useLaps, useResults } from '@/hooks/useF1Queries';
import { formatLapTime } from '@/lib/datetime';
import { assignDriverColors } from '@/lib/f1-colors';
import { topDriverNumbers } from '@/lib/session-helpers';
import { robustTimeDomain, niceTimeTicks } from '@/lib/chart';
import { WidgetShell } from './WidgetShell';

export function LapTimeChart({ sessionKey, enabled }: { sessionKey?: number; enabled: boolean }) {
  const { data, isLoading, isError } = useLaps(sessionKey, undefined, enabled);
  const { data: results } = useResults(sessionKey, enabled);
  const drivers = useMemo(() => data?.drivers ?? [], [data]);
  // Per-driver colour scheme (team/identity themed, teammates distinct).
  const colorOf = useMemo(() => assignDriverColors(drivers), [drivers]);

  const [selected, setSelected] = useState<Set<number>>(new Set());
  // Seed the session's top 3 (by classification position) once data arrives;
  // fall back to the 3 drivers with the most laps if results aren't available.
  useEffect(() => {
    if (drivers.length && selected.size === 0) {
      const byLaps = [...drivers].sort((a, b) => b.laps.length - a.laps.length).map((d) => d.driver_number);
      const top = topDriverNumbers(results?.classification, drivers, 3, byLaps);
      setSelected(new Set(top));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drivers, results]);

  const toggle = (n: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(n) ? next.delete(n) : next.add(n);
      return next;
    });

  // Pivot to one row per lap_number with a column per selected driver.
  const rows = useMemo(() => {
    const byLap = new Map<number, Record<string, number>>();
    for (const d of drivers) {
      if (!selected.has(d.driver_number)) continue;
      for (const lp of d.laps) {
        // Skip pit-out laps: they're slow and would otherwise flat-clip against the top of
        // the percentile-clipped y-domain, producing misleading spikes.
        if (lp.lap_duration == null || lp.is_pit_out_lap) continue;
        const row = byLap.get(lp.lap_number) ?? { lap: lp.lap_number };
        row[`d${d.driver_number}`] = lp.lap_duration;
        byLap.set(lp.lap_number, row);
      }
    }
    return [...byLap.values()].sort((a, b) => a.lap - b.lap);
  }, [drivers, selected]);

  // Robust y-domain: clip the slowest outlier laps (traffic / safety car) to the ~92nd
  // percentile so the racing-pace variation actually fills the chart and reads accurately.
  const yDomain = useMemo<[number, number] | undefined>(() => {
    const vals: number[] = [];
    for (const d of drivers) {
      if (!selected.has(d.driver_number)) continue;
      for (const lp of d.laps) if (lp.lap_duration != null && !lp.is_pit_out_lap) vals.push(lp.lap_duration);
    }
    return robustTimeDomain(vals, { clipPct: 0.92, padLo: 0.3, padHi: 0.3, floor: 0 });
  }, [drivers, selected]);
  // Snap ticks to round lap-time steps so labels read 1:20.0 / 1:20.5 rather than arbitrary ms.
  const yTicks = useMemo(() => (yDomain ? niceTimeTicks(yDomain[0], yDomain[1], 8) : undefined), [yDomain]);

  const nameOf = (n: number) => drivers.find((d) => d.driver_number === n)?.name ?? `#${n}`;

  return (
    <WidgetShell
      title="Lap Times"
      icon={<LineIcon className="h-5 w-5 text-red-500" />}
      isLoading={isLoading}
      isError={isError}
      isEmpty={!drivers.length}
      skeletonRows={6}
      className="lg:col-span-2"
    >
      <div className="flex flex-wrap gap-1 mb-3">
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
      <div className="h-[340px] w-full rounded-lg bg-zinc-950 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ left: 4, right: 12, top: 8, bottom: 4 }}>
            <CartesianGrid vertical={false} stroke="#3f3f46" strokeOpacity={0.5} />
            <XAxis dataKey="lap" tickLine={false} axisLine={false} fontSize={12} tick={{ fill: '#a1a1aa' }}
              label={{ value: 'Lap', position: 'insideBottom', offset: -2, fontSize: 12, fill: '#a1a1aa' }} />
            <YAxis tickFormatter={(v) => formatLapTime(Number(v))} width={62} fontSize={11} tick={{ fill: '#a1a1aa' }}
              tickLine={false} axisLine={false} domain={yDomain ?? ['dataMin - 0.3', 'dataMax + 0.3']}
              ticks={yTicks} tickCount={8} allowDataOverflow />
            <Tooltip
              contentStyle={{ fontSize: 12, background: '#18181b', border: '1px solid #3f3f46', color: '#fff' }}
              labelFormatter={(l) => `Lap ${l}`}
              formatter={(val: number, key: string) => [formatLapTime(Number(val)), nameOf(Number(key.replace('d', '')))]}
            />
            {drivers
              .filter((d) => selected.has(d.driver_number))
              .map((d) => (
                <Line key={d.driver_number} type="monotone" dataKey={`d${d.driver_number}`}
                  stroke={colorOf.get(d.driver_number)?.line} strokeOpacity={0.9} dot={false}
                  strokeWidth={1.5} connectNulls isAnimationActive={false} />
              ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </WidgetShell>
  );
}
