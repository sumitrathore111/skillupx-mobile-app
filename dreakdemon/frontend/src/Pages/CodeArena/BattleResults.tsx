import { motion } from 'framer-motion';
import {
  CheckCircle,
  Clock,
  Coins,
  Crown,
  Home,
  Loader2,
  Medal,
  RotateCcw,
  Star,
  Swords,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { useDataContext } from '../../Context/UserDataContext';
import { apiRequest } from '../../service/api';
import { createRematchBattle } from '../../service/battleService';
import { createBotBattle } from '../../service/battleServiceNew';

interface SubmissionResult {
  passedCount: number;
  totalCount: number;
  totalTime: number;
  passed: boolean;
}

interface Participant {
  odId: string;
  odName: string;
  odProfilePic?: string;
  rating: number;
  level?: number;
  hasSubmitted: boolean;
  submissionResult?: SubmissionResult;
}

interface Battle {
  id: string;
  status: 'waiting' | 'countdown' | 'active' | 'completed' | 'forfeited';
  participants: Participant[];
  winnerId?: string;
  winReason?: string;
  forfeitedBy?: string;
  prizePool?: number;
  prize?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  entryFee?: number;
}

// Simple confetti effect
const triggerConfetti = () => {
  const colors = ['#00ADB5', '#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1'];
  const confettiCount = 100;

  for (let i = 0; i < confettiCount; i++) {
    const confetti = document.createElement('div');
    confetti.style.cssText = `
      position: fixed;
      width: 10px;
      height: 10px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      left: ${Math.random() * 100}vw;
      top: -10px;
      border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
      pointer-events: none;
      z-index: 9999;
      animation: confetti-fall ${2 + Math.random() * 2}s ease-out forwards;
    `;
    document.body.appendChild(confetti);
    setTimeout(() => confetti.remove(), 4000);
  }
};

// Add keyframes for confetti animation
if (typeof document !== 'undefined' && !document.getElementById('confetti-styles')) {
  const style = document.createElement('style');
  style.id = 'confetti-styles';
  style.textContent = `
    @keyframes confetti-fall {
      to {
        transform: translateY(100vh) rotate(720deg);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

const BattleResults = () => {
  const { battleId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { userprofile, getUserWallet } = useDataContext();

  const [battle, setBattle] = useState<Battle | null>(null);
  const [loading, setLoading] = useState(true);
  const [isWinner, setIsWinner] = useState(false);
  const [myData, setMyData] = useState<Participant | null>(null);
  const [opponentData, setOpponentData] = useState<Participant | null>(null);
  const [ratingChange, setRatingChange] = useState(0);
  const [winByForfeit, setWinByForfeit] = useState(false);
  const [winReason, setWinReason] = useState<string>('');
  const [isRequestingRematch, setIsRequestingRematch] = useState(false);
  const [rematchSent, setRematchSent] = useState(false);
  const [updatedCoins, setUpdatedCoins] = useState<number | null>(null);

  // Refresh wallet to show updated balance after battle
  useEffect(() => {
    if (user?.id && battle?.status === 'completed') {
      getUserWallet(user.id).then((walletData) => {
        if (walletData) {
          setUpdatedCoins(walletData.coins);
        }
      });
    }
  }, [user?.id, battle?.status, getUserWallet]);

  useEffect(() => {
    const fetchBattleResults = async () => {
      if (!battleId) return;

      try {
        const response = await apiRequest(`/battles/${battleId}`);
        // Backend returns battle directly, not wrapped in { battle }
        const battleData = (response.battle || response) as Battle;

        console.log('Battle results data:', battleData);

        if (!battleData || !battleData.participants) {
          navigate('/dashboard/codearena');
          return;
        }

        setBattle(battleData);

        // Find my data and opponent data using odId field
        const me = battleData.participants?.find((p: Participant) => p.odId === user?.id);
        const opp = battleData.participants?.find((p: Participant) => p.odId !== user?.id);

        setMyData(me || null);
        setOpponentData(opp || null);

        // Check if winner
        const won = battleData.winnerId === user?.id;
        setIsWinner(won);

        // Check if won by forfeit
        if (battleData.status === 'forfeited' && battleData.forfeitedBy !== user?.id) {
          setWinByForfeit(true);
        }

        // Determine win/lose reason
        let reason = '';
        if (battleData.winReason) {
          reason = battleData.winReason;
        } else if (battleData.status === 'forfeited') {
          if (battleData.forfeitedBy === user?.id) {
            reason = 'You left the battle';
          } else {
            reason = 'Opponent left the battle';
          }
        } else if (me && opp) {
          const myPassed = me.submissionResult?.passedCount || 0;
          const oppPassed = opp.submissionResult?.passedCount || 0;
          const myTime = me.submissionResult?.totalTime || Infinity;
          const oppTime = opp.submissionResult?.totalTime || Infinity;

          if (won) {
            if (myPassed > oppPassed) {
              reason = `You passed more test cases (${myPassed} vs ${oppPassed})`;
            } else if (myPassed === oppPassed && myTime < oppTime) {
              reason = `Same test cases passed, but you were faster!`;
            } else if (!opp.hasSubmitted) {
              reason = 'Opponent did not submit';
            } else {
              reason = 'You solved it better!';
            }
          } else {
            if (oppPassed > myPassed) {
              reason = `Opponent passed more test cases (${oppPassed} vs ${myPassed})`;
            } else if (myPassed === oppPassed && oppTime < myTime) {
              reason = `Same test cases passed, but opponent was faster`;
            } else if (!me.hasSubmitted) {
              reason = 'You did not submit in time';
            } else {
              reason = 'Opponent solved it better';
            }
          }
        }
        setWinReason(reason);

        // Calculate rating change (simplified ELO)
        if (won) {
          setRatingChange(Math.floor(25 + Math.random() * 10));
        } else {
          setRatingChange(-Math.floor(15 + Math.random() * 10));
        }

        setLoading(false);

        // Trigger confetti if winner
        if (won) {
          setTimeout(() => {
            triggerConfetti();
          }, 500);
        }
      } catch (error) {
        console.error('Error fetching battle results:', error);
        setLoading(false);
      }
    };

    fetchBattleResults();
  }, [battleId, user, navigate]);

  // Handle rematch - send request to opponent
  const handleRematch = async () => {
    if (!user || !opponentData || !battle || isRequestingRematch || rematchSent) return;

    setIsRequestingRematch(true);
    try {
      const entryFee = battle.entryFee || 50;
      const difficulty = battle.difficulty || 'easy';

      // Create rematch request battle with original battle ID
      const rematchBattleId = await createRematchBattle(
        {
          difficulty,
          entryFee,
          userId: user.id,
          userName: userprofile?.name || user?.name || 'Player',
          userAvatar: userprofile?.profilePic || userprofile?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
          rating: myData?.rating || 1000,
          originalBattleId: battleId // Pass the original battle ID for rematch
        },
        opponentData.odId,
        opponentData.odName
      );

      if (rematchBattleId) {
        setRematchSent(true);

        // Show toast that rematch request was sent
        toast.success(`⚔️ Rematch request sent to ${opponentData.odName}! Waiting for response...`, {
          duration: 5000,
          icon: '⚔️'
        });

        // Poll for opponent to accept or reject
        const pollRematchStatus = async () => {
          try {
            const response = await apiRequest(`/battles/${rematchBattleId}`);
            // Backend returns battle data directly (not wrapped in { battle: ... })
            const data = response.battle || response;
            if (data?.status === 'countdown' && data?.participants?.length === 2) {
              // Opponent accepted! Navigate to battle
              clearInterval(interval);
              toast.success(`🎉 ${opponentData.odName} accepted the rematch! Starting battle...`, {
                duration: 3000,
                icon: '🎉'
              });
              navigate(`/dashboard/codearena/battle/${rematchBattleId}`);
            } else if (data?.status === 'rejected') {
              // Opponent declined the rematch
              clearInterval(interval);
              setRematchSent(false);
              toast.error(`${opponentData?.odName || 'Opponent'} declined the rematch request.`, {
                duration: 4000,
                icon: '❌'
              });
            }
          } catch (error) {
            console.error("Error polling rematch status:", error);
            clearInterval(interval);
            setRematchSent(false);
          }
        };

        const interval = setInterval(pollRematchStatus, 5000); // Poll every 5 seconds

        // Store interval ID for cleanup
        let isActive = true;

        // Clean up listener after 5 minutes (timeout)
        void setTimeout(() => {
          clearInterval(interval);
          // If still waiting after 5 minutes, reset the button
          if (isActive) {
            isActive = false;
            setRematchSent(false);
            toast('Rematch request timed out. Please try again.', {
              duration: 4000,
              icon: '⏰'
            });
          }
        }, 300000);
      }
    } catch (error) {
      console.error('Error creating rematch:', error);
      toast.error('Failed to send rematch request. Please try again.');
      setRematchSent(false);
    } finally {
      setIsRequestingRematch(false);
    }
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 py-8 px-4 relative overflow-hidden">
      {/* Close Button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => navigate('/dashboard/codearena/battle')}
        className="absolute top-4 right-4 z-50 w-12 h-12 bg-gray-800/80 hover:bg-gray-700 border border-gray-600 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-all shadow-lg"
      >
        <X className="w-6 h-6" />
      </motion.button>

      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-40 h-40 bg-gradient-to-br from-cyan-500/20 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute top-40 right-20 w-60 h-60 bg-gradient-to-br from-purple-500/15 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-32 h-32 bg-gradient-to-br from-yellow-500/20 to-transparent rounded-full blur-2xl"></div>
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Result Header */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center mb-10 relative"
        >
          {isWinner ? (
            <>
              <motion.div
                animate={{
                  rotate: [0, -10, 10, -10, 10, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ duration: 0.8, delay: 0.3, repeat: Infinity, repeatDelay: 3 }}
                className="w-40 h-40 mx-auto mb-6 bg-gradient-to-br from-yellow-400 via-orange-400 to-amber-500 rounded-full flex items-center justify-center shadow-2xl shadow-yellow-500/50 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-300/30 to-orange-300/30 rounded-full animate-pulse"></div>
                <Trophy className="w-20 h-20 text-white relative z-10" />
              </motion.div>
              <motion.h1
                initial={{ y: 20 }}
                animate={{ y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-6xl font-bold bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-500 bg-clip-text text-transparent mb-4"
              >
                🏆 Victory!
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="text-2xl text-gray-300 mb-4"
              >
                {winByForfeit
                  ? '🚪 Your opponent left the battle!'
                  : '✨ Congratulations! You won the battle! ✨'}
              </motion.p>
              {winByForfeit && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9 }}
                  className="text-lg text-yellow-400"
                >
                  Prize coins have been awarded to you!
                </motion.p>
              )}
            </>
          ) : (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="w-36 h-36 mx-auto mb-6 bg-gradient-to-br from-gray-600 via-gray-700 to-gray-800 rounded-full flex items-center justify-center shadow-2xl shadow-gray-500/30 relative overflow-hidden"
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-gray-500/20 to-gray-400/20 rounded-full"
                  animate={{ opacity: [0.3, 0.5, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <Medal className="w-18 h-18 text-gray-400 relative z-10" />
              </motion.div>
              <motion.h1
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-5xl font-bold bg-gradient-to-r from-gray-400 via-gray-500 to-gray-400 bg-clip-text text-transparent mb-4"
              >
                💔 Defeat
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-xl text-gray-300 mb-2"
              >
                Good effort! Keep practicing!
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="text-md text-cyan-400"
              >
                💪 Every defeat is a step towards victory!
              </motion.p>
            </>
          )}

          {/* Win/Lose Reason */}
          {winReason && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className={`mt-6 px-6 py-3 rounded-xl border ${
                isWinner
                  ? 'bg-green-500/10 border-green-500/30 text-green-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}
            >
              <p className="text-lg font-medium">
                📋 {winReason}
              </p>
            </motion.div>
          )}
        </motion.div>

        {/* Players Comparison */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-gray-800/60 via-gray-900/60 to-black/60 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 mb-8 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-cyan-500/10 to-transparent rounded-full -translate-y-10 translate-x-10"></div>

          <div className="grid grid-cols-3 gap-6 items-center">
            {/* Player 1 (You) */}
            <motion.div
              initial={{ x: -30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-center"
            >
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                className={`w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg ${
                  isWinner
                    ? 'bg-gradient-to-br from-yellow-400 to-amber-500 ring-4 ring-yellow-500/50 shadow-yellow-500/30'
                    : 'bg-gradient-to-br from-cyan-400 to-blue-500 ring-2 ring-cyan-500/30 shadow-cyan-500/20'
                }`}
              >
                {userprofile?.name?.[0] || 'Y'}
              </motion.div>
              <p className="text-white font-bold text-lg">{userprofile?.name || 'You'}</p>
              <p className="text-sm text-gray-400 mb-2">Level {myData?.level || 1}</p>
              {isWinner && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.8, type: "spring" }}
                  className="flex items-center justify-center gap-2 mt-2 text-yellow-400"
                >
                  <Crown className="w-5 h-5" />
                  <span className="text-sm font-semibold">🏆 Winner</span>
                </motion.div>
              )}
            </motion.div>

            {/* VS */}
            <div className="text-center">
              <motion.div
                animate={{ rotateY: [0, 180, 360] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent"
              >
                VS
              </motion.div>
            </div>

            {/* Player 2 (Opponent) */}
            <motion.div
              initial={{ x: 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-center"
            >
              <motion.div
                whileHover={{ scale: 1.1, rotate: -5 }}
                className={`w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg ${
                  !isWinner
                    ? 'bg-gradient-to-br from-yellow-400 to-amber-500 ring-4 ring-yellow-500/50 shadow-yellow-500/30'
                    : 'bg-gradient-to-br from-red-400 to-orange-500 ring-2 ring-red-500/30 shadow-red-500/20'
                }`}
              >
                {opponentData?.odName?.[0] || 'O'}
              </motion.div>
              <p className="text-white font-bold text-lg">
                {opponentData?.odName || 'Opponent'}
              </p>
              <p className="text-sm text-gray-400 mb-2">Level {opponentData?.level || 1}</p>
              {!isWinner && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.8, type: "spring" }}
                  className="flex items-center justify-center gap-2 mt-2 text-yellow-400"
                >
                  <Crown className="w-5 h-5" />
                  <span className="text-sm font-semibold">🏆 Winner</span>
                </motion.div>
              )}
            </motion.div>
          </div>
        </motion.div>

        {/* Stats Comparison */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6 mb-6"
        >
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-cyan-400" />
            Battle Stats
          </h3>

          <div className="space-y-4">
            {/* Tests Passed */}
            <div className="grid grid-cols-3 gap-4 items-center">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">
                  {myData?.submissionResult?.passedCount || 0}/{myData?.submissionResult?.totalCount || 0}
                </p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-gray-400">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">Tests Passed</span>
                </div>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">
                  {opponentData?.submissionResult?.passedCount || 0}/{opponentData?.submissionResult?.totalCount || 0}
                </p>
              </div>
            </div>

            {/* Time Taken */}
            <div className="grid grid-cols-3 gap-4 items-center">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">
                  {myData?.submissionResult?.totalTime || 0}ms
                </p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Time Taken</span>
                </div>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">
                  {opponentData?.submissionResult?.totalTime || 0}ms
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Rewards Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="grid md:grid-cols-2 gap-4 mb-6"
        >
          {/* Coins */}
          <div className={`p-6 rounded-2xl border ${
            isWinner
              ? 'bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border-yellow-500/30'
              : 'bg-gradient-to-br from-red-500/10 to-gray-800/50 border-red-500/20'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">{isWinner ? 'Coins Earned' : 'Entry Fee Lost'}</p>
                <p className={`text-3xl font-bold ${isWinner ? 'text-yellow-400' : 'text-red-400'}`}>
                  {isWinner ? `+${battle?.prize || battle?.prizePool || 0}` : `-${battle?.entryFee || 0}`}
                </p>
                {updatedCoins !== null && (
                  <p className="text-xs text-gray-500 mt-1">
                    Balance: {updatedCoins.toLocaleString()} coins
                  </p>
                )}
              </div>
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                isWinner ? 'bg-yellow-500/20' : 'bg-red-500/20'
              }`}>
                <Coins className={`w-7 h-7 ${isWinner ? 'text-yellow-400' : 'text-red-400'}`} />
              </div>
            </div>
          </div>

          {/* Rating Change */}
          <div className={`p-6 rounded-2xl border ${
            ratingChange > 0
              ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30'
              : 'bg-gradient-to-br from-red-500/20 to-orange-500/20 border-red-500/30'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Rating Change</p>
                <p className={`text-3xl font-bold ${ratingChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {ratingChange > 0 ? '+' : ''}{ratingChange}
                </p>
              </div>
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                ratingChange > 0 ? 'bg-green-500/20' : 'bg-red-500/20'
              }`}>
                {ratingChange > 0 ? (
                  <TrendingUp className="w-7 h-7 text-green-400" />
                ) : (
                  <TrendingDown className="w-7 h-7 text-red-400" />
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* XP Progress */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6 mb-6"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-purple-400" />
              <span className="text-white font-medium">Experience Gained</span>
            </div>
            <span className="text-purple-400 font-bold">+{isWinner ? 50 : 20} XP</span>
          </div>
          <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${isWinner ? 70 : 45}%` }}
              transition={{ delay: 0.7, duration: 1, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
            />
          </div>
          <p className="text-sm text-gray-400 mt-2">350/500 XP to Level Up</p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          {/* Rematch Button - Challenge same opponent */}
          {opponentData?.odId?.startsWith('bot_') ? (
            <motion.button
              whileHover={{ scale: 1.05, y: -2, boxShadow: "0 20px 40px rgba(239, 68, 68, 0.4)" }}
              whileTap={{ scale: 0.98 }}
              onClick={async () => {
                if (!user || !battle) return;
                try {
                  toast.loading('Finding opponent...', { id: 'bot-rematch' });
                  const result = await createBotBattle({
                    difficulty: (battle.difficulty || 'medium') as 'easy' | 'medium' | 'hard',
                    entryFee: battle.entryFee || 50,
                    userId: user.id,
                    userName: userprofile?.name || user.name || 'Player',
                    userAvatar: userprofile?.profilePic || '',
                    rating: userprofile?.rating || 1000
                  });
                  toast.dismiss('bot-rematch');
                  if (result?.battleId) {
                    toast.success('Opponent found! Get ready...');
                    navigate(`/dashboard/codearena/battle/${result.battleId}`);
                  }
                } catch (err: any) {
                  toast.dismiss('bot-rematch');
                  toast.error(err?.message || 'Failed to find opponent');
                }
              }}
              className="flex-1 flex items-center justify-center gap-3 py-4 px-6 bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 text-white font-bold text-lg rounded-xl shadow-lg shadow-red-500/30 hover:shadow-red-500/50 transition-all relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-red-400/20 to-orange-400/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              <Swords className="w-6 h-6 relative" />
              <span className="relative">🔥 Play Again</span>
            </motion.button>
          ) : (
            <motion.button
              whileHover={!rematchSent ? { scale: 1.05, y: -2, boxShadow: "0 20px 40px rgba(239, 68, 68, 0.4)" } : {}}
              whileTap={!rematchSent ? { scale: 0.98 } : {}}
              onClick={handleRematch}
              disabled={isRequestingRematch || rematchSent}
              className={`flex-1 flex items-center justify-center gap-3 py-4 px-6 text-white font-bold text-lg rounded-xl shadow-lg transition-all relative overflow-hidden group disabled:cursor-not-allowed ${
                rematchSent
                  ? 'bg-gradient-to-r from-yellow-600 via-amber-600 to-orange-600 shadow-yellow-500/30'
                  : 'bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 shadow-red-500/30 hover:shadow-red-500/50'
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-red-400/20 to-orange-400/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              {isRequestingRematch ? (
                <Loader2 className="w-6 h-6 relative animate-spin" />
              ) : rematchSent ? (
                <Loader2 className="w-6 h-6 relative animate-spin" />
              ) : (
                <Swords className="w-6 h-6 relative" />
              )}
              <span className="relative">
                {isRequestingRematch ? 'Sending...' : rematchSent ? `⏳ Waiting for ${opponentData?.odName?.split(' ')[0] || 'Opponent'}...` : `🔥 Rematch ${opponentData?.odName?.split(' ')[0] || 'Opponent'}`}
              </span>
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.05, y: -2, boxShadow: "0 20px 40px rgba(59, 130, 246, 0.4)" }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/dashboard/codearena/battle')}
            className="flex-1 flex items-center justify-center gap-3 py-4 px-6 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 text-white font-bold text-lg rounded-xl shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-blue-400/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            <RotateCcw className="w-6 h-6 relative" />
            <span className="relative">⚔️ New Battle</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/dashboard/codearena')}
            className="flex-1 flex items-center justify-center gap-3 py-4 px-6 bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white font-bold text-lg rounded-xl border border-gray-600 hover:border-gray-500 shadow-lg transition-all relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-gray-500/20 to-gray-400/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            <Home className="w-6 h-6 relative" />
            <span className="relative">🏠 Back to Arena</span>
          </motion.button>
        </motion.div>
      </div>


    </div>
  );
};

export default BattleResults;
