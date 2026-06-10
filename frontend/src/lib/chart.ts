// Shared helpers for readable recharts axes on lap-time / speed data.
//
// recharts, left to itself, picks an axis domain off raw min/max and emits ticks at
// arbitrary fractional values (e.g. 1:20.186, 1:20.671) — hard to read. These helpers give
// a percentile-clipped domain (so a couple of slow outlier laps don't squash the racing-pace
// band) plus ticks snapped to round steps.

const TIME_STEPS = [0.05, 0.1, 0.2, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60];
const SPEED_STEPS = [5, 10, 20, 25, 50, 100];

// Smallest "nice" step from `steps` that yields roughly `approxCount` ticks across `span`.
function niceStep(span: number, approxCount: number, steps: number[]): number {
  const raw = span / Math.max(1, approxCount);
  for (const s of steps) if (s >= raw) return s;
  return steps[steps.length - 1];
}

function ticksFrom(min: number, max: number, step: number): number[] {
  if (!(max > min) || step <= 0) return [];
  const out: number[] = [];
  const start = Math.ceil(min / step) * step;
  // round each tick to the step so float accumulation doesn't drift (e.g. 80.30000001)
  for (let t = start; t <= max + step * 1e-6; t += step) out.push(Math.round(t / step) * step);
  return out;
}

/**
 * Percentile-clipped [min, max] domain with padding and a hard floor.
 * Clips the slowest `1 - clipPct` of values (traffic / safety-car laps) so the chart fills
 * with racing-pace variation. Returns undefined when there's no usable data.
 */
export function robustTimeDomain(
  values: number[],
  opts: { clipPct?: number; padLo?: number; padHi?: number; floor?: number } = {}
): [number, number] | undefined {
  const { clipPct = 0.92, padLo = 0.3, padHi = 0.3, floor = 0 } = opts;
  const vals = values.filter((v) => typeof v === 'number' && Number.isFinite(v)).sort((a, b) => a - b);
  if (!vals.length) return undefined;
  const min = vals[0];
  const max = vals[Math.floor((vals.length - 1) * clipPct)] ?? vals[vals.length - 1];
  const lo = Math.max(floor, min - padLo);
  const hi = max + padHi;
  return [lo, hi > lo ? hi : lo + 1];
}

/** Min/max domain with padding scaled to the data span (no outlier clipping). */
export function paddedDomain(values: number[], frac = 0.04, minPad = 0.2, floor = 0): [number, number] | undefined {
  const vals = values.filter((v) => typeof v === 'number' && Number.isFinite(v));
  if (!vals.length) return undefined;
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const pad = Math.max(minPad, (hi - lo) * frac);
  const dlo = Math.max(floor, lo - pad);
  const dhi = hi + pad;
  return [dlo, dhi > dlo ? dhi : dlo + 1];
}

/** Round tick array for a lap-time / sector axis (seconds). */
export function niceTimeTicks(min: number, max: number, approxCount = 7): number[] {
  return ticksFrom(min, max, niceStep(max - min, approxCount, TIME_STEPS));
}

/** Speed domain (km/h) with a sensible floor — reclaims the wasted 0..pit-lane band. */
export function speedDomain(values: number[], padLo = 5, padHi = 10): [number, number] | undefined {
  const vals = values.filter((v) => typeof v === 'number' && Number.isFinite(v));
  if (!vals.length) return undefined;
  const lo = Math.max(0, Math.floor((Math.min(...vals) - padLo) / 5) * 5);
  const hi = Math.ceil((Math.max(...vals) + padHi) / 5) * 5;
  return [lo, hi > lo ? hi : lo + 5];
}

/** Round tick array for a speed axis (km/h). */
export function niceSpeedTicks(min: number, max: number, approxCount = 6): number[] {
  return ticksFrom(min, max, niceStep(max - min, approxCount, SPEED_STEPS));
}
