import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  Award,
  Code2,
  FolderPlus,
  MessageSquare,
  ShoppingBag,
  Swords,
  TrendingUp,
  Trophy,
  UserPlus,
  X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { apiRequest } from '../../service/api';
import { API_BASE_URL } from '../../service/apiConfig';

interface ActivityItem {
  id: string;
  type: 'battle_win' | 'battle_complete' | 'project_created' | 'project_joined' |
        'message' | 'endorsement' | 'sale' | 'new_developer' | 'challenge_solved';
  title: string;
  description: string;
  userId?: string;
  userName?: string;
  userAvatar?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface ActivityFeedProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ActivityFeed({ isOpen, onClose }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch initial activities
  useEffect(() => {
    if (isOpen) {
      fetchActivities();
    }
  }, [isOpen]);

  // Real-time socket connection
  useEffect(() => {
    if (!isOpen) return;

    // Use shared API base URL for socket.io
    const socket: Socket = io(API_BASE_URL, {
      transports: ['polling', 'websocket'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 3
    });

    socket.on('connect_error', () => {
      // Silently handle connection errors - socket is optional feature
      console.log('Socket connection not available - live updates disabled');
    });

    // Listen for various events
    socket.on('battle_completed', (data) => {
      const newActivity: ActivityItem = {
        id: `battle-${Date.now()}`,
        type: 'battle_complete',
        title: 'Battle Completed',
        description: `${data.winnerName} defeated ${data.loserName}`,
        userName: data.winnerName,
        timestamp: new Date()
      };
      addActivity(newActivity);
    });

    socket.on('project_created', (data) => {
      const newActivity: ActivityItem = {
        id: `project-${Date.now()}`,
        type: 'project_created',
        title: 'New Project',
        description: `${data.userName} created "${data.projectTitle}"`,
        userName: data.userName,
        timestamp: new Date()
      };
      addActivity(newActivity);
    });

    socket.on('sale_completed', (data) => {
      const newActivity: ActivityItem = {
        id: `sale-${Date.now()}`,
        type: 'sale',
        title: 'Marketplace Sale',
        description: `${data.buyerName} purchased "${data.projectTitle}"`,
        userName: data.buyerName,
        timestamp: new Date()
      };
      addActivity(newActivity);
    });

    return () => {
      socket.disconnect();
    };
  }, [isOpen]);

  const addActivity = (activity: ActivityItem) => {
    setActivities((prev) => [activity, ...prev].slice(0, 50));
  };

  const fetchActivities = async () => {
    setLoading(true);
    const allActivities: ActivityItem[] = [];

    try {
      // Fetch recent battles
      try {
        const battles = await apiRequest('/battles/recent?limit=10');
        (battles || []).forEach((battle: any) => {
          if (battle.status === 'completed') {
            allActivities.push({
              id: `battle-${battle._id}`,
              type: 'battle_complete',
              title: 'Battle Completed',
              description: `${battle.winnerName || 'A player'} won a coding battle`,
              userName: battle.winnerName,
              timestamp: new Date(battle.completedAt || battle.updatedAt)
            });
          }
        });
      } catch (e) { /* ignore */ }

      // Fetch recent ideas/projects
      try {
        const ideas = await apiRequest('/ideas');
        (ideas || [])
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 10)
          .forEach((idea: any) => {
            allActivities.push({
              id: `project-${idea._id}`,
              type: 'project_created',
              title: 'New Project',
              description: `"${idea.title}" was created`,
              userName: idea.userName || 'Someone',
              timestamp: new Date(idea.createdAt)
            });
          });
      } catch (e) { /* ignore */ }

      // Fetch recent marketplace activity
      try {
        const response = await apiRequest('/marketplace');
        const listings = response?.listings || response || [];
        (Array.isArray(listings) ? listings : [])
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5)
          .forEach((listing: any) => {
            allActivities.push({
              id: `listing-${listing._id}`,
              type: 'sale',
              title: 'New Listing',
              description: `"${listing.title}" listed for $${listing.price}`,
              userName: listing.sellerName,
              timestamp: new Date(listing.createdAt)
            });
          });
      } catch (e) { /* ignore */ }

      // Sort by timestamp
      allActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setActivities(allActivities.slice(0, 30));
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'battle_win':
        return <Trophy className="w-4 h-4 text-yellow-500" />;
      case 'battle_complete':
        return <Swords className="w-4 h-4 text-orange-500" />;
      case 'project_created':
        return <FolderPlus className="w-4 h-4 text-green-500" />;
      case 'project_joined':
        return <UserPlus className="w-4 h-4 text-blue-500" />;
      case 'message':
        return <MessageSquare className="w-4 h-4 text-cyan-500" />;
      case 'endorsement':
        return <Award className="w-4 h-4 text-purple-500" />;
      case 'sale':
        return <ShoppingBag className="w-4 h-4 text-pink-500" />;
      case 'new_developer':
        return <UserPlus className="w-4 h-4 text-blue-500" />;
      case 'challenge_solved':
        return <Code2 className="w-4 h-4 text-emerald-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActivityColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'battle_win':
      case 'battle_complete':
        return 'from-orange-500/10 to-red-500/10';
      case 'project_created':
      case 'project_joined':
        return 'from-green-500/10 to-emerald-500/10';
      case 'message':
        return 'from-cyan-500/10 to-blue-500/10';
      case 'endorsement':
        return 'from-purple-500/10 to-pink-500/10';
      case 'sale':
        return 'from-pink-500/10 to-rose-500/10';
      default:
        return 'from-gray-500/10 to-gray-500/10';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99] bg-black/30"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 z-[100] w-full max-w-sm bg-white dark:bg-gray-800 shadow-2xl border-l border-gray-200 dark:border-gray-700"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #00ADB5 0%, #00d4ff 100%)' }}
                >
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Activity Feed
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Real-time platform activity
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto h-[calc(100vh-80px)]">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                  <Activity className="w-12 h-12 mb-3 opacity-30" />
                  <p className="font-medium">No recent activity</p>
                  <p className="text-sm">Activities will appear here</p>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {activities.map((activity, index) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-3 rounded-xl bg-gradient-to-r ${getActivityColor(activity.type)}
                        border border-gray-100 dark:border-gray-700/50`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center flex-shrink-0">
                          {getActivityIcon(activity.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {activity.title}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                            {activity.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {activity.userName && (
                              <span className="text-xs font-medium" style={{ color: '#00ADB5' }}>
                                @{activity.userName}
                              </span>
                            )}
                            <span className="text-xs text-gray-400">
                              {formatTime(activity.timestamp)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Live indicator */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-gray-600 dark:text-gray-400">Live updates</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
