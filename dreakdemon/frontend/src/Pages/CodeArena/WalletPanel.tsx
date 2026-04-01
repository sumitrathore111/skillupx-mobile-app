import { motion } from 'framer-motion';
import {
    ArrowDownRight,
    ArrowUpRight,
    Coins,
    Gift,
    History,
    Star,
    Swords,
    Target,
    TrendingDown,
    TrendingUp,
    Trophy,
    Wallet as WalletIcon,
    X,
    Zap
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../../Context/AuthContext';
import { useDataContext } from '../../Context/UserDataContext';

interface WalletPanelProps {
  wallet: any;
  onClose: () => void;
}

const WalletPanel = ({ wallet, onClose }: WalletPanelProps) => {
  const { user } = useAuth();
  const { fetchUserTransactions, getUserProgress } = useDataContext();

  // Debug: Log wallet data
  console.log('WalletPanel received wallet:', wallet);

  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');

  // Initialize stats from wallet data immediately
  const [realStats, setRealStats] = useState({
    problemsSolved: wallet?.achievements?.problemsSolved || 0,
    battlesWon: wallet?.achievements?.battlesWon || wallet?.battlesWon || 0,
    currentStreak: wallet?.achievements?.currentStreak || 0
  });

  // Fetch real stats from backend
  useEffect(() => {
    const fetchRealStats = async () => {
      if (!user) return;

      try {
        // Get problems solved from user progress
        const userProgress = await getUserProgress?.(user.id);
        const solvedCount = userProgress?.solvedChallenges?.length || wallet?.achievements?.problemsSolved || 0;

        // Get battles won and streak from wallet achievements
        const battlesWon = wallet?.achievements?.battlesWon || wallet?.battlesWon || 0;
        const currentStreak = wallet?.achievements?.currentStreak || 0;

        setRealStats({
          problemsSolved: solvedCount,
          battlesWon: battlesWon,
          currentStreak: currentStreak
        });
      } catch (error) {
        console.error('Error fetching real stats:', error);
        setRealStats({
          problemsSolved: wallet?.achievements?.problemsSolved || 0,
          battlesWon: wallet?.achievements?.battlesWon || wallet?.battlesWon || 0,
          currentStreak: wallet?.achievements?.currentStreak || 0
        });
      }
    };

    fetchRealStats();
  }, [user, wallet, getUserProgress]);

  useEffect(() => {
    const loadTransactions = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Transactions are embedded in the wallet object
        // Use wallet.transactions if available, otherwise fetch from API
        if (wallet?.transactions && Array.isArray(wallet.transactions)) {
          console.log('Using wallet transactions:', wallet.transactions.length, 'items');
          // Sort by createdAt descending (newest first)
          const sortedTx = [...wallet.transactions].sort((a, b) => {
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();
            return dateB - dateA;
          });
          setTransactions(sortedTx);
          setLoading(false);
          return;
        }

        // Fallback: Try to fetch from API
        const data = await fetchUserTransactions(user.id);
        console.log('Fetched transactions from API:', data?.length || 0, 'items');

        // Sort by createdAt descending (newest first)
        const sortedData = Array.isArray(data) ? [...data].sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA;
        }) : [];

        setTransactions(sortedData);
      } catch (error) {
        console.error('Error loading transactions:', error);
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    };

    loadTransactions();
  }, [user, wallet, fetchUserTransactions]);

  const getTransactionIcon = (type: string, reason: string) => {
    // Backend uses 'credit' for earned and 'debit' for spent
    if (type === 'credit') {
      if (reason?.toLowerCase().includes('challenge')) return Target;
      if (reason?.toLowerCase().includes('battle') || reason?.toLowerCase().includes('prize')) return Swords;
      if (reason?.toLowerCase().includes('tournament')) return Trophy;
      if (reason?.toLowerCase().includes('marketplace') || reason?.toLowerCase().includes('views')) return Coins;
      if (reason?.toLowerCase().includes('star') || reason?.toLowerCase().includes('rating')) return Star;
      return Gift;
    } else {
      if (reason?.toLowerCase().includes('hint')) return Star;
      if (reason?.toLowerCase().includes('entry') || reason?.toLowerCase().includes('battle')) return Swords;
      return Coins;
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-sm bg-gray-900 border-l border-gray-700/50 overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <WalletIcon className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">My Wallet</h2>
              <p className="text-sm text-gray-400">Manage your coins & rewards</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Balance Card */}
        <div className="p-4">
          <div className="bg-gradient-to-br from-yellow-500/20 via-amber-500/20 to-orange-500/20 border border-yellow-500/30 rounded-2xl p-6">
            <p className="text-gray-400 text-sm mb-1">Total Balance</p>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
                <span className="text-xl font-bold text-gray-900">₿</span>
              </div>
              <span className="text-4xl font-bold text-white">
                {wallet?.coins?.toLocaleString() || 0}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-green-400 mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm">Earned</span>
                </div>
                <p className="text-white font-bold">
                  {wallet?.totalEarned?.toLocaleString() || 0}
                </p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-red-400 mb-1">
                  <TrendingDown className="w-4 h-4" />
                  <span className="text-sm">Spent</span>
                </div>
                <p className="text-white font-bold">
                  {wallet?.totalSpent?.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-4">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'history', label: 'History' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'bg-gray-800/50 text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'overview' ? (
            <div className="space-y-4">
              {/* Battle Rating */}
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-purple-400" />
                    <span className="text-white font-medium">Rating: {wallet?.battleRating || wallet?.rating || 1000}</span>
                  </div>
                  <span className="text-sm text-gray-400">
                    W: {wallet?.battlesWon || 0} / L: {wallet?.battlesLost || 0}
                  </span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(((wallet?.battleRating || 1000) / 2000) * 100, 100)}%` }}
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                  <Target className="w-5 h-5 text-green-400 mb-2" />
                  <p className="text-2xl font-bold text-white">
                    {realStats.problemsSolved}
                  </p>
                  <p className="text-sm text-gray-400">Problems Solved</p>
                </div>
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                  <Swords className="w-5 h-5 text-[#00ADB5] mb-2" />
                  <p className="text-2xl font-bold text-white">
                    {realStats.battlesWon}
                  </p>
                  <p className="text-sm text-gray-400">Battles Won</p>
                </div>
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                  <Coins className="w-5 h-5 text-yellow-400 mb-2" />
                  <p className="text-2xl font-bold text-white">
                    {wallet?.coins || 0}
                  </p>
                  <p className="text-sm text-gray-400">Total Coins</p>
                </div>
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                  <Zap className="w-5 h-5 text-orange-400 mb-2" />
                  <p className="text-2xl font-bold text-white">
                    {realStats.currentStreak}
                  </p>
                  <p className="text-sm text-gray-400">Win Streak</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full"
                  />
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8">
                  <History className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No transactions yet</p>
                </div>
              ) : (
                transactions.map((tx, i) => {
                  const Icon = getTransactionIcon(tx.type, tx.reason);
                  const isCredit = tx.type === 'credit';

                  return (
                    <motion.div
                      key={tx._id || tx.id || i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between p-3 bg-gray-800/50 border border-gray-700/50 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          isCredit ? 'bg-green-500/20' : 'bg-red-500/20'
                        }`}>
                          <Icon className={`w-4 h-4 ${isCredit ? 'text-green-400' : 'text-red-400'}`} />
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{tx.reason || tx.description || 'Transaction'}</p>
                          <p className="text-xs text-gray-400">{formatDate(tx.createdAt)}</p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1 font-bold ${
                        isCredit ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {isCredit ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4" />
                        )}
                        <span>{isCredit ? '+' : '-'}{Math.abs(tx.amount)}</span>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default WalletPanel;


