import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../../../service/apiConfig';

const SOCKET_URL = API_BASE_URL;

interface GitHubEventData {
  projectId: string;
  eventType: string;
  action?: string;
  sender: {
    login: string;
    avatarUrl?: string;
    id: number;
  };
  payload: Record<string, unknown>;
}

interface GitHubEvent {
  type: 'push' | 'pull_request' | 'issues' | 'create' | 'delete' | 'issue_comment';
  projectId: string;
  data: GitHubEventData;
  timestamp: string;
}

interface UseGitHubSocketOptions {
  projectId: string;
  onPush?: (data: GitHubEventData) => void;
  onPullRequest?: (data: GitHubEventData) => void;
  onIssue?: (data: GitHubEventData) => void;
  onCreate?: (data: GitHubEventData) => void;
  onDelete?: (data: GitHubEventData) => void;
  onComment?: (data: GitHubEventData) => void;
  onAnyEvent?: (event: GitHubEvent) => void;
}

export function useGitHubSocket({
  projectId,
  onPush,
  onPullRequest,
  onIssue,
  onCreate,
  onDelete,
  onComment,
  onAnyEvent
}: UseGitHubSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState<GitHubEvent[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!projectId) return;

    const token = localStorage.getItem('authToken');
    if (!token) return;

    // Create socket connection
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['polling', 'websocket'], // Prefer polling first (more reliable on cloud hosts)
      timeout: 20000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 GitHub Socket connected');
      setIsConnected(true);

      // Join project room for GitHub events
      socket.emit('join:project:github', projectId);
    });

    socket.on('disconnect', () => {
      console.log('🔌 GitHub Socket disconnected');
      setIsConnected(false);
    });

    // GitHub event handlers
    socket.on('github:push', (data) => {
      console.log('📥 GitHub push event:', data);
      const event: GitHubEvent = {
        type: 'push',
        projectId,
        data,
        timestamp: new Date().toISOString()
      };
      setEvents(prev => [event, ...prev].slice(0, 50));
      onPush?.(data);
      onAnyEvent?.(event);
    });

    socket.on('github:pull_request', (data) => {
      console.log('📥 GitHub PR event:', data);
      const event: GitHubEvent = {
        type: 'pull_request',
        projectId,
        data,
        timestamp: new Date().toISOString()
      };
      setEvents(prev => [event, ...prev].slice(0, 50));
      onPullRequest?.(data);
      onAnyEvent?.(event);
    });

    socket.on('github:issues', (data) => {
      console.log('📥 GitHub issue event:', data);
      const event: GitHubEvent = {
        type: 'issues',
        projectId,
        data,
        timestamp: new Date().toISOString()
      };
      setEvents(prev => [event, ...prev].slice(0, 50));
      onIssue?.(data);
      onAnyEvent?.(event);
    });

    socket.on('github:create', (data) => {
      console.log('📥 GitHub create event:', data);
      const event: GitHubEvent = {
        type: 'create',
        projectId,
        data,
        timestamp: new Date().toISOString()
      };
      setEvents(prev => [event, ...prev].slice(0, 50));
      onCreate?.(data);
      onAnyEvent?.(event);
    });

    socket.on('github:delete', (data) => {
      console.log('📥 GitHub delete event:', data);
      const event: GitHubEvent = {
        type: 'delete',
        projectId,
        data,
        timestamp: new Date().toISOString()
      };
      setEvents(prev => [event, ...prev].slice(0, 50));
      onDelete?.(data);
      onAnyEvent?.(event);
    });

    socket.on('github:issue_comment', (data) => {
      console.log('📥 GitHub comment event:', data);
      const event: GitHubEvent = {
        type: 'issue_comment',
        projectId,
        data,
        timestamp: new Date().toISOString()
      };
      setEvents(prev => [event, ...prev].slice(0, 50));
      onComment?.(data);
      onAnyEvent?.(event);
    });

    // Cleanup
    return () => {
      socket.emit('leave:project:github', projectId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [projectId, onPush, onPullRequest, onIssue, onCreate, onDelete, onComment, onAnyEvent]);

  const clearEvents = () => {
    setEvents([]);
  };

  return {
    isConnected,
    events,
    clearEvents,
    socket: socketRef.current
  };
}

export default useGitHubSocket;
