import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Award, Star, ArrowUpRight } from 'lucide-react';
import { driverColor } from '@/lib/f1-colors';

interface DriverCardProps {
  rank: number; // championship position (medal + watermark)
  driverNumber: number;
  driverId?: string | null;
  driverName: string;
  acronym?: string | null;
  photo: string | null;
  team: string | null;
  teamColor?: string | null;
  nationality: string;
  points: number; // season points
  seasonWins: number; // season wins
  careerWins: number;
  careerPodiums: number;
  careerPoles: number;
  careerLoading?: boolean;
}

const MEDAL: Record<number, { label: string; class: string }> = {
  1: { label: 'P1', class: 'bg-yellow-400 text-black' },
  2: { label: 'P2', class: 'bg-zinc-300 text-black' },
  3: { label: 'P3', class: 'bg-amber-600 text-white' },
};

function Avatar({ photo, name, color }: { photo: string | null; name: string; color: string }) {
  const [broken, setBroken] = useState(false);
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('');
  if (!photo || broken) {
    return (
      <div className="h-20 w-20 rounded-full grid place-items-center text-xl font-black text-white"
        style={{ background: color }}>
        {initials}
      </div>
    );
  }
  return (
    <img
      src={photo}
      alt={name}
      loading="lazy"
      decoding="async"
      onError={() => setBroken(true)}
      className="h-20 w-20 rounded-full object-cover object-top bg-white"
      style={{ boxShadow: `0 0 0 3px ${color}` }}
    />
  );
}

const Stat = ({ icon, value, label, loading }: { icon: React.ReactNode; value: number; label: string; loading?: boolean }) => (
  <div className="text-center">
    <div className="flex items-center justify-center gap-1 text-base font-bold">
      {icon}
      {loading ? '…' : value}
    </div>
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
  </div>
);

export const DriverCard = memo(function DriverCard({
  rank, driverNumber, driverId, driverName, photo, team, teamColor, nationality,
  points, seasonWins, careerWins, careerPodiums, careerPoles, careerLoading = false,
}: DriverCardProps) {
  const color = driverColor(teamColor);
  const medal = MEDAL[rank];
  const inner = (
    <div className="group relative overflow-hidden rounded-xl border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      {/* team-colour header with avatar */}
      <div className="relative px-4 pt-4 pb-3" style={{ background: `linear-gradient(135deg, ${color}26, transparent 70%)` }}>
        <span className="absolute -top-3 -left-1 text-7xl font-black leading-none text-foreground/5 select-none">{rank}</span>
        <div className="relative flex items-center gap-3">
          <Avatar photo={photo} name={driverName} color={color} />
          <div className="min-w-0">
            <div className="text-3xl font-black leading-none" style={{ color }}>#{driverNumber}</div>
            <div className="mt-1 text-xs text-muted-foreground truncate">{nationality}</div>
          </div>
          {medal && (
            <span className={`absolute top-0 right-0 text-[11px] font-bold px-2 py-0.5 rounded-full ${medal.class}`}>
              {medal.label}
            </span>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: color }} />
      </div>

      {/* body */}
      <div className="p-4">
        <h3 className="text-lg font-bold leading-tight flex items-center gap-1 group-hover:text-red-600 transition-colors">
          {driverName}
          {driverId && <ArrowUpRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />}
        </h3>
        <p className="text-xs text-muted-foreground mb-3">{team}</p>

        <div className="flex items-end justify-between mb-3">
          <div>
            <span className="text-3xl font-black tabular-nums">{points}</span>
            <span className="text-xs text-muted-foreground ml-1">PTS</span>
          </div>
          {seasonWins > 0 && (
            <span className="text-xs font-semibold text-muted-foreground">{seasonWins} win{seasonWins > 1 ? 's' : ''} this year</span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 pt-3 border-t">
          <Stat icon={<Trophy className="h-4 w-4 text-yellow-500" />} value={careerWins} label="Wins" loading={careerLoading} />
          <Stat icon={<Award className="h-4 w-4 text-orange-500" />} value={careerPodiums} label="Podiums" loading={careerLoading} />
          <Stat icon={<Star className="h-4 w-4 text-purple-500" />} value={careerPoles} label="Poles" loading={careerLoading} />
        </div>
      </div>
    </div>
  );

  return driverId ? <Link to={`/driver/${driverId}`} className="block">{inner}</Link> : inner;
});

export default DriverCard;
