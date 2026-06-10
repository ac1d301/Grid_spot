import { useMemo, useRef, useState } from 'react';
import { compoundColor, COMPOUND_COLORS } from '@/lib/f1-colors';
import type { DriverStrategy, Stint } from '@/services/f1';

type Tip = { left: number; top: number; lines: string[] } | null;

// Slim SVG Gantt: one row per driver (already ordered + filtered by the parent), stint bars
// coloured by compound, pit markers as little triangles. Tooltip is positioned RELATIVE to
// the wrapper (not viewport-fixed), so it never escapes the card or jumps on scroll.
export function TyreStrategyChart({ drivers }: { drivers: DriverStrategy[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip>(null);

  const totalLaps = useMemo(
    () => Math.max(1, ...drivers.flatMap((d) => d.stints.map((s) => s.lap_end || 0))),
    [drivers]
  );

  const ROW_H = 18, GAP = 5, LABEL_W = 52, PAD_R = 12, INNER_W = 1000;
  const lapToX = (lap: number) => LABEL_W + ((lap - 1) / (totalLaps - 1 || 1)) * (INNER_W - LABEL_W - PAD_R);
  const height = drivers.length * (ROW_H + GAP) + 22;

  const fitted = (d: DriverStrategy, lap: number): string | null =>
    d.stints.find((s) => s.lap_start === lap + 1 || s.lap_start === lap)?.compound ?? null;

  const show = (e: React.MouseEvent, lines: string[]) => {
    const r = wrapRef.current?.getBoundingClientRect();
    if (!r) return;
    const left = Math.min(e.clientX - r.left + 12, r.width - 168);
    setTip({ left: Math.max(4, left), top: e.clientY - r.top + 12, lines });
  };

  const stintTip = (d: DriverStrategy, s: Stint): string[] => [
    `${d.acronym ?? d.name ?? `#${d.driver_number}`} · ${s.compound ?? 'UNKNOWN'}`,
    `Laps ${s.lap_start}–${s.lap_end} (${s.laps_on_tyre ?? s.lap_end - s.lap_start + 1} laps)`,
    `Tyre age at start: ${s.tyre_age_at_start ?? '?'}`,
  ];

  return (
    <div>
      {/* legend */}
      <div className="mb-3 flex flex-wrap gap-3 text-xs">
        {Object.entries(COMPOUND_COLORS).filter(([k]) => k !== 'UNKNOWN').map(([k, c]) => (
          <span key={k} className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: c }} /> {k}
          </span>
        ))}
        <span className="flex items-center gap-1 text-muted-foreground"><span className="text-foreground/70">▼</span> pit stop</span>
      </div>

      {/* On narrow screens the 1000-unit viewBox would shrink labels to a few px; scroll instead. */}
      <div ref={wrapRef} className="relative overflow-x-auto">
        <svg viewBox={`0 0 ${INNER_W} ${height}`} className="w-full min-w-[640px]" role="img" aria-label="Tyre strategy timeline"
          onMouseLeave={() => setTip(null)}>
          {drivers.map((d, i) => {
            const y = i * (ROW_H + GAP) + 12;
            return (
              <g key={d.driver_number}>
                <text x={0} y={y + ROW_H * 0.72} fontSize={12} className="fill-foreground">{d.acronym ?? `#${d.driver_number}`}</text>
                {d.stints.map((s, j) => {
                  const x = lapToX(s.lap_start);
                  return (
                    <rect key={j} x={x} y={y} width={Math.max(2, lapToX(s.lap_end) - x)} height={ROW_H} rx={3}
                      fill={compoundColor(s.compound)} className="cursor-pointer transition-opacity hover:opacity-80"
                      onMouseMove={(e) => show(e, stintTip(d, s))} />
                  );
                })}
                {d.pit_stops.map((p, j) => {
                  const x = lapToX(p.lap_number);
                  const f = fitted(d, p.lap_number);
                  const lines = [
                    `${d.acronym ?? `#${d.driver_number}`} · Pit stop`,
                    `Lap ${p.lap_number}`,
                    p.pit_duration != null ? `Stationary ${p.pit_duration.toFixed(1)}s` : 'Duration n/a',
                    ...(f ? [`Fitted: ${f}`] : []),
                  ];
                  return (
                    <g key={`p${j}`} className="cursor-pointer" onMouseMove={(e) => show(e, lines)}>
                      <line x1={x} x2={x} y1={y - 2} y2={y + ROW_H + 2} stroke="currentColor" strokeWidth={1.25} className="text-foreground/70" />
                      <path d={`M${x - 3} ${y - 6} L${x + 3} ${y - 6} L${x} ${y - 1} Z`} className="fill-foreground/80" />
                      <rect x={x - 5} y={y - 6} width={10} height={ROW_H + 10} fill="transparent" />
                    </g>
                  );
                })}
              </g>
            );
          })}
          {Array.from({ length: Math.ceil(totalLaps / 10) + 1 }, (_, k) => k * 10 || 1)
            .filter((l) => l <= totalLaps)
            .map((l) => (
              <text key={l} x={lapToX(l)} y={height - 2} fontSize={10} textAnchor="middle" className="fill-muted-foreground">{l}</text>
            ))}
        </svg>

        {tip && (
          <div className="pointer-events-none absolute z-20 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-white shadow-xl"
            style={{ left: tip.left, top: tip.top }}>
            {tip.lines.map((l, i) => <div key={i} className={i === 0 ? 'font-semibold' : 'text-zinc-300'}>{l}</div>)}
          </div>
        )}
      </div>
    </div>
  );
}
