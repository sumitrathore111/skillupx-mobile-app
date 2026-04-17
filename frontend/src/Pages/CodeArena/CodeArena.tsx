import { AnimatePresence, motion } from 'framer-motion';
import {
    AlertTriangle,
    ChevronRight,
    Code2,
    Coins,
    Crown,
    History,
    Loader2,
    Star,
    Swords,
    Target,
    Trophy,
    Users
} from 'lucide-react';
import type { ErrorInfo, ReactNode } from 'react';
import { Component, useEffect, useState } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { useDataContext } from '../../Context/UserDataContext';

// Error Boundary Component
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('CodeArena Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-red-200 dark:border-red-800 p-8 max-w-md w-full text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Something went wrong</h2>
            <p className="text-gray-600 dark:text-white mb-4">
              There was an error loading CodeArena. Please refresh the page or try again later.
            </p>
            <div className="bg-red-50 dark:bg-red-900/30 p-3 rounded-lg mb-4 text-left">
              <pre className="text-xs text-red-700 dark:text-red-400 whitespace-pre-wrap">
                {this.state.error?.message || 'Unknown error'}
              </pre>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#00ADB5] text-white rounded-lg hover:bg-[#00ADB5]/80 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Import sub-components
import { apiRequest } from '../../service/api';
import BattleHistory from './BattleHistory';
import BattleLobby from './BattleLobby';
import BattleResults from './BattleResults';
import BattleRoom from './BattleRoom';
import ChallengeEditor from './ChallengeEditor';
import Leaderboard from './Leaderboard';
import PracticeChallenges from './PracticeChallenges';
import SeedChallenges from './SeedChallenges';
import WalletPanel from './WalletPanel';

const CodeArenaContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { getUserWallet, initializeWallet, subscribeToWallet, fetchGlobalLeaderboard, getUserProgress } = useDataContext();

  const [activeTab, setActiveTab] = useState('home');
  const [wallet, setWallet] = useState<any>(null);
  const [userStats, setUserStats] = useState({
    problemsSolved: 0,
    battlesWon: 0,
    currentStreak: 0,
    globalRank: '-' as string | number
  });
  const [loading, setLoading] = useState(true);
  const [showWallet, setShowWallet] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch real user stats - OPTIMIZED with dedicated endpoint
  const fetchUserStats = async (userId: string, walletData: any) => {
    try {
      // Make parallel requests for faster loading
      const [battleStatsResponse, userProgress, leaderboard] = await Promise.all([
        // Use optimized user-stats endpoint
        apiRequest(`/battles/user-stats/${userId}`).catch(() => null),
        getUserProgress?.(userId).catch(() => null),
        fetchGlobalLeaderboard?.().catch(() => null)
      ]);

      // Get problems solved from user progress
      const solvedCount = userProgress?.solvedChallenges?.length || walletData?.achievements?.problemsSolved || 0;

      // Get battles stats from optimized endpoint
      const battlesWon = battleStatsResponse?.battlesWon || walletData?.achievements?.battlesWon || 0;
      const currentStreak = battleStatsResponse?.currentStreak || walletData?.streak?.current || 0;

      // Get global rank from leaderboard
      let globalRank: string | number = '-';
      if (leaderboard) {
        const userRanking = leaderboard.find((p: any) => p.odId === userId);
        if (userRanking) globalRank = userRanking.rank;
      }

      setUserStats({
        problemsSolved: solvedCount,
        battlesWon: battlesWon,
        currentStreak: currentStreak,
        globalRank: globalRank
      });
    } catch (err) {
      console.error('Error fetching user stats:', err);
      setUserStats({
        problemsSolved: walletData?.achievements?.problemsSolved || 0,
        battlesWon: walletData?.achievements?.battlesWon || 0,
        currentStreak: walletData?.streak?.current || 0,
        globalRank: '-'
      });
    }
  };

  useEffect(() => {
    const initWallet = async () => {
      if (user && user.id) {
        try {
          // Show UI immediately, fetch data in parallel
          setLoading(false);

          // Start fetching stats immediately (don't wait for wallet)
          fetchUserStats(user.id, null);

          // Initialize wallet and set immediately
          let existingWallet = await getUserWallet(user.id);

          if (!existingWallet) {
            existingWallet = await initializeWallet(user.id);
          }

          // Set wallet immediately for instant display
          if (existingWallet) {
            setWallet(existingWallet);
          }

          const unsubscribe = subscribeToWallet(user.id, async (walletData) => {
            setWallet(walletData);
            // Update stats with wallet data (but don't refetch from API)
          });

          return () => unsubscribe();
        } catch (error) {
          console.error('Error initializing wallet:', error);
          setError('Failed to initialize wallet. Please check your connection and try again.');
          setLoading(false);
        }
      } else {
        console.log('No user or user.id, skipping wallet init');
        setLoading(false);
      }
    };

    initWallet();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/battle/history')) setActiveTab('history');
    else if (path.includes('/battle')) setActiveTab('battle');
    else if (path.includes('/leaderboard')) setActiveTab('leaderboard');
    else setActiveTab('home');
  }, [location]);

  const stats = [
    { label: 'Problems Solved', value: userStats.problemsSolved, icon: Code2, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Battles Won', value: userStats.battlesWon, icon: Swords, color: 'text-[#00ADB5] bg-[#00ADB5]/10' },
    { label: 'Current Streak', value: userStats.currentStreak, icon: Star, color: 'text-orange-600 bg-orange-50' },
    { label: 'Global Rank', value: userStats.globalRank, icon: Trophy, color: 'text-amber-600 bg-amber-50' },
  ];

  const quickActions = [
    {
      title: 'Quick Battle',
      description: 'Compete in a 1v1 coding duel',
      icon: Swords,
      color: 'bg-red-500',
      path: 'battle'
    },
    {
      title: 'Practice DSA',
      description: 'Solve coding problems & improve',
      icon: Target,
      color: 'bg-emerald-500',
      path: 'practice'
    },
    {
      title: 'Leaderboard',
      description: 'View global rankings',
      icon: Trophy,
      color: 'bg-amber-500',
      path: 'leaderboard'
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[#00ADB5] animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-white">Loading CodeArena...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-red-200 dark:border-red-700 p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Error Loading CodeArena</h2>
          <p className="text-gray-600 dark:text-white mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setLoading(true);
              window.location.reload();
            }}
            className="px-4 py-2 bg-[#00ADB5] text-white rounded-lg hover:bg-[#00ADB5]/80 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-8 max-w-md w-full text-center">
          <Code2 className="w-12 h-12 text-[#00ADB5] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Login Required</h2>
          <p className="text-gray-600 dark:text-white mb-4">Please log in to access CodeArena.</p>
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 bg-[#00ADB5] text-white rounded-lg hover:bg-[#00ADB5]/80 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[#00ADB5] rounded-lg">
                <Code2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">CodeArena</h1>
                <p className="text-xs text-gray-500 dark:text-white">Battle. Code. Win.</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {[
                { id: 'home', label: 'Home', icon: Code2, path: '' },
                { id: 'battle', label: 'Battle', icon: Swords, path: 'battle' },
                { id: 'history', label: 'History', icon: History, path: 'battle/history' },
                { id: 'leaderboard', label: 'Ranks', icon: Trophy, path: 'leaderboard' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => navigate(`/dashboard/codearena/${tab.path}`)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    activeTab === tab.id
                      ? 'bg-[#00ADB5]/10 dark:bg-[#00ADB5]/20 text-[#00ADB5] dark:text-[#00ADB5]'
                      : 'text-gray-600 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              ))}
            </nav>

            {/* Wallet */}
            <button
              onClick={() => setShowWallet(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-all"
            >
              <Coins className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-amber-700 dark:text-amber-300 font-semibold">{wallet?.coins?.toLocaleString() || 0}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={
            <HomeContent
              stats={stats}
              quickActions={quickActions}
              navigate={navigate}
            />
          } />
          <Route path="/battle" element={<BattleLobby wallet={wallet} />} />
          <Route path="/battle/history" element={<BattleHistory />} />
          <Route path="/battle/:battleId" element={<BattleRoom />} />
          <Route path="/battle/results/:battleId" element={<BattleResults />} />
          <Route path="/practice" element={<PracticeChallenges />} />
          <Route path="/practice/:challengeId" element={<ChallengeEditor />} />
          <Route path="/challenge/:challengeId" element={<ChallengeEditor />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/seed" element={<SeedChallenges />} />
        </Routes>
      </main>

      {/* Wallet Panel */}
      <AnimatePresence>
        {showWallet && (
          <WalletPanel
            wallet={wallet}
            onClose={() => setShowWallet(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 py-2 z-50">
        <div className="flex justify-around">
          {[
            { id: 'home', label: 'Home', icon: Code2, path: '' },
            { id: 'battle', label: 'Battle', icon: Swords, path: 'battle' },
            { id: 'history', label: 'History', icon: History, path: 'battle/history' },
            { id: 'leaderboard', label: 'Ranks', icon: Trophy, path: 'leaderboard' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => navigate(`/dashboard/codearena/${tab.path}`)}
              className={`flex flex-col items-center gap-1 p-2 ${
                activeTab === tab.id ? 'text-[#00ADB5]' : 'text-gray-400'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-xs">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

// Home Content
const HomeContent = ({ stats, quickActions, navigate }: any) => {
  const { fetchGlobalLeaderboard } = useDataContext();
  const [liveBattles, setLiveBattles] = useState<any[]>([]);
  const [topPlayers, setTopPlayers] = useState<any[]>([]);
  const [loadingBattles, setLoadingBattles] = useState(true);
  const [loadingPlayers, setLoadingPlayers] = useState(true);

  useEffect(() => {
    const loadLiveBattles = async () => {
      try {
        // Fetch active and waiting battles from the API
        const response = await apiRequest('/battles?status=active');
        const waitingResponse = await apiRequest('/battles?status=waiting');
        const countdownResponse = await apiRequest('/battles?status=countdown');

        const activeBattles = response.battles || [];
        const waitingBattles = waitingResponse.battles || [];
        const countdownBattles = countdownResponse.battles || [];

        // Combine and show the most recent battles
        const allBattles = [...activeBattles, ...countdownBattles, ...waitingBattles]
          .slice(0, 5) // Show max 5 battles
          .map((battle: any) => ({
            id: battle.id || battle._id,
            status: battle.status,
            difficulty: battle.difficulty,
            entryFee: battle.entryFee,
            prize: battle.prize,
            // Use participants if available, otherwise construct from creator fields
            participants: battle.participants?.length > 0
              ? battle.participants.map((p: any) => ({
                  odId: p.odId || p.userId,
                  userName: p.userName || p.odName || 'Player',
                  userAvatar: p.userAvatar || p.odProfilePic
                }))
              : [
                  {
                    odId: battle.creatorId,
                    userName: battle.creatorName || 'Player',
                    userAvatar: battle.creatorProfilePic
                  }
                ]
          }));

        setLiveBattles(allBattles);
      } catch (error) {
        console.error('Error loading battles:', error);
        setLiveBattles([]);
      } finally {
        setLoadingBattles(false);
      }
    };

    const loadTopPlayers = async () => {
      try {
        if (fetchGlobalLeaderboard) {
          const rankings = await fetchGlobalLeaderboard();
          setTopPlayers(rankings?.slice(0, 3) || []); // Show only top 3
        }
      } catch (error) {
        console.error('Error loading top players:', error);
        setTopPlayers([]);
      } finally {
        setLoadingPlayers(false);
      }
    };

    loadLiveBattles();
    loadTopPlayers();

    // Refresh live battles every 30 seconds (reduced from 10 for better performance)
    const battlesInterval = setInterval(loadLiveBattles, 30000);

    // Refresh top players every 60 seconds (reduced from 30)
    const playersInterval = setInterval(loadTopPlayers, 60000);

    return () => {
      clearInterval(battlesInterval);
      clearInterval(playersInterval);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pb-20 md:pb-6"
    >
      {/* Hero */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Welcome Back! 👋</h2>
        <p className="text-gray-600 dark:text-white mb-6">
          Ready to test your coding skills? Battle other developers or practice with Codeforces problems.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate('/dashboard/codearena/battle')}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#00ADB5] text-white font-medium rounded-lg hover:bg-[#00ADB5]/80 transition-colors"
          >
            <Swords className="w-4 h-4" />
            Find Match
          </button>
          <button
            onClick={() => navigate('/dashboard/practice')}
            className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            <Target className="w-4 h-4" />
            Practice
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat: any, index: number) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
          >
            <div className={`inline-flex p-2 rounded-lg ${stat.color} mb-3`}>
              <stat.icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
            <p className="text-sm text-gray-500 dark:text-white">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-4">
        {quickActions.map((action: any, index: number) => (
          <motion.button
            key={action.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + index * 0.05 }}
            onClick={() => navigate(`/dashboard/codearena/${action.path}`)}
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 text-left hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm transition-all group"
          >
            <div className={`inline-flex p-3 rounded-lg ${action.color} mb-4`}>
              <action.icon className="w-5 h-5 text-white" />
            </div>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{action.title}</h3>
            <p className="text-sm text-gray-500 dark:text-white mb-4">{action.description}</p>

            <div className="flex items-center gap-1 text-[#00ADB5] dark:text-[#00ADB5] text-sm font-medium group-hover:gap-2 transition-all">
              <span>Get Started</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </motion.button>
        ))}
      </div>

      {/* Activity Section */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Live Battles */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-green-600" />
              Live Battles
            </h3>
            <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Live
            </span>
          </div>

          {loadingBattles ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            </div>
          ) : liveBattles.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-white">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No active battles</p>
              <button
                onClick={() => navigate('/dashboard/codearena/battle')}
                className="mt-2 text-xs text-[#00ADB5] hover:underline"
              >
                Start a battle
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {liveBattles.map((battle, i) => (
                <div
                  key={battle.id || i}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      {battle.participants?.slice(0, 2).map((participant: any, idx: number) => (
                        <div
                          key={idx}
                          className={`w-7 h-7 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-bold text-white ${
                            idx === 0 ? 'bg-[#00ADB5]' : 'bg-purple-500'
                          }`}
                        >
                          {participant.userName?.[0] || '?'}
                        </div>
                      ))}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {battle.participants?.[0]?.userName || 'Player'} vs {battle.participants?.[1]?.userName || 'Waiting...'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-white capitalize">{battle.difficulty || 'Medium'}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    battle.status === 'waiting'
                      ? 'text-[#00ADB5] bg-[#00ADB5]/10 dark:bg-[#00ADB5]/20'
                      : 'text-orange-600 bg-orange-50 dark:bg-orange-900/30'
                  }`}>
                    {battle.status === 'waiting' ? 'Waiting' : 'In Progress'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Players */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-500" />
              Top Players
            </h3>
            <button
              onClick={() => navigate('/dashboard/codearena/leaderboard')}
              className="text-sm text-[#00ADB5] dark:text-[#00ADB5] hover:underline"
            >
              View All
            </button>
          </div>

          {loadingPlayers ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            </div>
          ) : topPlayers.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-white">
              <Crown className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No rankings yet</p>
              <button
                onClick={() => navigate('/dashboard/practice')}
                className="mt-2 text-xs text-[#00ADB5] hover:underline"
              >
                Start solving challenges
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {topPlayers.map((player) => {
                const rankColors = [
                  'text-amber-500 bg-amber-50 dark:bg-amber-900/30',
                  'text-gray-400 bg-gray-100 dark:bg-gray-700',
                  'text-orange-500 bg-orange-50 dark:bg-orange-900/30'
                ];
                return (
                  <div key={player.odId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${rankColors[player.rank - 1] || 'text-gray-600 dark:text-white bg-gray-50 dark:bg-gray-700'}`}>
                        {player.rank}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{player.odName}</p>
                        <p className="text-xs text-gray-500 dark:text-white">{player.problemsSolved} solved</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-amber-500">
                      <span className="text-sm">🪙</span>
                      <span className="text-sm font-medium">{player.coins || player.totalCoins || 0}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Main CodeArena component with Error Boundary
const CodeArena = () => {
  return (
    <ErrorBoundary>
      <CodeArenaContent />
    </ErrorBoundary>
  );
};

export default CodeArena;
