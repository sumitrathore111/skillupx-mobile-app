import { motion } from 'framer-motion';
import {
  AlertCircle,
  BookmarkPlus,
  BookOpen,
  Check,
  Code2,
  ExternalLink,
  Heart,
  Mail,
  MessageCircle,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  Send,
  Share2,
  Star,
  Trash2,
  TrendingUp,
  X
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import CustomSelect from '../../Component/Global/CustomSelect';
import { useAuth } from '../../Context/AuthContext';
import { useDataContext } from '../../Context/UserDataContext';
import { apiRequest } from '../../service/api';
import { getSocket, initializeSocket } from '../../service/socketService';
import { approveJoinRequest, createStudyGroup, deleteStudyGroup, getAllStudyGroups, rejectJoinRequest, removeMember, requestJoinStudyGroup } from '../../service/studyGroupsService';
import type { DeveloperProfile } from '../../types/developerConnect';

// ============================================
// Frontend cache for INSTANT loading
// ============================================
interface CachedPageData {
  developers: DeveloperProfile[];
  studyGroups: any[];
  techReviews: any[];
  helpRequests: any[];
  timestamp: number;
}

let pageDataCache: CachedPageData | null = null;
const CACHE_TTL = 60 * 1000; // 60 seconds

// ============================================
// MESSAGE CACHE for instant chat loading
// ============================================
interface CachedChatData {
  chatId: string;
  messages: any[];
  timestamp: number;
}

// Cache: participantId -> chat data
const chatCache = new Map<string, CachedChatData>();
// Cache: participantId -> chatId (for quick lookup)
const chatIdCache = new Map<string, string>();
const MESSAGE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedChat(participantId: string): CachedChatData | null {
  const cached = chatCache.get(participantId);
  if (cached && Date.now() - cached.timestamp < MESSAGE_CACHE_TTL) {
    return cached;
  }
  chatCache.delete(participantId);
  return null;
}

function setCachedChat(participantId: string, chatId: string, messages: any[]): void {
  chatCache.set(participantId, { chatId, messages, timestamp: Date.now() });
  chatIdCache.set(participantId, chatId);
}

function updateCachedMessages(participantId: string, messages: any[]): void {
  const cached = chatCache.get(participantId);
  if (cached) {
    cached.messages = messages;
    cached.timestamp = Date.now();
  }
}

function addMessageToCache(participantId: string, message: any): void {
  const cached = chatCache.get(participantId);
  if (cached) {
    // Check if message already exists
    const exists = cached.messages.some(m => m.id === message.id);
    if (!exists) {
      cached.messages = [...cached.messages, message];
    }
  }
}

function getCachedPageData(): CachedPageData | null {
  if (pageDataCache && Date.now() - pageDataCache.timestamp < CACHE_TTL) {
    return pageDataCache;
  }
  pageDataCache = null;
  return null;
}

function setCachedPageData(data: Omit<CachedPageData, 'timestamp'>): void {
  pageDataCache = { ...data, timestamp: Date.now() };
}

// Helper function to format timestamps
const formatTimestamp = (timestamp: any): string => {
  if (!timestamp) return 'Unknown date';

  try {
    if (timestamp?.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleDateString();
    }
    if (timestamp?.seconds) {
      return new Date(timestamp.seconds * 1000).toLocaleDateString();
    }
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString();
    }
    return 'Unknown date';
  } catch {
    return 'Unknown date';
  }
};

// Helper function to format relative time (Instagram style)
const formatRelativeTime = (timestamp: any): string => {
  if (!timestamp) return '';

  try {
    let date: Date;
    if (timestamp?.toDate && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } else if (timestamp?.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else {
      date = new Date(timestamp);
    }

    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);

    if (diffSecs < 60) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    if (diffWeeks < 52) return `${diffWeeks}w`;
    return `${Math.floor(diffWeeks / 52)}y`;
  } catch {
    return '';
  }
};

// Helper function to get user avatar with proper fallback
const getUserAvatar = (userprofile: any, userId: string | undefined): string => {
  if (userprofile?.avatar && userprofile.avatar.trim() !== '' && userprofile.avatar.startsWith('http')) return userprofile.avatar;
  if (userprofile?.avatrUrl && userprofile.avatrUrl.trim() !== '' && userprofile.avatrUrl.startsWith('http')) return userprofile.avatrUrl;
  if (userprofile?.profilePic && userprofile.profilePic.trim() !== '' && userprofile.profilePic.startsWith('http')) return userprofile.profilePic;
  const seed = userprofile?.name?.replace(/\s+/g, '') || userId || 'default';
  return `https://api.dicebear.com/9.x/adventurer/svg?seed=${seed}`;
};

// Helper function to render text with clickable links
const renderMessageWithLinks = (text: string, isMe: boolean = false) => {
  if (!text) return null;

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className={`underline hover:opacity-80 break-all ${isMe ? 'text-cyan-100' : 'text-[#00ADB5]'}`}
          onClick={(e) => e.stopPropagation()}
          style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}
        >
          {part}
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

