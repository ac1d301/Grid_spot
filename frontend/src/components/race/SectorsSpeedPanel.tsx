import { Gauge } from 'lucide-react';
import { useSectors } from '@/hooks/useF1Queries';
import { formatLapTime } from '@/lib/datetime';
import { WidgetShell } from './WidgetShell';
import type { SectorLeader } from '@/services/f1';

const Cell = ({ label, leader, kind }: { label: string; leader: SectorLeader | null; kind: 'time' | 'speed' }) => (
  <div className="bg-muted/40 rounded-lg p-3 text-center">
    <div className="text-xs text-muted-foreground mb-1">{label}</div>
    <div className="text-lg font-bold font-mono tabular-nums text-purple-500">
      {!leader ? '—' : kind === 'time' ? formatLapTime(leader.time) : `${leader.speed} km/h`}
    </div>
    <div className="text-xs font-semibold mt-1">{leader?.acronym ?? ''}</div>
  </div>
);

export function SectorsSpeedPanel({ sessionKey, enabled }: { sessionKey?: number; enabled: boolean }) {
  const { data, isLoading, isError } = useSectors(sessionKey, enabled);
  const fs = data?.fastest_sectors;
  const isEmpty = !fs || (!fs.s1 && !fs.s2 && !fs.s3 && !data?.speed_trap);

  return (
    <WidgetShell
      title="Sectors & Speed"
      icon={<Gauge className="h-5 w-5 text-purple-500" />}
      isLoading={isLoading}
      isError={isError}
      isEmpty={isEmpty}
    >
      <div className="grid grid-cols-2 gap-3">
        <Cell label="Sector 1" leader={fs?.s1 ?? null} kind="time" />
        <Cell label="Sector 2" leader={fs?.s2 ?? null} kind="time" />
        <Cell label="Sector 3" leader={fs?.s3 ?? null} kind="time" />
        <Cell label="Speed Trap" leader={data?.speed_trap ?? null} kind="speed" />
      </div>
    </WidgetShell>
  );
}
