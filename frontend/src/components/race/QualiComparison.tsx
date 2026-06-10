import { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Gauge } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useQualifying } from '@/hooks/useF1Queries';
import { formatLapTime } from '@/lib/datetime';
import { assignDriverColors } from '@/lib/f1-colors';
import { paddedDomain, niceTimeTicks } from '@/lib/chart';
import { WidgetShell } from './WidgetShell';
import type { QualiRow } from '@/services/f1';

type Phase = 'q1' | 'q2' | 'q3';
const PHASES: Phase[] = ['q1', 'q2', 'q3'];
const SECTORS = ['S1', 'S2', 'S3'] as const;
const COLS = ['S1', 'S2', 'S3', 'LAP'] as const;

// Select a phase (Q1/Q2/Q3) and see each selected driver's fastest-lap SECTOR times as a
// line graph (same look as the lap-time chart). One thin line per driver across S1/S2/S3.
export function QualiComparison({ sessionKey, enabled }: { sessionKey?: number; enabled: boolean }) {
  const { data, isLoading, isError } = useQualifying(sessionKey, enabled);
  const drivers = useMemo(() => data?.drivers ?? [], [data]);
  const colorOf = useMemo(() => assignDriverColors(drivers), [drivers]);

  const [phase, setPhase] = useState<Phase>('q3');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  useEffect(() => {
    if (drivers.length && selected.size === 0) {
      // Default to the top 3 qualifiers — sort by position explicitly so it's
      // robust to payload order (drivers without a position fall to the back).
      const top3 = [...drivers]
        .sort((a, b) => (a.position ?? 99) - (b.position ?? 99))
        .slice(0, 3)
        .map((d) => d.driver_number);
      setSelected(new Set(top3));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drivers]);

  const toggleDriver = (n: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(n) ? next.delete(n) : next.add(n);
      return next;
    });

  const chosen = useMemo(
    () => drivers.filter((d) => selected.has(d.driver_number) && d[phase]),
    [drivers, selected, phase]
  );
  const sectorsOf = (d: QualiRow) => d[phase]?.sectors ?? [null, null, null];

  // One row per column (S1/S2/S3 + the full LAP time); a column per selected driver.
  const rows = useMemo(
    () =>
      COLS.map((label) => {
        const row: Record<string, number | string | null> = { col: label };
        for (const d of chosen) {
          const p = d[phase];
          row[`d${d.driver_number}`] = !p ? null : label === 'LAP' ? p.time : p.sectors[SECTORS.indexOf(label as (typeof SECTORS)[number])];
        }
        return row;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chosen, phase]
  );

  // y-domain across every shown value (sectors + lap) so the lap point fits too. Padding
  // scales with the span (sectors ~20s, full lap ~80s share one axis); ticks are snapped
  // to round steps. No percentile clip here — that could lop off the lap point itself.
  const times = chosen
    .flatMap((d) => [...sectorsOf(d), d[phase]?.time ?? null])
    .filter((t): t is number => typeof t === 'number');
  const [yMin, yMax] = paddedDomain(times, 0.04, 0.2, 0) ?? [0, 80];
  const yTicks = niceTimeTicks(yMin, yMax, 8);
  const nameOf = (n: number) => drivers.find((d) => d.driver_number === n)?.acronym ?? `#${n}`;

  return (
    <WidgetShell
      title="Qualifying — Sectors & Lap"
      icon={<Gauge className="h-5 w-5 text-purple-500" />}
      isLoading={isLoading}
      isError={isError}
      isEmpty={!drivers.length}
      skeletonRows={6}
      className="lg:col-span-2"
    >
      {/* phase selector (single) */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-muted-foreground">Phase:</span>
        {PHASES.map((p) => (
          <button key={p} onClick={() => setPhase(p)} type="button">
            <Badge variant={phase === p ? 'default' : 'outline'} className="cursor-pointer">{p.toUpperCase()}</Badge>
          </button>
        ))}
      </div>
      {/* driver selector (multi) */}
      <div className="flex flex-wrap gap-1 mb-3">
        {drivers.map((d) => {
          const on = selected.has(d.driver_number);
          const hasTime = !!d[phase];
          return (
            <button key={d.driver_number} onClick={() => toggleDriver(d.driver_number)} type="button" disabled={!hasTime}>
              <Badge
                variant={on ? 'default' : 'outline'}
                style={on ? { backgroundColor: colorOf.get(d.driver_number)?.line, color: '#000' } : undefined}
                className={hasTime ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'}
              >
                {d.acronym ?? `#${d.driver_number}`}
              </Badge>
            </button>
          );
        })}
      </div>
      <div className="h-[320px] w-full rounded-lg bg-zinc-950 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ left: 8, right: 16, top: 8, bottom: 4 }}>
            <CartesianGrid vertical={false} stroke="#3f3f46" strokeOpacity={0.5} />
            <XAxis dataKey="col" tickLine={false} axisLine={false} fontSize={12} tick={{ fill: '#a1a1aa' }} padding={{ left: 24, right: 24 }} />
            <YAxis width={64} fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#a1a1aa' }}
              tickFormatter={(v) => formatLapTime(Number(v))} domain={[yMin, yMax]} ticks={yTicks} allowDecimals />
            <Tooltip
              contentStyle={{ fontSize: 12, background: '#18181b', border: '1px solid #3f3f46', color: '#fff' }}
              labelFormatter={(l) => (l === 'LAP' ? 'Full Lap' : `Sector ${String(l).slice(1)}`)}
              formatter={(val: number, key: string, item: { payload?: Record<string, number | string> }) => {
                // delta to the fastest selected driver in this column (sector or lap)
                const payload = item?.payload || {};
                const vals = Object.keys(payload)
                  .filter((k) => k.startsWith('d'))
                  .map((k) => payload[k])
                  .filter((v): v is number => typeof v === 'number');
                const best = vals.length ? Math.min(...vals) : val;
                const delta = val - best;
                const tag = delta <= 0.0005 ? 'fastest' : `+${delta.toFixed(3)}`;
                return [`${formatLapTime(val)}  (${tag})`, nameOf(Number(key.replace('d', '')))];
              }}
            />
            {chosen.map((d) => {
              const c = colorOf.get(d.driver_number);
              return (
                <Line key={d.driver_number} type="monotone" dataKey={`d${d.driver_number}`}
                  stroke={c?.line} strokeOpacity={0.9} strokeWidth={1.5}
                  dot={{ r: 3, fill: c?.accent, stroke: c?.line }} activeDot={{ r: 5 }} connectNulls isAnimationActive={false} />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Fastest-lap sector times + the full lap (selected phase). Hover any point for the time and the
        gap to the fastest in that sector — or to the fastest lap at <span className="font-semibold">LAP</span>.
      </p>
    </WidgetShell>
  );
}