export default function DeveloperConnect() {
  const { user } = useAuth();
  const { userprofile } = useDataContext();

  const [activeTab, setActiveTab] = useState<'directory' | 'messages' | 'groups' | 'reviews'>('directory');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [lookingForFilter, setLookingForFilter] = useState('');
  const [sortBy, setSortBy] = useState<'rank' | 'newest' | 'roadmap' | 'codearena' | 'creator'>('rank');
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [developers, setDevelopers] = useState<DeveloperProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<any[]>([]);

  // Debounce search for performance
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 150);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery]);

  // Pagination
  const [displayLimit, setDisplayLimit] = useState(12);

  // Study Groups state
  const [studyGroups, setStudyGroups] = useState<any[]>([]);
  const [studyGroupSearch, setStudyGroupSearch] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupData, setNewGroupData] = useState({
    name: '',
    description: '',
    topic: '',
    level: 'Beginner' as const,
    maxMembers: 10
  });

  // Tech Reviews state
  const [techReviews, setTechReviews] = useState<any[]>([]);
  const [helpRequests, setHelpRequests] = useState<any[]>([]);
  const [showNewReviewModal, setShowNewReviewModal] = useState(false);
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [reviewsActiveTab, setReviewsActiveTab] = useState<'reviews' | 'requests'>('reviews');
  const [reviewSearch, setReviewSearch] = useState('');
  const [newReviewData, setNewReviewData] = useState({
    website: '',
    url: '',
    category: '',
    rating: 5,
    title: '',
    content: '',
    pros: '',
    cons: ''
  });
  const [newRequestData, setNewRequestData] = useState({
    title: '',
    description: '',
    tags: ''
  });
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const [expandedRequests, setExpandedRequests] = useState<Set<string>>(new Set());
  const [showShareModal, setShowShareModal] = useState(false);
  const [reviewToShare, setReviewToShare] = useState<any>(null);
  const [shareSearch, setShareSearch] = useState('');
  const [highlightedReviewId, setHighlightedReviewId] = useState<string | null>(null);

  const reviewCategories = ['Coding Practice', 'Web Development', 'Mobile Development', 'Data Science', 'DevOps', 'UI/UX', 'Algorithms', 'System Design', 'Interview Prep', 'Other'];

  // Group details state
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
  const [groupMessage, setGroupMessage] = useState('');
  const [groupMessages, setGroupMessages] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // WebSocket connection status
  const [socketConnected, setSocketConnected] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [messageStatus, setMessageStatus] = useState<Record<string, 'sent' | 'delivered' | 'read'>>({});
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    const reviewId = params.get('reviewId');

    if (tab === 'reviews') {
      setActiveTab('reviews');
      setReviewsActiveTab('reviews');

      if (reviewId) {
        setHighlightedReviewId(reviewId);
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  useEffect(() => {
    if (highlightedReviewId && techReviews.length > 0) {
      setTimeout(() => {
        const reviewElement = document.getElementById(`review-${highlightedReviewId}`);
        if (reviewElement) {
          reviewElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
      setTimeout(() => setHighlightedReviewId(null), 3000);
    }
  }, [highlightedReviewId, techReviews]);

  useEffect(() => {
    initializeSocket();
    const socket = getSocket();

    if (socket) {
      setSocketConnected(socket.connected);

      const handleConnect = () => {
        setSocketConnected(true);
        if (user?.id) {
          socket.emit('userOnline', { userId: user.id });
        }
      };

      const handleDisconnect = () => {
        setSocketConnected(false);
      };

      const handleOnlineUsers = (users: string[]) => {
        setOnlineUsers(new Set(users));
      };

      const handleUserOnline = (data: { userId: string }) => {
        setOnlineUsers(prev => new Set([...prev, data.userId]));
      };

      const handleUserOffline = (data: { userId: string }) => {
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.userId);
          return newSet;
        });
      };

      const handleTyping = (data: { chatId: string; userId: string; userName: string }) => {
        if (data.chatId === chatId && data.userId !== user?.id) {
          setTypingUser(data.userName);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 3000);
        }
      };

      const handleStopTyping = (data: { chatId: string; userId: string }) => {
        if (data.chatId === chatId && data.userId !== user?.id) {
          setTypingUser(null);
        }
      };

      const handleMessageRead = (data: { messageId: string; readBy: string }) => {
        if (data.readBy !== user?.id) {
          setMessageStatus(prev => ({ ...prev, [data.messageId]: 'read' }));
        }
      };

      const handleMessageDeleted = (data: { messageId: string; chatId: string }) => {
        if (data.chatId === chatId) {
          setMessages(prev => prev.filter(m => m.id !== data.messageId));
        }
      };

      const handleMessageEdited = (data: { messageId: string; chatId: string; message: string }) => {
        if (data.chatId === chatId) {
          setMessages(prev => prev.map(m =>
            m.id === data.messageId ? { ...m, message: data.message, text: data.message, content: data.message, isEdited: true } : m
          ));
        }
      };

      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      socket.on('userTyping', handleTyping);
      socket.on('userStopTyping', handleStopTyping);
      socket.on('messageRead', handleMessageRead);
      socket.on('messageDeleted', handleMessageDeleted);
      socket.on('messageEdited', handleMessageEdited);
      socket.on('onlineUsers', handleOnlineUsers);
      socket.on('userOnline', handleUserOnline);
      socket.on('userOffline', handleUserOffline);

      // Global handler for new messages - updates conversations and unread badges
      const handleGlobalNewMessage = (payload: any) => {
        if (!payload || !user?.id) return;

        // Determine the other participant's ID
        const otherParticipantId = payload.senderId === user.id
          ? payload.recipientId || payload.participantId
          : payload.senderId;

        if (!otherParticipantId) return;

        // Update conversations list with new message - move to top
        setConversations(prev => {
          const existingIndex = prev.findIndex(c => c.participantId === otherParticipantId);
          const messageText = payload.message || payload.text || payload.content || '';
          const timestamp = payload.createdAt || payload.timestamp || new Date().toISOString();

          if (existingIndex >= 0) {
            // Update existing conversation and move to top
            const updated = [...prev];
            const [conversation] = updated.splice(existingIndex, 1);
            updated.unshift({
              ...conversation,
              lastMessage: messageText,
              lastMessageAt: timestamp
            });
            return updated;
          } else if (payload.senderId !== user.id) {
            // New conversation from someone else
            return [{
              participantId: otherParticipantId,
              participantName: payload.senderName || 'User',
              participantAvatar: payload.senderAvatar || `https://api.dicebear.com/9.x/adventurer/svg?seed=${payload.senderName?.replace(/\s+/g, '') || 'User'}`,
              lastMessage: messageText,
              lastMessageAt: timestamp
            }, ...prev];
          }
          return prev;
        });

        // Update unread count if message is from someone else and not in current chat
        if (payload.senderId !== user.id && otherParticipantId !== selectedChat) {
          setUnreadCounts(prev => ({
            ...prev,
            [otherParticipantId]: (prev[otherParticipantId] || 0) + 1
          }));
        }
      };

      socket.on('newMessage', handleGlobalNewMessage);

      socket.emit('getOnlineUsers');

      return () => {
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
        socket.off('userTyping', handleTyping);
        socket.off('userStopTyping', handleStopTyping);
        socket.off('messageRead', handleMessageRead);
        socket.off('messageDeleted', handleMessageDeleted);
        socket.off('messageEdited', handleMessageEdited);
        socket.off('onlineUsers', handleOnlineUsers);
        socket.off('userOnline', handleUserOnline);
        socket.off('userOffline', handleUserOffline);
        socket.off('newMessage', handleGlobalNewMessage);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      };
    }
  }, [chatId, user?.id, selectedChat]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const cached = getCachedPageData();
        if (cached) {
          setDevelopers(cached.developers);
          setStudyGroups(cached.studyGroups);
          setTechReviews(cached.techReviews);
          setHelpRequests(cached.helpRequests);
          setLoading(false);
          refreshDataInBackground();
          return;
        }

        setLoading(true);
        setError(null);

        const data = await apiRequest('/developers/init/page-data');

        setDevelopers(data.developers || []);
        setStudyGroups(data.studyGroups || []);
        setTechReviews(data.techReviews || []);
        setHelpRequests(data.helpRequests || []);

        setCachedPageData({
          developers: data.developers || [],
          studyGroups: data.studyGroups || [],
          techReviews: data.techReviews || [],
          helpRequests: data.helpRequests || []
        });

        if (!data.developers || data.developers.length === 0) {
          setError('No developers found. The community is waiting for you!');
        }
      } catch (err) {
        console.error('Error loading Developer Connect data:', err);
        try {
          const [developersData, groupsData, reviewsData, requestsData] = await Promise.all([
            apiRequest('/developers').catch(() => []),
            apiRequest('/study-groups').catch(() => ({ groups: [] })),
            apiRequest('/developers/tech-reviews').catch(() => ({ reviews: [] })),
            apiRequest('/developers/help-requests').catch(() => ({ requests: [] }))
          ]);

          const devs = developersData || [];
          const groups = groupsData.groups || [];
          const reviews = reviewsData.reviews || [];
          const requests = requestsData.requests || [];

          setDevelopers(devs);
          setStudyGroups(groups);
          setTechReviews(reviews);
          setHelpRequests(requests);

          setCachedPageData({
            developers: devs,
            studyGroups: groups,
            techReviews: reviews,
            helpRequests: requests
          });
        } catch {
          setError('Failed to load developers: ' + (err instanceof Error ? err.message : String(err)));
        }
      } finally {
        setLoading(false);
      }
    };

    const refreshDataInBackground = async () => {
      try {
        const data = await apiRequest('/developers/init/page-data');
        setDevelopers(data.developers || []);
        setStudyGroups(data.studyGroups || []);
        setTechReviews(data.techReviews || []);
        setHelpRequests(data.helpRequests || []);
        setCachedPageData({
          developers: data.developers || [],
          studyGroups: data.studyGroups || [],
          techReviews: data.techReviews || [],
          helpRequests: data.helpRequests || []
        });
      } catch {
        // Silently ignore background refresh errors
      }
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    if (!selectedChat || !user) {
      setMessages([]);
      setChatId(null);
      return;
    }

    let isMounted = true;
    let currentChatId: string | null = null;

    const setupChat = async () => {
      // INSTANT LOAD: Check cache first
      const cachedChat = getCachedChat(selectedChat);
      if (cachedChat) {
        // Show cached data instantly - no loading state!
        setChatId(cachedChat.chatId);
        setMessages(cachedChat.messages);
        currentChatId = cachedChat.chatId;

        // Setup socket with cached chatId immediately
        try {
          initializeSocket();
          const socket = getSocket();
          if (socket) {
            socket.emit('join-chat', cachedChat.chatId);
            setupSocketHandler(socket, cachedChat.chatId, isMounted);
          }
        } catch (e) {
          console.warn('Socket init failed:', e);
        }

        // Refresh messages in background (no loading indicator)
        apiRequest(`/chats/${cachedChat.chatId}/messages`)
          .then(freshMessages => {
            if (isMounted) {
              setMessages(freshMessages);
              updateCachedMessages(selectedChat, freshMessages);
            }
          })
          .catch(() => {/* ignore background refresh errors */});

        return;
      }

      // No cache - show loading state
      setLoadingMessages(true);

      try {
        const selectedDev = developers.find(d => d.userId === selectedChat);
        if (!selectedDev) {
          setLoadingMessages(false);
          return;
        }

        const chat = await apiRequest('/chats', {
          method: 'POST',
          body: JSON.stringify({
            participantIds: [user.id, selectedChat],
            participantNames: [userprofile?.displayName || user.name || 'User', selectedDev.name],
            participantAvatars: [userprofile?.avatrUrl || '', selectedDev.avatar]
          })
        });

        if (!isMounted) return;
        setChatId(chat.id);
        currentChatId = chat.id;

        const loadedMessages = await apiRequest(`/chats/${chat.id}/messages`);
        if (isMounted) {
          setMessages(loadedMessages);
          // Cache for instant loading next time
          setCachedChat(selectedChat, chat.id, loadedMessages);
        }
        setLoadingMessages(false);

        try {
          initializeSocket();
          const socket = getSocket();
          if (socket) {
            socket.emit('join-chat', chat.id);
            setupSocketHandler(socket, chat.id, isMounted);
          }
        } catch (e) {
          console.warn('Socket init failed, falling back to polling:', e);
        }

      } catch (error) {
        console.error('Error setting up chat:', error);
        if (isMounted) {
          setLoadingMessages(false);
        }
      }
    };

    // Helper function to setup socket message handler
    const setupSocketHandler = (socket: any, chatIdForSocket: string, mounted: boolean) => {
      const messageHandler = (payload: any) => {
        if (payload.chatId === chatIdForSocket && mounted) {
          if (payload.senderId === user?.id) {
            setMessages(prev => {
              const existsById = prev.some(m => m.id === payload.id);
              if (existsById) return prev;
              const tempIndex = prev.findIndex(m =>
                m.id?.startsWith('temp-') &&
                m.senderId === payload.senderId &&
                (m.message === payload.message || m.text === payload.message)
              );
              if (tempIndex !== -1) {
                const updated = [...prev];
                updated[tempIndex] = payload;
                return updated;
              }
              return prev;
            });
            return;
          }
          setMessages(prev => {
            const exists = prev.some(m => m.id === payload.id);
            if (exists) return prev;
            // Also update cache with new message
            addMessageToCache(selectedChat, payload);
            return [...prev, payload];
          });
        }
      };

      socket.on('newMessage', messageHandler);
      (socket as any)._chatMessageHandler = messageHandler;
    };

    setupChat();

    return () => {
      isMounted = false;
      try {
        const socket = getSocket();
        if (socket && socket.connected && currentChatId) {
          socket.emit('leave-chat', currentChatId);
          const handler = (socket as any)._chatMessageHandler;
          if (handler) {
            socket.off('newMessage', handler);
          }
          delete (socket as any)._chatMessageHandler;
        }
      } catch {
        // ignore cleanup errors
      }
    };
  }, [selectedChat, user?.id, developers, userprofile]);

  // Load unread counts immediately on mount for badge display
  useEffect(() => {
    if (!user) return;

    const loadUnreadCounts = async () => {
      try {
        const chats = await apiRequest('/chats');
        const initialUnreadCounts: Record<string, number> = {};
        (chats || []).forEach((chat: any) => {
          if (chat.unreadCount && chat.unreadCount > 0) {
            initialUnreadCounts[chat.participantId] = chat.unreadCount;
          }
        });
        setUnreadCounts(initialUnreadCounts);
      } catch (err) {
        console.warn('Could not load unread counts:', err);
      }
    };

    loadUnreadCounts();
  }, [user?.id]);

  useEffect(() => {
    if (!user || activeTab !== 'messages') {
      setConversations([]);
      return;
    }

    const loadConversations = async () => {
      try {
        const chats = await apiRequest('/chats');
        const formattedConversations = (chats || []).map((chat: any) => ({
          participantId: chat.participantId,
          participantName: chat.participantName,
          participantAvatar: chat.participantAvatar || `https://api.dicebear.com/9.x/adventurer/svg?seed=${chat.participantName?.replace(/\s+/g, '')}`,
          lastMessage: chat.lastMessage,
          lastMessageAt: chat.lastMessageAt,
          chatId: chat.id // Store chatId for caching
        }));
        setConversations(formattedConversations);

        // Cache chat IDs for instant loading
        (chats || []).forEach((chat: any) => {
          if (chat.id && chat.participantId) {
            // Only cache chatId mapping, not full messages yet
            chatIdCache.set(chat.participantId, chat.id);
          }
        });

        // Preload messages for first 3 conversations in background (for instant switching)
        const chatsToPreload = (chats || []).slice(0, 3);
        chatsToPreload.forEach(async (chat: any) => {
          if (chat.id && chat.participantId && !getCachedChat(chat.participantId)) {
            try {
              const messages = await apiRequest(`/chats/${chat.id}/messages`);
              setCachedChat(chat.participantId, chat.id, messages);
            } catch {
              // Ignore preload errors
            }
          }
        });

        // Also update unread counts when loading conversations
        const initialUnreadCounts: Record<string, number> = {};
        (chats || []).forEach((chat: any) => {
          if (chat.unreadCount && chat.unreadCount > 0) {
            initialUnreadCounts[chat.participantId] = chat.unreadCount;
          }
        });
        setUnreadCounts(prev => ({ ...prev, ...initialUnreadCounts }));
      } catch (err) {
        console.warn('Could not load conversations yet:', err);
        setConversations([]);
      }
    };

    loadConversations();
  }, [user?.id, activeTab]);

  useEffect(() => {
    if (!user) return;

    try {
      initializeSocket();
      const socket = getSocket();
      if (!socket) return;

      socket.emit('join-user', user.id);

      const handleJoinRequest = (data: any) => {
        if (selectedGroup && selectedGroup.id === data.groupId) {
          setSelectedGroup((prev: any) => {
            if (!prev) return prev;
            const existingRequests = prev.joinRequests || [];
            if (existingRequests.some((r: any) => r.userId === data.request.userId)) {
              return prev;
            }
            return {
              ...prev,
              joinRequests: [...existingRequests, data.request]
            };
          });
        }
        toast.success(`${data.request.userName} requested to join your group!`);
      };

      const handleRequestApproved = (data: any) => {
        toast.success(`You've been approved to join ${data.groupName}!`);
        if (data.group) {
          setStudyGroups(prev => prev.map(g => g.id === data.groupId ? data.group : g));
          if (selectedGroup && selectedGroup.id === data.groupId) {
            setSelectedGroup(data.group);
          }
        }
      };

      const handleRequestRejected = (data: any) => {
        toast.error(`Your request to join ${data.groupName} was rejected.`);
        if (selectedGroup && selectedGroup.id === data.groupId) {
          setSelectedGroup((prev: any) => {
            if (!prev) return prev;
            return {
              ...prev,
              joinRequests: prev.joinRequests?.filter((r: any) => r.userId !== user.id) || []
            };
          });
        }
      };

      const handleMemberJoined = (data: any) => {
        toast.success(`${data.member.name} has joined the group!`);
        if (data.group) {
          setStudyGroups(prev => prev.map(g => g.id === data.groupId ? data.group : g));
          if (selectedGroup && selectedGroup.id === data.groupId) {
            setSelectedGroup(data.group);
          }
        }
      };

      const handleRemovedFromGroup = (data: any) => {
        toast.error(`You've been removed from ${data.groupName}`);
        if (selectedGroup && selectedGroup.id === data.groupId) {
          setSelectedGroup(null);
        }
        setStudyGroups(prev => prev.filter(g => g.id !== data.groupId));
      };

      const handleMemberRemoved = (data: any) => {
        if (data.group) {
          setStudyGroups(prev => prev.map(g => g.id === data.groupId ? data.group : g));
          if (selectedGroup && selectedGroup.id === data.groupId) {
            setSelectedGroup(data.group);
          }
        }
      };

      const handleGroupUpdated = (data: any) => {
        if (data.group) {
          setStudyGroups(prev => prev.map(g => g.id === data.groupId ? data.group : g));
          if (selectedGroup && selectedGroup.id === data.groupId) {
            setSelectedGroup(data.group);
          }
        }
      };

      socket.on('joinRequest', handleJoinRequest);
      socket.on('requestApproved', handleRequestApproved);
      socket.on('requestRejected', handleRequestRejected);
      socket.on('memberJoined', handleMemberJoined);
      socket.on('removedFromGroup', handleRemovedFromGroup);
      socket.on('memberRemoved', handleMemberRemoved);
      socket.on('groupUpdated', handleGroupUpdated);

      return () => {
        socket.emit('leave-user', user.id);
        socket.off('joinRequest', handleJoinRequest);
        socket.off('requestApproved', handleRequestApproved);
        socket.off('requestRejected', handleRequestRejected);
        socket.off('memberJoined', handleMemberJoined);
        socket.off('removedFromGroup', handleRemovedFromGroup);
        socket.off('memberRemoved', handleMemberRemoved);
        socket.off('groupUpdated', handleGroupUpdated);
      };
    } catch (error) {
      console.warn('Socket initialization failed for study groups:', error);
    }
  }, [user?.id, selectedGroup?.id]);

  useEffect(() => {
    if (!selectedGroup || !user) return;

    try {
      const socket = getSocket();
      if (socket) {
        socket.emit('join-group', selectedGroup.id);
      }

      return () => {
        if (socket) {
          socket.emit('leave-group', selectedGroup.id);
        }
      };
    } catch (error) {
      console.warn('Could not join group socket room:', error);
    }
  }, [selectedGroup?.id, user]);

  useEffect(() => {
    if (!selectedGroup || !user) {
      setGroupMessages([]);
      return;
    }

    const loadGroupMessages = async () => {
      try {
        const response = await apiRequest(`/study-groups/${selectedGroup.id}/messages`);
        setGroupMessages(response.messages || []);
      } catch (err) {
        console.warn('Could not load group messages:', err);
        setGroupMessages([]);
      }
    };

    loadGroupMessages();

    try {
      const socket = getSocket();
      if (socket) {
        const handleNewGroupMessage = (data: any) => {
          if (data.groupId === selectedGroup.id && data.message) {
            setGroupMessages(prev => {
              if (prev.some(m => m.id === data.message.id)) {
                return prev;
              }
              return [...prev, data.message];
            });
          }
        };

        socket.on('newGroupMessage', handleNewGroupMessage);

        return () => {
          socket.off('newGroupMessage', handleNewGroupMessage);
        };
      }
    } catch (error) {
      console.warn('Socket not available for group messages:', error);
    }
  }, [selectedGroup?.id, user]);

  const filteredDevelopers = useMemo(() => {
    const queryLower = debouncedSearch.toLowerCase();
    const filtered = developers.filter(dev => {
      const devSkills = dev.skills || [];
      const devLookingFor = dev.lookingFor || '';
      const devInstitute = dev.institute || '';

      const matchesSearch = !debouncedSearch ||
        (dev.name || '').toLowerCase().includes(queryLower) ||
        (dev.username || '').toLowerCase().includes(queryLower) ||
        devSkills.some(s => s.toLowerCase().includes(queryLower)) ||
        devInstitute.toLowerCase().includes(queryLower);
      const matchesSkills = selectedSkills.length === 0 ||
        selectedSkills.some(s => devSkills.includes(s));
      const matchesLookingFor = !lookingForFilter || devLookingFor.includes(lookingForFilter);

      return matchesSearch && matchesSkills && matchesLookingFor;
    });

    switch (sortBy) {
      case 'rank':
        filtered.sort((a, b) => (a.combinedRank || 999) - (b.combinedRank || 999));
        break;
      case 'roadmap':
        filtered.sort((a, b) => (b.roadmapTopicsCompleted || 0) - (a.roadmapTopicsCompleted || 0));
        break;
      case 'codearena':
        filtered.sort((a, b) => (b.challenges_solved || 0) - (a.challenges_solved || 0));
        break;
      case 'creator':
        filtered.sort((a, b) => (b.creatorTasksCompleted || 0) - (a.creatorTasksCompleted || 0));
        break;
      case 'newest':
      default:
        break;
    }

    return filtered;
  }, [developers, debouncedSearch, selectedSkills, lookingForFilter, sortBy]);

  const displayedDevelopers = useMemo(() =>
    filteredDevelopers.slice(0, displayLimit),
    [filteredDevelopers, displayLimit]
  );

  const canLoadMore = filteredDevelopers.length > displayLimit;

  const allSkills = ['React', 'Node.js', 'Python', 'Java', 'MongoDB', 'TypeScript', 'AWS', 'Machine Learning'];

  const renderDirectory = () => {
    if (loading) {
      return (
        <div className="space-y-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700 animate-pulse">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gray-300 dark:bg-gray-700 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded mb-2 w-1/2" />
                  <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/3" />
                </div>
              </div>
              <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded mb-4" />
              <div className="flex gap-2">
                <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded flex-1" />
                <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded flex-1" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-8 border border-red-200 dark:border-red-800">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-300 mb-2">Unable to Load Developers</h3>
              <p className="text-red-700 dark:text-red-400">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (developers.length === 0) {
      return (
        <div className="bg-white dark:bg-gray-900 rounded-xl p-12 border border-gray-200 dark:border-gray-700 text-center">
          <Code2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Developers Yet</h3>
          <p className="text-gray-600 dark:text-white mb-6">Developers who complete their profiles will appear here. Invite your friends!</p>
          <button className="px-6 py-2 text-white rounded-lg transition-all shadow-lg hover:opacity-90" style={{ background: 'linear-gradient(135deg, #00ADB5 0%, #00d4ff 100%)' }}>
            Invite Friends
          </button>
        </div>
      );
    }

    return (
    <div className="space-y-6">
      {/* Search and Filters - Marketplace Style */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
            <input
              type="text"
              placeholder="Search developers by name or skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00ADB5] focus:bg-white dark:focus:bg-gray-600 transition-all"
            />
          </div>

            <CustomSelect
              value={selectedSkills.length > 0 ? selectedSkills[0] : ''}
              onChange={(value) => {
                if (value === '') {
                  setSelectedSkills([]);
                } else {
                  setSelectedSkills(prev =>
                    prev.includes(value)
                      ? prev.filter(s => s !== value)
                      : [value]
                  );
                }
              }}
              options={[
                { value: '', label: 'All Skills' },
                ...allSkills.map(skill => ({ value: skill, label: skill }))
              ]}
              className="w-full sm:min-w-[180px] sm:w-auto"
            />

            <CustomSelect
              value={lookingForFilter}
              onChange={(value) => setLookingForFilter(value)}
              options={[
                { value: '', label: 'Looking For' },
                { value: 'Teammates', label: 'Teammates' },
                { value: 'Mentoring', label: 'Mentoring' },
                { value: 'Both', label: 'Both' }
              ]}
              className="w-full sm:min-w-[180px] sm:w-auto"
            />

            <CustomSelect
              value={sortBy}
              onChange={(value) => setSortBy(value as 'rank' | 'newest' | 'roadmap' | 'codearena' | 'creator')}
              options={[
                { value: 'rank', label: '🏆 Top Ranked' },
                { value: 'roadmap', label: '📚 Roadmap Progress' },
                { value: 'codearena', label: '💻 CodeArena' },
                { value: 'creator', label: '🚀 Creator Corner' },
                { value: 'newest', label: '🆕 Newest' }
              ]}
              className="w-full sm:min-w-[180px] sm:w-auto"
            />
          </div>

          {selectedSkills.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {selectedSkills.map(skill => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium text-white"
                  style={{ background: 'linear-gradient(135deg, #00ADB5 0%, #00d4ff 100%)' }}
                >
                  {skill}
                  <button
                    onClick={() => setSelectedSkills(prev => prev.filter(s => s !== skill))}
                    className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                  >
                    ×
                  </button>
                </span>
              ))}
              <button
                onClick={() => setSelectedSkills([])}
                className="px-3 py-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-white">
          <p>Showing {displayedDevelopers.length} of {filteredDevelopers.length} developers</p>
          {filteredDevelopers.length !== developers.length && (
            <p>{developers.length} total in directory</p>
          )}
        </div>

      {/* Developer Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedDevelopers.map((dev, index) => (
          <motion.div
            key={dev.userId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`rounded-xl p-6 border hover:shadow-lg transition-shadow ${
              dev.isCurrentUser
                ? 'bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-300 dark:border-purple-600 ring-2 ring-purple-400 dark:ring-purple-500'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
            }`}
          >
            {/* Current User Badge */}
            {dev.isCurrentUser && (
              <div className="mb-3 -mt-2 -mx-2">
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/40 rounded-full">
                  ⭐ This is you
                </span>
              </div>
            )}
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3 flex-1">
                <img
                  src={dev.avatar || `https://api.dicebear.com/9.x/adventurer/svg?seed=${dev.name}`}
                  alt={dev.name || 'Developer'}
                  className={`w-12 h-12 rounded-full ${dev.isCurrentUser ? 'ring-2 ring-purple-400' : ''}`}
                />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{dev.name || 'Unknown'}</h3>
                  {dev.username && (
                    <p className="text-xs text-[#00ADB5] font-medium">@{dev.username}</p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-white">
                    {dev.institute || dev.college || 'Not specified'} • {
                      dev.yearOfStudy ?
                        (dev.yearOfStudy === 1 ? '1st Year' : dev.yearOfStudy === 2 ? '2nd Year' : dev.yearOfStudy === 3 ? '3rd Year' : dev.yearOfStudy === 4 ? '4th Year' : `${dev.yearOfStudy} Year`)
                        : (dev.year || 'Student')
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1" style={{ color: '#00ADB5' }}>
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-semibold">#{dev.combinedRank || 'N/A'}</span>
              </div>
            </div>

              <p className="text-sm text-gray-600 dark:text-white mb-4">{dev.bio || 'About yourself'}</p>

              <div className="rounded-lg p-3 mb-4" style={{ background: 'rgba(0, 173, 181, 0.1)' }}>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center">
                    <p className="text-gray-500 dark:text-gray-400">Roadmap</p>
                    <p className="font-bold text-gray-900 dark:text-white">{dev.roadmapTopicsCompleted || 0}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">topics</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500 dark:text-gray-400">CodeArena</p>
                    <p className="font-bold text-gray-900 dark:text-white">{dev.challenges_solved || 0}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">solved</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500 dark:text-gray-400">Creator</p>
                    <p className="font-bold text-gray-900 dark:text-white">{dev.creatorTasksCompleted || 0}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">tasks</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-semibold text-gray-700 dark:text-white mb-2">Skills</p>
                <div className="flex flex-wrap gap-1">
                  {(dev.skills || []).length > 0 ? (
                    <>
                      {(dev.skills || []).slice(0, 3).map((skill: string) => (
                        <span
                          key={skill}
                          className="text-xs px-2 py-1 rounded-full"
                          style={{ backgroundColor: 'rgba(0, 173, 181, 0.15)', color: '#00ADB5' }}
                        >
                          {skill}
                        </span>
                      ))}
                      {(dev.skills || []).length > 3 && (
                        <span className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white rounded-full">
                          +{(dev.skills || []).length - 3}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-sm text-gray-400 dark:text-gray-500">No skills added</span>
                  )}
                </div>
              </div>

              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">
                  {dev.lookingFor || 'Open to opportunities'}
                </p>
                <p className="text-xs text-green-600 dark:text-green-300 line-clamp-2">{dev.lookingForDetails || 'Looking to connect with other developers'}</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                {dev.isCurrentUser ? (
                  <button
                    onClick={() => toast.success('Check your profile in Profile section!')}
                    className="flex-1 px-3 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    ⭐ Your Profile
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedChat(dev.userId);
                      setActiveTab('messages');
                    }}
                    className="flex-1 px-3 py-2 text-white text-sm font-semibold rounded-lg transition-all shadow-md hover:opacity-90 flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #00ADB5 0%, #00d4ff 100%)' }}>
                    <MessageSquare className="w-4 h-4" />
                    Message
                  </button>
                )}
                <button
                  onClick={() => {
                    setActiveTab('reviews');
                    toast.success(`Check out reviews shared by the community!`);
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white text-sm font-semibold rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2">
                  <Star className="w-4 h-4" />
                  Reviews
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {canLoadMore && (
          <div className="text-center mt-8">
            <button
              onClick={() => setDisplayLimit(prev => prev + 12)}
              className="px-8 py-3 text-white rounded-lg transition-all shadow-lg hover:opacity-90 font-semibold"
              style={{ background: 'linear-gradient(135deg, #00ADB5 0%, #00d4ff 100%)' }}
            >
              Load More ({filteredDevelopers.length - displayLimit} remaining)
            </button>
          </div>
        )}

        {filteredDevelopers.length === 0 && (
          <div className="text-center py-12">
            <Code2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No developers found</h3>
            <p className="text-gray-600 dark:text-white">Try adjusting your filters</p>
          </div>
        )}
      </div>
    );
  };

  const renderMessages = () => {
    const selectedDev = selectedChat ? developers.find(d => d.userId === selectedChat) : null;

    const emitTyping = () => {
      const socket = getSocket();
      if (socket && chatId && user) {
        socket.emit('typing', {
          chatId,
          userId: user.id,
          userName: userprofile?.displayName || user.name || 'User'
        });
      }
    };

    const emitStopTyping = () => {
      const socket = getSocket();
      if (socket && chatId && user) {
        socket.emit('stopTyping', { chatId, userId: user.id });
      }
    };

    const markMessagesAsRead = () => {
      const socket = getSocket();
      if (socket && chatId && user) {
        const unreadMessages = messages.filter(m => m.senderId !== user.id && !m.isRead);
        unreadMessages.forEach(msg => {
          socket.emit('markAsRead', { messageId: msg.id, chatId, readBy: user.id });
        });
        if (selectedChat) {
          setUnreadCounts(prev => ({ ...prev, [selectedChat]: 0 }));
        }
      }
    };

    if (selectedChat && messages.length > 0 && chatId) {
      setTimeout(() => markMessagesAsRead(), 100);
    }

    const handleSendMessage = async () => {
      if (!newMessage.trim() || !user || !chatId) return;

      emitStopTyping();
      const messageContent = newMessage;
      const tempId = `temp-${Date.now()}`;
      setNewMessage('');

      setMessageStatus(prev => ({ ...prev, [tempId]: 'sent' }));

      const optimisticMessage = {
        id: tempId,
        senderId: user.id,
        senderName: userprofile?.displayName || userprofile?.name || user.name || 'User',
        senderAvatar: userprofile?.avatar || userprofile?.avatrUrl || '',
        message: messageContent,
        text: messageContent,
        createdAt: new Date().toISOString(),
        timestamp: new Date(),
        isRead: false
      };
      setMessages(prev => [...prev, optimisticMessage]);

      // Update cache with optimistic message
      if (selectedChat) {
        addMessageToCache(selectedChat, optimisticMessage);
      }

      // Update conversations list immediately when sending
      if (selectedChat) {
        setConversations(prev => {
          const idx = prev.findIndex(c => c.participantId === selectedChat);
          if (idx >= 0) {
            const updated = [...prev];
            const [conv] = updated.splice(idx, 1);
            updated.unshift({
              ...conv,
              lastMessage: messageContent,
              lastMessageAt: new Date().toISOString()
            });
            return updated;
          }
          return prev;
        });
      }

      try {
        const response = await apiRequest(`/chats/${chatId}/messages`, {
          method: 'POST',
          body: JSON.stringify({
            senderId: user.id,
            senderName: userprofile?.displayName || userprofile?.name || user.name || 'User',
            senderAvatar: userprofile?.avatar || userprofile?.avatrUrl || '',
            message: messageContent,
          }),
        });

        if (response?.id) {
          setMessages(prev => prev.map(m =>
            m.id === tempId ? { ...m, id: response.id } : m
          ));
          setMessageStatus(prev => {
            const newStatus = { ...prev };
            delete newStatus[tempId];
            newStatus[response.id] = 'delivered';
            return newStatus;
          });
        }
      } catch (error) {
        console.error('Error sending message:', error);
        setNewMessage(messageContent);
        setMessages(prev => prev.filter(m => m.id !== tempId));
        toast.error('Failed to send message. Please try again.');
      }
    };

    const handleEditMessage = async (messageId: string) => {
      if (!editingText.trim() || !chatId) return;
      try {
        await apiRequest(`/chats/${chatId}/messages/${messageId}`, {
          method: 'PATCH',
          body: JSON.stringify({ message: editingText.trim() }),
        });
        setMessages(prev => prev.map(m =>
          m.id === messageId ? { ...m, message: editingText.trim(), text: editingText.trim(), content: editingText.trim(), isEdited: true } : m
        ));
        setEditingMessageId(null);
        setEditingText('');
        toast.success('Message updated');
      } catch (error) {
        console.error('Error editing message:', error);
        toast.error('Failed to edit message');
      }
    };

    const handleDeleteMessage = async (messageId: string) => {
      if (!chatId || !confirm('Delete this message?')) return;
      try {
        await apiRequest(`/chats/${chatId}/messages/${messageId}`, {
          method: 'DELETE',
        });
        setMessages(prev => prev.filter(m => m.id !== messageId));
        toast.success('Message deleted');
      } catch (error) {
        console.error('Error deleting message:', error);
        toast.error('Failed to delete message');
      }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setNewMessage(e.target.value);
      if (e.target.value.trim()) {
        emitTyping();
      } else {
        emitStopTyping();
      }
    };

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px] lg:h-[650px]">
        {/* Left Side - Users/Conversations List - Hidden on mobile when chat is selected */}
        <div className={`lg:col-span-1 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col shadow-lg ${selectedChat ? 'hidden lg:flex' : 'flex'}`}>
          {/* Header with gradient */}
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-cyan-50/50 via-white to-cyan-50/50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-base">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #00ADB5 0%, #00d4ff 100%)' }}>
                    <MessageSquare className="w-4 h-4 text-white" />
                  </div>
                  Chats
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-10">{conversations.length} active</p>
              </div>
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold ${
                  socketConnected
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                }`}
              >
                <motion.div
                  animate={{ scale: socketConnected ? [1, 1.4, 1] : 1 }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}
                />
                {socketConnected ? 'Live' : 'Offline'}
              </motion.div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00ADB5]/10 to-[#00ADB5]/5 dark:from-[#00ADB5]/20 dark:to-[#00ADB5]/10 border border-[#00ADB5]/20 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8 text-[#00ADB5]" />
                </div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No conversations yet</p>
                <p className="text-xs mt-2 text-gray-500 dark:text-gray-400">Visit Developer Directory to start chatting</p>
              </div>
            ) : (
              conversations.map(conv => (
                <motion.button
                  key={conv.participantId}
                  whileHover={{ x: 4, backgroundColor: 'rgba(0,173,181,0.05)' }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setSelectedChat(conv.participantId)}
                  className={`w-full p-4 transition-all text-left relative overflow-hidden ${
                    selectedChat === conv.participantId
                      ? 'bg-gradient-to-r from-[#00ADB5]/10 to-transparent dark:from-[#00ADB5]/15 dark:to-transparent'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  {selectedChat === conv.participantId && (
                    <motion.div
                      layoutId="selectedConv"
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full"
                      style={{ background: 'linear-gradient(180deg, #00ADB5 0%, #00d4ff 100%)' }}
                    />
                  )}
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={conv.participantAvatar}
                        alt={conv.participantName}
                        className={`w-12 h-12 rounded-full shadow-md transition-all ${
                          selectedChat === conv.participantId
                            ? 'ring-2 ring-[#00ADB5] ring-offset-2 dark:ring-offset-gray-800'
                            : 'ring-1 ring-gray-200 dark:ring-gray-600'
                        }`}
                      />
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-800 ${
                        onlineUsers.has(conv.participantId) ? 'bg-emerald-500' : 'bg-gray-400 dark:bg-gray-500'
                      }`}></div>
                      {unreadCounts[conv.participantId] > 0 && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg"
                          style={{ background: 'linear-gradient(135deg, #00ADB5 0%, #00d4ff 100%)' }}
                        >
                          {unreadCounts[conv.participantId] > 9 ? '9+' : unreadCounts[conv.participantId]}
                        </motion.div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className={`font-semibold truncate text-sm ${
                          unreadCounts[conv.participantId] > 0
                            ? 'text-gray-900 dark:text-white font-bold'
                            : selectedChat === conv.participantId
                              ? 'text-[#00ADB5]'
                              : 'text-gray-900 dark:text-white'
                        }`}>{conv.participantName}</p>
                        {conv.lastMessageAt && (
                          <span className={`text-[10px] flex-shrink-0 ml-2 ${
                            unreadCounts[conv.participantId] > 0
                              ? 'text-[#00ADB5] font-semibold'
                              : 'text-gray-400 dark:text-gray-500'
                          }`}>
                            {new Date(conv.lastMessageAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                      <p className={`text-xs truncate flex items-center gap-1 ${
                        unreadCounts[conv.participantId] > 0
                          ? 'text-gray-700 dark:text-gray-200 font-medium'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {conv.lastMessage || <span className="italic text-gray-400">Start a conversation...</span>}
                      </p>
                    </div>
                  </div>
                </motion.button>
              ))
            )}
          </div>
        </div>

        {/* Right Side - Chat Area - Full width on mobile when chat selected, hidden otherwise on mobile */}
        <div className={`lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 flex flex-col shadow-lg overflow-hidden ${selectedChat ? 'flex' : 'hidden lg:flex'}`}>
          {!selectedChat || !selectedDev ? (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-cyan-50/30 via-white to-cyan-50/30 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800">
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, type: 'spring' }}
                className="text-center p-8 max-w-md"
              >
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                  className="w-28 h-28 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl"
                  style={{
                    background: 'linear-gradient(135deg, #00ADB5 0%, #00d4ff 50%, #00ADB5 100%)',
                    backgroundSize: '200% 200%'
                  }}
                >
                  <MessageSquare className="w-14 h-14 text-white" />
                </motion.div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Start a Conversation</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                  Select a developer from the list to connect and collaborate in real-time
                </p>
                <div className="flex items-center justify-center gap-4 text-sm text-gray-400 dark:text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                    Real-time chat
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-[#00ADB5] rounded-full"></span>
                    Instant delivery
                  </div>
                </div>
              </motion.div>
            </div>
          ) : (
            <>
              {/* Chat Header - Enhanced */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedChat(null)}
                      className="lg:hidden p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <div className="relative">
                      <img src={selectedDev.avatar} alt={selectedDev.name} className="w-10 h-10 lg:w-11 lg:h-11 rounded-full ring-2 ring-[#00ADB5] ring-offset-2 dark:ring-offset-gray-800 shadow-md" />
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-800 ${
                        onlineUsers.has(selectedDev.userId) ? 'bg-emerald-500' : 'bg-gray-400 dark:bg-gray-500'
                      }`}></div>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white text-base">{selectedDev.name}</h3>
                      {selectedDev.username && !typingUser && (
                        <p className="text-xs text-[#00ADB5] font-medium">@{selectedDev.username}</p>
                      )}
                      {typingUser ? (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-xs text-[#00ADB5] font-medium flex items-center gap-1"
                        >
                          <span className="flex gap-0.5">
                            <motion.span animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-1 h-1 bg-[#00ADB5] rounded-full" />
                            <motion.span animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1 h-1 bg-[#00ADB5] rounded-full" />
                            <motion.span animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1 h-1 bg-[#00ADB5] rounded-full" />
                          </span>
                          typing...
                        </motion.p>
                      ) : (
                        <p className={`text-xs flex items-center gap-1 ${
                          onlineUsers.has(selectedDev.userId)
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${onlineUsers.has(selectedDev.userId) ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                          {onlineUsers.has(selectedDev.userId) ? 'Online' : 'Offline'}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm ${
                    socketConnected
                      ? 'bg-emerald-50/80 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700'
                      : 'bg-amber-50/80 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700'
                  }`}>
                    <motion.div
                      animate={{ scale: socketConnected ? [1, 1.3, 1] : 1 }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}
                    />
                    <span className={`${socketConnected ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {socketConnected ? 'Live' : 'Connecting'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 sm:space-y-4 bg-gray-50 dark:bg-gray-900">
                {loadingMessages ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full">
                    <div className="relative">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 dark:border-gray-700" style={{ borderTopColor: '#00ADB5' }}></div>
                      <MessageSquare className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 text-cyan-500" />
                    </div>
                    <div className="text-gray-500 text-sm mt-4">Loading messages...</div>
                  </motion.div>
                ) : messages.length === 0 ? (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center h-full">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#00ADB5]/20 to-[#00ADB5]/10 dark:from-[#00ADB5]/20 dark:to-[#00ADB5]/10 flex items-center justify-center mb-4 border border-[#00ADB5]/20">
                      <span className="text-4xl">👋</span>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Start the conversation!</h4>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Say hello to {selectedDev?.name || 'your new connection'}</p>
                  </motion.div>
                ) : (
                  <>
                    <div className="flex items-center justify-center mb-4">
                      <div className="px-3 py-1 bg-white dark:bg-gray-900 rounded-full text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 shadow-sm">
                        {messages[0]?.createdAt
                          ? new Date(messages[0].createdAt).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
                          : 'Today'}
                      </div>
                    </div>
                    {messages.map((msg) => {
                      const isMe = msg.senderId === user?.id || msg.senderId === user?.id?.toString() || msg.userId === user?.id;
                      const status = messageStatus[msg.id] || (msg.isRead ? 'read' : 'delivered');
                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 15, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ duration: 0.25, type: 'spring', stiffness: 400, damping: 25 }}
                          className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                          {!isMe && (
                            <img
                              src={msg.senderAvatar || `https://api.dicebear.com/9.x/adventurer/svg?seed=${msg.senderName?.replace(/\s+/g, '') || 'User'}`}
                              alt={msg.senderName || 'User'}
                              className="w-8 h-8 rounded-full flex-shrink-0 mr-2 shadow-md ring-2 ring-white dark:ring-gray-800"
                            />
                          )}

                          <div className={`max-w-[70%] ${isMe ? 'mr-2' : ''} relative group`}>
                            {editingMessageId === msg.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={editingText}
                                  onChange={(e) => setEditingText(e.target.value)}
                                  className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-900 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00ADB5]"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleEditMessage(msg.id);
                                    if (e.key === 'Escape') { setEditingMessageId(null); setEditingText(''); }
                                  }}
                                />
                                <button onClick={() => handleEditMessage(msg.id)} className="p-1.5 bg-[#00ADB5] text-white rounded-full hover:bg-[#00969d]">
                                  <Check className="w-4 h-4" />
                                </button>
                                <button onClick={() => { setEditingMessageId(null); setEditingText(''); }} className="p-1.5 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-full hover:bg-gray-400">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <motion.div
                                  whileHover={{ scale: 1.01, y: -1 }}
                                  className={`px-4 py-2.5 overflow-hidden ${
                                    isMe
                                      ? 'rounded-2xl rounded-tr-md text-white'
                                      : 'rounded-2xl rounded-tl-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-100 dark:border-gray-600'
                                  }`}
                                  style={isMe ? {
                                    background: 'linear-gradient(135deg, #00ADB5 0%, #00d4ff 100%)',
                                    boxShadow: '0 4px 20px rgba(0, 173, 181, 0.25)'
                                  } : {
                                    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)'
                                  }}
                                >
                                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{renderMessageWithLinks(msg.message || msg.content || msg.text, isMe)}</p>
                                  {msg.isEdited && <p className={`text-[10px] mt-1 ${isMe ? 'text-cyan-100' : 'text-gray-400'}`}>(edited)</p>}
                                  <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : ''}`}>
                                    <p className={`text-[10px] ${isMe ? 'text-cyan-100' : 'text-gray-400'}`}>
                                      {msg.createdAt
                                        ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                        : new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                    {isMe && (
                                      <span className="text-[10px] text-cyan-100 ml-1">
                                        {status === 'read' ? (
                                          <span title="Read">✓✓</span>
                                        ) : status === 'delivered' ? (
                                          <span title="Delivered" className="opacity-70">✓✓</span>
                                        ) : (
                                          <span title="Sent" className="opacity-50">✓</span>
                                        )}
                                      </span>
                                    )}
                                  </div>
                                </motion.div>

                                {isMe && !msg.id.startsWith('temp-') && (
                                  <div className="absolute -left-16 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                    <button
                                      onClick={() => { setEditingMessageId(msg.id); setEditingText(msg.message || msg.content || msg.text || ''); }}
                                      className="p-1.5 bg-gray-200 dark:bg-gray-700 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
                                      title="Edit"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteMessage(msg.id)}
                                      className="p-1.5 bg-gray-200 dark:bg-gray-700 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-600 dark:text-gray-300 hover:text-red-500"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>

                          {isMe && (
                            <img
                              src={userprofile?.avatar || `https://api.dicebear.com/9.x/adventurer/svg?seed=${user?.name?.replace(/\s+/g, '') || 'Me'}`}
                              alt="Me"
                              className="w-8 h-8 rounded-full flex-shrink-0 ml-2 shadow-md ring-2 ring-white dark:ring-gray-800"
                            />
                          )}
                        </motion.div>
                      );
                    })}
                    <div ref={messagesEndRef} />

                    {typingUser && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2 pl-10"
                      >
                        <div className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-md shadow-sm">
                          <div className="flex items-center gap-1">
                            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-2 h-2 bg-[#00ADB5] rounded-full" />
                            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-2 h-2 bg-[#00ADB5] rounded-full" />
                            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-2 h-2 bg-[#00ADB5] rounded-full" />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </>
                )}
              </div>

              {/* Message Input - Premium Design */}
              <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                {/* Typing indicator above input */}
                {newMessage.trim() && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="text-[11px] text-[#00ADB5] mb-2 ml-2 hidden sm:block"
                  >
                    Press Enter to send
                  </motion.p>
                )}
                <div className="flex gap-2 sm:gap-3 items-center bg-gray-50 dark:bg-gray-900 rounded-2xl p-1.5 sm:p-2 shadow-sm border border-gray-200 dark:border-gray-700 transition-all focus-within:border-[#00ADB5] focus-within:ring-2 focus-within:ring-[#00ADB5]/20">
                  <button className="hidden sm:flex p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={handleInputChange}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newMessage.trim()) {
                        handleSendMessage();
                      }
                    }}
                    onBlur={() => emitStopTyping()}
                    className="flex-1 px-2 py-2 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none text-sm"
                  />
                  <button className="hidden sm:flex p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className={`p-2.5 rounded-xl transition-all ${
                      newMessage.trim()
                        ? 'text-white shadow-lg'
                        : 'text-gray-400 bg-gray-100 dark:bg-gray-900'
                    }`}
                    style={newMessage.trim() ? {
                      background: 'linear-gradient(135deg, #00ADB5 0%, #00d4ff 100%)',
                      boxShadow: '0 4px 12px rgba(0, 173, 181, 0.4)'
                    } : {}}
                  >
                    <Send className="w-5 h-5" />
                  </motion.button>
                </div>
                <div className="hidden sm:flex items-center justify-center gap-2 mt-2">
                  {socketConnected ? (
                    <p className="text-[10px] text-gray-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                      Real-time messaging active
                    </p>
                  ) : (
                    <p className="text-[10px] text-amber-500 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                      Connecting to real-time...
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderGroups = () => {
    if (selectedGroup) {
      const isMember = selectedGroup.members?.some((m: any) => m.userId === user?.id);
      const isAdmin = selectedGroup.members?.some((m: any) => m.userId === user?.id && (m.role === 'admin' || m.role === 'creator'));
      const hasPendingRequest = selectedGroup.joinRequests?.some((r: any) => r.userId === user?.id && r.status === 'pending');

      return (
        <div className="space-y-6">
          <button
            onClick={() => setSelectedGroup(null)}
            className="font-semibold flex items-center gap-2 transition-colors"
            style={{ color: '#00ADB5' }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            ← Back to Groups
          </button>

          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{selectedGroup.name}</h2>
                <p className="text-gray-600 dark:text-white">{selectedGroup.description}</p>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full ${
                selectedGroup.level === 'Beginner' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                selectedGroup.level === 'Intermediate' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {selectedGroup.level}
              </span>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <span className="text-sm px-3 py-1 rounded-full" style={{ backgroundColor: 'rgba(0, 173, 181, 0.15)', color: '#00ADB5' }}>
                {selectedGroup.topic}
              </span>
              <span className="text-sm text-gray-600 dark:text-white">
                {selectedGroup.members?.length || 0} / {selectedGroup.maxMembers} members
              </span>
            </div>

            {/* Pending Join Requests - Only visible to owner/admin */}
            {isAdmin && selectedGroup.joinRequests?.length > 0 && (
              <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Pending Join Requests ({selectedGroup.joinRequests.length})
                </h3>
                <div className="space-y-3">
                  {selectedGroup.joinRequests.map((request: any) => (
                    <div key={request.userId} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded-lg">
                      <img
                        src={request.userAvatar || `https://api.dicebear.com/9.x/adventurer/svg?seed=${request.userName}`}
                        alt={request.userName}
                        className="w-10 h-10 rounded-full"
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">{request.userName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Requested {new Date(request.requestedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            try {
                              const updatedGroup = await approveJoinRequest(selectedGroup.id, request.userId);
                              setSelectedGroup(updatedGroup);
                              const groups = await getAllStudyGroups();
                              setStudyGroups(groups);
                              toast.success(`${request.userName} has been approved!`);
                            } catch (error: any) {
                              toast.error(error?.message || 'Failed to approve request');
                            }
                          }}
                          className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                          title="Approve"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              const updatedGroup = await rejectJoinRequest(selectedGroup.id, request.userId);
                              setSelectedGroup(updatedGroup);
                              toast.success(`Request from ${request.userName} has been rejected`);
                            } catch (error: any) {
                              toast.error(error?.message || 'Failed to reject request');
                            }
                          }}
                          className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                          title="Reject"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ✅ CHANGED: Members - Compact Avatar Row (replaces old grid layout) */}
            <div className="mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  👥 {selectedGroup.members?.length || 0} Members:
                </span>
                <div className="flex items-center flex-wrap gap-1">
                  {selectedGroup.members?.map((member: any) => (
                    <div key={member.userId} className="relative group/member flex-shrink-0">
                      <div className="relative">
                        <img
                          src={member.avatar || `https://api.dicebear.com/9.x/adventurer/svg?seed=${member.name}`}
                          alt={member.name}
                          className={`w-8 h-8 rounded-full border-2 transition-transform group-hover/member:scale-110 ${
                            member.role === 'creator' ? 'border-yellow-400' :
                            member.role === 'admin' ? 'border-blue-400' :
                            'border-white dark:border-gray-700'
                          }`}
                          title={`${member.name}${member.role === 'creator' ? ' (Creator)' : member.role === 'admin' ? ' (Admin)' : ''}`}
                        />
                        {(member.role === 'creator' || member.role === 'admin') && (
                          <span className="absolute -top-1 -right-1 text-[10px] leading-none">
                            {member.role === 'creator' ? '👑' : '⭐'}
                          </span>
                        )}
                      </div>
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover/member:opacity-100 transition-opacity pointer-events-none z-10">
                        {member.name}
                        {member.role === 'creator' ? ' · Creator' : member.role === 'admin' ? ' · Admin' : ''}
                      </div>
                      {/* Remove button for admin - appears on hover */}
                      {isAdmin && member.role !== 'creator' && member.userId !== user?.id && (
                        <button
                          onClick={async () => {
                            if (window.confirm(`Remove ${member.name} from the group?`)) {
                              try {
                                const updatedGroup = await removeMember(selectedGroup.id, member.userId);
                                setSelectedGroup(updatedGroup);
                                const groups = await getAllStudyGroups();
                                setStudyGroups(groups);
                                toast.success(`${member.name} has been removed`);
                              } catch (error: any) {
                                toast.error(error?.message || 'Failed to remove member');
                              }
                            }
                          }}
                          className="absolute -top-1 -left-1 w-4 h-4 bg-red-500 text-white rounded-full opacity-0 group-hover/member:opacity-100 transition-opacity flex items-center justify-center text-[10px] leading-none z-10"
                          title="Remove member"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {isMember ? (
              <>
                {/* Group Chat */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Group Discussion
                  </h3>

                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4 h-[480px] overflow-y-auto">
                    {groupMessages.length === 0 ? (
                      <p className="text-gray-500 text-center text-sm py-8">No messages yet. Start the conversation!</p>
                    ) : (
                      <div className="space-y-3">
                        {groupMessages.map((msg: any, idx: number) => (
                          <div key={msg.id || idx} className="flex gap-2">
                            <img
                              src={msg.avatar || msg.senderAvatar || `https://api.dicebear.com/9.x/adventurer/svg?seed=${msg.name || msg.senderName}`}
                              alt={msg.name || msg.senderName}
                              className="w-8 h-8 rounded-full flex-shrink-0"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-sm text-gray-900 dark:text-white">{msg.name || msg.senderName}</span>
                                <span className="text-xs text-gray-400">
                                  {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'now'}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 dark:text-white">{msg.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={groupMessage}
                      onChange={(e) => setGroupMessage(e.target.value)}
                      onKeyPress={async (e) => {
                        if (e.key === 'Enter' && groupMessage.trim()) {
                          const messageText = groupMessage.trim();
                          const senderName = userprofile?.displayName || userprofile?.name || user?.name || 'User';
                          const senderAvatar = userprofile?.avatar || userprofile?.avatrUrl || '';
                          const tempId = `temp-${Date.now()}`;

                          const optimisticMsg = {
                            id: tempId,
                            name: senderName,
                            senderName,
                            avatar: senderAvatar,
                            senderAvatar,
                            message: messageText,
                            timestamp: new Date().toISOString()
                          };
                          setGroupMessages(prev => [...prev, optimisticMsg]);
                          setGroupMessage('');

                          try {
                            const response = await apiRequest(`/study-groups/${selectedGroup.id}/messages`, {
                              method: 'POST',
                              body: JSON.stringify({ message: messageText, senderName, senderAvatar })
                            });

                            if (response.message) {
                              setGroupMessages(prev => prev.map(m =>
                                m.id === tempId ? response.message : m
                              ));
                            }
                          } catch (error) {
                            console.error('Error sending group message:', error);
                            setGroupMessages(prev => prev.filter(m => m.id !== tempId));
                            setGroupMessage(messageText);
                            toast.error('Failed to send message');
                          }
                        }
                      }}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    />
                    <button
                      onClick={async () => {
                        if (groupMessage.trim()) {
                          const messageText = groupMessage.trim();
                          const senderName = userprofile?.displayName || userprofile?.name || user?.name || 'User';
                          const senderAvatar = userprofile?.avatar || userprofile?.avatrUrl || '';
                          const tempId = `temp-${Date.now()}`;

                          const optimisticMsg = {
                            id: tempId,
                            name: senderName,
                            senderName,
                            avatar: senderAvatar,
                            senderAvatar,
                            message: messageText,
                            timestamp: new Date().toISOString()
                          };
                          setGroupMessages(prev => [...prev, optimisticMsg]);
                          setGroupMessage('');

                          try {
                            const response = await apiRequest(`/study-groups/${selectedGroup.id}/messages`, {
                              method: 'POST',
                              body: JSON.stringify({ message: messageText, senderName, senderAvatar })
                            });

                            if (response.message) {
                              setGroupMessages(prev => prev.map(m =>
                                m.id === tempId ? response.message : m
                              ));
                            }
                          } catch (error) {
                            console.error('Error sending group message:', error);
                            setGroupMessages(prev => prev.filter(m => m.id !== tempId));
                            setGroupMessage(messageText);
                            toast.error('Failed to send message');
                          }
                        }
                      }}
                      className="px-4 py-2 text-white rounded-lg transition-all shadow-md hover:opacity-90"
                      style={{ background: 'linear-gradient(135deg, #00ADB5 0%, #00d4ff 100%)' }}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>


              </>
            ) : (
              <div className="text-center py-8 border-t border-gray-200 dark:border-gray-700">
                {hasPendingRequest ? (
                  <>
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                      <AlertCircle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <p className="text-gray-600 dark:text-white mb-2 font-semibold">Request Pending</p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Waiting for the group owner to approve your request</p>
                  </>
                ) : (
                  <>
                    <p className="text-gray-600 dark:text-white mb-4">Request to join this group and get approval from the owner</p>
                    <button
                      onClick={async () => {
                        if (user) {
                          try {
                            const userName = userprofile?.displayName || user.name || 'User';
                            const userAvatar = userprofile?.avatrUrl || '';
                            const response = await requestJoinStudyGroup(selectedGroup.id, userName, userAvatar);

                            if (response.group) {
                              setSelectedGroup(response.group);
                              const groups = await getAllStudyGroups();
                              setStudyGroups(groups);
                            }
                            toast.success(response.message || 'Join request sent! Waiting for approval.');
                          } catch (error: any) {
                            console.error('Error requesting to join group:', error);
                            toast.error(error?.message || 'Failed to send join request. Please try again.');
                          }
                        }
                      }}
                      disabled={selectedGroup.members?.length >= selectedGroup.maxMembers}
                      className="px-6 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:opacity-90"
                      style={{ background: 'linear-gradient(135deg, #00ADB5 0%, #00d4ff 100%)' }}
                    >
                      Request to Join
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    // Group list view
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Study Groups</h3>

          <div className="relative flex-1 max-w-md mx-0 sm:mx-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={studyGroupSearch}
              onChange={(e) => setStudyGroupSearch(e.target.value)}
              placeholder="Search groups..."
              className="w-full pl-10 pr-10 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
            />
            {studyGroupSearch && (
              <button
                onClick={() => setStudyGroupSearch('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowCreateGroup(true)}
            className="px-4 py-2 text-white rounded-lg transition-all shadow-lg hover:opacity-90 flex items-center gap-2 whitespace-nowrap"
            style={{ background: 'linear-gradient(135deg, #00ADB5 0%, #00d4ff 100%)' }}>
            <Plus className="w-5 h-5" />
            Create Group
          </button>
        </div>

        {/* Create Group Modal */}
        {showCreateGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4">Create Study Group</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-white mb-1">Group Name</label>
                  <input
                    type="text"
                    value={newGroupData.name}
                    onChange={(e) => setNewGroupData({...newGroupData, name: e.target.value})}
                    placeholder="DSA Interview Prep"
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-white mb-1">Description</label>
                  <textarea
                    value={newGroupData.description}
                    onChange={(e) => setNewGroupData({...newGroupData, description: e.target.value})}
                    placeholder="Daily DSA practice and mock interviews"
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-white mb-1">Topic</label>
                  <select
                    value={newGroupData.topic}
                    onChange={(e) => setNewGroupData({...newGroupData, topic: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                  >
                    <option value="">Select Topic</option>
                    <option value="DSA">Data Structures & Algorithms</option>
                    <option value="Web Dev">Web Development</option>
                    <option value="Mobile">Mobile Development</option>
                    <option value="AI/ML">AI & Machine Learning</option>
                    <option value="System Design">System Design</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-white mb-1">Level</label>
                  <select
                    value={newGroupData.level}
                    onChange={(e) => setNewGroupData({...newGroupData, level: e.target.value as any})}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-white mb-1">Max Members</label>
                  <input
                    type="number"
                    value={newGroupData.maxMembers}
                    onChange={(e) => setNewGroupData({...newGroupData, maxMembers: parseInt(e.target.value)})}
                    min="2"
                    max="50"
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={async () => {
                    if (newGroupData.name && newGroupData.topic && user) {
                      try {
                        const newGroup = await createStudyGroup({
                          ...newGroupData,
                          creatorId: user.id,
                          creatorName: userprofile?.displayName || userprofile?.name || user.name || 'User',
                          creatorAvatar: userprofile?.avatar || userprofile?.avatrUrl || '',
                          members: [{
                            userId: user.id,
                            name: userprofile?.displayName || userprofile?.name || user.name || 'User',
                            avatar: userprofile?.avatar || userprofile?.avatrUrl || '',
                            joinedAt: new Date(),
                            role: 'creator' as const
                          }]
                        });

                        if (newGroup) {
                          setStudyGroups(prev => [newGroup, ...prev]);
                        }

                        const groups = await getAllStudyGroups();
                        if (groups && groups.length > 0) {
                          setStudyGroups(groups);
                        }

                        setShowCreateGroup(false);
                        setNewGroupData({name: '', description: '', topic: '', level: 'Beginner', maxMembers: 10});
                        toast.success('Study group created successfully!');
                      } catch (error) {
                        console.error('Error creating group:', error);
                        toast.error('Failed to create group. Please try again.');
                      }
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Create Group
                </button>
                <button
                  onClick={() => setShowCreateGroup(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Study Groups Grid */}
        {(() => {
          const searchTerm = studyGroupSearch.trim().toLowerCase();
          const filteredGroups = searchTerm
            ? studyGroups.filter(group =>
                (group.name || '').toLowerCase().includes(searchTerm) ||
                (group.topic || '').toLowerCase().includes(searchTerm) ||
                (group.description || '').toLowerCase().includes(searchTerm) ||
                (group.creatorName || '').toLowerCase().includes(searchTerm)
              )
            : studyGroups;

          if (filteredGroups.length === 0) {
            return (
              <div className="bg-white dark:bg-gray-900 rounded-xl p-12 border border-gray-200 dark:border-gray-700 text-center">
                <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {studyGroupSearch ? 'No Groups Found' : 'No Study Groups Yet'}
                </h3>
                <p className="text-gray-600 dark:text-white mb-6">
                  {studyGroupSearch
                    ? `No groups matching "${studyGroupSearch}"`
                    : 'Create or join a study group to learn together'}
                </p>
                {!studyGroupSearch && (
                  <button
                    onClick={() => setShowCreateGroup(true)}
                    className="px-6 py-2 text-white rounded-lg transition-all shadow-lg hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #00ADB5 0%, #00d4ff 100%)' }}>
                    Create First Group
                  </button>
                )}
              </div>
            );
          }

          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredGroups.map((group) => (
            <div key={group.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-1">{group.name}</h4>
                  <p className="text-xs text-gray-500 dark:text-white">by {group.creatorName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    group.level === 'Beginner' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    group.level === 'Intermediate' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {group.level}
                  </span>
                  {group.creatorId === user?.id && (
                    <button
                      onClick={async () => {
                        if (window.confirm('Are you sure you want to delete this study group?')) {
                          try {
                            await deleteStudyGroup(group.id);
                            const groups = await getAllStudyGroups();
                            setStudyGroups(groups);
                          } catch (error) {
                            console.error('Error deleting group:', error);
                            alert('Failed to delete group. Please try again.');
                          }
                        }
                      }}
                      className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      title="Delete group"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

                  <p className="text-sm text-gray-600 dark:text-white mb-4 line-clamp-2">{group.description}</p>

                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'rgba(0, 173, 181, 0.15)', color: '#00ADB5' }}>
                      {group.topic}
                    </span>
                  </div>

                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-700 dark:text-white mb-2">Members ({group.members?.length || 0})</p>
                    <div className="flex items-center gap-1">
                      {group.members?.slice(0, 5).map((member: any, idx: number) => (
                        <img
                          key={member.userId}
                          src={member.avatar || `https://api.dicebear.com/9.x/adventurer/svg?seed=${member.name}`}
                          alt={member.name}
                          className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800"
                          title={member.name}
                          style={{ marginLeft: idx > 0 ? '-8px' : '0' }}
                        />
                      ))}
                      {(group.members?.length || 0) > 5 && (
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-white" style={{ marginLeft: '-8px' }}>
                          +{(group.members?.length || 0) - 5}
                        </div>
                      )}
                      {(!group.members || group.members.length === 0) && (
                        <p className="text-xs text-gray-500">No members yet</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-600 dark:text-white mb-4">
                    <span>{group.members?.length || 0} / {group.maxMembers} members</span>
                    <span className="text-gray-400">Created {formatTimestamp(group.createdAt)}</span>
                  </div>

                  <button
                    onClick={() => setSelectedGroup(group)}
                    className="w-full px-4 py-2 text-white rounded-lg transition-all text-sm font-semibold shadow-md hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #00ADB5 0%, #00d4ff 100%)' }}
                  >
                    View Details
                  </button>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    );
  };

  const handleSubmitReview = async () => {
    if (!newReviewData.website || !newReviewData.title || !newReviewData.content) {
      toast.error('Please fill in required fields (Website, Title, Review)');
      return;
    }

    try {
      const avatarUrl = getUserAvatar(userprofile, user?.id);

      const reviewPayload = {
        userId: user?.id,
        userName: userprofile?.displayName || user?.name || 'Anonymous',
        userAvatar: avatarUrl,
        userLevel: userprofile?.level || 'Student',
        website: newReviewData.website,
        url: newReviewData.url,
        category: newReviewData.category,
        rating: newReviewData.rating,
        title: newReviewData.title,
        content: newReviewData.content,
        pros: newReviewData.pros.split(',').map(p => p.trim()).filter(Boolean),
        cons: newReviewData.cons.split(',').map(c => c.trim()).filter(Boolean),
        timestamp: new Date().toISOString(),
        likes: 0,
        helpful: 0
      };

      const response = await apiRequest('/developers/tech-reviews', {
        method: 'POST',
        body: JSON.stringify(reviewPayload)
      });

      if (response.review) {
        setTechReviews(prev => [response.review, ...prev]);
      } else {
        setTechReviews(prev => [{ ...reviewPayload, id: `temp-${Date.now()}` }, ...prev]);
      }

      setShowNewReviewModal(false);
      setNewReviewData({ website: '', url: '', category: '', rating: 5, title: '', content: '', pros: '', cons: '' });
      toast.success('Review posted successfully!');
    } catch (error) {
      console.error('Error posting review:', error);
      toast.error('Failed to post review. Please try again.');
    }
  };

  const handleSubmitRequest = async () => {
    if (!newRequestData.title || !newRequestData.description) {
      toast.error('Please fill in title and description');
      return;
    }

    try {
      const requestPayload = {
        userId: user?.id,
        userName: userprofile?.displayName || user?.name || 'Anonymous',
        userAvatar: getUserAvatar(userprofile, user?.id),
        title: newRequestData.title,
        description: newRequestData.description,
        tags: newRequestData.tags.split(',').map(t => t.trim()).filter(Boolean),
        timestamp: new Date().toISOString(),
        responses: 0
      };

      const response = await apiRequest('/developers/help-requests', {
        method: 'POST',
        body: JSON.stringify(requestPayload)
      });

      if (response.request) {
        setHelpRequests(prev => [response.request, ...prev]);
      } else {
        setHelpRequests(prev => [{ ...requestPayload, id: `temp-${Date.now()}` }, ...prev]);
      }

      setShowNewRequestModal(false);
      setNewRequestData({ title: '', description: '', tags: '' });
      toast.success('Help request posted successfully!');
    } catch (error) {
      console.error('Error posting request:', error);
      toast.error('Failed to post request. Please try again.');
    }
  };

  const handleLikeReview = async (reviewId: string) => {
    try {
      const response = await apiRequest(`/developers/tech-reviews/${reviewId}/like`, { method: 'POST' });
      setTechReviews(prev => prev.map(r =>
        r.id === reviewId
          ? {
              ...r,
              likes: response.likes,
              likedBy: response.liked
                ? [...(r.likedBy || []), user?.id]
                : (r.likedBy || []).filter((id: string) => id !== user?.id)
            }
          : r
      ));
    } catch (error) {
      console.error('Error liking review:', error);
    }
  };

  const handleMarkHelpful = async (reviewId: string) => {
    try {
      await apiRequest(`/developers/tech-reviews/${reviewId}/helpful`, { method: 'POST' });
      setTechReviews(prev => prev.map(r => r.id === reviewId ? { ...r, helpful: (r.helpful || 0) + 1 } : r));
      toast.success('Marked as helpful!');
    } catch (error) {
      console.error('Error marking helpful:', error);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    try {
      await apiRequest(`/developers/tech-reviews/${reviewId}`, { method: 'DELETE' });
      setTechReviews(prev => prev.filter(r => r.id !== reviewId));
      toast.success('Review deleted successfully');
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error('Failed to delete review');
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (!window.confirm('Are you sure you want to delete this request?')) return;
    try {
      await apiRequest(`/developers/help-requests/${requestId}`, { method: 'DELETE' });
      setHelpRequests(prev => prev.filter(r => r.id !== requestId));
      toast.success('Request deleted successfully');
    } catch (error) {
      console.error('Error deleting request:', error);
      toast.error('Failed to delete request');
    }
  };

  const handleSubmitReply = async () => {
    if (!replyText.trim() || !selectedRequest) {
      toast.error('Please enter your reply');
      return;
    }

    try {
      const replyData = {
        content: replyText,
        userName: userprofile?.displayName || user?.name || 'Anonymous',
        userAvatar: getUserAvatar(userprofile, user?.id)
      };

      const response = await apiRequest(`/developers/help-requests/${selectedRequest.id}/respond`, {
        method: 'POST',
        body: JSON.stringify(replyData)
      });

      setHelpRequests(prev => prev.map(r =>
        r.id === selectedRequest.id
          ? {
              ...r,
              responses: response.responses || (r.responses || 0) + 1,
              replies: response.replies || [...(r.replies || []), response.reply]
            }
          : r
      ));

      setSelectedRequest((prev: any) => prev ? {
        ...prev,
        responses: response.responses || (prev.responses || 0) + 1,
        replies: response.replies || [...(prev.replies || []), response.reply]
      } : null);

      setReplyText('');
      toast.success('Reply sent successfully!');
    } catch (error) {
      console.error('Error submitting reply:', error);
      toast.error('Failed to send reply');
    }
  };

  const fetchReplies = async (requestId: string) => {
    try {
      const response = await apiRequest(`/developers/help-requests/${requestId}/replies`);
      return response.replies || [];
    } catch (error) {
      console.error('Error fetching replies:', error);
      return [];
    }
  };

  const filteredReviews = techReviews.filter(review =>
    review.website?.toLowerCase().includes(reviewSearch.toLowerCase()) ||
    review.title?.toLowerCase().includes(reviewSearch.toLowerCase()) ||
    review.category?.toLowerCase().includes(reviewSearch.toLowerCase())
  );

  const filteredRequests = helpRequests.filter(request =>
    request.title?.toLowerCase().includes(reviewSearch.toLowerCase()) ||
    request.description?.toLowerCase().includes(reviewSearch.toLowerCase()) ||
    request.tags?.some((tag: string) => tag.toLowerCase().includes(reviewSearch.toLowerCase()))
  );

  const renderTechReviews = () => (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: 'linear-gradient(135deg, #00ADB5 0%, #00d4ff 100%)' }}>
            <BookmarkPlus className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Tech Reviews</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Share & discover the best learning resources</p>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowNewReviewModal(true)}
            className="flex-1 sm:flex-none px-4 py-2 text-white rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity font-semibold"
            style={{ background: 'linear-gradient(135deg, #00ADB5 0%, #00d4ff 100%)' }}
          >
            <Plus className="w-4 h-4" />
            Post Review
          </button>
          <button
            onClick={() => setShowNewRequestModal(true)}
            className="flex-1 sm:flex-none px-4 py-2 border-2 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-semibold"
            style={{ borderColor: '#00ADB5', color: '#00ADB5' }}
          >
            <Plus className="w-4 h-4" />
            Ask for Help
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
        <input
          type="text"
          placeholder="Search reviews, websites, categories..."
          value={reviewSearch}
          onChange={(e) => setReviewSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2"
          style={{ '--tw-ring-color': '#00ADB5' } as any}
        />
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-1 flex gap-2">
        <button
          onClick={() => setReviewsActiveTab('reviews')}
          className={`flex-1 py-2 px-4 rounded-md transition-colors font-semibold ${
            reviewsActiveTab === 'reviews'
              ? 'text-white'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          style={reviewsActiveTab === 'reviews' ? { background: 'linear-gradient(135deg, #00ADB5 0%, #00d4ff 100%)' } : {}}
        >
          <Star className="w-4 h-4 inline mr-2" />
          Reviews ({filteredReviews.length})
        </button>
        <button
          onClick={() => setReviewsActiveTab('requests')}
          className={`flex-1 py-2 px-4 rounded-md transition-colors font-semibold ${
            reviewsActiveTab === 'requests'
              ? 'text-white'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          style={reviewsActiveTab === 'requests' ? { background: 'linear-gradient(135deg, #00ADB5 0%, #00d4ff 100%)' } : {}}
        >
          <MessageCircle className="w-4 h-4 inline mr-2" />
          Help Requests ({filteredRequests.length})
        </button>
      </div>

      {reviewsActiveTab === 'reviews' && (
        <div className="space-y-4">
          {filteredReviews.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-xl p-12 text-center border border-gray-200 dark:border-gray-700">
              <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No reviews yet</h4>
              <p className="text-gray-500 dark:text-gray-400 mb-4">Be the first to share a learning resource!</p>
              <button
                onClick={() => setShowNewReviewModal(true)}
                className="px-6 py-2 text-white rounded-lg font-semibold"
                style={{ background: 'linear-gradient(135deg, #00ADB5 0%, #00d4ff 100%)' }}
              >
                Post First Review
              </button>
            </div>
          ) : (
            filteredReviews.map(review => (
              <motion.div
                key={review.id}
                id={`review-${review.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white dark:bg-gray-900 rounded-xl p-6 border hover:shadow-lg transition-all ${
                  highlightedReviewId === review.id
                    ? 'border-[#00ADB5] ring-2 ring-[#00ADB5] shadow-lg shadow-[#00ADB5]/20'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-start gap-4">
                  <img
                    src={review.userAvatar || `https://api.dicebear.com/9.x/adventurer/svg?seed=${review.userId}`}
                    alt={review.userName}
                    className="w-12 h-12 rounded-full flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="font-semibold text-gray-900 dark:text-white">{review.userName}</span>
                      <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'rgba(0, 173, 181, 0.15)', color: '#00ADB5' }}>
                        {review.userLevel || 'Student'}
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="text-sm text-gray-500">{formatTimestamp(review.timestamp)}</span>
                    </div>

                    <div className="mt-2">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h4 className="text-lg font-bold" style={{ color: '#00ADB5' }}>{review.website}</h4>
                        {review.url && (
                          <a
                            href={review.url.startsWith('http') ? review.url : `https://${review.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-blue-500"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        {review.category && (
                          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded ml-auto">
                            {review.category}
                          </span>
                        )}
                      </div>

                      <div className="flex gap-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${i < (review.rating || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>

                      <h5 className="font-semibold text-gray-900 dark:text-white mb-2">{review.title}</h5>
                      <p className="text-gray-700 dark:text-gray-300 mb-3">{review.content}</p>

                      {((review.pros && review.pros.length > 0) || (review.cons && review.cons.length > 0)) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                          {review.pros && review.pros.length > 0 && (
                            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                              <h6 className="text-sm font-semibold text-green-800 dark:text-green-400 mb-2">Pros</h6>
                              <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                                {review.pros.map((pro: string, i: number) => (
                                  <li key={i}>✓ {pro}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {review.cons && review.cons.length > 0 && (
                            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                              <h6 className="text-sm font-semibold text-red-800 dark:text-red-400 mb-2">Cons</h6>
                              <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                                {review.cons.map((con: string, i: number) => (
                                  <li key={i}>✗ {con}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-6 text-gray-500 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <button
                          onClick={() => handleLikeReview(review.id)}
                          className={`flex items-center gap-2 transition-colors ${(review.likedBy || []).includes(user?.id) ? 'text-red-500' : 'hover:text-red-500'}`}
                        >
                          <Heart className={`w-5 h-5 ${(review.likedBy || []).includes(user?.id) ? 'fill-red-500' : ''}`} />
                          <span className="text-sm">{review.likes || 0}</span>
                        </button>

                        <button
                          onClick={() => handleMarkHelpful(review.id)}
                          className="flex items-center gap-2 hover:text-green-500 transition-colors"
                        >
                          <TrendingUp className="w-5 h-5" />
                          <span className="text-sm">{review.helpful || 0} helpful</span>
                        </button>
                        <div className="flex items-center gap-2 ml-auto">
                          <button
                            onClick={() => {
                              setReviewToShare(review);
                              setShowShareModal(true);
                            }}
                            className="flex items-center gap-2 hover:text-purple-500 transition-colors"
                            title="Share to message"
                          >
                            <Share2 className="w-5 h-5" />
                          </button>
                          {review.userId === user?.id && (
                            <button
                              onClick={() => handleDeleteReview(review.id)}
                              className="flex items-center gap-2 hover:text-red-500 transition-colors"
                              title="Delete your review"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {reviewsActiveTab === 'requests' && (
        <div className="space-y-4">
          {filteredRequests.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-xl p-12 text-center border border-gray-200 dark:border-gray-700">
              <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No help requests yet</h4>
              <p className="text-gray-500 dark:text-gray-400 mb-4">Need recommendations? Ask the community!</p>
              <button
                onClick={() => setShowNewRequestModal(true)}
                className="px-6 py-2 text-white rounded-lg font-semibold"
                style={{ background: 'linear-gradient(135deg, #00ADB5 0%, #00d4ff 100%)' }}
              >
                Ask for Help
              </button>
            </div>
          ) : (
            filteredRequests.map(request => {
              const allReplies = request.replies || [];
              const isExpanded = expandedRequests.has(request.id);
              const displayReplies = isExpanded ? allReplies : [];
              const totalReplies = allReplies.length || request.responses || 0;
              const hasMoreReplies = totalReplies > 0;

              return (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      <button
                        onClick={() => {
                          setSearchQuery(request.userName || '');
                          setActiveTab('directory');
                        }}
                        className="flex-shrink-0 group"
                        title={`View ${request.userName}'s profile`}
                      >
                        <img
                          src={request.userAvatar || `https://api.dicebear.com/9.x/adventurer/svg?seed=${request.userId}`}
                          alt={request.userName}
                          className="w-12 h-12 rounded-full ring-2 ring-transparent group-hover:ring-[#00ADB5] transition-all cursor-pointer"
                        />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <button
                            onClick={() => {
                              setSearchQuery(request.userName || '');
                              setActiveTab('directory');
                            }}
                            className="font-semibold text-gray-900 dark:text-white hover:text-[#00ADB5] dark:hover:text-[#00ADB5] transition-colors cursor-pointer"
                            title={`View ${request.userName}'s profile`}
                          >
                            {request.userName}
                          </button>
                          <span className="text-gray-400">•</span>
                          <span className="text-sm text-gray-500">{formatTimestamp(request.timestamp)}</span>
                        </div>

                        <h4 className="font-bold text-lg text-gray-900 dark:text-white mb-2">{request.title}</h4>
                        <p className="text-gray-700 dark:text-gray-300 mb-3">{request.description}</p>

                        {request.tags && request.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {request.tags.map((tag: string, i: number) => (
                              <span
                                key={i}
                                className="text-xs px-3 py-1 rounded-full"
                                style={{ backgroundColor: 'rgba(0, 173, 181, 0.15)', color: '#00ADB5' }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-sm">
                          {request.userId === user?.id && (
                            <button
                              onClick={() => handleDeleteRequest(request.id)}
                              className="flex items-center gap-2 text-gray-500 hover:text-red-500 transition-colors ml-auto"
                              title="Delete your request"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 dark:border-gray-700/50">
                    {totalReplies > 0 && (
                      <div className="px-4 pb-2">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {totalReplies} {totalReplies === 1 ? 'response' : 'responses'}
                        </span>
                      </div>
                    )}

                    {hasMoreReplies && !isExpanded && (
                      <button
                        onClick={async () => {
                          const replies = await fetchReplies(request.id);
                          setHelpRequests(prev => prev.map(r =>
                            r.id === request.id ? { ...r, replies } : r
                          ));
                          setExpandedRequests(prev => new Set([...prev, request.id]));
                        }}
                        className="px-4 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-[#00ADB5] transition-colors"
                      >
                        View all {totalReplies} responses
                      </button>
                    )}

                    {displayReplies.length > 0 && (
                      <div className="px-4 py-2 space-y-3">
                        {displayReplies.map((reply: any, index: number) => (
                          <div
                            key={reply.id || index}
                            className="group flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300"
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                            <button
                              onClick={() => {
                                setSearchQuery(reply.userName || '');
                                setActiveTab('directory');
                              }}
                              className="flex-shrink-0 relative"
                            >
                              <div className="absolute -inset-0.5 bg-gradient-to-tr from-[#00ADB5] to-cyan-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                              <img
                                src={reply.userAvatar || `https://api.dicebear.com/9.x/adventurer/svg?seed=${reply.userId}`}
                                alt={reply.userName}
                                className="relative w-9 h-9 rounded-full ring-2 ring-white dark:ring-gray-800"
                              />
                            </button>

                            <div className="flex-1 min-w-0">
                              <div className="bg-gray-100/80 dark:bg-gray-700/50 rounded-2xl px-4 py-2.5 inline-block max-w-full">
                                <button
                                  onClick={() => {
                                    setSearchQuery(reply.userName || '');
                                    setActiveTab('directory');
                                  }}
                                  className="font-semibold text-sm text-gray-900 dark:text-white hover:text-[#00ADB5] dark:hover:text-[#00ADB5] transition-colors"
                                >
                                  {reply.userName}
                                </button>
                                <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 leading-relaxed break-words">{reply.content}</p>
                              </div>
                              <div className="flex items-center gap-3 mt-1.5 ml-1">
                                <span className="text-xs text-gray-400 font-medium">{formatRelativeTime(reply.timestamp || reply.createdAt)}</span>
                                {reply.userId === user?.id && (
                                  <button
                                    onClick={async () => {
                                      if (!window.confirm('Delete this comment?')) return;
                                      try {
                                        await apiRequest(`/developers/help-requests/${request.id}/replies/${reply.id}`, {
                                          method: 'DELETE'
                                        });
                                        setHelpRequests(prev => prev.map(r =>
                                          r.id === request.id
                                            ? {
                                                ...r,
                                                responses: Math.max((r.responses || 1) - 1, 0),
                                                replies: (r.replies || []).filter((rep: any) => rep.id !== reply.id)
                                              }
                                            : r
                                        ));
                                        toast.success('Comment deleted');
                                      } catch (error) {
                                        console.error('Error deleting comment:', error);
                                        toast.error('Failed to delete comment');
                                      }
                                    }}
                                    className="text-xs font-semibold text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {isExpanded && hasMoreReplies && (
                      <button
                        onClick={() => {
                          setExpandedRequests(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(request.id);
                            return newSet;
                          });
                        }}
                        className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-[#00ADB5] transition-colors"
                      >
                        ── Hide comments ──
                      </button>
                    )}

                    {request.userId !== user?.id && (
                      <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700/30 flex items-center gap-3 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
                        <div className="relative">
                          <div className="absolute -inset-0.5 bg-gradient-to-tr from-[#00ADB5] to-cyan-400 rounded-full opacity-60" />
                          <img
                            src={getUserAvatar(userprofile, user?.id)}
                            alt="You"
                            className="relative w-9 h-9 rounded-full ring-2 ring-white dark:ring-gray-800 flex-shrink-0"
                          />
                        </div>
                        <div className="flex-1 flex items-center gap-2 bg-gray-100/80 dark:bg-gray-700/50 rounded-full px-4 py-2 focus-within:ring-2 focus-within:ring-[#00ADB5]/50 transition-all">
                          <input
                            type="text"
                            placeholder="Add a comment..."
                            className="flex-1 text-sm bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400"
                            onKeyDown={async (e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                const input = e.target as HTMLInputElement;
                                const content = input.value.trim();
                                if (!content) return;

                                try {
                                  const replyData = {
                                    content,
                                    userName: userprofile?.displayName || user?.name || 'Anonymous',
                                    userAvatar: getUserAvatar(userprofile, user?.id)
                                  };

                                  const response = await apiRequest(`/developers/help-requests/${request.id}/respond`, {
                                    method: 'POST',
                                    body: JSON.stringify(replyData)
                                  });

                                  setHelpRequests(prev => prev.map(r =>
                                    r.id === request.id
                                      ? {
                                          ...r,
                                          responses: (r.responses || 0) + 1,
                                          replies: [...(r.replies || []), { ...replyData, id: response.reply?.id || Date.now(), userId: user?.id, timestamp: new Date().toISOString() }]
                                        }
                                      : r
                                  ));

                                  input.value = '';
                                  toast.success('Comment posted!');
                                } catch (error) {
                                  console.error('Error posting comment:', error);
                                  toast.error('Failed to post comment');
                                }
                              }
                            }}
                          />
                          <button
                            onClick={async (e) => {
                              const container = (e.target as HTMLElement).closest('.flex');
                              const input = container?.querySelector('input') as HTMLInputElement;
                              if (!input) return;
                              const content = input.value.trim();
                              if (!content) {
                                input.focus();
                                return;
                              }

                              try {
                                const replyData = {
                                  content,
                                  userName: userprofile?.displayName || user?.name || 'Anonymous',
                                  userAvatar: getUserAvatar(userprofile, user?.id)
                                };

                                const response = await apiRequest(`/developers/help-requests/${request.id}/respond`, {
                                  method: 'POST',
                                  body: JSON.stringify(replyData)
                                });

                                setHelpRequests(prev => prev.map(r =>
                                  r.id === request.id
                                    ? {
                                        ...r,
                                        responses: (r.responses || 0) + 1,
                                        replies: [...(r.replies || []), { ...replyData, id: response.reply?.id || Date.now(), userId: user?.id, timestamp: new Date().toISOString() }]
                                      }
                                    : r
                                ));

                                input.value = '';
                                toast.success('Comment posted!');
                              } catch (error) {
                                console.error('Error posting comment:', error);
                                toast.error('Failed to post comment');
                              }
                            }}
                            className="text-sm font-bold hover:scale-105 active:scale-95 transition-all"
                            style={{ color: '#00ADB5' }}
                          >
                            Post
                          </button>
                        </div>
                      </div>
                    )}

                    {request.userId === user?.id && displayReplies.length === 0 && (
                      <div className="px-4 py-4 flex items-center justify-center gap-2 text-sm text-gray-400 dark:text-gray-500">
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      )}

      {/* New Review Modal */}
      {showNewReviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Post a Review</h3>
              <button
                onClick={() => setShowNewReviewModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-white mb-1">Website Name *</label>
                <input
                  type="text"
                  value={newReviewData.website}
                  onChange={(e) => setNewReviewData({ ...newReviewData, website: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2"
                  placeholder="e.g., LeetCode, freeCodeCamp"
                  style={{ '--tw-ring-color': '#00ADB5' } as any}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-white mb-1">Website URL</label>
                <input
                  type="text"
                  value={newReviewData.url}
                  onChange={(e) => setNewReviewData({ ...newReviewData, url: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2"
                  placeholder="e.g., leetcode.com"
                  style={{ '--tw-ring-color': '#00ADB5' } as any}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-white mb-1">Category</label>
                <select
                  value={newReviewData.category}
                  onChange={(e) => setNewReviewData({ ...newReviewData, category: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2"
                  style={{ '--tw-ring-color': '#00ADB5' } as any}
                >
                  <option value="">Select category</option>
                  {reviewCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-white mb-1">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star
                      key={star}
                      className={`w-8 h-8 cursor-pointer transition-colors ${
                        star <= newReviewData.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 hover:text-yellow-200'
                      }`}
                      onClick={() => setNewReviewData({ ...newReviewData, rating: star })}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-white mb-1">Review Title *</label>
                <input
                  type="text"
                  value={newReviewData.title}
                  onChange={(e) => setNewReviewData({ ...newReviewData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2"
                  placeholder="Summarize your experience"
                  style={{ '--tw-ring-color': '#00ADB5' } as any}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-white mb-1">Detailed Review *</label>
                <textarea
                  value={newReviewData.content}
                  onChange={(e) => setNewReviewData({ ...newReviewData, content: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white h-32 focus:outline-none focus:ring-2"
                  placeholder="Share your experience, tips, and insights..."
                  style={{ '--tw-ring-color': '#00ADB5' } as any}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-white mb-1">Pros (comma separated)</label>
                <input
                  type="text"
                  value={newReviewData.pros}
                  onChange={(e) => setNewReviewData({ ...newReviewData, pros: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2"
                  placeholder="Great UI, Free resources, Active community"
                  style={{ '--tw-ring-color': '#00ADB5' } as any}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-white mb-1">Cons (comma separated)</label>
                <input
                  type="text"
                  value={newReviewData.cons}
                  onChange={(e) => setNewReviewData({ ...newReviewData, cons: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2"
                  placeholder="Expensive, Limited content, Slow support"
                  style={{ '--tw-ring-color': '#00ADB5' } as any}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSubmitReview}
                className="flex-1 py-2 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
                style={{ background: 'linear-gradient(135deg, #00ADB5 0%, #00d4ff 100%)' }}
              >
                Post Review
              </button>
              <button
                onClick={() => setShowNewReviewModal(false)}
                className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* New Help Request Modal */}
      {showNewRequestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-900 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Ask for Help</h3>
              <button
                onClick={() => setShowNewRequestModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-white mb-1">What are you looking for? *</label>
                <input
                  type="text"
                  value={newRequestData.title}
                  onChange={(e) => setNewRequestData({ ...newRequestData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2"
                  placeholder="e.g., Best resources to learn React"
                  style={{ '--tw-ring-color': '#00ADB5' } as any}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-white mb-1">Description *</label>
                <textarea
                  value={newRequestData.description}
                  onChange={(e) => setNewRequestData({ ...newRequestData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white h-24 focus:outline-none focus:ring-2"
                  placeholder="Describe what you're looking for, your current level, specific requirements..."
                  style={{ '--tw-ring-color': '#00ADB5' } as any}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-white mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  value={newRequestData.tags}
                  onChange={(e) => setNewRequestData({ ...newRequestData, tags: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2"
                  placeholder="React, Frontend, Beginner"
                  style={{ '--tw-ring-color': '#00ADB5' } as any}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSubmitRequest}
                className="flex-1 py-2 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
                style={{ background: 'linear-gradient(135deg, #00ADB5 0%, #00d4ff 100%)' }}
              >
                Post Request
              </button>
              <button
                onClick={() => setShowNewRequestModal(false)}
                className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Reply Modal */}
      {showReplyModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {selectedRequest.userId === user?.id ? 'View Replies' : 'Reply to Request'}
              </h3>
              <button
                onClick={() => {
                  setShowReplyModal(false);
                  setReplyText('');
                  setSelectedRequest(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-3 mb-2">
                <button
                  onClick={() => {
                    if (selectedRequest.userId !== user?.id) {
                      setSearchQuery(selectedRequest.userName || '');
                      setActiveTab('directory');
                      setShowReplyModal(false);
                      setSelectedRequest(null);
                      setReplyText('');
                    }
                  }}
                  className={`flex items-center gap-2 ${selectedRequest.userId !== user?.id ? 'hover:opacity-80 transition-opacity cursor-pointer group' : 'cursor-default'}`}
                  disabled={selectedRequest.userId === user?.id}
                >
                  <img
                    src={selectedRequest.userAvatar || `https://api.dicebear.com/9.x/adventurer/svg?seed=${selectedRequest.userId}`}
                    alt={selectedRequest.userName}
                    className={`w-8 h-8 rounded-full ${selectedRequest.userId !== user?.id ? 'ring-2 ring-transparent group-hover:ring-[#00ADB5] transition-all' : ''}`}
                  />
                  <span className={`font-semibold text-gray-900 dark:text-white ${selectedRequest.userId !== user?.id ? 'group-hover:text-[#00ADB5] transition-colors' : ''}`}>{selectedRequest.userName}</span>
                </button>
                {selectedRequest.userId === user?.id && (
                  <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">Your Request</span>
                )}
              </div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-1">{selectedRequest.title}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{selectedRequest.description}</p>
            </div>

            {selectedRequest.replies && selectedRequest.replies.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-white mb-3 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  {selectedRequest.replies.length} {selectedRequest.replies.length === 1 ? 'Reply' : 'Replies'}
                </h4>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {selectedRequest.replies.map((reply: any, index: number) => (
                    <div key={reply.id || index} className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <button
                          onClick={() => {
                            setSearchQuery(reply.userName || '');
                            setActiveTab('directory');
                            setShowReplyModal(false);
                            setSelectedRequest(null);
                            setReplyText('');
                          }}
                          className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer group"
                        >
                          <img
                            src={reply.userAvatar || `https://api.dicebear.com/9.x/adventurer/svg?seed=${reply.userId}`}
                            alt={reply.userName}
                            className="w-6 h-6 rounded-full ring-2 ring-transparent group-hover:ring-[#00ADB5] transition-all"
                          />
                          <span className="font-medium text-sm text-gray-900 dark:text-white group-hover:text-[#00ADB5] transition-colors">{reply.userName}</span>
                        </button>
                        <span className="text-xs text-gray-500">{formatTimestamp(reply.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{reply.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedRequest.userId === user?.id && (!selectedRequest.replies || selectedRequest.replies.length === 0) && (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No replies yet. Check back later!</p>
              </div>
            )}

            {selectedRequest.userId !== user?.id && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-white mb-1">Your Reply *</label>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white h-24 focus:outline-none focus:ring-2"
                    placeholder="Share your recommendation, resources, or advice..."
                    style={{ '--tw-ring-color': '#00ADB5' } as React.CSSProperties}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              {selectedRequest.userId !== user?.id ? (
                <>
                  <button
                    onClick={handleSubmitReply}
                    disabled={!replyText.trim()}
                    className="flex-1 py-2 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: 'linear-gradient(135deg, #00ADB5 0%, #00d4ff 100%)' }}
                  >
                    Send Reply
                  </button>
                  <button
                    onClick={() => {
                      setShowReplyModal(false);
                      setReplyText('');
                      setSelectedRequest(null);
                    }}
                    className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setShowReplyModal(false);
                    setReplyText('');
                    setSelectedRequest(null);
                  }}
                  className="w-full py-2 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
                  style={{ background: 'linear-gradient(135deg, #00ADB5 0%, #00d4ff 100%)' }}
                >
                  Close
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2" style={{ background: 'linear-gradient(135deg, #00ADB5 0%, #00d4ff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Developer Connect 🤝
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-white">
                Find teammates, build together, grow your network
              </p>
            </div>
          </div>
        </motion.div>

        <div className="flex gap-1 sm:gap-2 mb-6 sm:mb-8 border-b border-gray-200 dark:border-gray-700 overflow-x-auto scrollbar-hide">
          {[
            { id: 'directory', label: 'Developer Directory', icon: Code2 },
            { id: 'messages', label: 'Messages', icon: Mail },
            { id: 'groups', label: 'Study Groups', icon: BookOpen },
            { id: 'reviews', label: 'Tech Reviews', icon: Star }
          ].map(tab => {
            const Icon = tab.icon;
            const totalUnread = tab.id === 'messages' ? Object.values(unreadCounts).reduce((sum, count) => sum + count, 0) : 0;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-2 sm:px-4 py-2 sm:py-3 font-semibold flex items-center gap-1 sm:gap-2 border-b-2 transition-colors whitespace-nowrap text-xs sm:text-base ${
                  activeTab === tab.id
                    ? 'border-transparent'
                    : 'border-transparent text-gray-600 dark:text-white hover:text-gray-900 dark:hover:text-white'
                }`}
                style={activeTab === tab.id ? { borderBottomColor: '#00ADB5', color: '#00ADB5' } : {}}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.id === 'directory' ? 'Directory' : tab.id === 'messages' ? 'Messages' : tab.id === 'groups' ? 'Groups' : 'Reviews'}</span>
                {tab.id === 'messages' && totalUnread > 0 && (
                  <span
                    className="ml-1 px-1.5 py-0.5 text-[10px] sm:text-xs font-bold text-white rounded-full min-w-[18px] text-center"
                    style={{ background: 'linear-gradient(135deg, #00ADB5 0%, #00d4ff 100%)' }}
                  >
                    {totalUnread > 9 ? '9+' : totalUnread}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {activeTab === 'directory' && renderDirectory()}
        {activeTab === 'messages' && renderMessages()}
        {activeTab === 'groups' && renderGroups()}
        {activeTab === 'reviews' && renderTechReviews()}
      </div>

      {/* Share Review Modal */}
      {showShareModal && reviewToShare && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-xl"
          >
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Share Review</h3>
              <button
                onClick={() => {
                  setShowShareModal(false);
                  setReviewToShare(null);
                  setShareSearch('');
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Sharing:</p>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-400" />
                <span className="font-semibold text-gray-900 dark:text-white">{reviewToShare.website}</span>
                <span className="text-gray-500">-</span>
                <span className="text-gray-600 dark:text-gray-300 truncate">{reviewToShare.title}</span>
              </div>
            </div>

            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search developers to share with..."
                  value={shareSearch}
                  onChange={(e) => setShareSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 text-sm"
                  style={{ '--tw-ring-color': '#00ADB5' } as any}
                />
              </div>
            </div>

            <div className="overflow-y-auto max-h-[300px]">
              {developers
                .filter(dev =>
                  dev.userId !== user?.id &&
                  (dev.name?.toLowerCase().includes(shareSearch.toLowerCase()) ||
                   dev.skills?.some((s: string) => s.toLowerCase().includes(shareSearch.toLowerCase())))
                )
                .slice(0, 20)
                .map(dev => (
                  <button
                    key={dev.userId}
                    onClick={async () => {
                      try {
                        const chatResponse = await apiRequest('/chats', {
                          method: 'POST',
                          body: JSON.stringify({
                            participantIds: [user?.id, dev.userId],
                          }),
                        });

                        const chatId = chatResponse?.id || chatResponse?.chat?.id;
                        if (!chatId) throw new Error('Failed to create chat');

                        const reviewLink = `${window.location.origin}/dashboard/developer-connect?tab=reviews&reviewId=${reviewToShare.id}`;
                        const shareMessage = `📚 Check out this review: ${reviewToShare.website}\n🔗 ${reviewLink}`;

                        await apiRequest(`/chats/${chatId}/messages`, {
                          method: 'POST',
                          body: JSON.stringify({
                            senderId: user?.id,
                            senderName: userprofile?.displayName || userprofile?.name || user?.name || 'User',
                            senderAvatar: userprofile?.avatar || userprofile?.avatrUrl || '',
                            message: shareMessage,
                          }),
                        });

                        toast.success(`Review shared with ${dev.name}!`);
                        setShowShareModal(false);
                        setReviewToShare(null);
                        setShareSearch('');
                      } catch (error) {
                        console.error('Error sharing review:', error);
                        toast.error('Failed to share review');
                      }
                    }}
                    className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                  >
                    <img
                      src={dev.avatar || `https://api.dicebear.com/9.x/adventurer/svg?seed=${dev.userId}`}
                      alt={dev.name}
                      className="w-10 h-10 rounded-full"
                    />
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-gray-900 dark:text-white">{dev.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{dev.bio?.substring(0, 30) || 'Developer'}</p>
                    </div>
                    <Send className="w-4 h-4 text-gray-400" />
                  </button>
                ))}
              {developers.filter(dev =>
                dev.userId !== user?.id &&
                (dev.name?.toLowerCase().includes(shareSearch.toLowerCase()) ||
                 dev.skills?.some((s: string) => s.toLowerCase().includes(shareSearch.toLowerCase())))
              ).length === 0 && (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No developers found</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
