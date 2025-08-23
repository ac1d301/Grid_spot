import { cn } from '@/lib/utils';

type LoadingSkeletonProps = {
  className?: string;
  lines?: number;
};

const LoadingSkeleton = ({ className, lines = 3 }: LoadingSkeletonProps) => {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 w-full rounded bg-muted animate-pulse" />
      ))}
    </div>
  );
};

export default LoadingSkeleton;

