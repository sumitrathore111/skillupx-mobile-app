import { AnimatePresence, motion } from 'framer-motion';
import {
  Award,
  Bell,
  CheckCircle,
  MessageSquare,
  ShoppingBag,
  Sword,
  Trophy,
  UserPlus,
  X
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { apiRequest } from '../../service/api';
import { getSocket, initializeSocket } from '../../service/socketService';

interface Notification {
  id: string;
  type: 'battle_invite' | 'message' | 'project_request' | 'tech_review' | 'sale' | 'task_assigned' | 'battle_result';
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: Date;
  data?: any;
}

interface UnifiedNotificationsProps {
  isMinimized?: boolean;
}

export default function UnifiedNotifications({ isMinimized = false }: UnifiedNotificationsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [panelPosition, setPanelPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Update panel position when opening
  const handleToggle = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const panelHeight = 400; // Approximate panel height

      // Check if button is in bottom half of screen - if so, open upward
      const isBottomHalf = rect.top > window.innerHeight / 2;

      setPanelPosition({
        top: isBottomHalf
          ? Math.max(16, rect.top - panelHeight - 8) // Open upward
          : rect.bottom + 8, // Open downward
        left: Math.max(16, Math.min(rect.left, window.innerWidth - 400))
      });
    }
    setIsOpen(!isOpen);
    if (!isOpen) fetchNotifications();
  };

  // Fetch notifications on mount
  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    // Set up real-time socket listeners
    initializeSocket();
    const socket = getSocket();

    if (socket) {
      // Listen for new messages
      socket.on('newMessage', (data: any) => {
        addNotification({
          id: `msg-${Date.now()}`,
          type: 'message',
          title: 'New Message',
          message: `${data.senderName || 'Someone'} sent you a message`,
          link: '/dashboard/courses',
          read: false,
          createdAt: new Date(),
          data
        });
      });

      // Listen for battle invites
      socket.on('battleInvite', (data: any) => {
        addNotification({
          id: `battle-${Date.now()}`,
          type: 'battle_invite',
          title: 'Battle Invite!',
          message: `${data.fromName || 'A player'} challenged you to a battle`,
          link: `/dashboard/codearena/battle/${data.battleId}`,
          read: false,
          createdAt: new Date(),
          data
        });
      });

      // Listen for project join requests
      socket.on('joinRequestReceived', (data: any) => {
        addNotification({
          id: `join-${Date.now()}`,
          type: 'project_request',
          title: 'Join Request',
          message: `${data.userName || 'Someone'} wants to join your project`,
          link: '/dashboard/projects',
          read: false,
          createdAt: new Date(),
          data
        });
      });

      // Listen for tech reviews
      socket.on('newTechReview', (data: any) => {
        addNotification({
          id: `review-${Date.now()}`,
          type: 'tech_review',
          title: 'New Tech Review!',
          message: `${data.fromName || 'Someone'} posted a review for ${data.website || 'a website'}`,
          link: '/dashboard/developer-connect',
          read: false,
          createdAt: new Date(),
          data
        });
      });

      // Listen for marketplace sales
      socket.on('projectSold', (data: any) => {
        addNotification({
          id: `sale-${Date.now()}`,
          type: 'sale',
          title: 'Project Sold!',
          message: `Your project sold for ${data.price || 0} coins`,
          link: '/dashboard/marketplace',
          read: false,
          createdAt: new Date(),
          data
        });
      });
    }

    return () => {
      if (socket) {
        socket.off('newMessage');
        socket.off('battleInvite');
        socket.off('joinRequestReceived');
        socket.off('newEndorsement');
        socket.off('projectSold');
      }
    };
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Aggregate notifications from different sources
      const notifs: Notification[] = [];

      // 1. Unread messages count
      try {
        const chatsResponse = await apiRequest('/chats');
        const chats = chatsResponse?.chats || [];
        const unreadChats = chats.filter((chat: any) => {
          const lastMessage = chat.lastMessage;
          return lastMessage && lastMessage.senderId !== user.id && !chat.read;
        });

        if (unreadChats.length > 0) {
          notifs.push({
            id: 'messages-unread',
            type: 'message',
            title: 'Unread Messages',
            message: `You have ${unreadChats.length} unread conversation${unreadChats.length > 1 ? 's' : ''}`,
            link: '/dashboard/courses',
            read: false,
            createdAt: new Date()
          });
        }
      } catch (e) { /* ignore */ }

      // 2. Pending join requests (for project creators)
      try {
        const ideasResponse = await apiRequest('/ideas');
        const myProjects = (ideasResponse || []).filter((idea: any) =>
          idea.userId === user.id && idea.status === 'approved'
        );

        for (const project of myProjects.slice(0, 5)) {
          const requests = await apiRequest(`/join-requests/project/${project.projectId || project.id}`);
          const pendingRequests = (requests || []).filter((r: any) => r.status === 'pending');

          if (pendingRequests.length > 0) {
            notifs.push({
              id: `project-requests-${project.id}`,
              type: 'project_request',
              title: `${project.title}`,
              message: `${pendingRequests.length} pending join request${pendingRequests.length > 1 ? 's' : ''}`,
              link: '/dashboard/projects',
              read: false,
              createdAt: new Date()
            });
          }
        }
      } catch (e) { /* ignore */ }

      // 3. Recent battle results
      try {
        const battlesResponse = await apiRequest(`/battles/user/${user.id}`);
        const recentBattles = (battlesResponse?.battles || [])
          .filter((b: any) => b.status === 'completed')
          .slice(0, 3);

        for (const battle of recentBattles) {
          const isWinner = battle.winner === user.id;
          notifs.push({
            id: `battle-result-${battle._id}`,
            type: 'battle_result',
            title: isWinner ? '🏆 Battle Won!' : 'Battle Complete',
            message: isWinner ? `You won ${battle.prize} coins!` : 'Better luck next time',
            link: `/dashboard/codearena/battle/results/${battle._id}`,
            read: true, // Mark as read by default
            createdAt: new Date(battle.completedAt || battle.createdAt)
          });
        }
      } catch (e) { /* ignore */ }

      // 4. Rematch requests
      try {
        const rematchResponse = await apiRequest(`/battles/rematch-requests?userId=${user.id}`);
        const rematchBattles = rematchResponse?.battles || [];

        for (const battle of rematchBattles) {
          notifs.push({
            id: `rematch-${battle._id}`,
            type: 'battle_invite',
            title: 'Rematch Request!',
            message: `${battle.rematchRequest?.fromName || 'Player'} wants a rematch`,
            link: `/dashboard/codearena`,
            read: false,
            createdAt: new Date(battle.rematchRequest?.createdAt || Date.now())
          });
        }
      } catch (e) { /* ignore */ }

      // Sort by date and set
      notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);

    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const addNotification = (notif: Notification) => {
    setNotifications(prev => [notif, ...prev].slice(0, 20));
    setUnreadCount(prev => prev + 1);
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleNotificationClick = (notif: Notification) => {
    markAsRead(notif.id);
    setIsOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'battle_invite':
        return <Sword className="w-5 h-5 text-orange-500" />;
      case 'message':
        return <MessageSquare className="w-5 h-5 text-blue-500" />;
      case 'project_request':
        return <UserPlus className="w-5 h-5 text-green-500" />;
      case 'tech_review':
        return <Award className="w-5 h-5 text-purple-500" />;
      case 'sale':
        return <ShoppingBag className="w-5 h-5 text-emerald-500" />;
      case 'task_assigned':
        return <CheckCircle className="w-5 h-5 text-cyan-500" />;
      case 'battle_result':
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className={`relative p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 bg-gray-100 dark:bg-gray-800 transition-colors group ${isMinimized ? 'w-full justify-center flex' : ''}`}
        title="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-500 dark:text-gray-400" />

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}

        {/* Tooltip for minimized state */}
        {isMinimized && (
          <div className="hidden lg:block fixed ml-3 px-3 py-2 rounded-lg shadow-xl bg-gray-900 text-white text-sm opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap pointer-events-none z-50"
            style={{ left: '80px' }}
          >
            Notifications {unreadCount > 0 && `(${unreadCount})`}
          </div>
        )}
      </button>

      {/* Dropdown Panel - Rendered via Portal */}
      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-[9998]"
                onClick={() => setIsOpen(false)}
              />

              {/* Notification Panel */}
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="fixed w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-[9999] overflow-hidden"
                style={{
                  top: panelPosition.top,
                  left: panelPosition.left,
                  maxHeight: 'calc(100vh - 100px)'
                }}
              >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Bell className="w-5 h-5" style={{ color: '#00ADB5' }} />
                  Notifications
                </h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Notifications List */}
              <div className="max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Bell className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <motion.div
                      key={notif.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={() => handleNotificationClick(notif)}
                      className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors border-b border-gray-100 dark:border-gray-700/50 ${
                        !notif.read ? 'bg-cyan-50/50 dark:bg-cyan-900/10' : ''
                      }`}
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        {getNotificationIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${!notif.read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                          {notif.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {notif.message}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {formatTime(notif.createdAt)}
                        </p>
                      </div>
                      {!notif.read && (
                        <div className="w-2 h-2 rounded-full bg-cyan-500 flex-shrink-0 mt-2" />
                      )}
                    </motion.div>
                  ))
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      navigate('/dashboard/db');
                    }}
                    className="w-full text-center text-sm font-medium py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    style={{ color: '#00ADB5' }}
                  >
                    View All Activity
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>,
      document.body
      )}
    </div>
  );
}
