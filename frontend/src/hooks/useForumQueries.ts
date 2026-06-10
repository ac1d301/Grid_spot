// React Query layer over the forum REST + WebSocket service. Mirrors the useF1Queries
// pattern: typed query keys, cached lists, and mutations that keep the cache in sync.
import { useEffect } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import { forumService } from '@/services/forum';

// ---- types ----
export interface ForumAuthor {
  _id: string;
  username: string;
}

export interface ForumThreadSummary {
  _id: string;
  title: string;
  content: string;
  author: ForumAuthor;
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

export interface ForumComment {
  _id: string;
  content: string;
  author: ForumAuthor;
  thread: string;
  parentComment?: string | null;
  likes: string[];
  dislikes: string[];
  createdAt: string;
  isEdited: boolean;
  replies?: ForumComment[];
  score?: number;
}

export interface ThreadsResponse {
  threads: ForumThreadSummary[];
  currentPage: number;
  totalPages: number;
  totalThreads: number;
}

export interface ThreadDetail {
  thread: ForumThreadSummary;
  comments: ForumComment[];
  commentsPage?: number;
  commentsTotalPages?: number;
  topLevelTotal?: number;
}

export interface ThreadsParams {
  page?: number;
  limit?: number;
  category?: string;
  tag?: string;
  sort?: string;
  q?: string;
}

// ---- keys ----
export const forumKeys = {
  all: ['forum'] as const,
  threads: (params: ThreadsParams) => ['forum', 'threads', params] as const,
  thread: (id: string, limit?: number) => ['forum', 'thread', id, limit ?? 'all'] as const,
};

const errMsg = (err: unknown, fallback = 'Something went wrong') =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

// ---- vote helper (pure) ----
export function toggleVote(
  likes: string[] = [],
  dislikes: string[] = [],
  userId: string,
  voteType: 'like' | 'dislike'
): { likes: string[]; dislikes: string[]; score: number } {
  const hadLike = likes.includes(userId);
  const hadDislike = dislikes.includes(userId);
  let nl = likes.filter((id) => id !== userId);
  let nd = dislikes.filter((id) => id !== userId);
  if (voteType === 'like' && !hadLike) nl = [...nl, userId];
  if (voteType === 'dislike' && !hadDislike) nd = [...nd, userId];
  return { likes: nl, dislikes: nd, score: nl.length - nd.length };
}

// ---- tree helpers (pure) ----
function mapComment(list: ForumComment[], id: string, fn: (c: ForumComment) => ForumComment): ForumComment[] {
  return list.map((c) => {
    if (c._id === id) return fn(c);
    if (c.replies?.length) return { ...c, replies: mapComment(c.replies, id, fn) };
    return c;
  });
}

function insertComment(list: ForumComment[], parentId: string | null, comment: ForumComment): ForumComment[] {
  // de-dupe (the acting user may already have it from the mutation response)
  const exists = (arr: ForumComment[]): boolean =>
    arr.some((c) => c._id === comment._id || (c.replies ? exists(c.replies) : false));
  if (exists(list)) return list;
  if (!parentId) return [...list, comment];
  return list.map((c) => {
    if (c._id === parentId) return { ...c, replies: [...(c.replies ?? []), comment] };
    if (c.replies?.length) return { ...c, replies: insertComment(c.replies, parentId, comment) };
    return c;
  });
}

function removeComments(list: ForumComment[], ids: Set<string>): ForumComment[] {
  return list
    .filter((c) => !ids.has(c._id))
    .map((c) => (c.replies?.length ? { ...c, replies: removeComments(c.replies, ids) } : c));
}

// Apply a realtime socket event to a cached ThreadDetail.
export function applyForumEvent(prev: ThreadDetail | undefined, msg: any): ThreadDetail | undefined {
  if (!prev) return prev;
  switch (msg?.type) {
    case 'comment_created':
      if (!msg.comment) return prev;
      return { ...prev, comments: insertComment(prev.comments, msg.parentCommentId ?? null, msg.comment) };
    case 'comment_updated':
      return {
        ...prev,
        comments: mapComment(prev.comments, msg.commentId, (c) => ({ ...c, content: msg.content, isEdited: true })),
      };
    case 'comment_deleted': {
      const ids = new Set<string>(msg.deletedIds ?? [msg.commentId]);
      return { ...prev, comments: removeComments(prev.comments, ids) };
    }
    case 'vote_updated':
      if (msg.targetType === 'thread') {
        return { ...prev, thread: { ...prev.thread, score: msg.score } };
      }
      return { ...prev, comments: mapComment(prev.comments, msg.targetId, (c) => ({ ...c, score: msg.score })) };
    default:
      return prev;
  }
}

// ---- queries ----
export function useThreads(params: ThreadsParams) {
  return useQuery({
    queryKey: forumKeys.threads(params),
    queryFn: () => forumService.getThreads(params) as Promise<ThreadsResponse>,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useThread(id?: string, limit = 50) {
  return useQuery({
    queryKey: forumKeys.thread(id ?? '', limit),
    queryFn: () => forumService.getThread(id!, { limit }) as Promise<ThreadDetail>,
    enabled: !!id,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

// Subscribe to a thread's live deltas and fold them into the useThread cache.
export function useThreadSocket(threadId?: string) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!threadId) return;
    forumService.subscribeToThread(threadId);
    const off = forumService.addListener((msg) => {
      if (!msg || String(msg.threadId) !== String(threadId)) return;
      // patch every cached page/limit variant of this thread
      qc.setQueriesData<ThreadDetail>({ queryKey: ['forum', 'thread', threadId] }, (prev) =>
        applyForumEvent(prev, msg)
      );
    });
    return () => {
      off();
      forumService.unsubscribeFromThread(threadId);
    };
  }, [threadId, qc]);
}

// ---- mutations ----
export function useCreateThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; content: string; category: string; tags: string[] }) =>
      forumService.createThread(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['forum', 'threads'] });
      toast.success('Thread created');
    },
    onError: (err) => toast.error(errMsg(err, 'Could not create thread')),
  });
}

export function useCreateComment(threadId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { content: string; parentCommentId?: string | null }) =>
      forumService.createComment(threadId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['forum', 'thread', threadId] });
      qc.invalidateQueries({ queryKey: ['forum', 'threads'] }); // refresh list comment counts
    },
    onError: (err) => toast.error(errMsg(err, 'Could not post comment')),
  });
}

export function useEditComment(threadId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) => forumService.updateComment(id, content),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forum', 'thread', threadId] }),
    onError: (err) => toast.error(errMsg(err, 'Could not edit comment')),
  });
}

export function useDeleteComment(threadId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => forumService.deleteComment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['forum', 'thread', threadId] });
      qc.invalidateQueries({ queryKey: ['forum', 'threads'] }); // refresh list comment counts
    },
    onError: (err) => toast.error(errMsg(err, 'Could not delete comment')),
  });
}

// Plain vote mutation — optimistic cache writes are done in the page (it has the exact cache
// context); this just posts and surfaces failures.
export function useVote() {
  return useMutation({
    mutationFn: (data: { targetType: 'thread' | 'comment'; targetId: string; voteType: 'like' | 'dislike' }) =>
      forumService.vote(data),
    onError: (err) => toast.error(errMsg(err, 'Could not register vote')),
  });
}
