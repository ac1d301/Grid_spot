import { useState } from 'react';
import { Radio, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useNews } from '@/hooks/useF1Queries';
import { NewsCard } from '@/components/news/NewsCard';

const TABS = [
  { key: 'trending', label: 'Trending' },
  { key: 'latest', label: 'Latest' },
] as const;

const News = () => {
  const [tab, setTab] = useState<'trending' | 'latest'>('trending');
  const { data, isLoading, isError, isFetching, dataUpdatedAt } = useNews(tab, 40);
  const items = data?.items ?? [];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero — matches the rest of the site (dark zinc + red accent) */}
      <div className="bg-gradient-to-br from-zinc-900 via-black to-zinc-900 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-red-400 mb-2">
            <Radio className="h-4 w-4 animate-pulse" /> Live Feed
          </div>
          <h1 className="text-4xl md:text-5xl font-bold">
            F1 <span className="text-red-600">NEWS</span>
          </h1>
          <p className="text-zinc-300 mt-2 max-w-xl">
            Trending Formula 1 headlines from across the web — refreshed automatically.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-6">
            {TABS.map((t) => (
              <Button
                key={t.key}
                size="sm"
                variant={tab === t.key ? 'default' : 'outline'}
                className={tab === t.key ? 'bg-red-600 hover:bg-red-700' : 'border-white/30 text-white hover:bg-white hover:text-black'}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </Button>
            ))}
            <span className="text-xs text-zinc-400 flex items-center gap-1.5">
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              {isFetching ? 'Updating…' : dataUpdatedAt ? `Updated ${new Date(dataUpdatedAt).toLocaleTimeString('en-IN')}` : ''}
            </span>
          </div>
        </div>
      </div>

      <section className="container mx-auto px-4 py-10">
        {isError && (
          <p className="text-orange-600 mb-6">Couldn’t load the news feed right now. It’ll retry automatically.</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {isLoading
            ? [...Array(9)].map((_, i) => <Skeleton key={i} className="h-44 rounded-lg" />)
            : items.map((item) => <NewsCard key={item.link} item={item} />)}
        </div>
      </section>
    </div>
  );
};

export default News;
