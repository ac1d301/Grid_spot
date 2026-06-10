import { Flag } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useRaceControl } from '@/hooks/useF1Queries';
import { formatISTTime } from '@/lib/datetime';
import { flagClass } from '@/lib/f1-colors';
import { WidgetShell } from './WidgetShell';

export function RaceControlLog({ sessionKey, enabled }: { sessionKey?: number; enabled: boolean }) {
  const { data, isLoading, isError } = useRaceControl(sessionKey, enabled);
  const log = data?.log ?? [];

  return (
    <WidgetShell
      title="Race Control"
      icon={<Flag className="h-5 w-5 text-red-500" />}
      isLoading={isLoading}
      isError={isError}
      isEmpty={!log.length}
      skeletonRows={6}
    >
      <ScrollArea className="h-80 pr-3">
        <div className="space-y-2">
          {log.map((e, i) => (
            <div key={i} className="text-sm border-b border-border/40 pb-2">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs text-muted-foreground font-mono">{formatISTTime(e.date)}</span>
                {e.flag && <Badge className={`text-[10px] px-1.5 ${flagClass(e.flag)}`}>{e.flag}</Badge>}
                {e.lap_number != null && <span className="text-xs text-muted-foreground">L{e.lap_number}</span>}
              </div>
              <div className="text-foreground/90">{e.message}</div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </WidgetShell>
  );
}
