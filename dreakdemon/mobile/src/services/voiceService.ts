import {
    mediaDevices,
    MediaStream,
    RTCIceCandidate,
    RTCPeerConnection,
    RTCSessionDescription,
} from 'react-native-webrtc';
import { getSocket } from './socketService';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export type VoiceParticipant = {
  userId: string;
  userName: string;
  socketId?: string;
};

type PeerEntry = {
  pc: RTCPeerConnection;
  remoteStream: MediaStream | null;
};

let localStream: MediaStream | null = null;
let peers: Map<string, PeerEntry> = new Map();
let currentGroupId: string | null = null;
let currentRoomId: string | null = null;
let isMuted = false;

// Callbacks
let onParticipantsChanged: ((participants: VoiceParticipant[]) => void) | null = null;
let onLocalStreamReady: ((stream: MediaStream) => void) | null = null;
let onRemoteStreamAdded: ((socketId: string, stream: MediaStream) => void) | null = null;
let onRemoteStreamRemoved: ((socketId: string) => void) | null = null;

export function setVoiceCallbacks(callbacks: {
  onParticipantsChanged?: (participants: VoiceParticipant[]) => void;
  onLocalStreamReady?: (stream: MediaStream) => void;
  onRemoteStreamAdded?: (socketId: string, stream: MediaStream) => void;
  onRemoteStreamRemoved?: (socketId: string) => void;
}) {
  onParticipantsChanged = callbacks.onParticipantsChanged || null;
  onLocalStreamReady = callbacks.onLocalStreamReady || null;
  onRemoteStreamAdded = callbacks.onRemoteStreamAdded || null;
  onRemoteStreamRemoved = callbacks.onRemoteStreamRemoved || null;
}

async function getLocalAudioStream(): Promise<MediaStream> {
  if (localStream) return localStream;
  const stream = await mediaDevices.getUserMedia({
    audio: true,
    video: false,
  }) as MediaStream;
  localStream = stream;
  onLocalStreamReady?.(stream);
  return stream;
}

function createPeerConnection(targetSocketId: string): RTCPeerConnection {
  const pc = new RTCPeerConnection(ICE_SERVERS);

  (pc as any).addEventListener('icecandidate', (event: any) => {
    if (event.candidate) {
      const socket = getSocket();
      socket?.emit('voice-ice-candidate', {
        targetSocketId,
        candidate: event.candidate,
        groupId: currentGroupId,
        roomId: currentRoomId,
      });
    }
  });

  (pc as any).addEventListener('track', (event: any) => {
    const remoteStream = event.streams?.[0] || new MediaStream([event.track]);
    const entry = peers.get(targetSocketId);
    if (entry) entry.remoteStream = remoteStream;
    onRemoteStreamAdded?.(targetSocketId, remoteStream);
  });

  // Add local tracks
  if (localStream) {
    localStream.getTracks().forEach((track: any) => {
      pc.addTrack(track, localStream!);
    });
  }

  peers.set(targetSocketId, { pc, remoteStream: null });
  return pc;
}

async function createOffer(targetSocketId: string) {
  const pc = createPeerConnection(targetSocketId);
  const offer = await pc.createOffer({});
  await pc.setLocalDescription(offer);

  const socket = getSocket();
  socket?.emit('voice-offer', {
    targetSocketId,
    offer: pc.localDescription,
    groupId: currentGroupId,
    roomId: currentRoomId,
  });
}

export async function joinVoiceRoom(groupId: string, roomId: string, userId: string, userName: string) {
  currentGroupId = groupId;
  currentRoomId = roomId;

  await getLocalAudioStream();
  const socket = getSocket();
  if (!socket) return;

  // Listen for signaling events
  socket.on('voice-existing-peers', async (data: { peers: Array<{ socketId: string; userId: string; userName: string }> }) => {
    for (const peer of data.peers) {
      await createOffer(peer.socketId);
    }
  });

  socket.on('voice-user-joined', async (data: { socketId: string; userId: string; userName: string }) => {
    // New peer joined — wait for their offer (they'll create offers to existing peers)
  });

  socket.on('voice-offer', async (data: { fromSocketId: string; offer: any }) => {
    const pc = createPeerConnection(data.fromSocketId);
    await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socket.emit('voice-answer', {
      targetSocketId: data.fromSocketId,
      answer: pc.localDescription,
      groupId: currentGroupId,
      roomId: currentRoomId,
    });
  });

  socket.on('voice-answer', async (data: { fromSocketId: string; answer: any }) => {
    const entry = peers.get(data.fromSocketId);
    if (entry) {
      await entry.pc.setRemoteDescription(new RTCSessionDescription(data.answer));
    }
  });

  socket.on('voice-ice-candidate', async (data: { fromSocketId: string; candidate: any }) => {
    const entry = peers.get(data.fromSocketId);
    if (entry) {
      await entry.pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
  });

  socket.on('voice-user-left', (data: { socketId: string }) => {
    const entry = peers.get(data.socketId);
    if (entry) {
      entry.pc.close();
      peers.delete(data.socketId);
      onRemoteStreamRemoved?.(data.socketId);
    }
  });

  socket.on('voiceRoomParticipants', (data: { groupId: string; roomId: string; participants: VoiceParticipant[] }) => {
    if (data.groupId === currentGroupId && data.roomId === currentRoomId) {
      onParticipantsChanged?.(data.participants);
    }
  });

  // Tell server we're joining
  socket.emit('join-voice-room', { groupId, roomId, userId, userName });
}

export function leaveVoiceRoom() {
  const socket = getSocket();

  // Tell server
  if (socket && currentGroupId && currentRoomId) {
    socket.emit('leave-voice-room', { groupId: currentGroupId, roomId: currentRoomId });
  }

  // Cleanup signaling listeners
  if (socket) {
    socket.off('voice-existing-peers');
    socket.off('voice-user-joined');
    socket.off('voice-offer');
    socket.off('voice-answer');
    socket.off('voice-ice-candidate');
    socket.off('voice-user-left');
    socket.off('voiceRoomParticipants');
  }

  // Close all peer connections
  for (const [, entry] of peers) {
    entry.pc.close();
  }
  peers.clear();

  // Stop local stream
  if (localStream) {
    localStream.getTracks().forEach((track: any) => track.stop());
    localStream = null;
  }

  currentGroupId = null;
  currentRoomId = null;
  isMuted = false;
}

export function toggleMute(): boolean {
  if (!localStream) return false;
  isMuted = !isMuted;
  localStream.getAudioTracks().forEach((track: any) => {
    track.enabled = !isMuted;
  });
  return isMuted;
}

export function getIsMuted(): boolean {
  return isMuted;
}

export function isInVoiceRoom(): boolean {
  return currentGroupId !== null && currentRoomId !== null;
}

export function getCurrentVoiceRoom(): { groupId: string; roomId: string } | null {
  if (currentGroupId && currentRoomId) {
    return { groupId: currentGroupId, roomId: currentRoomId };
  }
  return null;
}
