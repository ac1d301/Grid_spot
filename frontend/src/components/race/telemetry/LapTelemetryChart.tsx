import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { qk } from '@/hooks/useF1Queries';
import { f1Api } from '@/services/f1';
import type { DriverColor } from '@/lib/f1-colors';
import { speedDomain, niceSpeedTicks } from '@/lib/chart';
import { WidgetShell } from '@/components/race/WidgetShell';

// Overlays the SPEED trace of every selected driver for one lap (distinct colours), so
// you can see who's faster on which part of the lap. With a single driver selected it
// also shows throttle/brake. x = elapsed seconds from each driver's lap start.
export function LapTelemetryChart({
  sessionKey,
  drivers,
  lap,
  colorOf,
  nameOf,
}: {
  sessionKey: number;
  drivers: number[];
  lap?: number;
  colorOf: Map<number, DriverColor>;
  nameOf: (n: number) => string;
}) {
  const results = useQueries({
    queries: drivers.map((dn) => ({
      queryKey: qk.telemetry(sessionKey, dn, lap!),
      queryFn: () => f1Api.getTelemetryLap(sessionKey, dn, lap!),
      enabled: !!sessionKey && !!lap && !!dn,
      staleTime: 24 * 60 * 60_000,
    })),
  });

  const isLoading = results.some((r) => r.isLoading);
  const single = drivers.length === 1;

  // Merge each driver's points by elapsed seconds (0.5s buckets) from their lap start.
  const rows = useMemo(() => {
    const byT = new Map<number, Record<string, number>>();
    results.forEach((res, i) => {
      const dn = drivers[i];
      const pts = res.data?.points ?? [];
      if (!pts.length) return;
      const t0 = new Date(pts[0].date).getTime();
      for (const p of pts) {
        const t = Math.round(((new Date(p.date).getTime() - t0) / 1000) * 2) / 2; // 0.5s bucket
        const row = byT.get(t) ?? { t };
        row[`d${dn}`] = p.speed;
        if (single) {
          row.throttle = p.throttle;
          row.brake = p.brake;
        }
        byT.set(t, row);
      }
    });
    return [...byT.values()].sort((a, b) => a.t - b.t);
  }, [results, drivers, single]);

  // Speed axis floored near the slowest point (not 0) so the racing band fills the chart
  // instead of wasting the bottom third on the pit-lane/corner-exit range.
  const speedAxis = useMemo(() => {
    const vals: number[] = [];
    for (const row of rows) for (const dn of drivers) {
      const v = row[`d${dn}`];
      if (typeof v === 'number') vals.push(v);
    }
    const domain = speedDomain(vals);
    return { domain, ticks: domain ? niceSpeedTicks(domain[0], domain[1]) : undefined };
  }, [rows, drivers]);

  return (
    <WidgetShell
      title="Telemetry Comparison (Speed)"
      isLoading={isLoading}
      isError={false}
      isEmpty={!drivers.length || !lap || !rows.length}
      emptyText={!drivers.length || !lap ? 'Pick driver(s) and a lap' : 'No telemetry for this lap'}
      skeletonRows={6}
      className="lg:col-span-2"
    >
      <div className="h-[340px] w-full rounded-lg bg-zinc-950 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ left: 4, right: 8, top: 8, bottom: 4 }}>
            <CartesianGrid vertical={false} stroke="#3f3f46" strokeOpacity={0.5} />
            <XAxis dataKey="t" tickLine={false} axisLine={false} fontSize={11} unit="s" tick={{ fill: '#a1a1aa' }} />
            <YAxis yAxisId="speed" tickLine={false} axisLine={false} fontSize={11} width={42}
              domain={speedAxis.domain ?? [0, 'dataMax + 20']} ticks={speedAxis.ticks} allowDataOverflow tick={{ fill: '#a1a1aa' }} />
            {single && <YAxis yAxisId="pct" orientation="right" tickLine={false} axisLine={false} fontSize={11} width={32} domain={[0, 100]} tick={{ fill: '#a1a1aa' }} />}
            <Tooltip
              contentStyle={{ fontSize: 12, background: '#18181b', border: '1px solid #3f3f46', color: '#fff' }}
              labelFormatter={(t) => `${t}s`}
              formatter={(val: number, key: string) => {
                if (key === 'throttle') return [`${val}%`, 'Throttle'];
                if (key === 'brake') return [`${val}%`, 'Brake'];
                return [`${val} km/h`, nameOf(Number(key.replace('d', '')))];
              }}
            />
            {drivers.map((dn) => (
              <Line key={dn} yAxisId="speed" type="monotone" dataKey={`d${dn}`}
                stroke={colorOf.get(dn)?.line} strokeOpacity={0.85} dot={false} strokeWidth={2.5} connectNulls isAnimationActive={false} />
            ))}
            {single && (
              <>
                <Area yAxisId="pct" type="monotone" dataKey="throttle" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} strokeWidth={1} dot={false} isAnimationActive={false} />
                <Line yAxisId="pct" type="monotone" dataKey="brake" stroke="#3b82f6" dot={false} strokeWidth={1} isAnimationActive={false} />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        {single ? 'Red/your colour = speed · Green = throttle % · Blue = brake %' : 'One line per driver — speed (km/h) over the lap'}
      </p>
    </WidgetShell>
  );
}
