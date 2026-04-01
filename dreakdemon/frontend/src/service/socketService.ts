import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from './apiConfig';

// Use shared base URL for socket connections
const getSocketUrl = () => API_BASE_URL;

let socket: Socket | null = null;

export const initializeSocket = (): Socket => {
  if (!socket || !socket.connected) {
    const socketUrl = getSocketUrl();
    console.log('🔌 Initializing socket connection to:', socketUrl);

    socket = io(socketUrl, {
      transports: ['polling', 'websocket'], // Prefer polling first (more reliable on cloud hosts)
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    socket.on('connect', () => {
      console.log('🔌 Socket connected:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('🔌 Socket connection error:', error.message);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('🔌 Socket reconnected after', attemptNumber, 'attempts');
    });
  }
  return socket;
};

export const getSocket = (): Socket | null => {
  return socket;
};

export const joinProjectRoom = (projectId: string): void => {
  if (socket) {
    socket.emit('join-project', projectId);
    console.log('📡 Joined project room:', projectId);
  }
};

export const leaveProjectRoom = (projectId: string): void => {
  if (socket) {
    socket.emit('leave-project', projectId);
    console.log('📡 Left project room:', projectId);
  }
};

// Join user's personal room for receiving notifications
export const joinUserRoom = (userId: string): void => {
  if (socket) {
    socket.emit('join-user', userId);
    console.log('📡 Joined user room:', userId);
  }
};

export const leaveUserRoom = (userId: string): void => {
  if (socket) {
    socket.emit('leave-user', userId);
    console.log('📡 Left user room:', userId);
  }
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Event listeners for project updates
export const onNewMessage = (callback: (data: any) => void): void => {
  if (socket) {
    socket.on('new-message', callback);
  }
};

export const onTaskCreated = (callback: (data: any) => void): void => {
  if (socket) {
    socket.on('task-created', callback);
  }
};

export const onTaskUpdated = (callback: (data: any) => void): void => {
  if (socket) {
    socket.on('task-updated', callback);
  }
};

export const onTaskDeleted = (callback: (data: any) => void): void => {
  if (socket) {
    socket.on('task-deleted', callback);
  }
};

export const onMemberJoined = (callback: (data: any) => void): void => {
  if (socket) {
    socket.on('member-joined', callback);
  }
};

export const onJoinRequestUpdated = (callback: (data: any) => void): void => {
  if (socket) {
    socket.on('join-request-updated', callback);
  }
};

export const onMessageDeleted = (callback: (data: any) => void): void => {
  if (socket) {
    socket.on('message-deleted', callback);
  }
};

export const onMessageEdited = (callback: (data: any) => void): void => {
  if (socket) {
    socket.on('message-edited', callback);
  }
};

// Remove event listeners
export const offNewMessage = (callback?: (data: any) => void): void => {
  if (socket) {
    socket.off('new-message', callback);
  }
};

export const offTaskCreated = (callback?: (data: any) => void): void => {
  if (socket) {
    socket.off('task-created', callback);
  }
};

export const offTaskUpdated = (callback?: (data: any) => void): void => {
  if (socket) {
    socket.off('task-updated', callback);
  }
};

export const offTaskDeleted = (callback?: (data: any) => void): void => {
  if (socket) {
    socket.off('task-deleted', callback);
  }
};

export const offMemberJoined = (callback?: (data: any) => void): void => {
  if (socket) {
    socket.off('member-joined', callback);
  }
};

export const offJoinRequestUpdated = (callback?: (data: any) => void): void => {
  if (socket) {
    socket.off('join-request-updated', callback);
  }
};

export const offMessageDeleted = (callback?: (data: any) => void): void => {
  if (socket) {
    socket.off('message-deleted', callback);
  }
};

export const offMessageEdited = (callback?: (data: any) => void): void => {
  if (socket) {
    socket.off('message-edited', callback);
  }
};

// ==================== BATTLE LOBBY ====================

export const joinBattleLobby = (): void => {
  if (socket) {
    socket.emit('join-battle-lobby');
    console.log('⚔️ Joined battle lobby room');
  }
};

export const leaveBattleLobby = (): void => {
  if (socket) {
    socket.emit('leave-battle-lobby');
    console.log('⚔️ Left battle lobby room');
  }
};

export const onBattleCreated = (callback: (data: any) => void): void => {
  if (socket) socket.on('battle-created', callback);
};

export const offBattleCreated = (callback?: (data: any) => void): void => {
  if (socket) socket.off('battle-created', callback);
};

export const onBattleRemoved = (callback: (data: any) => void): void => {
  if (socket) socket.on('battle-removed', callback);
};

export const offBattleRemoved = (callback?: (data: any) => void): void => {
  if (socket) socket.off('battle-removed', callback);
};

export const onBattleMatched = (callback: (data: any) => void): void => {
  if (socket) socket.on('battle-matched', callback);
};

export const offBattleMatched = (callback?: (data: any) => void): void => {
  if (socket) socket.off('battle-matched', callback);
};

export const onBattleInviteReceived = (callback: (data: any) => void): void => {
  if (socket) socket.on('battle-invite-received', callback);
};

export const offBattleInviteReceived = (callback?: (data: any) => void): void => {
  if (socket) socket.off('battle-invite-received', callback);
};

export const onBattleInviteRejected = (callback: (data: any) => void): void => {
  if (socket) socket.on('battle-invite-rejected', callback);
};

export const offBattleInviteRejected = (callback?: (data: any) => void): void => {
  if (socket) socket.off('battle-invite-rejected', callback);
};

// Chat-specific socket functions for Developer Connect
export const joinChatRoom = (chatId: string): void => {
  if (socket) {
    socket.emit('join-chat', chatId);
    console.log('💬 Joined chat room:', chatId);
  }
};

export const leaveChatRoom = (chatId: string): void => {
  if (socket) {
    socket.emit('leave-chat', chatId);
    console.log('💬 Left chat room:', chatId);
  }
};

export const onChatMessage = (callback: (data: any) => void): void => {
  if (socket) {
    socket.on('newMessage', callback);
  }
};

export const offChatMessage = (callback?: (data: any) => void): void => {
  if (socket) {
    socket.off('newMessage', callback);
  }
};

// Group chat socket functions
export const joinGroupRoom = (groupId: string): void => {
  if (socket) {
    socket.emit('join-group', groupId);
    console.log('👥 Joined group room:', groupId);
  }
};

export const leaveGroupRoom = (groupId: string): void => {
  if (socket) {
    socket.emit('leave-group', groupId);
    console.log('👥 Left group room:', groupId);
  }
};

export const onGroupMessage = (callback: (data: any) => void): void => {
  if (socket) {
    socket.on('newGroupMessage', callback);
  }
};

export const offGroupMessage = (callback?: (data: any) => void): void => {
  if (socket) {
    socket.off('newGroupMessage', callback);
  }
};

// Send message via socket (for faster real-time updates)
export const emitChatMessage = (chatId: string, message: any): void => {
  if (socket) {
    socket.emit('sendMessage', { chatId, message });
  }
};

export const emitGroupMessage = (groupId: string, message: any): void => {
  if (socket) {
    socket.emit('sendGroupMessage', { groupId, message });
  }
};
