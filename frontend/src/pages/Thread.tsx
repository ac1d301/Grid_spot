import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  useThread,
  useThreadSocket,
  useCreateComment,
  useEditComment,
  useDeleteComment,
  useVote,
  toggleVote,
  type ForumComment,
  type ThreadDetail,
} from '@/hooks/useForumQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ThumbsUp, ThumbsDown, ArrowLeft, Reply, Edit, Trash2, Wifi } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Recursively replace a comment in the tree.
function patchComment(list: ForumComment[], id: string, fn: (c: ForumComment) => ForumComment): ForumComment[] {
  return list.map((c) =>
    c._id === id ? fn(c) : c.replies?.length ? { ...c, replies: patchComment(c.replies, id, fn) } : c
  );
}

const Thread = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [limit, setLimit] = useState(50);
  const { data, isLoading, isError } = useThread(id, limit);
  useThreadSocket(id); // live deltas → cache

  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const createMut = useCreateComment(id ?? '');
  const editMut = useEditComment(id ?? '');
  const deleteMut = useDeleteComment(id ?? '');
  const voteMut = useVote();

  const thread = data?.thread;
  const comments = data?.comments ?? [];
  const topLevelTotal = data?.topLevelTotal ?? comments.length;

  const handleVote = (targetType: 'thread' | 'comment', targetId: string, voteType: 'like' | 'dislike') => {
    if (!user) {
      toast.error('Please log in to vote');
      return;
    }
    queryClient.setQueriesData<ThreadDetail>({ queryKey: ['forum', 'thread', id] }, (prev) => {
      if (!prev) return prev;
      if (targetType === 'thread') {
        const v = toggleVote(prev.thread.likes, prev.thread.dislikes, user.id, voteType);
        return { ...prev, thread: { ...prev.thread, ...v } };
      }
      return {
        ...prev,
        comments: patchComment(prev.comments, targetId, (c) => ({ ...c, ...toggleVote(c.likes, c.dislikes, user.id, voteType) })),
      };
    });
    voteMut.mutate(
      { targetType, targetId, voteType },
      { onError: () => queryClient.invalidateQueries({ queryKey: ['forum', 'thread', id] }) }
    );
  };

  const handleSubmitComment = (parentCommentId: string | null) => {
    if (!newComment.trim()) return;
    createMut.mutate(
      { content: newComment, parentCommentId },
      {
        onSuccess: () => {
          setNewComment('');
          setReplyTo(null);
        },
      }
    );
  };

  const handleEditSubmit = (commentId: string) => {
    if (!editContent.trim()) return;
    editMut.mutate(
      { id: commentId, content: editContent },
      {
        onSuccess: () => {
          setEditingId(null);
          setEditContent('');
        },
      }
    );
  };

  const handleDelete = (commentId: string) => {
    if (!confirm('Delete this comment?')) return;
    deleteMut.mutate(commentId);
  };

  const scoreOf = (t: { score?: number; likes?: string[]; dislikes?: string[] }) =>
    t.score ?? (t.likes?.length ?? 0) - (t.dislikes?.length ?? 0);
  const voted = (t: { likes?: string[]; dislikes?: string[] }, type: 'like' | 'dislike') =>
    !!user && (type === 'like' ? t.likes : t.dislikes)?.includes(user.id);

  const renderComment = (comment: ForumComment, depth = 0) => {
    const score = scoreOf(comment);
    const isOwn = comment.author?._id === user?.id;
    return (
      <div key={comment._id} className={depth > 0 ? 'ml-5 sm:ml-8 border-l-2 border-border pl-3 sm:pl-4' : ''}>
        <Card className="mb-3">
          <CardContent className="p-4">
            <div className="flex gap-3">
              {/* votes */}
              <div className="flex flex-col items-center gap-0.5 min-w-[40px]">
                <Button variant="ghost" size="icon" className={`h-7 w-7 rounded-full ${voted(comment, 'like') ? 'bg-green-500/15 text-green-500' : ''}`} onClick={() => handleVote('comment', comment._id, 'like')}>
                  <ThumbsUp className="w-3.5 h-3.5" />
                </Button>
                <span className={`text-xs font-bold tabular-nums ${score > 0 ? 'text-green-500' : score < 0 ? 'text-red-500' : ''}`}>{score}</span>
                <Button variant="ghost" size="icon" className={`h-7 w-7 rounded-full ${voted(comment, 'dislike') ? 'bg-red-500/15 text-red-500' : ''}`} onClick={() => handleVote('comment', comment._id, 'dislike')}>
                  <ThumbsDown className="w-3.5 h-3.5" />
                </Button>
              </div>
              {/* body */}
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{comment.author?.username ?? 'unknown'}</span>
                  <span>•</span>
                  <span>{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
                  {comment.isEdited && <span className="italic">· edited</span>}
                </div>

                {editingId === comment._id ? (
                  <div className="space-y-2">
                    <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="min-h-[80px]" maxLength={5000} />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleEditSubmit(comment._id)} disabled={editMut.isPending}>Save</Button>
                      <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setEditContent(''); }}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm whitespace-pre-wrap break-words">{comment.content}</p>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setReplyTo(comment._id); setNewComment(''); }}>
                        <Reply className="w-3.5 h-3.5 mr-1" /> Reply
                      </Button>
                      {isOwn && (
                        <>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setEditingId(comment._id); setEditContent(comment.content); }}>
                            <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-red-600 hover:text-red-700" onClick={() => handleDelete(comment._id)}>
                            <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                          </Button>
                        </>
                      )}
                    </div>

                    {replyTo === comment._id && (
                      <div className="space-y-2 mt-2 p-3 rounded-lg bg-muted/40">
                        <Textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Write a reply…" className="min-h-[70px]" maxLength={5000} />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleSubmitComment(comment._id)} disabled={createMut.isPending || !newComment.trim()}>Reply</Button>
                          <Button size="sm" variant="outline" onClick={() => { setReplyTo(null); setNewComment(''); }}>Cancel</Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        {comment.replies?.map((r) => renderComment(r, depth + 1))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8 space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}><CardContent className="p-6"><Skeleton className="h-5 w-3/4 mb-3" /><Skeleton className="h-20 w-full" /></CardContent></Card>
        ))}
      </div>
    );
  }

  if (isError || !thread) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Button variant="outline" onClick={() => navigate('/forum')} className="mb-4"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Forum</Button>
        <Card><CardContent className="p-8 text-center text-muted-foreground">Thread not found.</CardContent></Card>
      </div>
    );
  }

  const threadScore = scoreOf(thread);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
      <Button variant="outline" size="sm" onClick={() => navigate('/forum')}><ArrowLeft className="w-4 h-4 mr-2" /> Back to Forum</Button>

      {/* Thread */}
      <Card>
        <CardContent className="p-6">
          <div className="flex gap-4">
            <div className="flex flex-col items-center gap-1 min-w-[48px]">
              <Button variant="ghost" size="icon" className={`h-9 w-9 rounded-full ${voted(thread, 'like') ? 'bg-green-500/15 text-green-500' : ''}`} onClick={() => handleVote('thread', thread._id, 'like')}>
                <ThumbsUp className="w-4 h-4" />
              </Button>
              <span className={`text-lg font-bold tabular-nums ${threadScore > 0 ? 'text-green-500' : threadScore < 0 ? 'text-red-500' : ''}`}>{threadScore}</span>
              <Button variant="ghost" size="icon" className={`h-9 w-9 rounded-full ${voted(thread, 'dislike') ? 'bg-red-500/15 text-red-500' : ''}`} onClick={() => handleVote('thread', thread._id, 'dislike')}>
                <ThumbsDown className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{thread.category}</Badge>
                {thread.tags?.map((tag) => <Badge key={tag} variant="outline" className="text-xs">#{tag}</Badge>)}
              </div>
              <h1 className="text-2xl font-bold leading-tight">{thread.title}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>by {thread.author?.username ?? 'unknown'}</span>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(thread.createdAt), { addSuffix: true })}</span>
              </div>
              <p className="whitespace-pre-wrap break-words">{thread.content}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* New top-level comment */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            Add a comment
            <span className="inline-flex items-center gap-1 text-xs font-normal text-muted-foreground"><Wifi className="w-3 h-3 text-green-500" /> live</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={replyTo === null ? newComment : ''}
            onChange={(e) => { setReplyTo(null); setNewComment(e.target.value); }}
            placeholder="Share your thoughts…"
            className="min-h-[90px]"
            maxLength={5000}
          />
          <Button onClick={() => handleSubmitComment(null)} disabled={createMut.isPending || (replyTo === null && !newComment.trim())}>
            {createMut.isPending ? 'Posting…' : 'Post Comment'}
          </Button>
        </CardContent>
      </Card>

      {/* Comments */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">
          {topLevelTotal} {topLevelTotal === 1 ? 'Comment' : 'Comments'}
        </h2>
        {comments.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No comments yet. Be the first to share your thoughts!</CardContent></Card>
        ) : (
          <>
            {comments.map((c) => renderComment(c))}
            {topLevelTotal > comments.length && (
              <div className="text-center pt-2">
                <Button variant="outline" size="sm" onClick={() => setLimit((l) => l + 50)}>
                  Load more comments ({topLevelTotal - comments.length})
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Thread;
