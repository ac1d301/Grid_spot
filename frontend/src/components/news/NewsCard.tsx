import { memo } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatRelative } from '@/lib/datetime';
import type { NewsItem } from '@/services/f1';

// memo: a Home/News re-render shouldn't re-render every card (item refs are stable per fetch).
export const NewsCard = memo(function NewsCard({ item }: { item: NewsItem }) {
  return (
    <a href={item.link} target="_blank" rel="noreferrer noopener" className="block group h-full">
      <Card className="h-full transition-all duration-300 hover:-translate-y-1 hover:border-red-500/50 hover:shadow-lg">
        <CardContent className="p-5 flex flex-col justify-between min-h-[170px]">
          <div className="flex items-center justify-between mb-3">
            <Badge variant="secondary" className="text-[11px] font-semibold uppercase tracking-wide">
              {item.source ?? 'F1'}
            </Badge>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-red-500 transition-colors" />
          </div>
          <h3 className="text-base md:text-lg font-bold leading-snug line-clamp-4 group-hover:text-red-600 transition-colors">
            {item.title}
          </h3>
          <div className="mt-3 text-xs text-muted-foreground">{formatRelative(item.published)}</div>
        </CardContent>
      </Card>
    </a>
  );
});
