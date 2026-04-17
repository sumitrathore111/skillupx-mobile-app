import { motion } from 'framer-motion';
import {
    Calendar,
    ChevronRight,
    Coins,
    Crown,
    Loader2,
    Swords,
    Target,
    Trophy,
    XCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { apiRequest } from '../../service/api';

interface BattleHistoryItem {
  id: string;
  status: 'waiting' | 'countdown' | 'active' | 'completed' | 'forfeited' | 'cancelled';
  winnerId?: string;
  winReason?: string;
  forfeitedBy?: string;
  prize: number;
  entryFee: number;
  difficulty: string;
  participants: {
    odId: string;
    odName: string;
    odProfilePic?: string;
    hasSubmitted?: boolean;
    submissionResult?: {
      passed: boolean;
      passedCount: number;
      totalCount: number;
      totalTime: number;
    };
  }[];
  challenge?: {
    title: string;
    difficulty: string;
  };
  createdAt: { toDate?: () => Date } | Date | number;
  endTime?: { toDate?: () => Date } | Date | number;
}

const BattleHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [battles, setBattles] = useState<BattleHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'won' | 'lost'>('all');
  const [stats, setStats] = useState({
    totalBattles: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    totalEarnings: 0
  });

  useEffect(() => {
    const fetchBattleHistory = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Fetch user's battles from backend
        const response = await apiRequest(`/battles/user/${user.id}`);
        const userBattles = response.battles || [];

        console.log('User battles:', userBattles.length);
        console.log('Current user ID:', user.id);

        console.log('User participated in:', userBattles.length, 'battles');

        // Filter to only show completed/forfeited battles for history
        const completedBattles = userBattles.filter((b: any) =>
          b.status === 'completed' || b.status === 'forfeited'
        );

        // Sort by creation date (newest first)
        completedBattles.sort((a: any, b: any) => {
          const getTime = (ts: { toDate?: () => Date } | Date | number | undefined) => {
            if (!ts) return 0;
            if (typeof ts === 'object' && 'toDate' in ts && ts.toDate) {
              return ts.toDate().getTime();
            }
            if (ts instanceof Date) return ts.getTime();
            return typeof ts === 'number' ? ts : 0;
          };
          return getTime(b.createdAt) - getTime(a.createdAt);
        });

        console.log('Completed battles:', completedBattles.length);
        if (completedBattles.length > 0) {
          console.log('Sample battle:', completedBattles[0]);
        }

        setBattles(completedBattles);

        // Calculate stats
        let wins = 0;
        let losses = 0;
        let totalEarnings = 0;

        userBattles.forEach((battle: any) => {
          const isWinner = battle.winnerId === user.id;
          if (isWinner) {
            wins++;
            totalEarnings += battle.prize || 0;
          } else if (battle.winnerId && battle.winnerId !== user.id) {
            losses++;
            totalEarnings -= battle.entryFee || 0;
          }
        });

        setStats({
          totalBattles: userBattles.length,
          wins,
          losses,
          winRate: userBattles.length > 0 ? Math.round((wins / userBattles.length) * 100) : 0,
          totalEarnings
        });

      } catch (error) {
        console.error('Error fetching battle history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBattleHistory();
  }, [user]);

  const getFilteredBattles = () => {
    if (filter === 'all') return battles;
    if (filter === 'won') return battles.filter(b => b.winnerId === user?.id);
    if (filter === 'lost') return battles.filter(b => b.winnerId && b.winnerId !== user?.id);
    return battles;
  };

  const formatDate = (timestamp: { toDate?: () => Date } | Date | number | null | undefined) => {
    if (!timestamp) return 'N/A';
    let date: Date;
    if (typeof timestamp === 'object' && 'toDate' in timestamp && timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date(timestamp as number);
    }
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getOpponent = (battle: BattleHistoryItem) => {
    const participant = battle.participants?.find(p => {
      const part = p as { odId?: string; userId?: string };
      return part.odId !== user?.id && part.userId !== user?.id;
    });
    return participant;
  };

  const getMyResult = (battle: BattleHistoryItem) => {
    const participant = battle.participants?.find(p => {
      const part = p as { odId?: string; userId?: string };
      return part.odId === user?.id || part.userId === user?.id;
    });
    return participant;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#00ADB5] animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading battle history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Hero Header */}
      <header className="relative overflow-hidden py-8 md:py-12" style={{ background: 'linear-gradient(135deg, #00ADB5 0%, #00d4ff 100%)' }}>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Swords className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white">Battle History</h1>
                  <p className="text-white/80 text-sm">Your past matches and performance</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate('/dashboard/codearena/battle')}
              className="px-5 py-2.5 bg-white text-[#00ADB5] font-semibold rounded-xl hover:bg-white/90 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2"
            >
              <Swords className="w-4 h-4" />
              New Battle
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4"
        >
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-4 hover:shadow-xl transition-all">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <Target className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Battles</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalBattles}</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-2xl shadow-lg border border-green-100 dark:border-green-800 p-4 hover:shadow-xl transition-all">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-800/50 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-xs text-green-600 dark:text-green-400 mb-1">Victories</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.wins}</p>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/30 dark:to-orange-900/30 rounded-2xl shadow-lg border border-red-100 dark:border-red-800 p-4 hover:shadow-xl transition-all">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-800/50 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <p className="text-xs text-red-600 dark:text-red-400 mb-1">Defeats</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.losses}</p>
          </div>

          <div className="bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-cyan-900/30 dark:to-teal-900/30 rounded-2xl shadow-lg border border-cyan-100 dark:border-cyan-800 p-4 hover:shadow-xl transition-all">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-xl bg-[#00ADB5]/20 flex items-center justify-center">
                <Crown className="w-5 h-5 text-[#00ADB5]" />
              </div>
            </div>
            <p className="text-xs text-[#00ADB5] mb-1">Win Rate</p>
            <p className="text-2xl font-bold text-[#00ADB5]">{stats.winRate}%</p>
          </div>

          <div className={`rounded-2xl shadow-lg border p-4 hover:shadow-xl transition-all ${
            stats.totalEarnings >= 0
              ? 'bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/30 border-amber-100 dark:border-amber-800'
              : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-700'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                stats.totalEarnings >= 0 ? 'bg-amber-100 dark:bg-amber-800/50' : 'bg-gray-100 dark:bg-gray-700'
              }`}>
                <Coins className={`w-5 h-5 ${stats.totalEarnings >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-600'}`} />
              </div>
            </div>
            <p className={`text-xs mb-1 ${stats.totalEarnings >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500'}`}>Total Earnings</p>
            <p className={`text-2xl font-bold ${stats.totalEarnings >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600'}`}>
              {stats.totalEarnings >= 0 ? '+' : ''}{stats.totalEarnings}
            </p>
          </div>
        </motion.div>

        {/* Filter Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-2 bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 p-1.5 w-fit"
        >
          {[
            { id: 'all', label: 'All Battles', count: battles.length },
            { id: 'won', label: 'Victories', count: battles.filter(b => b.winnerId === user?.id).length },
            { id: 'lost', label: 'Defeats', count: battles.filter(b => b.winnerId && b.winnerId !== user?.id).length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as 'all' | 'won' | 'lost')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                filter === tab.id
                  ? 'bg-gradient-to-r from-[#00ADB5] to-[#00d4ff] text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                filter === tab.id ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </motion.div>

        {/* Battle List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          {getFilteredBattles().length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-700 mx-auto mb-4 flex items-center justify-center">
                <Swords className="w-10 h-10 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">No battles found</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                {filter === 'all'
                  ? "You haven't participated in any battles yet. Start your first battle and prove your coding skills!"
                  : filter === 'won'
                    ? "No victories yet. Keep practicing and you'll get there!"
                    : "No defeats recorded. You're doing great!"}
              </p>
              <button
                onClick={() => navigate('/dashboard/codearena/battle')}
                className="px-6 py-3 bg-gradient-to-r from-[#00ADB5] to-[#00d4ff] text-white font-semibold rounded-xl hover:shadow-lg transition-all transform hover:scale-105 inline-flex items-center gap-2"
              >
                <Swords className="w-5 h-5" />
                Start Your First Battle
              </button>
            </div>
          ) : (
            getFilteredBattles().map((battle, index) => {
              const isWinner = battle.winnerId === user?.id;
              const opponent = getOpponent(battle);
              const myResult = getMyResult(battle);
              const wonByForfeit = battle.status === 'forfeited' && battle.forfeitedBy !== user?.id;
              const lostByForfeit = battle.status === 'forfeited' && battle.forfeitedBy === user?.id;

              return (
                <motion.div
                  key={battle.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/dashboard/codearena/battle/results/${battle.id}`)}
                  className={`bg-white dark:bg-gray-900 rounded-2xl shadow-md border-2 p-4 cursor-pointer hover:shadow-xl transition-all group ${
                    isWinner
                      ? 'border-green-200 dark:border-green-700/50 hover:border-green-400 dark:hover:border-green-600'
                      : 'border-red-200 dark:border-red-700/50 hover:border-red-400 dark:hover:border-red-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    {/* Left - Result & Opponent */}
                    <div className="flex items-center gap-4">
                      {/* Result Badge */}
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-lg ${
                        isWinner
                          ? 'bg-gradient-to-br from-green-400 to-emerald-500'
                          : 'bg-gradient-to-br from-red-400 to-orange-500'
                      }`}>
                        {isWinner ? (
                          <Trophy className="w-7 h-7 text-white" />
                        ) : (
                          <XCircle className="w-7 h-7 text-white" />
                        )}
                      </div>

                      {/* Battle Info */}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-lg font-bold ${isWinner ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {isWinner ? '🏆 Victory' : '💔 Defeat'}
                          </span>
                          {wonByForfeit && (
                            <span className="text-xs px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400 rounded-full font-medium">
                              Opponent Left
                            </span>
                          )}
                          {lostByForfeit && (
                            <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full font-medium">
                              Forfeited
                            </span>
                          )}
                        </div>

                        <p className="text-gray-700 dark:text-gray-300 font-medium">
                          vs <span className="text-gray-900 dark:text-white">{opponent?.odName || 'Unknown Player'}</span>
                        </p>

                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(battle.endTime || battle.createdAt)}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                            battle.difficulty === 'easy' ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400' :
                            battle.difficulty === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400' :
                            'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400'
                          }`}>
                            {battle.difficulty}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right - Stats & Coins */}
                    <div className="flex items-center gap-6">
                      {/* Test Results */}
                      {myResult?.submissionResult && (
                        <div className="text-center hidden md:block bg-gray-50 dark:bg-gray-700/50 px-4 py-2 rounded-xl">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Tests Passed</p>
                          <p className={`text-lg font-bold ${myResult.submissionResult.passed ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                            {myResult.submissionResult.passedCount}/{myResult.submissionResult.totalCount}
                          </p>
                        </div>
                      )}

                      {/* Coins */}
                      <div className={`text-center px-4 py-2 rounded-xl ${
                        isWinner ? 'bg-green-50 dark:bg-green-900/30' : 'bg-red-50 dark:bg-red-900/30'
                      }`}>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Coins</p>
                        <p className={`text-lg font-bold flex items-center justify-center gap-1 ${isWinner ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          <Coins className="w-4 h-4" />
                          {isWinner ? '+' : '-'}{isWinner ? battle.prize : battle.entryFee}
                        </p>
                      </div>

                      {/* Arrow */}
                      <div className="hidden md:flex w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 items-center justify-center group-hover:bg-[#00ADB5] group-hover:text-white transition-all">
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  </div>

                  {/* Win Reason */}
                  {battle.winReason && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-semibold text-gray-800 dark:text-gray-200">Result: </span>
                        {battle.winReason}
                      </p>
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default BattleHistory;
