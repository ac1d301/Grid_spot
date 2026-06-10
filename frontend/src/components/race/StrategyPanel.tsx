import { useMemo } from 'react';
import { CircleDot } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useStrategy, useResults } from '@/hooks/useF1Queries';
import { WidgetShell } from './WidgetShell';
import { TyreStrategyChart } from './TyreStrategyChart';
import { PitStopsTable } from './PitStopsTable';

// Tabbed strategy widget: one card, one `useStrategy` query, two views — the tyre-strategy
// timeline and the pit-stop table. Rows ordered by finishing position (via results).
export function StrategyPanel({ sessionKey, enabled }: { sessionKey?: number; enabled: boolean }) {
  const { data, isLoading, isError } = useStrategy(sessionKey, enabled);
  const { data: results } = useResults(sessionKey, enabled);

  const drivers = useMemo(() => {
    const posOf = new Map<number, number>();
    for (const r of results?.classification ?? []) {
      if (typeof r.position === 'number') posOf.set(r.driver_number, r.position);
    }
    return (data?.drivers ?? [])
      .filter((d) => d.stints.length)
      .sort(
        (a, b) =>
          (posOf.get(a.driver_number) ?? 999) - (posOf.get(b.driver_number) ?? 999) ||
          a.driver_number - b.driver_number
      );
  }, [data, results]);

  const pitCount = useMemo(() => drivers.reduce((n, d) => n + d.pit_stops.length, 0), [drivers]);

  return (
    <WidgetShell
      title="Race Strategy"
      icon={<CircleDot className="h-5 w-5 text-red-500" />}
      isLoading={isLoading}
      isError={isError}
      isEmpty={!drivers.length}
      skeletonRows={8}
      className="lg:col-span-2"
    >
      <Tabs defaultValue="timeline">
        <TabsList className="mb-3">
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="pits">Pit stops{pitCount ? ` (${pitCount})` : ''}</TabsTrigger>
        </TabsList>
        <TabsContent value="timeline">
          <TyreStrategyChart drivers={drivers} />
        </TabsContent>
        <TabsContent value="pits">
          <PitStopsTable drivers={drivers} />
        </TabsContent>
      </Tabs>
    </WidgetShell>
  );
}

export default StrategyPanel;
