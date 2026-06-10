import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  useThreads,
  useCreateThread,
  useVote,
  toggleVote,
  type ThreadsResponse,
  type ForumThreadSummary,
} from '@/hooks/useForumQueries';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ThumbsUp, ThumbsDown, MessageSquare, Clock, Plus, TrendingUp, Activity, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const CATEGORIES = ['General', 'Race Discussion', 'Technical', 'News', 'Off-Topic'];
const SORTS = [
  { key: 'newest', label: 'Latest', icon: Clock },
  { key: 'popular', label: 'Most Liked', icon: TrendingUp },
  { key: 'lastActivity', label: 'Active', icon: Activity },
];

const Forum = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [sort, setSort] = useState('newest');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newThread, setNewThread] = useState({ title: '', content: '', category: 'General', tags: '' });

  // debounce the search box so we don't fire a request per keystroke
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const params = useMemo(
    () => ({
      page,
      limit: 10,
      sort,
      ...(category !== 'all' ? { category } : {}),
      ...(debouncedSearch ? { q: debouncedSearch } : {}),
    }),
    [page, sort, category, debouncedSearch]
  );

  const { data, isLoading, isError } = useThreads(params);
  const threads = data?.threads ?? [];
  const totalPages = data?.totalPages ?? 1;

  const createMut = useCreateThread();
  const voteMut = useVote();

  // reset to page 1 whenever a filter changes
  const onFilterChange = (fn: () => void) => {
    fn();
    setPage(1);
  };

  const handleCreate = () => {
    const tags = newThread.tags.split(',').map((t) => t.trim()).filter(Boolean);
    createMut.mutate(
      { title: newThread.title, content: newThread.content, category: newThread.category, tags },
      {
        onSuccess: () => {
          setIsCreateOpen(false);
          setNewThread({ title: '', content: '', category: 'General', tags: '' });
        },
      }
    );
  };

  const handleVote = (thread: ForumThreadSummary, voteType: 'like' | 'dislike') => {
    if (!user) {
      toast.error('Please log in to vote');
      return;
    }
    // optimistic across all cached list pages
    queryClient.setQueriesData<ThreadsResponse>({ queryKey: ['forum', 'threads'] }, (prev) =>
      prev
        ? {
            ...prev,
            threads: prev.threads.map((t) =>
              t._id === thread._id ? { ...t, ...toggleVote(t.likes, t.dislikes, user.id, voteType) } : t
            ),
          }
        : prev
    );
    voteMut.mutate(
      { targetType: 'thread', targetId: thread._id, voteType },
      { onError: () => queryClient.invalidateQueries({ queryKey: ['forum', 'threads'] }) }
    );
  };

  const scoreOf = (t: ForumThreadSummary) => t.score ?? (t.likes?.length ?? 0) - (t.dislikes?.length ?? 0);
  const voted = (t: ForumThreadSummary, type: 'like' | 'dislike') =>
    !!user && (type === 'like' ? t.likes : t.dislikes)?.includes(user.id);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero — matches the site theme */}
      <div className="bg-gradient-to-br from-zinc-900 via-black to-zinc-900 text-white">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-4xl md:text-5xl font-bold">
            PIT LANE <span className="text-red-600">CHAT</span>
          </h1>
          <p className="text-zinc-300 mt-2">Discuss, debate, and share your passion for racing.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Controls */}
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="relative lg:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search threads or tags…"
              className="pl-9"
            />
          </div>
          <Select value={category} onValueChange={(v) => onFilterChange(() => setCategory(v))}>
            <SelectTrigger className="lg:w-52"><SelectValue placeholder="All categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex flex-wrap gap-2">
            {SORTS.map((s) => (
              <Button
                key={s.key}
                size="sm"
                variant={sort === s.key ? 'default' : 'outline'}
                onClick={() => onFilterChange(() => setSort(s.key))}
              >
                <s.icon className="w-4 h-4 mr-1" />
                {s.label}
              </Button>
            ))}
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-red-600 hover:bg-red-700 lg:ml-auto">
                <Plus className="w-4 h-4 mr-2" />
                New Thread
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Create New Thread</DialogTitle>
                <DialogDescription>Start a new discussion in the forum</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={newThread.title}
                    onChange={(e) => setNewThread({ ...newThread, title: e.target.value })}
                    placeholder="Enter thread title…"
                    maxLength={200}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Select value={newThread.category} onValueChange={(v) => setNewThread({ ...newThread, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Content</label>
                  <Textarea
                    value={newThread.content}
                    onChange={(e) => setNewThread({ ...newThread, content: e.target.value })}
                    placeholder="Share your thoughts…"
                    className="min-h-[120px]"
                    maxLength={10000}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Tags (optional)</label>
                  <Input
                    value={newThread.tags}
                    onChange={(e) => setNewThread({ ...newThread, tags: e.target.value })}
                    placeholder="Separate tags with commas"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button
                    onClick={handleCreate}
                    disabled={createMut.isPending || !newThread.title.trim() || !newThread.content.trim()}
                  >
                    {createMut.isPending ? 'Creating…' : 'Create Thread'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i}><CardContent className="p-6"><Skeleton className="h-5 w-3/4 mb-3" /><Skeleton className="h-4 w-1/2" /></CardContent></Card>
            ))}
          </div>
        ) : isError ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">Couldn’t load the forum. Please try again.</CardContent></Card>
        ) : threads.length === 0 ? (
          <div className="text-center py-16">
            <h3 className="text-lg font-semibold mb-2">No threads found</h3>
            <p className="text-muted-foreground mb-4">
              {search || category !== 'all' ? 'Try a different search or category.' : 'Be the first to start a discussion!'}
            </p>
            <Button onClick={() => setIsCreateOpen(true)} className="bg-red-600 hover:bg-red-700">
              <Plus className="w-4 h-4 mr-2" /> Create First Thread
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {threads.map((thread) => {
              const score = scoreOf(thread);
              return (
                <Card key={thread._id} className="transition-all hover:shadow-md hover:border-red-500/40">
                  <CardContent className="p-5">
                    <div className="flex gap-4">
                      {/* votes */}
                      <div className="flex flex-col items-center gap-1 min-w-[48px]">
                        <Button variant="ghost" size="icon" className={`h-8 w-8 rounded-full ${voted(thread, 'like') ? 'bg-green-500/15 text-green-500' : ''}`} onClick={() => handleVote(thread, 'like')}>
                          <ThumbsUp className="w-4 h-4" />
                        </Button>
                        <span className={`text-sm font-bold tabular-nums ${score > 0 ? 'text-green-500' : score < 0 ? 'text-red-500' : ''}`}>{score}</span>
                        <Button variant="ghost" size="icon" className={`h-8 w-8 rounded-full ${voted(thread, 'dislike') ? 'bg-red-500/15 text-red-500' : ''}`} onClick={() => handleVote(thread, 'dislike')}>
                          <ThumbsDown className="w-4 h-4" />
                        </Button>
                      </div>
                      {/* content */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          <Badge variant="secondary">{thread.category}</Badge>
                          <span>by {thread.author?.username ?? 'unknown'}</span>
                          <span>•</span>
                          <span>{formatDistanceToNow(new Date(thread.createdAt), { addSuffix: true })}</span>
                        </div>
                        <button className="text-left w-full" onClick={() => navigate(`/forum/thread/${thread._id}`)}>
                          <h3 className="text-lg font-bold leading-snug hover:text-red-600 transition-colors">{thread.title}</h3>
                          {thread.content && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{thread.content}</p>
                          )}
                        </button>
                        {thread.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {thread.tags.slice(0, 4).map((tag) => <Badge key={tag} variant="outline" className="text-xs">#{tag}</Badge>)}
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{thread.commentCount ?? 0} {thread.commentCount === 1 ? 'comment' : 'comments'}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Forum;
