import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

// Standard loading / empty / error wrapper so every Race Center widget behaves the same.
export function WidgetShell({
  title,
  icon,
  isLoading,
  isError,
  isEmpty,
  emptyText = 'No data for this session yet',
  skeletonRows = 4,
  className,
  children,
}: {
  title: string;
  icon?: ReactNode;
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  emptyText?: string;
  skeletonRows?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: skeletonRows }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : isError ? (
          <Badge variant="outline" className="text-orange-600">
            Couldn’t load {title.toLowerCase()}
          </Badge>
        ) : isEmpty ? (
          <p className="text-sm text-muted-foreground py-4">{emptyText}</p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
