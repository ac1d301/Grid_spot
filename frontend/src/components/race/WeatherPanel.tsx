import { Thermometer, Droplets, Wind, CloudRain } from 'lucide-react';
import { useWeather } from '@/hooks/useF1Queries';
import { WidgetShell } from './WidgetShell';

const Stat = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-center gap-2">
    {icon}
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-bold tabular-nums">{value}</div>
    </div>
  </div>
);

export function WeatherPanel({ sessionKey, isLive, enabled }: { sessionKey?: number; isLive: boolean; enabled: boolean }) {
  const { data, isLoading, isError } = useWeather(sessionKey, isLive, enabled);
  const w = data?.latest;

  return (
    <WidgetShell
      title="Weather"
      icon={<CloudRain className="h-5 w-5 text-sky-500" />}
      isLoading={isLoading}
      isError={isError}
      isEmpty={!w}
    >
      <div className="grid grid-cols-2 gap-4">
        <Stat icon={<Thermometer className="h-5 w-5 text-red-400" />} label="Air" value={`${w?.air ?? '—'}°C`} />
        <Stat icon={<Thermometer className="h-5 w-5 text-orange-400" />} label="Track" value={`${w?.track ?? '—'}°C`} />
        <Stat icon={<Droplets className="h-5 w-5 text-sky-400" />} label="Humidity" value={`${w?.humidity ?? '—'}%`} />
        <Stat icon={<Wind className="h-5 w-5 text-zinc-400" />} label="Wind" value={`${w?.wind_speed ?? '—'} m/s`} />
        <Stat icon={<CloudRain className="h-5 w-5 text-blue-500" />} label="Rainfall" value={w?.rainfall ? 'Yes' : 'Dry'} />
      </div>
    </WidgetShell>
  );
}
