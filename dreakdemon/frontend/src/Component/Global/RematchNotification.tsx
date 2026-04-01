import { AnimatePresence, motion } from 'framer-motion';
import { Coins, Swords, Trophy, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { useDataContext } from '../../Context/UserDataContext';
import { apiRequest } from '../../service/api';

interface RematchRequest {
  battleId: string;
  challengerName: string;
  challengerAvatar: string;
  challengerRating: number;
  difficulty: string;
  entryFee: number;
  prize: number;
}

interface Wallet {
  coins: number;
  rating?: number;
}

// Store rejected rematch IDs in localStorage to persist across page navigation
const getRejectedRematches = (): string[] => {
  try {
    const stored = localStorage.getItem('rejectedRematches');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const addRejectedRematch = (battleId: string) => {
  const rejected = getRejectedRematches();
  if (!rejected.includes(battleId)) {
    rejected.push(battleId);
    localStorage.setItem('rejectedRematches', JSON.stringify(rejected));
  }
};

const RematchNotification = () => {
  const { user } = useAuth();
  const { userprofile } = useDataContext();
  const navigate = useNavigate();
  const location = window.location.pathname;

  const [incomingRematch, setIncomingRematch] = useState<RematchRequest | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [showFullModal, setShowFullModal] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Only poll when user is on CodeArena-related pages
  const isCodeArenaPage = location.includes('/code-arena') || location.includes('/battle');

  // Subscribe to wallet updates - only when on CodeArena pages
  useEffect(() => {
    if (!user?.id || !isCodeArenaPage) return;
    
    // Fetch wallet data from backend
    const fetchWallet = async () => {
      try {
        const response = await apiRequest(`/wallet/${user.id}`);
        setWallet(response.wallet);
      } catch (error) {
        console.error('Error fetching wallet:', error);
      }
    };
    
    fetchWallet();
    
    // Poll for updates every 30 seconds (reduced from 10)
    const interval = setInterval(fetchWallet, 30000);
    return () => clearInterval(interval);
  }, [user?.id, isCodeArenaPage]);

  // Listen for incoming rematch requests targeting current user - only on CodeArena pages
  useEffect(() => {
    // Only run if user and user.id are defined and on CodeArena pages
    if (!user || !user.id || !isCodeArenaPage) return;

    // Fetch rematch requests from backend
    const fetchRematchRequests = async () => {
      try {
        if (!user || !user.id) return; // Guard inside async as well
        const response = await apiRequest(`/battles/rematch-requests?userId=${user.id}`);
        const battles = response.battles || [];
        const rejectedIds = getRejectedRematches();

        for (const battle of battles) {
          const battleId = battle._id || battle.id;
          const rematchRequest = battle.rematchRequest;

          // Skip if no rematch request exists
          if (!rematchRequest) continue;

          // Skip if already rejected or if the rematch is FROM ourselves (we sent it)
          if (rejectedIds.includes(battleId) || rematchRequest.from === user.id) {
            continue;
          }

          // Only show if this rematch is targeted TO us and status is pending
          if (rematchRequest.to !== user.id || rematchRequest.status !== 'pending') {
            continue;
          }

          // Get challenger info from rematchRequest (the person who sent the rematch)
          // Challenger is the first participant (the one who created the rematch)
          const challenger = battle.participants?.find((p: any) => p.userId === rematchRequest.from);

          setIncomingRematch({
            battleId,
            challengerName: rematchRequest.fromName || challenger?.userName || 'Unknown',
            challengerAvatar: challenger?.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${rematchRequest.from}`,
            challengerRating: challenger?.rating || 1000,
            difficulty: battle.difficulty,
            entryFee: battle.entryFee,
            prize: battle.prize
          });
          setShowToast(true);
          return; // Only show one rematch at a time
        }

        // No valid rematch found
        setIncomingRematch(null);
        setShowToast(false);
        setShowFullModal(false);
      } catch (error) {
        console.error('Error fetching rematch requests:', error);
      }
    };

    fetchRematchRequests();

    // Poll for updates every 15 seconds (reduced from 5 for better performance)
    const interval = setInterval(fetchRematchRequests, 15000);
    return () => clearInterval(interval);
  }, [user, isCodeArenaPage]);

  // Auto-hide toast after 10 seconds
  useEffect(() => {
    if (!showToast || showFullModal) return;

    const timer = setTimeout(() => {
      setShowToast(false);
    }, 10000);

    return () => clearTimeout(timer);
  }, [showToast, showFullModal, incomingRematch?.battleId]);

  const handleAccept = useCallback(async () => {
    if (!incomingRematch || !user || isAccepting) return;

    const { battleId, entryFee } = incomingRematch;

    // Check wallet balance
    if (!wallet || wallet.coins < entryFee) {
      toast.error(`Insufficient coins! You need ${entryFee} coins to accept this rematch.`);
      return;
    }

    setIsAccepting(true);

    try {
      // Accept rematch via backend
      await apiRequest(`/battles/${battleId}/accept-rematch`, {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          userName: userprofile?.name || user.name || 'User',
          userProfilePic: userprofile?.profilePic || '',
          rating: wallet?.rating || 1000
        })
      });

      toast.success(`🎉 Rematch accepted! Starting battle with ${incomingRematch.challengerName}...`, {
        duration: 3000,
        icon: '⚔️'
      });

      setIncomingRematch(null);
      setShowToast(false);
      setShowFullModal(false);
      navigate(`/dashboard/codearena/battle/${battleId}`);
    } catch (error: any) {
      console.error('Error accepting rematch:', error);
      toast.error(error?.message || 'Failed to accept rematch. Please try again.');
    } finally {
      setIsAccepting(false);
    }
  }, [incomingRematch, user, wallet, userprofile, navigate, isAccepting]);

  const handleDecline = useCallback(async () => {
    if (!incomingRematch) return;

    const { battleId, challengerName } = incomingRematch;

    // Mark as rejected locally so it won't show again
    addRejectedRematch(battleId);

    // Update the battle status to rejected - this will notify the rematcher
    try {
      await apiRequest(`/battles/${battleId}/reject-rematch`, {
        method: 'POST',
        body: JSON.stringify({
          rejectedBy: user?.id,
          rejectedByName: userprofile?.name || user?.name || 'User'
        })
      });
      
      toast(`Rematch from ${challengerName} declined`, {
        duration: 3000,
        icon: '❌'
      });
    } catch (error) {
      console.error('Error rejecting rematch:', error);
    }

    setIncomingRematch(null);
    setShowToast(false);
    setShowFullModal(false);
  }, [incomingRematch, user?.id]);

  const handleToastClick = () => {
    setShowToast(false);
    setShowFullModal(true);
  };

  const handleToastClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowToast(false);
  };

  // Don't render if no user or no incoming rematch
  if (!user || !incomingRematch) return null;

  return (
    <>
      {/* Small Toast Notification - Top Right */}
      <AnimatePresence>
        {showToast && !showFullModal && (
          <motion.div
            initial={{ opacity: 0, x: 100, y: -20 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 100 }}
            onClick={handleToastClick}
            className="fixed top-4 right-4 z-[9999] cursor-pointer"
          >
            <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-4 shadow-2xl shadow-orange-500/30 max-w-sm border border-orange-400/30">
              {/* Close button */}
              <button
                onClick={handleToastClose}
                className="absolute -top-2 -right-2 p-1 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors shadow-lg"
              >
                <X className="w-4 h-4 text-white" />
              </button>

              <div className="flex items-center gap-3">
                {/* Animated Swords Icon */}
                <motion.div
                  animate={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
                  className="p-2 bg-white/20 rounded-lg flex-shrink-0"
                >
                  <Swords className="w-6 h-6 text-white" />
                </motion.div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm">⚔️ Rematch Challenge!</p>
                  <p className="text-orange-100 text-xs truncate">
                    {incomingRematch.challengerName} wants a rematch
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-orange-200 flex items-center gap-1">
                      <Coins className="w-3 h-3" /> {incomingRematch.entryFee}
                    </span>
                    <span className="text-xs text-orange-200">•</span>
                    <span className="text-xs text-orange-200 capitalize">{incomingRematch.difficulty}</span>
                  </div>
                </div>

                {/* Avatar */}
                <img
                  src={incomingRematch.challengerAvatar}
                  alt={incomingRematch.challengerName}
                  className="w-10 h-10 rounded-full border-2 border-white/30 flex-shrink-0"
                />
              </div>

              {/* Progress bar for auto-dismiss */}
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 10, ease: 'linear' }}
                className="h-1 bg-white/40 rounded-full mt-3"
              />
              
              <p className="text-orange-100 text-xs text-center mt-2">Click to view details</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Modal */}
      <AnimatePresence>
        {showFullModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999]"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl relative overflow-hidden"
            >
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-orange-100 dark:from-orange-900/30 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-blue-100 dark:from-blue-900/30 to-transparent rounded-full translate-y-12 -translate-x-12"></div>

              {/* Close button */}
              <button
                onClick={handleDecline}
                className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>

              {/* Header */}
              <div className="text-center mb-6 relative">
                <motion.div
                  animate={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                  className="inline-block"
                >
                  <div className="p-4 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl inline-block mb-4 shadow-lg">
                    <Swords className="w-10 h-10 text-white" />
                  </div>
                </motion.div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">⚔️ Rematch Challenge!</h3>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Someone wants a rematch with you</p>
              </div>

              {/* Challenger Info */}
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 rounded-xl mb-6">
                <img
                  src={incomingRematch.challengerAvatar}
                  alt={incomingRematch.challengerName}
                  className="w-16 h-16 rounded-full border-3 border-blue-500 shadow-md"
                />
                <div>
                  <p className="font-bold text-lg text-gray-900 dark:text-white">{incomingRematch.challengerName}</p>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Rating: <span className="font-semibold text-blue-600 dark:text-blue-400">{incomingRematch.challengerRating}</span>
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm capitalize">
                    Difficulty: <span className={`font-semibold ${
                      incomingRematch.difficulty === 'easy' ? 'text-green-600 dark:text-green-400' :
                      incomingRematch.difficulty === 'medium' ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
                    }`}>{incomingRematch.difficulty}</span>
                  </p>
                </div>
              </div>

              {/* Entry Fee & Prize */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-amber-50 dark:bg-amber-900/30 rounded-xl text-center">
                  <Coins className="w-6 h-6 text-amber-600 dark:text-amber-400 mx-auto mb-2" />
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Entry Fee</p>
                  <p className="text-xl font-bold text-amber-700 dark:text-amber-300">{incomingRematch.entryFee}</p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-xl text-center">
                  <Trophy className="w-6 h-6 text-green-600 dark:text-green-400 mx-auto mb-2" />
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium">Prize Pool</p>
                  <p className="text-xl font-bold text-green-700 dark:text-green-300">{incomingRematch.prize}</p>
                </div>
              </div>

              {/* Wallet Balance */}
              <div className="flex items-center justify-center gap-2 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg mb-6">
                <Coins className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <span className="text-gray-700 dark:text-gray-300">
                  Your Balance: <span className="font-bold">{wallet?.coins || 0} coins</span>
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDecline}
                  className="flex-1 py-3 px-4 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Decline
                </motion.button>
                <motion.button
                  whileHover={{ scale: wallet && wallet.coins >= incomingRematch.entryFee ? 1.02 : 1 }}
                  whileTap={{ scale: wallet && wallet.coins >= incomingRematch.entryFee ? 0.98 : 1 }}
                  onClick={handleAccept}
                  disabled={isAccepting || !wallet || wallet.coins < incomingRematch.entryFee}
                  className={`flex-1 py-3 px-4 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
                    wallet && wallet.coins >= incomingRematch.entryFee
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 shadow-lg'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isAccepting ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                    />
                  ) : (
                    <>
                      <Swords className="w-5 h-5" />
                      Accept ({incomingRematch.entryFee} coins)
                    </>
                  )}
                </motion.button>
              </div>

              {wallet && wallet.coins < incomingRematch.entryFee && (
                <p className="text-center text-red-500 text-sm mt-3">
                  Insufficient coins. You need {incomingRematch.entryFee - wallet.coins} more coins.
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default RematchNotification;
