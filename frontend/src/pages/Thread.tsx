import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { forumService } from '@/services/forum';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Eye,
  ArrowLeft,
  Reply,
  Edit,
  Trash2,
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
  score?: number;
}

interface Comment {
  _id: string;
  content: string;
  author: {
    _id: string;
    username: string;
  };
  thread: string;
  parentComment?: string;
  likes: string[];
  dislikes: string[];
  createdAt: string;
  isEdited: boolean;
  replies?: Comment[];
  score?: number;
}

const Thread = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [thread, setThread] = useState<Thread | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [voteTooltip, setVoteTooltip] = useState<string | null>(null);

  const showVoteTooltip = (msg: string) => {
    setVoteTooltip(msg);
    setTimeout(() => setVoteTooltip(null), 2000);
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    if (!isAuthenticated || !id) return;
    setLoading(true);
    forumService.getThread(id)
      .then((data) => {
        setThread(data.thread);
        setComments(data.comments);
      })
      .catch((err) => setError(err.message || 'Error fetching thread'))
      .finally(() => setLoading(false));
  }, [isAuthenticated, id]);

  const handleSubmitComment = async () => {
    if (!id || !newComment.trim()) return;

    try {
      await forumService.createComment(id, {
        content: newComment,
        parentCommentId: replyTo
      });
      setNewComment('');
      setReplyTo(null);
      // Refresh comments
      const data = await forumService.getThread(id);
      setComments(data.comments);
      // Update thread comment count
      if (thread) {
        setThread({
          ...thread,
          commentCount: thread.commentCount + 1
        });
      }
    } catch (err) {
      console.error('Error posting comment:', err);
    }
  };

  const handleEditSubmit = async (commentId: string) => {
    if (!editContent.trim()) return;

    try {
      await forumService.updateComment(commentId, editContent);
      setEditingComment(null);
      setEditContent('');
      const data = await forumService.getThread(id!);
      setComments(data.comments);
    } catch (err) {
      console.error('Error editing comment:', err);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      await forumService.deleteComment(commentId);
      const data = await forumService.getThread(id!);
      setComments(data.comments);
      // Update thread comment count
      if (thread) {
        setThread({
          ...thread,
          commentCount: Math.max(0, thread.commentCount - 1)
        });
      }
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  };

  const handleThreadVote = async (voteType: 'like' | 'dislike') => {
    if (!thread || !user) {
      showVoteTooltip('Please login to vote');
      return;
    }

    const likes = thread.likes || [];
    const dislikes = thread.dislikes || [];
    const hasLiked = likes.includes(user.id);
    const hasDisliked = dislikes.includes(user.id);

    // Create new arrays without mutating originals
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

    // Optimistic update
    const updatedThread = {
      ...thread,
      likes: newLikes,
      dislikes: newDislikes,
      score: newLikes.length - newDislikes.length
    };
    setThread(updatedThread);

    try {
      await forumService.vote({
        targetType: 'thread',
        targetId: thread._id,
        voteType
      });
    } catch (err) {
      // Revert on error
      const refreshed = await forumService.getThread(thread._id);
      setThread(refreshed.thread);
      console.error('Error voting:', err);
      showVoteTooltip('Failed to vote');
    }
  };

  const handleCommentVote = async (commentId: string, voteType: 'like' | 'dislike') => {
    if (!user) {
      showVoteTooltip('Please login to vote');
      return;
    }

    const commentIndex = comments.findIndex(c => c._id === commentId);
    if (commentIndex === -1) return;

    const comment = comments[commentIndex];
    const likes = comment.likes || [];
    const dislikes = comment.dislikes || [];
    const hasLiked = likes.includes(user.id);
    const hasDisliked = dislikes.includes(user.id);

    // Create new arrays without mutating originals
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

    // Optimistic update
    const updatedComments = [...comments];
    const updatedComment = {
      ...comment,
      likes: newLikes,
      dislikes: newDislikes,
      score: newLikes.length - newDislikes.length
    };
    updatedComments[commentIndex] = updatedComment;
    setComments(updatedComments);

    try {
      await forumService.vote({
        targetType: 'comment',
        targetId: commentId,
        voteType
      });
    } catch (err) {
      // Revert on error
      const data = await forumService.getThread(id!);
      setComments(data.comments);
      console.error('Error voting:', err);
      showVoteTooltip('Failed to vote');
    }
  };

  const getVoteScore = (target: Thread | Comment) => {
    const likes = target.likes || [];
    const dislikes = target.dislikes || [];
    return target.score !== undefined ? target.score : (likes.length - dislikes.length);
  };

  const hasUserVoted = (target: Thread | Comment, voteType: 'like' | 'dislike') => {
    if (!user) return false;
    const targetArray = voteType === 'like' ? (target.likes || []) : (target.dislikes || []);
    return targetArray.includes(user.id);
  };

  const renderComment = (comment: Comment, depth = 0) => {
    const score = getVoteScore(comment);
    const hasLiked = hasUserVoted(comment, 'like');
    const hasDisliked = hasUserVoted(comment, 'dislike');

    return (
      <div key={comment._id} className={`mb-4 ${depth > 0 ? 'ml-8 border-l-2 border-gray-200 dark:border-gray-700 pl-4' : ''}`}>
        <Card>
          <CardContent className="p-4">
            <div className="flex space-x-3">
              {/* Vote Section - Fixed alignment */}
              <div className="flex flex-col items-center space-y-1 min-w-[50px]">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCommentVote(comment._id, 'like')}
                  className={`p-1 rounded-full transition-colors ${
                    hasLiked
                      ? 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900 dark:text-green-400'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <ThumbsUp className="w-3 h-3" />
                </Button>
                <span className={`text-sm font-medium ${
                  score > 0 ? 'text-green-600' : score < 0 ? 'text-red-600' : ''
                }`}>
                  {score}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCommentVote(comment._id, 'dislike')}
                  className={`p-1 rounded-full transition-colors ${
                    hasDisliked
                      ? 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900 dark:text-red-400'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <ThumbsDown className="w-3 h-3" />
                </Button>
              </div>

              {/* Comment Content */}
              <div className="flex-1 space-y-3">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-red-600/50">
                    {comment.author.username}
                  </span>
                  <span className="text-sm text-gray-500">•</span>
                  <span className="text-sm text-gray-500">
                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                  </span>
                  {comment.isEdited && (
                    <>
                      <span className="text-sm text-gray-200">•</span>
                      <span className="text-xs text-gray-300">edited</span>
                    </>
                  )}
                </div>

                {editingComment === comment._id ? (
                  <div className="space-y-3">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="min-h-[80px]"
                    />
                    <div className="flex space-x-2">
                      <Button size="sm" onClick={() => handleEditSubmit(comment._id)}>
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingComment(null);
                          setEditContent('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-gray-300 whitespace-pre-wrap">
                      {comment.content}
                    </p>

                    <div className="flex items-center space-x-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setReplyTo(comment._id)}
                      >
                        <Reply className="w-3 h-3 mr-1" />
                        Reply
                      </Button>

                      {comment.author._id === user?.id && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingComment(comment._id);
                              setEditContent(comment.content);
                            }}
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteComment(comment._id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Delete
                          </Button>
                        </>
                      )}
                    </div>

                    {replyTo === comment._id && (
                      <div className="space-y-3 mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <Textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Write a reply..."
                          className="min-h-[80px]"
                        />
                        <div className="flex space-x-2">
                          <Button onClick={handleSubmitComment}>Reply</Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setReplyTo(null);
                              setNewComment('');
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Render Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3">
            {comment.replies.map(reply => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return null;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-4" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !thread) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-red-600">{error || 'Thread not found'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const threadScore = getVoteScore(thread);
  const hasLiked = hasUserVoted(thread, 'like');
  const hasDisliked = hasUserVoted(thread, 'dislike');

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 bg-gray-950/30 rounded-xl shadow-lg">
      {/* Back Button */}
      <Button
        variant="outline"
        onClick={() => navigate('/forum')}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Forum
      </Button>

      {/* Thread */}
      <Card className='bg-red-950/40 border-red-800/30'>
        <CardContent className="p-6">
          <div className="flex space-x-4">
            {/* Vote Section - Fixed alignment */}
            <div className="flex flex-col items-center space-y-2 min-w-[60px]">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleThreadVote('like')}
                className={`p-2 rounded-full transition-colors ${
                  hasLiked
                    ? 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900 dark:text-green-400'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <ThumbsUp className="w-4 h-4" />
              </Button>
              <span className={`text-lg font-bold ${
                threadScore > 0 ? 'text-green-600' : threadScore < 0 ? 'text-red-600' : ''
              }`}>
                {threadScore}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleThreadVote('dislike')}
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
            <div className="flex-1 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{thread.category}</Badge>
                {thread.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* Fixed thread title color */}
               <h1 className="text-2xl font-bold text-white" style={{ fontFamily: '"Orbitron", "Montserrat", "Arial Black", sans-serif' }}>
                {thread.title}
              </h1>

              <div className="flex items-center space-x-2 text-sm text-gray-300">
                <span>by {thread.author.username}</span>
                <span>•</span>
                <span>
                  {formatDistanceToNow(new Date(thread.createdAt), { addSuffix: true })}
                </span>
                {/* <span>•</span> */}
                {/* <div className="flex items-center space-x-1">
                  <Eye className="w-4 h-4" />
                  <span>{thread.views} views</span>
                </div> */}
                {/* <span>•</span>
                <div className="flex items-center space-x-1">
                  <MessageSquare className="w-4 h-4" />
                  <span>{thread.commentCount} comments</span>
                </div> */}
              </div>

              <div className="prose max-w-none">
                <p className="text-white whitespace-pre-wrap">
                  {thread.content}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comment Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add a comment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Share your thoughts..."
              className="min-h-[100px] mb-3"
            />
            <Button onClick={handleSubmitComment} disabled={!newComment.trim()}>
              Post Comment
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Vote Tooltip */}
      {voteTooltip && (
        <div className="fixed bottom-4 right-4 bg-black text-white px-3 py-2 rounded-md text-sm z-50">
          {voteTooltip}
        </div>
      )}

      {/* Comments */}
      <div className="space-y-4">
        {comments.map((comment) => renderComment(comment))}
        
        {comments.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-white">No comments yet. Be the first to share your thoughts!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Thread;
