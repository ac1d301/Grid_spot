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
  ArrowUpIcon,
  ArrowDownIcon,
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
  upvotes: string[];
  downvotes: string[];
  views: number;
  commentCount: number;
  createdAt: string;
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
  upvotes: string[];
  downvotes: string[];
  createdAt: string;
  isEdited: boolean;
  replies?: Comment[];
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
      const data = await forumService.getThread(id);
      setComments(data.comments);
    } catch (err) {
      console.error('Error editing comment:', err);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await forumService.deleteComment(commentId);
      const data = await forumService.getThread(id);
      setComments(data.comments);
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  };

  const handleVote = async (targetType: 'thread' | 'comment', targetId: string, voteType: 'up' | 'down') => {
    try {
      await forumService.vote({
        targetType,
        targetId,
        voteType
      });
      
      if (targetType === 'thread' && thread) {
        const updatedThread = await forumService.getThread(id!);
        setThread(updatedThread.thread);
      } else {
        const data = await forumService.getThread(id!);
        setComments(data.comments);
      }
    } catch (err) {
      console.error('Error voting:', err);
    }
  };

  const getVoteScore = (target: Thread | Comment) => {
    return target.upvotes.length - target.downvotes.length;
  };

  const hasUserVoted = (target: Thread | Comment, voteType: 'up' | 'down') => {
    if (!user) return false;
    return voteType === 'up' 
      ? target.upvotes.includes(user.id)
      : target.downvotes.includes(user.id);
  };

  const renderComment = (comment: Comment, depth = 0) => {
    const score = getVoteScore(comment);
    const hasUpvoted = hasUserVoted(comment, 'up');
    const hasDownvoted = hasUserVoted(comment, 'down');

    return (
      <div key={comment._id} className={`${depth > 0 ? 'ml-8 border-l-2 border-gray-200 dark:border-gray-700 pl-4' : ''}`}>
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex gap-4">
              {/* Vote Section */}
              <div className="flex flex-col items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className={`p-1 ${hasUpvoted ? 'text-orange-500' : ''}`}
                  onClick={() => handleVote('comment', comment._id, 'up')}
                >
                  <ArrowUpIcon className="w-4 h-4" />
                </Button>
                <span className={`text-sm font-medium ${
                  score > 0 ? 'text-orange-500' : score < 0 ? 'text-blue-500' : ''
                }`}>
                  {score}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className={`p-1 ${hasDownvoted ? 'text-blue-500' : ''}`}
                  onClick={() => handleVote('comment', comment._id, 'down')}
                >
                  <ArrowDownIcon className="w-4 h-4" />
                </Button>
              </div>

              {/* Comment Content */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 text-sm text-gray-500">
                  <span className="font-medium">{comment.author.username}</span>
                  <span>•</span>
                  <span>{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
                  {comment.isEdited && <Badge variant="outline" className="text-xs">edited</Badge>}
                </div>

                {editingComment === comment._id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="min-h-[80px]"
                    />
                    <div className="flex gap-2">
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
                    <div className="mb-3">
                      <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-6"
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
                            className="text-xs h-6"
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
                            className="text-xs h-6"
                            onClick={() => handleDeleteComment(comment._id)}
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Delete
                          </Button>
                        </>
                      )}
                    </div>

                    {replyTo === comment._id && (
                      <div className="mt-3 space-y-2">
                        <Textarea
                          placeholder="Write a reply..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          className="min-h-[80px]"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSubmitComment}>
                            Reply
                          </Button>
                          <Button 
                            size="sm" 
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
          <div className="space-y-2">
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
      <div className="max-w-4xl mx-auto p-4">
        <Skeleton className="h-8 w-32 mb-4" />
        <Card className="mb-6">
          <CardContent className="p-4">
            <Skeleton className="h-6 w-3/4 mb-4" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="mb-4">
            <CardContent className="p-4">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !thread) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <Card>
          <CardContent className="p-4 text-center">
            {error || 'Thread not found'}
          </CardContent>
        </Card>
      </div>
    );
  }

  const threadScore = getVoteScore(thread);
  const hasUpvoted = hasUserVoted(thread, 'up');
  const hasDownvoted = hasUserVoted(thread, 'down');

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Back Button */}
      <Button 
        variant="ghost" 
        onClick={() => navigate('/forum')}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Forum
      </Button>

      {/* Thread */}
      <Card className="mb-6">
        <CardContent className="p-0">
          <div className="flex">
            {/* Vote Section */}
            <div className="flex flex-col items-center p-4 bg-red-900/30 dark:bg-gray-800 min-w-[80px]">
              <Button
                size="sm"
                variant="ghost"
                className={`p-2 ${hasUpvoted ? 'text-orange-500' : ''}`}
                onClick={() => handleVote('thread', thread._id, 'up')}
              >
                <ArrowUpIcon className="w-5 h-5" />
              </Button>
              <span className={`font-bold ${
                threadScore > 0 ? 'text-orange-500' : threadScore < 0 ? 'text-blue-500' : ''
              }`}>
                {threadScore}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className={`p-2 ${hasDownvoted ? 'text-blue-500' : ''}`}
                onClick={() => handleVote('thread', thread._id, 'down')}
              >
                <ArrowDownIcon className="w-5 h-5" />
              </Button>
            </div>

            {/* Thread Content */}
            <div className="flex-1 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">{thread.category}</Badge>
                {thread.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>

              <h1 className="text-2xl font-bold mb-3">{thread.title}</h1>

              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
                <span>by {thread.author.username}</span>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(thread.createdAt), { addSuffix: true })}</span>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  <span>{thread.views} views</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <MessageSquare className="w-4 h-4" />
                  <span>{thread.commentCount} comments</span>
                </div>
              </div>

              <div className="prose dark:prose-invert max-w-none">
                <p className="whitespace-pre-wrap">{thread.content}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comment Form */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="space-y-3">
            <Textarea
              placeholder="What are your thoughts?"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[100px]"
            />
            <Button onClick={handleSubmitComment} disabled={!newComment.trim()}>
              Post Comment
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Comments */}
      <div className="space-y-4">
        {comments.map((comment) => renderComment(comment))}
        
        {comments.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              No comments yet. Be the first to share your thoughts!
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Thread;
