import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import { createServer } from 'http';
import morgan from 'morgan';
import path from 'path';
import { Server as SocketIOServer } from 'socket.io';
import { connectDatabase } from './config/database';

// Import routes
import adminRoutes from './routes/admin';
import aiRoutes from './routes/ai';
import authRoutes from './routes/auth';
import battleRoutes from './routes/battles';
import boardRoutes from './routes/boards';
import challengeRoutes from './routes/challenges';
import chatRoutes from './routes/chats';
import connectionRoutes from './routes/connections';
import developerRoutes from './routes/developers';
import discussionRoutes from './routes/discussions';
import executeRoutes from './routes/execute';
import githubRoutes from './routes/github';
import ideaRoutes from './routes/ideas';
import joinRequestRoutes from './routes/joinRequests';
import leaderboardRoutes from './routes/leaderboard';
import marketplaceRoutes from './routes/marketplace';
import messageRoutes from './routes/messages';
import projectInviteRoutes from './routes/projectInvites';
import projectRoutes from './routes/projects';
import roadmapRoutes from './routes/roadmaps';
import studyGroupRoutes from './routes/studyGroups';
import uploadRoutes from './routes/upload';
import userRoutes from './routes/users';
import walletRoutes from './routes/wallet';

// Load environment variables
dotenv.config();

const app: Application = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

