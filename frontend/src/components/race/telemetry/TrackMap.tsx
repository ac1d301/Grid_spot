import { useTrackMap } from '@/hooks/useF1Queries';
import { driverColor } from '@/lib/f1-colors';
import { WidgetShell } from '@/components/race/WidgetShell';

// 2D SVG track map. OpenF1 only records /location for some (recent/live) sessions, so
// this often shows an empty state — that's expected, not an error.
export function TrackMap({ sessionKey, isLive }: { sessionKey: number; isLive: boolean }) {
  const { data, isLoading, isError } = useTrackMap(sessionKey, undefined, isLive, true);
  const cars = data?.positions ?? [];
  const b = data?.bounds;

  const VB = 1000;
  const norm = (v: number, min: number, max: number) => (max === min ? 0.5 : (v - min) / (max - min));

  return (
    <WidgetShell
      title="Track Map"
      isLoading={isLoading}
      isError={isError}
      isEmpty={!cars.length || !b}
      emptyText="No track-position data for this session"
      className="lg:col-span-2"
    >
      <svg viewBox={`0 0 ${VB} ${VB}`} className="w-full max-h-[420px]" role="img" aria-label="Track map">
        {b &&
          cars.map((c) => {
            const cx = 40 + norm(c.x, b.minX, b.maxX) * (VB - 80);
            const cy = VB - (40 + norm(c.y, b.minY, b.maxY) * (VB - 80)); // flip Y for screen coords
            return (
              <g key={c.driver_number}>
                <circle cx={cx} cy={cy} r={12} fill={driverColor(c.color)} stroke="#000" strokeWidth={1} />
                <text x={cx} y={cy - 16} fontSize={16} textAnchor="middle" className="fill-foreground">
                  {c.acronym ?? `#${c.driver_number}`}
                </text>
              </g>
            );
          })}
      </svg>
    </WidgetShell>
  );
}
