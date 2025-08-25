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
  ThumbsUp,
  ThumbsDown,
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
  likes: string[];
  dislikes: string[];
  views: number;
  commentCount: number;
  createdAt: string;
  lastActivity: string;
  score?: number;
}

const Forum = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'latest' | 'popular'>('latest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newThread, setNewThread] = useState({
    title: '',
    content: '',
    category: 'General',
    tags: ''
  });
  const [voteTooltip, setVoteTooltip] = useState<string | null>(null);

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

  const showVoteTooltip = (msg: string) => {
    setVoteTooltip(msg);
    setTimeout(() => setVoteTooltip(null), 2000);
  };

  const handleVote = async (threadId: string, voteType: 'like' | 'dislike') => {
    if (!user) {
      showVoteTooltip('Please login to vote');
      return;
    }

    const threadIndex = threads.findIndex(t => t._id === threadId);
    if (threadIndex === -1) return;

    const thread = threads[threadIndex];
    const likes = thread.likes || [];
    const dislikes = thread.dislikes || [];
    const hasLiked = likes.includes(user.id);
    const hasDisliked = dislikes.includes(user.id);

    // Optimistic update - create new arrays without mutating originals
    let newLikes = [...likes];
    let newDislikes = [...dislikes];

    // Remove user from both arrays first
    newLikes = newLikes.filter(id => id !== user.id);
    newDislikes = newDislikes.filter(id => id !== user.id);

    // Check if user is toggling off the same vote
    const isTogglingOff = (voteType === 'like' && hasLiked) || (voteType === 'dislike' && hasDisliked);

    if (!isTogglingOff) {
      // Add new vote
      if (voteType === 'like') {
        newLikes.push(user.id);
        showVoteTooltip('Liked!');
      } else {
        newDislikes.push(user.id);
        showVoteTooltip('Disliked!');
      }
    } else {
      showVoteTooltip('Vote removed');
    }

    // Update the thread with new arrays
    const updatedThreads = [...threads];
    const updatedThread = {
      ...thread,
      likes: newLikes,
      dislikes: newDislikes,
      score: newLikes.length - newDislikes.length
    };
    updatedThreads[threadIndex] = updatedThread;
    setThreads(updatedThreads);

    try {
      await forumService.vote({
        targetType: 'thread',
        targetId: threadId,
        voteType
      });
    } catch (err) {
      // Revert on error
      fetchThreads();
      console.error('Error voting:', err);
      showVoteTooltip('Failed to vote');
    }
  };

  const getVoteScore = (thread: Thread) => {
    const likes = thread.likes || [];
    const dislikes = thread.dislikes || [];
    return thread.score !== undefined ? thread.score : (likes.length - dislikes.length);
  };

  const hasUserVoted = (thread: Thread, voteType: 'like' | 'dislike') => {
    if (!user) return false;
    const targetArray = voteType === 'like' ? (thread.likes || []) : (thread.dislikes || []);
    return targetArray.includes(user.id);
  };

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return null;

  if (loading && threads.length === 0) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6 bg-gray-950/30 rounded-xl shadow-lg">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-white" style={{ fontFamily: '"Orbitron", "Montserrat", "Arial Black", sans-serif' }}>
          Pit Lane Chat
        </h1>
        <p className="text-lg text-white">
          The Ultimate Forum for F1 Fans to Discuss, Debate, and Share Their Passion for Racing
        </p>
      </div>

      {/* Sort & Create Thread Section */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-white">Sort by:</span>
          <Button
            variant={sortBy === 'latest' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('latest')}
          >
            <Clock className="w-4 h-4 mr-1" />
            Latest
          </Button>
          <Button
            variant={sortBy === 'popular' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('popular')}
          >
            <TrendingUp className="w-4 h-4 mr-1" />
            Most Liked
          </Button>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-red-600 hover:bg-red-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Thread
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New Thread</DialogTitle>
              <DialogDescription>
                Start a new discussion in the forum
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={newThread.title}
                  onChange={(e) => setNewThread({ ...newThread, title: e.target.value })}
                  placeholder="Enter thread title..."
                />
              </div>
              <div>
                <label className="text-sm font-medium">Category</label>
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
                <label className="text-sm font-medium">Content</label>
                <Textarea
                  value={newThread.content}
                  onChange={(e) => setNewThread({ ...newThread, content: e.target.value })}
                  placeholder="Share your thoughts..."
                  className="min-h-[120px]"
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
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateThread}>Create Thread</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Threads List */}
      <div className="space-y-4">
        {threads.map((thread) => {
          const score = getVoteScore(thread);
          const hasLiked = hasUserVoted(thread, 'like');
          const hasDisliked = hasUserVoted(thread, 'dislike');

          return (
            <Card key={thread._id} className="hover:shadow-md transition-shadow bg-red-900/10 border-red-800/30">
              <CardContent className="p-6">
                <div className="flex space-x-4">
                  {/* Vote Section - Fixed alignment */}
                  <div className="flex flex-col items-center space-y-1 min-w-[60px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleVote(thread._id, 'like')}
                      className={`p-2 rounded-full transition-colors ${
                        hasLiked
                          ? 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900 dark:text-green-400'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <ThumbsUp className="w-4 h-4" />
                    </Button>
                    <span className={`text-sm font-medium ${
                      score > 0 ? 'text-green-600' : score < 0 ? 'text-red-600' : 'text-white'
                    }`}>
                      {score}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleVote(thread._id, 'dislike')}
                      className={`p-2 rounded-full transition-colors ${
                        hasDisliked
                          ? 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900 dark:text-red-400'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <ThumbsDown className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Thread Content */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">{thread.category}</Badge>
                      <span className="text-sm text-gray-300">
                        by {thread.author.username}
                      </span>
                      <span className="text-sm text-gray-400">•</span>
                      <span className="text-sm text-gray-300">
                        {formatDistanceToNow(new Date(thread.createdAt), { addSuffix: true })}
                      </span>
                    </div>

                    <div
                      className="cursor-pointer"
                      onClick={() => navigate(`/forum/thread/${thread._id}`)}
                    >
                      {/* Thread title and content in white */}
                      <h3 className="text-xl font-semibold text-white hover:text-red-600 dark:hover:text-red-400 transition-colors" style={{ fontFamily: '"Orbitron", "Montserrat", "Arial Black", sans-serif' }}>
                        {thread.title}
                      </h3>
                      {thread.content && (
                        <p className="text-white mt-2">
                          {thread.content.length > 150
                            ? `${thread.content.substring(0, 150)}...`
                            : thread.content}
                        </p>
                      )}
                    </div>

                    {thread.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {thread.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      <div className="flex items-center space-x-1">
                        <MessageSquare className="w-4 h-4" />
                        <span>{thread.commentCount} Comment down your thoughts</span>
                      </div>
                      {/* <div className="flex items-center space-x-1">
                        <Eye className="w-4 h-4" />
                        <span>{thread.views} views</span>
                      </div> */}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Vote Tooltip */}
      {voteTooltip && (
        <div className="fixed bottom-4 right-4 bg-black text-white px-3 py-2 rounded-md text-sm z-50">
          {voteTooltip}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2">
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

      {/* Empty State */}
      {threads.length === 0 && !loading && (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No threads found
          </h3>
          <p className="text-gray-500 mb-4">Be the first to start a discussion!</p>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-red-600 hover:bg-red-700">
            Create First Thread
          </Button>
        </div>
      )}
    </div>
  );
};

export default Forum;