// Socket.io setup for real-time updates
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: [
      'https://skillupx.online',
      'https://www.skillupx.online',
      'https://skillupx.vercel.app',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Track online users: Map<socketId, userId>
const socketUserMap = new Map<string, string>();
// Track online users: Set of userIds
const onlineUsers = new Set<string>();
// Track voice room participants: Map<groupId:roomId, Set<{socketId, userId, userName}>>
const voiceRoomParticipants = new Map<string, Map<string, { socketId: string; userId: string; userName: string }>>();

function getVoiceRoomKey(groupId: string, roomId: string) {
  return `${groupId}:${roomId}`;
}

function getVoiceParticipants(groupId: string, roomId: string) {
  const key = getVoiceRoomKey(groupId, roomId);
  if (!voiceRoomParticipants.has(key)) voiceRoomParticipants.set(key, new Map());
  return voiceRoomParticipants.get(key)!;
}

function broadcastVoiceParticipants(groupId: string, roomId: string) {
  const participants = getVoiceParticipants(groupId, roomId);
  const list = Array.from(participants.values()).map(p => ({ userId: p.userId, userName: p.userName }));
  io.to(`group:${groupId}`).emit('voiceRoomParticipants', { groupId, roomId, participants: list });
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.id);

  // Handle user coming online
  socket.on('userOnline', (data: { userId: string }) => {
    if (data.userId) {
      socketUserMap.set(socket.id, data.userId);
      onlineUsers.add(data.userId);
      console.log(`🟢 User ${data.userId} is now online`);
      // Broadcast to all clients that this user is online
      io.emit('userOnline', { userId: data.userId });
    }
  });

  // Handle request for online users list
  socket.on('getOnlineUsers', () => {
    socket.emit('onlineUsers', Array.from(onlineUsers));
  });

  // ==================== BATTLE LOBBY EVENTS ====================
  socket.on('join-battle-lobby', () => {
    socket.join('battle-lobby');
    console.log(`⚔️ Socket ${socket.id} joined battle-lobby`);
  });

  socket.on('leave-battle-lobby', () => {
    socket.leave('battle-lobby');
    console.log(`⚔️ Socket ${socket.id} left battle-lobby`);
  });

  // Join a project room for real-time updates
  socket.on('join-project', (projectId: string) => {
    socket.join(`project:${projectId}`);
    console.log(`👤 Socket ${socket.id} joined project:${projectId}`);
  });

  // Leave a project room
  socket.on('leave-project', (projectId: string) => {
    socket.leave(`project:${projectId}`);
    console.log(`👤 Socket ${socket.id} left project:${projectId}`);
  });

  // Join user's personal room for notifications
  socket.on('join-user', (userId: string) => {
    socket.join(`user:${userId}`);
    console.log(`👤 Socket ${socket.id} joined user room: user:${userId}`);
  });

  // Leave user's personal room
  socket.on('leave-user', (userId: string) => {
    socket.leave(`user:${userId}`);
    console.log(`👤 Socket ${socket.id} left user room: user:${userId}`);
  });

  // ==================== BOARD COLLABORATION EVENTS ====================

  // Join a board room for real-time task updates
  socket.on('join-board', (boardId: string) => {
    socket.join(`board:${boardId}`);
    console.log(`📋 Socket ${socket.id} joined board:${boardId}`);
  });

  // Leave a board room
  socket.on('leave-board', (boardId: string) => {
    socket.leave(`board:${boardId}`);
    console.log(`📋 Socket ${socket.id} left board:${boardId}`);
  });

  // Cursor tracking for real-time collaboration
  socket.on('cursor-move', (data: { boardId: string; userId: string; userName: string; position: { x: number; y: number }; color: string }) => {
    socket.to(`board:${data.boardId}`).emit('cursor-update', {
      socketId: socket.id,
      userId: data.userId,
      userName: data.userName,
      position: data.position,
      color: data.color
    });
  });

  // Task drag start - show ghost to other users
  socket.on('task-drag-start', (data: { boardId: string; taskId: string; userId: string; userName: string }) => {
    socket.to(`board:${data.boardId}`).emit('task-dragging', {
      taskId: data.taskId,
      userId: data.userId,
      userName: data.userName,
      isDragging: true
    });
  });

  // Task drag end
  socket.on('task-drag-end', (data: { boardId: string; taskId: string; userId: string }) => {
    socket.to(`board:${data.boardId}`).emit('task-dragging', {
      taskId: data.taskId,
      userId: data.userId,
      isDragging: false
    });
  });

  // User is typing in task comments
  socket.on('typing-comment', (data: { taskId: string; boardId: string; userId: string; userName: string }) => {
    socket.to(`board:${data.boardId}`).emit('user-typing-comment', {
      taskId: data.taskId,
      userId: data.userId,
      userName: data.userName
    });
  });

  // User stopped typing
  socket.on('stopped-typing-comment', (data: { taskId: string; boardId: string; userId: string }) => {
    socket.to(`board:${data.boardId}`).emit('user-stopped-typing-comment', {
      taskId: data.taskId,
      userId: data.userId
    });
  });

  // User is viewing a task (for presence indicators)
  socket.on('viewing-task', (data: { taskId: string; boardId: string; userId: string; userName: string; avatar?: string }) => {
    socket.join(`task:${data.taskId}`);
    socket.to(`board:${data.boardId}`).emit('user-viewing-task', {
      taskId: data.taskId,
      userId: data.userId,
      userName: data.userName,
      avatar: data.avatar
    });
  });

  // User stopped viewing a task
  socket.on('stopped-viewing-task', (data: { taskId: string; boardId: string; userId: string }) => {
    socket.leave(`task:${data.taskId}`);
    socket.to(`board:${data.boardId}`).emit('user-left-task', {
      taskId: data.taskId,
      userId: data.userId
    });
  });

  // Join a chat room for real-time messaging
  socket.on('join-chat', (chatId: string) => {
    socket.join(`chat:${chatId}`);
    console.log(`💬 Socket ${socket.id} joined chat:${chatId}`);
  });

  // Leave a chat room
  socket.on('leave-chat', (chatId: string) => {
    socket.leave(`chat:${chatId}`);
    console.log(`💬 Socket ${socket.id} left chat:${chatId}`);
  });

  // Join a group room for real-time group messaging
  socket.on('join-group', (groupId: string) => {
    socket.join(`group:${groupId}`);
    console.log(`👥 Socket ${socket.id} joined group:${groupId}`);
  });

  // Leave a group room
  socket.on('leave-group', (groupId: string) => {
    socket.leave(`group:${groupId}`);
    console.log(`👥 Socket ${socket.id} left group:${groupId}`);
  });

  // Join user's personal room for notifications
  socket.on('join-user', (userId: string) => {
    socket.join(`user:${userId}`);
    console.log(`👤 Socket ${socket.id} joined user:${userId}`);
  });

  // Leave user's personal room
  socket.on('leave-user', (userId: string) => {
    socket.leave(`user:${userId}`);
    console.log(`👤 Socket ${socket.id} left user:${userId}`);
  });

  // ==================== VOICE ROOM (WebRTC Signaling) ====================

  // Join a voice room
  socket.on('join-voice-room', (data: { groupId: string; roomId: string; userId: string; userName: string }) => {
    const { groupId, roomId, userId, userName } = data;
    const participants = getVoiceParticipants(groupId, roomId);

    // Leave any other voice room this socket is in
    for (const [key, pMap] of voiceRoomParticipants.entries()) {
      if (pMap.has(socket.id)) {
        pMap.delete(socket.id);
        const [gId, rId] = key.split(':');
        socket.leave(`voice:${key}`);
        broadcastVoiceParticipants(gId, rId);
      }
    }

    // Join the voice room
    participants.set(socket.id, { socketId: socket.id, userId, userName });
    socket.join(`voice:${groupId}:${roomId}`);
    console.log(`🎙️ ${userName} joined voice room ${roomId} in group ${groupId}`);

    // Notify existing participants about the new peer
    socket.to(`voice:${groupId}:${roomId}`).emit('voice-user-joined', {
      groupId, roomId, userId, userName, socketId: socket.id
    });

    // Send the list of existing participants to the new joiner (so they can create offers)
    const existingPeers = Array.from(participants.values())
      .filter(p => p.socketId !== socket.id)
      .map(p => ({ userId: p.userId, userName: p.userName, socketId: p.socketId }));
    socket.emit('voice-existing-peers', { groupId, roomId, peers: existingPeers });

    broadcastVoiceParticipants(groupId, roomId);
  });

  // Leave a voice room
  socket.on('leave-voice-room', (data: { groupId: string; roomId: string }) => {
    const { groupId, roomId } = data;
    const participants = getVoiceParticipants(groupId, roomId);
    const participant = participants.get(socket.id);
    if (participant) {
      participants.delete(socket.id);
      socket.leave(`voice:${groupId}:${roomId}`);
      console.log(`🎙️ ${participant.userName} left voice room ${roomId} in group ${groupId}`);
      socket.to(`voice:${groupId}:${roomId}`).emit('voice-user-left', {
        groupId, roomId, userId: participant.userId, socketId: socket.id
      });
      broadcastVoiceParticipants(groupId, roomId);
    }
  });

  // WebRTC signaling: relay offer to a specific peer
  socket.on('voice-offer', (data: { targetSocketId: string; offer: any; groupId: string; roomId: string }) => {
    io.to(data.targetSocketId).emit('voice-offer', {
      fromSocketId: socket.id,
      offer: data.offer,
      groupId: data.groupId,
      roomId: data.roomId
    });
  });

  // WebRTC signaling: relay answer to a specific peer
  socket.on('voice-answer', (data: { targetSocketId: string; answer: any; groupId: string; roomId: string }) => {
    io.to(data.targetSocketId).emit('voice-answer', {
      fromSocketId: socket.id,
      answer: data.answer,
      groupId: data.groupId,
      roomId: data.roomId
    });
  });

  // WebRTC signaling: relay ICE candidate to a specific peer
  socket.on('voice-ice-candidate', (data: { targetSocketId: string; candidate: any; groupId: string; roomId: string }) => {
    io.to(data.targetSocketId).emit('voice-ice-candidate', {
      fromSocketId: socket.id,
      candidate: data.candidate,
      groupId: data.groupId,
      roomId: data.roomId
    });
  });

  // Get voice room participants
  socket.on('get-voice-participants', (data: { groupId: string; roomId: string }) => {
    const participants = getVoiceParticipants(data.groupId, data.roomId);
    const list = Array.from(participants.values()).map(p => ({ userId: p.userId, userName: p.userName }));
    socket.emit('voiceRoomParticipants', { groupId: data.groupId, roomId: data.roomId, participants: list });
  });

  socket.on('disconnect', () => {
    // Clean up voice rooms
    for (const [key, pMap] of voiceRoomParticipants.entries()) {
      if (pMap.has(socket.id)) {
        const participant = pMap.get(socket.id)!;
        pMap.delete(socket.id);
        const [gId, rId] = key.split(':');
        io.to(`voice:${key}`).emit('voice-user-left', {
          groupId: gId, roomId: rId, userId: participant.userId, socketId: socket.id
        });
        broadcastVoiceParticipants(gId, rId);
        if (pMap.size === 0) voiceRoomParticipants.delete(key);
      }
    }

    // Handle user going offline
    const userId = socketUserMap.get(socket.id);
    if (userId) {
      socketUserMap.delete(socket.id);
      // Check if user has no more active sockets
      const hasOtherSockets = Array.from(socketUserMap.values()).includes(userId);
      if (!hasOtherSockets) {
        onlineUsers.delete(userId);
        console.log(`🔴 User ${userId} is now offline`);
        // Broadcast to all clients that this user is offline
        io.emit('userOffline', { userId });
      }
    }
    console.log('🔌 User disconnected:', socket.id);
  });
});

// Make io accessible in routes
app.set('io', io);

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    'https://skillupx.online',
    'https://www.skillupx.online',
    'https://skillupx.vercel.app',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:8081',
    'http://localhost:19006',
    'http://localhost:19000',
    'http://192.168.29.224:8081',
    'http://192.168.29.224:19000',
    'http://192.168.29.224:19006'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Connect to database
connectDatabase();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/battles', battleRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/study-groups', studyGroupRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/ideas', ideaRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/roadmaps', roadmapRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/developers', developerRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/discussions', discussionRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/execute', executeRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/join-requests', joinRequestRoutes);
app.use('/api/project-invites', projectInviteRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/github', githubRoutes);

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: any, _req: Request, res: Response, _next: any) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`🔌 Socket.io enabled for real-time updates`);
});
export { io };
export default app;
