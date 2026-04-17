import { SOCKET_URL } from '@constants/config';
import { io, Socket } from 'socket.io-client';
import { getStoredToken } from './authService';

let socket: Socket | null = null;

export async function initializeSocket(): Promise<Socket> {
  if (socket?.connected) return socket;

  const token = await getStoredToken();

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['polling', 'websocket'], // polling first as fallback, upgrades to ws
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => console.log('Socket connected:', socket?.id));
  socket.on('disconnect', (reason) => console.log('Socket disconnected:', reason));
  socket.on('connect_error', (err) => console.log('Socket error:', err.message));

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// ============ CHAT EVENTS ============
export function joinUserRoom(userId: string) {
  socket?.emit('join-user', userId);
}

export function leaveUserRoom(userId: string) {
  socket?.emit('leave-user', userId);
}

export function emitTyping(chatId: string, userId: string) {
  socket?.emit('typing', { chatId, userId });
}

export function emitStopTyping(chatId: string, userId: string) {
  socket?.emit('stopTyping', { chatId, userId });
}

export function onNewMessage(callback: (message: any) => void) {
  socket?.on('newMessage', callback);
}

export function offNewMessage() {
  socket?.off('newMessage');
}

export function onTyping(callback: (data: any) => void) {
  socket?.on('typing', callback);
}

export function offTyping() {
  socket?.off('typing');
}

export function onStopTyping(callback: (data: any) => void) {
  socket?.on('stopTyping', callback);
}

export function offStopTyping() {
  socket?.off('stopTyping');
}

// ============ BATTLE EVENTS ============
// IMPORTANT: Backend uses hyphen-separated event names (not camelCase)

export function joinBattleLobby() {
  socket?.emit('join-battle-lobby');
  console.log('⚔️ Joined battle lobby room');
}

export function leaveBattleLobby() {
  socket?.emit('leave-battle-lobby');
  console.log('⚔️ Left battle lobby room');
}

export function onBattleCreated(callback: (data: any) => void) {
  socket?.on('battle-created', callback);
}

export function offBattleCreated(callback?: (data: any) => void) {
  socket?.off('battle-created', callback);
}

export function onBattleRemoved(callback: (data: any) => void) {
  socket?.on('battle-removed', callback);
}

export function offBattleRemoved(callback?: (data: any) => void) {
  socket?.off('battle-removed', callback);
}

export function onBattleMatched(callback: (data: any) => void) {
  socket?.on('battle-matched', callback);
}

export function offBattleMatched(callback?: (data: any) => void) {
  socket?.off('battle-matched', callback);
}

export function onBattleInviteReceived(callback: (data: any) => void) {
  socket?.on('battle-invite-received', callback);
}

export function offBattleInviteReceived(callback?: (data: any) => void) {
  socket?.off('battle-invite-received', callback);
}

export function onBattleInviteRejected(callback: (data: any) => void) {
  socket?.on('battle-invite-rejected', callback);
}

export function offBattleInviteRejected(callback?: (data: any) => void) {
  socket?.off('battle-invite-rejected', callback);
}

// ============ STUDY GROUP EVENTS ============
export function joinGroup(groupId: string) {
  socket?.emit('join-group', groupId);
}

export function leaveGroup(groupId: string) {
  socket?.emit('leave-group', groupId);
}

export function onGroupMessage(callback: (message: any) => void) {
  socket?.on('newGroupMessage', callback);
}

export function offGroupMessage() {
  socket?.off('newGroupMessage');
}

// ============ ONLINE STATUS ============
export function onUserOnline(callback: (userId: string) => void) {
  socket?.on('userOnline', callback);
}

export function onUserOffline(callback: (userId: string) => void) {
  socket?.on('userOffline', callback);
}

// ============ PROJECT ROOM EVENTS ============
export function joinProjectRoom(projectId: string) {
  socket?.emit('join-project', projectId);
}

export function leaveProjectRoom(projectId: string) {
  socket?.emit('leave-project', projectId);
}

// ── Board / Task events (emitted to project:{id} room)
export function onTaskCreated(callback: (data: any) => void) {
  socket?.on('task:created', callback);
}
export function offTaskCreated(callback?: (data: any) => void) {
  socket?.off('task:created', callback);
}

export function onTaskUpdated(callback: (data: any) => void) {
  socket?.on('task:updated', callback);
}
export function offTaskUpdated(callback?: (data: any) => void) {
  socket?.off('task:updated', callback);
}

export function onTaskMoved(callback: (data: any) => void) {
  socket?.on('task:moved', callback);
}
export function offTaskMoved(callback?: (data: any) => void) {
  socket?.off('task:moved', callback);
}

export function onTaskDeleted(callback: (data: any) => void) {
  socket?.on('task:deleted', callback);
}
export function offTaskDeleted(callback?: (data: any) => void) {
  socket?.off('task:deleted', callback);
}

export function onTaskCommented(callback: (data: any) => void) {
  socket?.on('task:commented', callback);
}
export function offTaskCommented(callback?: (data: any) => void) {
  socket?.off('task:commented', callback);
}

// ── Project chat events (emitted to project:{id} room)
export function onProjectMessage(callback: (data: any) => void) {
  socket?.on('new-message', callback);
}
export function offProjectMessage(callback?: (data: any) => void) {
  socket?.off('new-message', callback);
}

export function onProjectMessageEdited(callback: (data: any) => void) {
  socket?.on('message-edited', callback);
}
export function offProjectMessageEdited(callback?: (data: any) => void) {
  socket?.off('message-edited', callback);
}

export function onProjectMessageDeleted(callback: (data: any) => void) {
  socket?.on('message-deleted', callback);
}
export function offProjectMessageDeleted(callback?: (data: any) => void) {
  socket?.off('message-deleted', callback);
}

// ── Member events
export function onMemberRemoved(callback: (data: any) => void) {
  socket?.on('member-removed', callback);
}
export function offMemberRemoved(callback?: (data: any) => void) {
  socket?.off('member-removed', callback);
}

// ── File events
export function onFileUploaded(callback: (data: any) => void) {
  socket?.on('file-uploaded', callback);
}
export function offFileUploaded(callback?: (data: any) => void) {
  socket?.off('file-uploaded', callback);
}

export function onFileDeleted(callback: (data: any) => void) {
  socket?.on('file-deleted', callback);
}
export function offFileDeleted(callback?: (data: any) => void) {
  socket?.off('file-deleted', callback);
}

// ── Board structure events
export function onBoardCreated(callback: (data: any) => void) {
  socket?.on('board:created', callback);
}
export function offBoardCreated(callback?: (data: any) => void) {
  socket?.off('board:created', callback);
}

export function onBoardUpdated(callback: (data: any) => void) {
  socket?.on('board:updated', callback);
}
export function offBoardUpdated(callback?: (data: any) => void) {
  socket?.off('board:updated', callback);
}

// ── GitHub events
export function onGitHubPush(callback: (data: any) => void) {
  socket?.on('github:push', callback);
}
export function offGitHubPush(callback?: (data: any) => void) {
  socket?.off('github:push', callback);
}

export function onGitHubPR(callback: (data: any) => void) {
  socket?.on('github:pull_request', callback);
}
export function offGitHubPR(callback?: (data: any) => void) {
  socket?.off('github:pull_request', callback);
}

// ============ NOTIFICATION EVENTS ============
export function onNotification(callback: (data: any) => void) {
  socket?.on('notification', callback);
}

export function offNotification(callback?: (data: any) => void) {
  socket?.off('notification', callback);
}
