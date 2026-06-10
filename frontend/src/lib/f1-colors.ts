// Tyre compound -> hex (Pirelli-style). Used by TyreStrategyChart + legend.
export const COMPOUND_COLORS: Record<string, string> = {
  SOFT: '#E8002D',
  MEDIUM: '#F6C700',
  HARD: '#EBEBEB',
  INTERMEDIATE: '#43B02A',
  WET: '#0067AD',
  UNKNOWN: '#9CA3AF',
};
export const compoundColor = (c?: string | null) =>
  COMPOUND_COLORS[(c ?? '').toUpperCase()] ?? COMPOUND_COLORS.UNKNOWN;

// Race-control flag -> Tailwind badge classes. Used by RaceControlLog + live banner.
export const FLAG_COLORS: Record<string, string> = {
  GREEN: 'bg-green-600 text-white',
  CLEAR: 'bg-green-700 text-white',
  YELLOW: 'bg-yellow-400 text-black',
  'DOUBLE YELLOW': 'bg-yellow-500 text-black',
  RED: 'bg-red-600 text-white animate-pulse',
  BLUE: 'bg-blue-600 text-white',
  CHEQUERED: 'bg-zinc-200 text-black',
};
export const flagClass = (flag?: string | null) =>
  FLAG_COLORS[(flag ?? '').toUpperCase()] ?? 'bg-zinc-700 text-white';

// Driver/team colour with a safe fallback (team colour may be null from the backend).
export const driverColor = (hex?: string | null) => hex || '#9CA3AF';

export interface DriverColor { line: string; accent: string }

// Per-driver colour scheme (team/identity themed). `line` = the graph trace, `accent` =
// dots / highlights. Tuned to read well on the dark chart plotting area, with teammates
// kept distinct (e.g. the two McLarens). Keyed by OpenF1 name_acronym.
export const DRIVER_COLORS: Record<string, DriverColor> = {
  RUS: { line: '#B7C0C9', accent: '#00D2BE' }, // Mercedes silver + teal
  ANT: { line: '#00D2BE', accent: '#9DFF00' }, // Mercedes teal + Italian green
  LEC: { line: '#FF1E1E', accent: '#FFFFFF' }, // Ferrari red
  HAM: { line: '#8C5BFF', accent: '#FFD400' }, // purple + yellow
  NOR: { line: '#FF8700', accent: '#FFF200' }, // McLaren papaya
  PIA: { line: '#FFD24A', accent: '#00C46A' }, // gold/green (distinct from teammate)
  VER: { line: '#FF5E00', accent: '#1E41FF' }, // Dutch orange + Red Bull blue
  HAD: { line: '#3B82F6', accent: '#EF4135' }, // French blue
  GAS: { line: '#2D8CE0', accent: '#FF87BC' }, // Alpine blue + BWT pink
  COL: { line: '#74ACDF', accent: '#FFD700' }, // Argentina sky blue
  LAW: { line: '#7AA0FF', accent: '#C0C0C0' }, // lightened from NZ black for visibility
  LIN: { line: '#3FA7E6', accent: '#FECC00' }, // Swedish blue/yellow
  OCO: { line: '#5B9BD5', accent: '#E10600' }, // French blue + Haas red
  BEA: { line: '#FF4D4D', accent: '#0B3D2E' }, // Ferrari-academy red
  SAI: { line: '#E0203A', accent: '#FFC400' }, // Spanish red/yellow
  ALB: { line: '#377DFF', accent: '#A51931' }, // Williams blue + Thai red
  HUL: { line: '#B6FF00', accent: '#E5E5E5' }, // "Hulk" neon green
  BOR: { line: '#00C46A', accent: '#FFDF00' }, // Brazil green/yellow
  ALO: { line: '#2E86FF', accent: '#FFD100' }, // Alonso blue/yellow
  STR: { line: '#E84C5A', accent: '#00B894' }, // Canada red + Aston green
  PER: { line: '#19A974', accent: '#CE1126' }, // Mexico green/red
  BOT: { line: '#5B86C9', accent: '#D6A461' }, // Finland blue + Cadillac gold
};

// Fallback palette for any acronym not in the table above.
export const DRIVER_PALETTE = [
  '#E6194B', '#3CB44B', '#4363D8', '#F58231', '#911EB4', '#42D4F4', '#F032E6', '#BFEF45',
  '#FABED4', '#469990', '#DCBEFF', '#9A6324', '#FFD8B1', '#A6E22E', '#00B4D8', '#A9A9A9',
];

// Stable colour per driver. Keyed by driver_number; resolves the scheme via acronym, with
// a deterministic palette fallback so unknown drivers still get a distinct colour.
export function assignDriverColors(
  drivers: Array<{ driver_number: number; acronym?: string | null }>
): Map<number, DriverColor> {
  const map = new Map<number, DriverColor>();
  const sorted = [...drivers].sort((a, b) => a.driver_number - b.driver_number);
  sorted.forEach((d, i) => {
    const known = d.acronym ? DRIVER_COLORS[d.acronym.toUpperCase()] : undefined;
    map.set(d.driver_number, known ?? { line: DRIVER_PALETTE[i % DRIVER_PALETTE.length], accent: '#ffffff' });
  });
  return map;
}
