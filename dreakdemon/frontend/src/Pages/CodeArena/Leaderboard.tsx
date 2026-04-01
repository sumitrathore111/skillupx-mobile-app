import { motion } from 'framer-motion';
import {
    Award,
    Calendar,
    Clock,
    Crown,
    Loader2,
    Medal,
    Star,
    Trophy
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../../Context/AuthContext';
import { useDataContext } from '../../Context/UserDataContext';

const Leaderboard = () => {
  const { user } = useAuth();
  const { fetchGlobalLeaderboard, fetchWeeklyLeaderboard, fetchMonthlyLeaderboard, getUserWallet } = useDataContext();

  const [activeTab, setActiveTab] = useState<'global' | 'weekly' | 'monthly'>('global');
  const [rankings, setRankings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      try {
        let data: any[] = [];

        switch (activeTab) {
          case 'global':
            data = await fetchGlobalLeaderboard();
            break;
          case 'weekly':
            data = await fetchWeeklyLeaderboard();
            break;
          case 'monthly':
            data = await fetchMonthlyLeaderboard();
            break;
        }

        setRankings(data);

        // Get user's wallet for their stats
        if (user) {
          const walletData = await getUserWallet(user.id);
          setWallet(walletData);

          // Find user's rank
          const userRank = data.find((r: any) => r.odId === user.id);
          if (userRank) {
            setMyRank(userRank);
          }
        }
      } catch (error) {
        console.error('Error loading leaderboard:', error);
        setRankings([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [activeTab, user]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <div className="space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
              <Trophy className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">🏆 Leaderboard</h2>
              <p className="text-gray-500 dark:text-white text-sm">Compete with the best coders</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 bg-gray-100 dark:bg-gray-700 p-2 rounded-lg">
            {[
              { id: 'global', label: 'All Time', icon: Trophy },
              { id: 'weekly', label: 'Weekly', icon: Calendar },
              { id: 'monthly', label: 'Monthly', icon: Clock },
            ].map((tab) => (
              <motion.button
                key={tab.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-[#00ADB5] text-white'
                    : 'text-gray-600 dark:text-white hover:text-gray-800 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Top 3 Podium */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 text-center">Top Performers</h3>

        <div className="flex items-end justify-center gap-4 md:gap-8">
          {/* 2nd Place */}
          {rankings[1] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-col items-center"
            >
              <div className="relative mb-3">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gray-500 flex items-center justify-center text-xl md:text-2xl font-bold text-white shadow-md border-2 border-gray-400">
                  {rankings[1]?.avatar || rankings[1]?.odName?.[0] || '?'}
                </div>
                <div className="absolute -top-1 -right-1 w-7 h-7 bg-gray-600 rounded-full flex items-center justify-center shadow-md">
                  <span className="text-white text-sm font-bold">2</span>
                </div>
              </div>
              <p className="text-gray-900 dark:text-white font-semibold text-sm md:text-base text-center truncate max-w-[80px] md:max-w-[100px]">
                {rankings[1]?.odName}
              </p>
              <p className="text-gray-600 dark:text-white text-xs">Level {rankings[1]?.level}</p>
              <div className="mt-3 h-20 w-20 md:w-24 rounded-t-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex flex-col items-center justify-center">
                <span className="text-[#00ADB5] font-bold text-lg">🪙 {rankings[1]?.coins || rankings[1]?.totalCoins || 0}</span>
                <span className="text-gray-600 dark:text-white text-xs">{rankings[1]?.problemsSolved} solved</span>
              </div>
            </motion.div>
          )}

          {/* 1st Place */}
          {rankings[0] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center -mt-4"
            >
              <div className="relative mb-3">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-amber-500 flex items-center justify-center text-2xl md:text-3xl font-bold text-white shadow-xl border-3 border-amber-400">
                  {rankings[0]?.avatar || rankings[0]?.odName?.[0] || '?'}
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center shadow-lg">
                  <Crown className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-gray-900 dark:text-white font-bold text-base md:text-lg text-center truncate max-w-[100px] md:max-w-[120px]">
                {rankings[0]?.odName}
              </p>
              <p className="text-gray-600 dark:text-white text-xs">Level {rankings[0]?.level}</p>
              <div className="mt-3 h-28 w-24 md:w-28 rounded-t-xl bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 shadow-md flex flex-col items-center justify-center">
                <span className="text-[#00ADB5] font-bold text-xl">🪙 {rankings[0]?.coins || rankings[0]?.totalCoins || 0}</span>
                <span className="text-gray-600 dark:text-white text-xs">{rankings[0]?.problemsSolved} solved</span>
              </div>
            </motion.div>
          )}

          {/* 3rd Place */}
          {rankings[2] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center"
            >
              <div className="relative mb-3">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-orange-500 flex items-center justify-center text-xl md:text-2xl font-bold text-white shadow-md border-2 border-orange-400">
                  {rankings[2]?.avatar || rankings[2]?.odName?.[0] || '?'}
                </div>
                <div className="absolute -top-1 -right-1 w-7 h-7 bg-orange-600 rounded-full flex items-center justify-center shadow-md">
                  <span className="text-white text-sm font-bold">3</span>
                </div>
              </div>
              <p className="text-gray-900 dark:text-white font-semibold text-sm md:text-base text-center truncate max-w-[80px] md:max-w-[100px]">
                {rankings[2]?.odName}
              </p>
              <p className="text-gray-600 dark:text-white text-xs">Level {rankings[2]?.level}</p>
              <div className="mt-3 h-16 w-20 md:w-24 rounded-t-xl bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 flex flex-col items-center justify-center">
                <span className="text-[#00ADB5] font-bold text-lg">🪙 {rankings[2]?.coins || rankings[2]?.totalCoins || 0}</span>
                <span className="text-gray-600 dark:text-white text-xs">{rankings[2]?.problemsSolved} solved</span>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Your Rank Card */}
      {wallet && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border border-[#00ADB5]/30 dark:border-blue-700 rounded-xl p-5"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xl font-bold text-white shadow-lg">
                  {wallet?.userName?.[0] || 'Y'}
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#00ADB5] rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-white dark:border-gray-800">
                  {myRank?.rank || '?'}
                </div>
              </div>

              <div>
                <p className="text-gray-900 dark:text-white font-semibold text-lg">{wallet?.userName || 'You'}</p>
                <p className="text-sm text-gray-500 dark:text-white">Your Current Rank</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-[#00ADB5] font-bold text-xl">🪙 {wallet?.coins || 0}</p>
                <p className="text-xs text-gray-500">Coins</p>
              </div>
              <div className="text-center">
                <p className="text-emerald-600 font-bold text-xl">{myRank?.problemsSolved || 0}</p>
                <p className="text-xs text-gray-500 dark:text-white">Solved</p>
              </div>
              <div className="text-center">
                <p className="text-purple-600 font-bold text-xl">{myRank?.battlesWon || 0}</p>
                <p className="text-xs text-gray-500 dark:text-white">Wins</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Rankings List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
      >
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300">
          <div className="col-span-1 text-center">#</div>
          <div className="col-span-5">Player</div>
          <div className="col-span-2 text-center">Coins</div>
          <div className="col-span-2 text-center hidden sm:block">Solved</div>
          <div className="col-span-2 text-center hidden sm:block">Wins</div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-[#00ADB5] animate-spin" />
          </div>
        ) : rankings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-white">
            <Trophy className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-lg font-medium">No rankings yet</p>
            <p className="text-sm">Start solving challenges to appear on the leaderboard!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {rankings.map((player, index) => (
              <motion.div
                key={player.odId || index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className={`grid grid-cols-12 gap-2 px-4 py-4 items-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  player.odId === user?.id ? 'bg-[#00ADB5]/10 dark:bg-[#00ADB5]/20 border-l-4 border-[#00ADB5]' : ''
                }`}
              >
                {/* Rank */}
                <div className="col-span-1 flex items-center justify-center">
                  {player.rank <= 3 ? (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      player.rank === 1 ? 'bg-yellow-100' :
                      player.rank === 2 ? 'bg-gray-100' :
                      'bg-amber-100'
                    }`}>
                      {getRankIcon(player.rank)}
                    </div>
                  ) : (
                    <span className="text-gray-500 dark:text-white font-medium">{player.rank}</span>
                  )}
                </div>

                {/* Player */}
                <div className="col-span-5 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ${
                    player.rank === 1 ? 'bg-amber-500' :
                    player.rank === 2 ? 'bg-gray-500' :
                    player.rank === 3 ? 'bg-orange-500' :
                    'bg-gray-400'
                  }`}>
                    {player.avatar || player.odName?.[0] || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-gray-900 dark:text-white font-medium truncate flex items-center gap-2">
                      {player.odName}
                      {player.odId === user?.id && (
                        <span className="text-xs bg-[#00ADB5]/20 dark:bg-blue-900/50 text-[#00ADB5] dark:text-[#00ADB5] px-2 py-0.5 rounded-full font-medium">You</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-white flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-500" />
                      Level {player.level}
                    </p>
                  </div>
                </div>

                {/* Coins */}
                <div className="col-span-2 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-amber-500">🪙</span>
                    <span className="text-[#00ADB5] font-bold">{player.coins || player.totalCoins || 0}</span>
                  </div>
                </div>

                {/* Solved */}
                <div className="col-span-2 text-center hidden sm:block">
                  <span className="text-green-600 font-medium">{player.problemsSolved}</span>
                </div>

                {/* Wins */}
                <div className="col-span-2 text-center hidden sm:block">
                  <span className="text-purple-600 font-medium">{player.battlesWon}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Rewards Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
      >
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-600" />
          Weekly Rewards
        </h3>

        <div className="grid md:grid-cols-3 gap-4">
          {[
            { rank: '1st Place', coins: 100, icon: Crown, bgColor: 'bg-amber-50 dark:bg-amber-900/30', iconBg: 'bg-amber-500', borderColor: 'border-amber-200 dark:border-amber-700' },
            { rank: '2nd Place', coins: 50, icon: Medal, bgColor: 'bg-gray-50 dark:bg-gray-700', iconBg: 'bg-gray-500', borderColor: 'border-gray-200 dark:border-gray-600' },
            { rank: '3rd Place', coins: 200, icon: Medal, bgColor: 'bg-orange-50 dark:bg-orange-900/30', iconBg: 'bg-orange-500', borderColor: 'border-orange-200 dark:border-orange-700' },
          ].map((reward, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.1 }}
              className={`flex items-center gap-4 p-4 rounded-lg border ${reward.bgColor} ${reward.borderColor} hover:shadow-md transition-all`}
            >
              <div className={`p-3 rounded-lg ${reward.iconBg} shadow-sm`}>
                <reward.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-gray-900 dark:text-white font-medium">{reward.rank}</p>
                <p className="text-amber-600 font-bold text-lg">{reward.coins.toLocaleString()} coins</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
      </div>
    </div>
  );
};

export default Leaderboard;
