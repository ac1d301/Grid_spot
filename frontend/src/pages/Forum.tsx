import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { forumService } from '@/services/forum';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowUpIcon,
  ArrowDownIcon,
  MessageSquare,
  Eye,
  Clock,
  Plus,
  TrendingUp,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface Thread {
  _id: string;
  title: string;
  content: string;
  author: {
    _id: string;
    username: string;
  };
  category: string;
  tags: string[];
  upvotes: string[];
  downvotes: string[];
  views: number;
  commentCount: number;
  createdAt: string;
  lastActivity: string;
}

const Forum = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'latest' | 'mostVoted'>('latest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newThread, setNewThread] = useState({
    title: '',
    content: '',
    category: 'General',
    tags: ''
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchThreads();
  }, [isAuthenticated, sortBy, page]);

  const fetchThreads = async () => {
    try {
      setLoading(true);
      const response = await forumService.getThreads({
        page,
        limit: 10,
        sort: sortBy === 'latest' ? 'newest' : 'popular'
      });
      setThreads(response.threads);
      setTotalPages(response.totalPages);
      setError(null);
    } catch (err) {
      setError('Failed to load threads');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateThread = async () => {
    try {
      const tags = newThread.tags.split(',').map(tag => tag.trim()).filter(Boolean);
      await forumService.createThread({
        ...newThread,
        tags
      });
      setIsCreateDialogOpen(false);
      setNewThread({ title: '', content: '', category: 'General', tags: '' });
      fetchThreads();
    } catch (err) {
      console.error('Error creating thread:', err);
    }
  };

  const handleVote = async (threadId: string, voteType: 'up' | 'down') => {
    try {
      await forumService.vote({
        targetType: 'thread',
        targetId: threadId,
        voteType
      });
      fetchThreads();
    } catch (err) {
      console.error('Error voting:', err);
    }
  };

  const getVoteScore = (thread: Thread) => {
    return thread.upvotes.length - thread.downvotes.length;
  };

  const hasUserVoted = (thread: Thread, voteType: 'up' | 'down') => {
    if (!user) return false;
    return voteType === 'up'
      ? thread.upvotes.includes(user.id)
      : thread.downvotes.includes(user.id);
  };

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return null;

  if (loading && threads.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="mb-4">
            <CardContent className="p-4">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-4" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">F1 Forum</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Discuss all things Formula 1
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Thread
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Thread</DialogTitle>
              <DialogDescription>
                Start a new discussion in the forum
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Title</label>
                <Input
                  placeholder="Thread title..."
                  value={newThread.title}
                  onChange={(e) => setNewThread({ ...newThread, title: e.target.value })}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Category</label>
                <Select
                  value={newThread.category}
                  onValueChange={(value) => setNewThread({ ...newThread, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General">General</SelectItem>
                    <SelectItem value="Race Discussion">Race Discussion</SelectItem>
                    <SelectItem value="Technical">Technical</SelectItem>
                    <SelectItem value="News">News</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Content</label>
                <Textarea
                  placeholder="What's on your mind?"
                  value={newThread.content}
                  onChange={(e) => setNewThread({ ...newThread, content: e.target.value })}
                  className="min-h-[120px]"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Tags (optional)</label>
                <Input
                  placeholder="ferrari, verstappen, racing (comma separated)"
                  value={newThread.tags}
                  onChange={(e) => setNewThread({ ...newThread, tags: e.target.value })}
                />
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateThread}>
                  Create Thread
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sort Filter */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Sort by:</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={sortBy === 'latest' ? 'default' : 'ghost'}
                onClick={() => setSortBy('latest')}
              >
                <Clock className="w-4 h-4 mr-2" />
                Latest
              </Button>
              <Button
                size="sm"
                variant={sortBy === 'mostVoted' ? 'default' : 'ghost'}
                onClick={() => setSortBy('mostVoted')}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Most Voted
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Threads List */}
      <div className="space-y-4">
        {threads.map((thread) => {
          const score = getVoteScore(thread);
          const hasUpvoted = hasUserVoted(thread, 'up');
          const hasDownvoted = hasUserVoted(thread, 'down');

          return (
            <Card key={thread._id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-0">
                <div className="flex">
                  {/* Vote Section */}
                  <div className="flex flex-col items-center p-4 bg-red-900/30 dark:bg-gray-800 min-w-[80px]">
                    <Button
                      size="sm"
                      variant="ghost"
                      className={`p-2 ${hasUpvoted ? 'text-orange-500' : ''}`}
                      onClick={() => handleVote(thread._id, 'up')}
                    >
                      <ArrowUpIcon className="w-5 h-5" />
                    </Button>
                    <span className={`font-bold text-sm ${
                      score > 0 ? 'text-orange-500' : score < 0 ? 'text-blue-500' : ''
                    }`}>
                      {score}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className={`p-2 ${hasDownvoted ? 'text-blue-500' : ''}`}
                      onClick={() => handleVote(thread._id, 'down')}
                    >
                      <ArrowDownIcon className="w-5 h-5" />
                    </Button>
                  </div>

                  {/* Thread Content */}
                  <div 
                    className="flex-1 p-4 cursor-pointer"
                    onClick={() => navigate(`/forum/thread/${thread._id}`)}
                  >
                    <div className="flex items-center gap-2 mb-2 text-sm text-gray-500">
                      <Badge variant="outline">{thread.category}</Badge>
                      <span>•</span>
                      <span>by {thread.author.username}</span>
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(thread.createdAt), { addSuffix: true })}</span>
                    </div>

                    <h3 className="font-semibold text-lg mb-2 hover:text-blue-600 dark:hover:text-blue-400">
                      {thread.title}
                    </h3>

                    {thread.content && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                        {thread.content.length > 150 
                          ? `${thread.content.substring(0, 150)}...` 
                          : thread.content
                        }
                      </p>
                    )}

                    {thread.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {thread.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        <span>{thread.commentCount} comments</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        <span>{thread.views} views</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {threads.length === 0 && !loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-medium mb-2">No threads found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Be the first to start a discussion!
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              Create First Thread
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Forum;
