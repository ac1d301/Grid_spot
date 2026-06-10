const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { ForumThread, Comment } = require('./models/forum');

// Module-level handle to the live server so the REST routes can push real-time
// updates without an import cycle (see broadcastToThread export at the bottom).
let instance = null;

class WebSocketServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.clients = new Map(); // Map to store client connections with their user info
    this.setupWebSocket();
    instance = this;
  }

  setupWebSocket() {
    this.wss.on('connection', async (ws, req) => {
      try {
        // Get token from query string
        const token = new URL(req.url, 'http://localhost').searchParams.get('token');
        if (!token) {
          ws.close(4001, 'Authentication required');
          return;
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded) {
          ws.close(4002, 'Invalid token');
          return;
        }

        // Store user info with the connection
        this.clients.set(ws, {
          userId: decoded.userId,
          username: decoded.username
        });

        console.log(`Client connected: ${decoded.username}`);

        // Handle incoming messages
        ws.on('message', async (message) => {
          try {
            const data = JSON.parse(message);
            await this.handleMessage(ws, data);
          } catch (error) {
            console.error('Error handling message:', error);
            this.sendError(ws, error.message);
          }
        });

        // Handle client disconnect
        ws.on('close', () => {
          console.log(`Client disconnected: ${decoded.username}`);
          this.clients.delete(ws);
        });

        // Send initial connection success message
        ws.send(JSON.stringify({
          type: 'connection',
          status: 'success',
          message: 'Connected to forum WebSocket server'
        }));

      } catch (error) {
        console.error('WebSocket connection error:', error);
        ws.close(4000, 'Connection error');
      }
    });
  }

  async handleMessage(ws, data) {
    const user = this.clients.get(ws);
    if (!user) {
      throw new Error('User not authenticated');
    }

    switch (data.type) {
      case 'subscribe_thread':
        await this.handleSubscribeThread(ws, data.threadId);
        break;

      case 'unsubscribe_thread':
        await this.handleUnsubscribeThread(ws, data.threadId);
        break;

      case 'new_comment':
        await this.handleNewComment(ws, data);
        break;

      case 'edit_comment':
        await this.handleEditComment(ws, data);
        break;

      case 'delete_comment':
        await this.handleDeleteComment(ws, data);
        break;

      case 'vote':
        await this.handleVote(ws, data);
        break;

      default:
        throw new Error('Unknown message type');
    }
  }

  // Just registers interest in a thread's live updates. The client loads the thread's
  // content over REST (React Query); the socket only carries deltas. (threadId stored as a
  // string so it matches the string ids the REST routes broadcast with.)
  handleSubscribeThread(ws, threadId) {
    ws.threadSubscriptions = ws.threadSubscriptions || new Set();
    ws.threadSubscriptions.add(String(threadId));
  }

  handleUnsubscribeThread(ws, threadId) {
    if (ws.threadSubscriptions) {
      ws.threadSubscriptions.delete(String(threadId));
    }
  }

  async handleNewComment(ws, data) {
    const user = this.clients.get(ws);
    
    const comment = new Comment({
      content: data.content,
      author: user.userId,
      thread: data.threadId,
      parentComment: data.parentCommentId || null
    });

    await comment.save();

    // Update thread's lastActivity
    const thread = await ForumThread.findById(data.threadId);
    await thread.updateLastActivity();

    // Broadcast to all clients subscribed to this thread
    this.broadcast({
      type: 'new_comment',
      threadId: data.threadId,
      data: await comment.populate('author', 'username')
    }, data.threadId);
  }

  async handleEditComment(ws, data) {
    const user = this.clients.get(ws);
    
    const comment = await Comment.findById(data.commentId);
    if (!comment || comment.author.toString() !== user.userId) {
      throw new Error('Not authorized to edit this comment');
    }

    comment.content = data.content;
    comment.isEdited = true;
    await comment.save();

    this.broadcast({
      type: 'edit_comment',
      threadId: comment.thread,
      commentId: comment._id,
      data: await comment.populate('author', 'username')
    }, comment.thread);
  }

  async handleDeleteComment(ws, data) {
    const user = this.clients.get(ws);
    
    const comment = await Comment.findById(data.commentId);
    if (!comment || comment.author.toString() !== user.userId) {
      throw new Error('Not authorized to delete this comment');
    }

    await comment.delete();

    this.broadcast({
      type: 'delete_comment',
      threadId: comment.thread,
      commentId: comment._id
    }, comment.thread);
  }

  async handleVote(ws, data) {
    const user = this.clients.get(ws);
    const { targetType, targetId, voteType } = data;
    
    let target;
    if (targetType === 'thread') {
      target = await ForumThread.findById(targetId);
    } else if (targetType === 'comment') {
      target = await Comment.findById(targetId);
    }

    if (!target) {
      throw new Error('Target not found');
    }

    // Schema stores likes/dislikes (not upvotes/downvotes). Toggle the user's vote.
    target.likes = (target.likes || []).filter(id => id.toString() !== user.userId);
    target.dislikes = (target.dislikes || []).filter(id => id.toString() !== user.userId);
    if (voteType === 'like') {
      target.likes.push(user.userId);
    } else if (voteType === 'dislike') {
      target.dislikes.push(user.userId);
    }

    await target.save();

    const threadId = targetType === 'thread' ? targetId : target.thread;
    this.broadcast({
      type: 'vote_updated',
      targetType,
      targetId,
      score: target.likes.length - target.dislikes.length,
      likes: target.likes.length,
      dislikes: target.dislikes.length,
      threadId: String(threadId)
    }, threadId);
  }

  broadcast(message, threadId) {
    const key = String(threadId);
    this.wss.clients.forEach(client => {
      if (
        client.readyState === WebSocket.OPEN &&
        client.threadSubscriptions &&
        client.threadSubscriptions.has(key)
      ) {
        client.send(JSON.stringify(message));
      }
    });
  }

  sendError(ws, error) {
    ws.send(JSON.stringify({
      type: 'error',
      message: error
    }));
  }
}

module.exports = WebSocketServer;

// Used by the forum REST routes to fan out a real-time delta to everyone subscribed to a
// thread. No-op until the server is constructed. message = { type, threadId, ...payload }.
module.exports.broadcastToThread = (threadId, message) => {
  if (instance) instance.broadcast(message, threadId);
};
