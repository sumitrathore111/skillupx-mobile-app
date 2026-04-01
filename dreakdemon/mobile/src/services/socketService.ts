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
  socket?.emit('joinUserRoom', userId);
}

export function leaveUserRoom(userId: string) {
  socket?.emit('leaveUserRoom', userId);
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
export function joinBattleLobby() {
  socket?.emit('joinBattleLobby');
}

export function leaveBattleLobby() {
  socket?.emit('leaveBattleLobby');
}

export function onBattleMatched(callback: (data: any) => void) {
  socket?.on('battleMatched', callback);
}

export function offBattleMatched() {
  socket?.off('battleMatched');
}

export function onBattleStarted(callback: (data: any) => void) {
  socket?.on('battleStarted', callback);
}

export function offBattleStarted() {
  socket?.off('battleStarted');
}

export function onBattleEnded(callback: (data: any) => void) {
  socket?.on('battleEnded', callback);
}

export function offBattleEnded() {
  socket?.off('battleEnded');
}

export function onOpponentSubmitted(callback: (data: any) => void) {
  socket?.on('opponentSubmitted', callback);
}

export function offOpponentSubmitted() {
  socket?.off('opponentSubmitted');
}

export function onBattleInviteReceived(callback: (data: any) => void) {
  socket?.on('battleInviteReceived', callback);
}

export function offBattleInviteReceived() {
  socket?.off('battleInviteReceived');
}

// ============ STUDY GROUP EVENTS ============
export function joinGroup(groupId: string) {
  socket?.emit('joinGroup', groupId);
}

export function leaveGroup(groupId: string) {
  socket?.emit('leaveGroup', groupId);
}

export function onGroupMessage(callback: (message: any) => void) {
  socket?.on('groupMessage', callback);
}

export function offGroupMessage() {
  socket?.off('groupMessage');
}

// ============ ONLINE STATUS ============
export function onUserOnline(callback: (userId: string) => void) {
  socket?.on('userOnline', callback);
}

export function onUserOffline(callback: (userId: string) => void) {
  socket?.on('userOffline', callback);
}
