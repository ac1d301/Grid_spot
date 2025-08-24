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

class ForumService {
  ws: WebSocket | null = null;
  messageHandlers: Map<string, (data: any) => void> = new Map();
  threadId: string | null = null;

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
    
    const token = authService.getToken();
    if (!token) return;

    this.ws = new WebSocket(`${WS_BASE_URL}?token=${token}`);
    
    this.ws.onopen = () => {
      // Optionally log connection
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const handler = this.messageHandlers.get(message.type);
        if (handler) handler(message.data || message);
      } catch (error) {
        // Optionally log error
      }
    };

    this.ws.onclose = () => {
      // Optionally handle reconnect
    };
  }

  onMessage(type: string, handler: (data: any) => void) {
    this.messageHandlers.set(type, handler);
    this.connect();
  }

  subscribeToThread(threadId: string) {
    this.connect();
    this.threadId = threadId;
    this.sendMessage('subscribe_thread', { threadId });
  }

  unsubscribeFromThread(threadId: string) {
    this.sendMessage('unsubscribe_thread', { threadId });
    this.threadId = null;
  }

  sendMessage(type: string, data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, ...data }));
    }
  }

  async getThreads(params: any) {
    const res = await api.get('/threads', { params });
    return res.data;
  }

  async getThread(id: string) {
    const res = await api.get(`/threads/${id}`);
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

  async updateComment(id: string, data: any) {
    const res = await api.put(`/comments/${id}`, data);
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
