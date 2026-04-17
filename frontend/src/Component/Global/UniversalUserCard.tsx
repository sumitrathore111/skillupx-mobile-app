import { AnimatePresence, motion } from 'framer-motion';
import {
  Award,
  Code2,
  FolderOpen,
  MessageSquare,
  Trophy,
  UserPlus,
  X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../service/api';

interface UserCardProps {
  userId: string;
  userName?: string;
  userAvatar?: string;
  isOpen: boolean;
  onClose: () => void;
  position?: { x: number; y: number };
}

interface UserData {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  bio?: string;
  skills?: string[];
  battleRating?: number;
  battlesWon?: number;
  battlesLost?: number;
  projectsCreated?: number;
  projectsContributed?: number;
  endorsements?: number;
  bazaarSales?: number;
  joinedAt?: string;
}

export default function UniversalUserCard({
  userId,
  userName,
  userAvatar,
  isOpen,
  onClose,
  position
}: UserCardProps) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserData();
    }
  }, [isOpen, userId]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      // Fetch user profile
      const profile = await apiRequest(`/users/${userId}`);

      // Fetch battle stats
      let battleStats = { battlesWon: 0, battlesLost: 0, battleRating: 1000 };
      try {
        const stats = await apiRequest(`/battles/user-stats/${userId}`);
        battleStats = {
          battlesWon: stats?.battlesWon || 0,
          battlesLost: (stats?.totalBattles || 0) - (stats?.battlesWon || 0),
          battleRating: profile?.battleRating || 1000
        };
      } catch (e) { /* ignore */ }

      // Fetch project stats
      let projectStats = { created: 0, contributed: 0 };
      try {
        const ideas = await apiRequest('/ideas');
        projectStats.created = (ideas || []).filter((i: any) => i.userId === userId).length;
        // Contributing projects would need a different API
      } catch (e) { /* ignore */ }

      setUserData({
        id: userId,
        name: profile?.name || userName || 'Unknown User',
        email: profile?.email,
        avatar: profile?.avatar || userAvatar,
        bio: profile?.bio || profile?.lookingFor,
        skills: profile?.skills || [],
        battleRating: battleStats.battleRating,
        battlesWon: battleStats.battlesWon,
        battlesLost: battleStats.battlesLost,
        projectsCreated: projectStats.created,
        projectsContributed: projectStats.contributed,
        endorsements: profile?.endorsements?.length || 0,
        bazaarSales: 0, // Would need marketplace API
        joinedAt: profile?.createdAt
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
      setUserData({
        id: userId,
        name: userName || 'Unknown User',
        avatar: userAvatar,
        skills: [],
        battleRating: 1000,
        battlesWon: 0,
        battlesLost: 0,
        projectsCreated: 0,
        projectsContributed: 0,
        endorsements: 0,
        bazaarSales: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMessage = () => {
    onClose();
    navigate('/dashboard/courses', { state: { selectedChat: userId } });
  };

  const handleInviteToProject = () => {
    onClose();
    navigate('/dashboard/projects', { state: { inviteUser: userId } });
  };

  const getAvatarDisplay = () => {
    const avatar = userData?.avatar;
    if (avatar && avatar.startsWith('http')) {
      return (
        <img
          src={avatar}
          alt={userData?.name}
          className="w-full h-full object-cover"
        />
      );
    } else if (avatar) {
      return <span className="text-3xl">{avatar}</span>;
    }
    return (
      <span className="text-white font-bold text-2xl">
        {userData?.name?.charAt(0)?.toUpperCase() || 'U'}
      </span>
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[100] bg-black/20"
            onClick={onClose}
          />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="fixed z-[101] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-80 overflow-hidden"
            style={{
              left: position?.x ? Math.min(position.x, window.innerWidth - 340) : '50%',
              top: position?.y ? Math.min(position.y, window.innerHeight - 400) : '50%',
              transform: position ? 'none' : 'translate(-50%, -50%)'
            }}
          >
            {/* Header with gradient */}
            <div
              className="h-20 relative"
              style={{ background: 'linear-gradient(135deg, #00ADB5 0%, #00d4ff 100%)' }}
            >
              <button
                onClick={onClose}
                className="absolute top-2 right-2 p-1 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Avatar */}
            <div className="flex justify-center -mt-10">
              <div
                className="w-20 h-20 rounded-full border-4 border-white dark:border-gray-800 overflow-hidden flex items-center justify-center"
                style={{ backgroundColor: '#00ADB5' }}
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  getAvatarDisplay()
                )}
              </div>
            </div>

            {/* Content */}
            <div className="px-4 pb-4">
              {loading ? (
                <div className="text-center py-4">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mx-auto mb-2 animate-pulse" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24 mx-auto animate-pulse" />
                </div>
              ) : (
                <>
                  {/* Name & Bio */}
                  <div className="text-center mt-2">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {userData?.name}
                    </h3>
                    {userData?.bio && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                        {userData.bio}
                      </p>
                    )}
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {/* Battle Rating */}
                    <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-lg p-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Trophy className="w-4 h-4 text-orange-500" />
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          {userData?.battleRating || 1000}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">ELO Rating</p>
                    </div>

                    {/* Battle Wins */}
                    <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg p-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Code2 className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          {userData?.battlesWon || 0}W / {userData?.battlesLost || 0}L
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Battles</p>
                    </div>

                    {/* Projects */}
                    <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-lg p-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <FolderOpen className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          {userData?.projectsCreated || 0}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Projects</p>
                    </div>

                    {/* Endorsements */}
                    <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg p-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Award className="w-4 h-4 text-purple-500" />
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          {userData?.endorsements || 0}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Endorsements</p>
                    </div>
                  </div>

                  {/* Skills */}
                  {userData?.skills && userData.skills.length > 0 && (
                    <div className="mt-3">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {userData.skills.slice(0, 4).map((skill) => (
                          <span
                            key={skill}
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: 'rgba(0, 173, 181, 0.15)', color: '#00ADB5' }}
                          >
                            {skill}
                          </span>
                        ))}
                        {userData.skills.length > 4 && (
                          <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                            +{userData.skills.length - 4}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={handleMessage}
                      className="flex-1 flex items-center justify-center gap-1 py-2 text-white text-sm font-semibold rounded-lg transition-all hover:opacity-90"
                      style={{ background: 'linear-gradient(135deg, #00ADB5 0%, #00d4ff 100%)' }}
                    >
                      <MessageSquare className="w-4 h-4" />
                      Message
                    </button>
                    <button
                      onClick={handleInviteToProject}
                      className="flex-1 flex items-center justify-center gap-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white text-sm font-semibold rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <UserPlus className="w-4 h-4" />
                      Invite
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Hook to use the user card
export function useUserCard() {
  const [isOpen, setIsOpen] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [userAvatar, setUserAvatar] = useState<string>('');
  const [position, setPosition] = useState<{ x: number; y: number } | undefined>();

  const openUserCard = (
    id: string,
    name?: string,
    avatar?: string,
    event?: React.MouseEvent
  ) => {
    setUserId(id);
    setUserName(name || '');
    setUserAvatar(avatar || '');
    if (event) {
      setPosition({ x: event.clientX, y: event.clientY });
    }
    setIsOpen(true);
  };

  const closeUserCard = () => {
    setIsOpen(false);
  };

  const UserCardComponent = () => (
    <UniversalUserCard
      userId={userId}
      userName={userName}
      userAvatar={userAvatar}
      isOpen={isOpen}
      onClose={closeUserCard}
      position={position}
    />
  );

  return {
    openUserCard,
    closeUserCard,
    UserCardComponent
  };
}
