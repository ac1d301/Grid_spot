import { driverColor } from '@/lib/f1-colors';

// Small reusable team-colour bar + acronym chip.
export function DriverColorDot({ color, acronym }: { color?: string | null; acronym?: string | null }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-block h-3 w-1.5 rounded" style={{ background: driverColor(color) }} />
      {acronym && <span className="font-mono font-semibold">{acronym}</span>}
    </span>
  );
}
