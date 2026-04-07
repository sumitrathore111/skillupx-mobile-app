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
