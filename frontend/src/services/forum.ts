import axios from 'axios';
import { authService } from './auth';
import { API_BASE_URL, WS_BASE_URL } from '../config/api';

const api = axios.create({
  baseURL: `${API_BASE_URL}/forum`,
});

// Fixed axios interceptor - proper header handling
api.interceptors.request.use((config) => {
  const token = authService.getToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

type ForumListener = (msg: any) => void;

class ForumService {
  private ws: WebSocket | null = null;
  private listeners = new Set<ForumListener>();
  private subscriptions = new Set<string>();
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldConnect = false;

  // ---- realtime ----
  private connect() {
    const token = authService.getToken();
    if (!token) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;

    this.shouldConnect = true;
    this.ws = new WebSocket(`${WS_BASE_URL}?token=${token}`);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      // re-arm any subscriptions after a (re)connect
      this.subscriptions.forEach((id) => this.send('subscribe_thread', { threadId: id }));
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.listeners.forEach((l) => l(msg));
      } catch {
        /* ignore malformed frames */
      }
    };

    this.ws.onclose = () => {
      this.ws = null;
      if (this.shouldConnect && (this.subscriptions.size || this.listeners.size)) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      try { this.ws?.close(); } catch { /* noop */ }
    };
  }

  // Exponential backoff (1s → 2s → 4s … capped at 30s).
  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    const delay = Math.min(30_000, 1000 * 2 ** this.reconnectAttempts);
    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private send(type: string, data: Record<string, unknown>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, ...data }));
    }
  }

  // Register a raw message listener; returns an unsubscribe fn. Opens the socket on demand.
  addListener(fn: ForumListener): () => void {
    this.listeners.add(fn);
    this.connect();
    return () => {
      this.listeners.delete(fn);
      if (!this.listeners.size && !this.subscriptions.size) this.disconnect();
    };
  }

  subscribeToThread(threadId: string) {
    this.subscriptions.add(threadId);
    this.connect();
    this.send('subscribe_thread', { threadId });
  }

  unsubscribeFromThread(threadId: string) {
    this.subscriptions.delete(threadId);
    this.send('unsubscribe_thread', { threadId });
    if (!this.listeners.size && !this.subscriptions.size) this.disconnect();
  }

  private disconnect() {
    this.shouldConnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    try { this.ws?.close(); } catch { /* noop */ }
    this.ws = null;
  }

  // ---- REST ----
  async getThreads(params: Record<string, unknown>) {
    const res = await api.get('/threads', { params });
    return res.data;
  }

  async getThread(id: string, params?: Record<string, unknown>) {
    const res = await api.get(`/threads/${id}`, { params });
    return res.data;
  }

  async createThread(data: any) {
    const res = await api.post('/threads', data);
    return res.data;
  }

  async updateThread(id: string, data: any) {
    const res = await api.put(`/threads/${id}`, data);
    return res.data;
  }

  async deleteThread(id: string) {
    const res = await api.delete(`/threads/${id}`);
    return res.data;
  }

  async createComment(threadId: string, data: any) {
    const res = await api.post(`/threads/${threadId}/comments`, data);
    return res.data;
  }

  async updateComment(id: string, content: string) {
    const res = await api.put(`/comments/${id}`, { content });
    return res.data;
  }

  async deleteComment(id: string) {
    const res = await api.delete(`/comments/${id}`);
    return res.data;
  }

  async vote(data: any) {
    const res = await api.post('/vote', data);
    return res.data;
  }
}

export const forumService = new ForumService();
