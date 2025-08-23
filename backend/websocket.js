const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { ForumThread, Comment } = require('./models/forum');

class WebSocketServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.clients = new Map(); // Map to store client connections with their user info
    this.setupWebSocket();
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

  async handleSubscribeThread(ws, threadId) {
    const user = this.clients.get(ws);
    ws.threadSubscriptions = ws.threadSubscriptions || new Set();
    ws.threadSubscriptions.add(threadId);
    
    // Send current thread data
    const thread = await ForumThread.findById(threadId)
      .populate('author', 'username')
      .populate({
        path: 'comments',
        populate: {
          path: 'author',
          select: 'username'
        }
      });

    if (thread) {
      ws.send(JSON.stringify({
        type: 'thread_data',
        threadId,
        data: thread
      }));
    }
  }

  handleUnsubscribeThread(ws, threadId) {
    if (ws.threadSubscriptions) {
      ws.threadSubscriptions.delete(threadId);
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

    // Remove existing votes
    target.upvotes = target.upvotes.filter(id => id.toString() !== user.userId);
    target.downvotes = target.downvotes.filter(id => id.toString() !== user.userId);

    // Add new vote
    if (voteType === 'up') {
      target.upvotes.push(user.userId);
    } else if (voteType === 'down') {
      target.downvotes.push(user.userId);
    }

    await target.save();

    this.broadcast({
      type: 'vote_update',
      targetType,
      targetId,
      score: target.score,
      threadId: targetType === 'thread' ? targetId : target.thread
    }, targetType === 'thread' ? targetId : target.thread);
  }

  broadcast(message, threadId) {
    this.wss.clients.forEach(client => {
      if (
        client.readyState === WebSocket.OPEN &&
        client.threadSubscriptions &&
        client.threadSubscriptions.has(threadId)
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