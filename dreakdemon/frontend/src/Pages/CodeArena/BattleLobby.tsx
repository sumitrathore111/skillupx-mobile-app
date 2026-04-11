import { AnimatePresence, motion } from 'framer-motion';
import {
    AtSign,
    Check,
    ChevronRight,
    Clock,
    Coins,
    Shield,
    Swords,
    Trophy,
    UserPlus,
    Users,
    X,
    Zap
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { useDataContext } from '../../Context/UserDataContext';
import { apiRequest } from '../../service/api';
import { joinOrCreateBattle } from '../../service/battleService';
import {
    acceptBattleInvite,
    createBotBattle,
    getMyBattleInvites,
    inviteUserToBattle,
    rejectBattleInvite,
    searchUsersForInvite
} from '../../service/battleServiceNew';
import {
    initializeSocket,
    joinBattleLobby,
    joinUserRoom,
    leaveBattleLobby,
    leaveUserRoom,
    offBattleCreated,
    offBattleInviteReceived,
    offBattleInviteRejected,
    offBattleMatched,
    offBattleRemoved,
    onBattleCreated,
    onBattleInviteReceived,
    onBattleInviteRejected,
    onBattleMatched,
    onBattleRemoved
} from '../../service/socketService';

interface Wallet {
  coins: number;
  rating?: number;
}

interface BattleLobbyProps {
  wallet: Wallet;
}

interface WaitingBattle {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorProfilePic?: string;
  creatorRating?: number;
  difficulty: 'easy' | 'medium' | 'hard';
  entryFee: number;
  prize: number;
  timeLimit: number;
  status: 'waiting' | 'matched' | 'active';
  challenge?: {
    id: string;
    title: string;
    difficulty: string;
    category: string;
  };
  createdAt: Date;
}

interface SearchUser {
  id: string;
  username: string;
  name: string;
  avatar: string;
}

interface BattleInvite {
  battleId: string;
  fromUserId: string;
  fromUsername: string;
  fromName: string;
  difficulty: string;
  entryFee: number;
  prize: number;
  createdAt: string;
  creatorAvatar: string;
}

const difficulties = [
  { id: 'easy', label: 'Easy', color: 'bg-green-500', rating: '800-1200', time: 15 },
  { id: 'medium', label: 'Medium', color: 'bg-yellow-500', rating: '1200-1600', time: 20 },
  { id: 'hard', label: 'Hard', color: 'bg-red-500', rating: '1600-2000', time: 30 },
];

const entryOptions = [
  { fee: 5, prize: 9 },
  { fee: 10, prize: 18 },
  { fee: 20, prize: 36 },
  { fee: 50, prize: 90 },
];

const BattleLobby = ({ wallet }: BattleLobbyProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { userprofile } = useDataContext();

  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('medium');
  const [selectedEntry, setSelectedEntry] = useState(entryOptions[1]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [waitingBattles, setWaitingBattles] = useState<WaitingBattle[]>([]);
  const [myBattleId, setMyBattleId] = useState<string | null>(null);
  const [searchTime, setSearchTime] = useState(0);
  const [isCreatingBotBattle, setIsCreatingBotBattle] = useState(false);

  // Invite states
  const [inviteSearch, setInviteSearch] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteBattleId, setInviteBattleId] = useState<string | null>(null);
  const [myInvites, setMyInvites] = useState<BattleInvite[]>([]);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Socket: join battle-lobby room + user room on mount ───
  useEffect(() => {
    if (!user) return;
    const socket = initializeSocket();
    if (socket) {
      joinBattleLobby();
      joinUserRoom(user.id);
    }
    return () => {
      leaveBattleLobby();
      leaveUserRoom(user.id);
    };
  }, [user]);

  // ─── Socket: listen for new / removed waiting battles (replaces polling GET /battles) ───
  useEffect(() => {
    if (!user) return;

    // Fetch initial list once
    const fetchInitial = async () => {
      try {
        const response = await apiRequest(`/battles?status=waiting&difficulty=${selectedDifficulty}`);
        const battles = response.battles || [];
        setWaitingBattles(battles.filter((b: WaitingBattle) => b.creatorId !== user.id));
      } catch (error) {
        console.error('Error fetching waiting battles:', error);
      }
    };
    fetchInitial();

    // Real-time additions
    const handleCreated = (battle: WaitingBattle) => {
      if (battle.creatorId === user.id) return;                       // skip own
      if (battle.difficulty !== selectedDifficulty) return;           // wrong tab
      setWaitingBattles(prev => {
        if (prev.some(b => b.id === battle.id)) return prev;         // dedup
        return [...prev, battle as WaitingBattle];
      });
    };

    // Real-time removals (joined or cancelled)
    const handleRemoved = ({ battleId }: { battleId: string }) => {
      setWaitingBattles(prev => prev.filter(b => b.id !== battleId));
    };

    onBattleCreated(handleCreated);
    onBattleRemoved(handleRemoved);

    return () => {
      offBattleCreated(handleCreated);
      offBattleRemoved(handleRemoved);
    };
  }, [user, selectedDifficulty]);

  // ─── Socket: instant match notification (replaces polling GET /battles/:id) ───
  const handleBattleMatched = useCallback(({ battleId }: { battleId: string }) => {
    console.log('⚡ battle-matched received, navigating to', battleId);
    navigate(`/dashboard/codearena/battle/${battleId}`);
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    onBattleMatched(handleBattleMatched);
    return () => { offBattleMatched(handleBattleMatched); };
  }, [user, handleBattleMatched]);

  // ─── Socket: receive battle invites in real-time (replaces polling GET /my-invites) ───
  useEffect(() => {
    if (!user) return;

    // Fetch existing invites once on mount
    const fetchInitialInvites = async () => {
      const invites = await getMyBattleInvites();
      setMyInvites(invites);
    };
    fetchInitialInvites();

    const handleInviteReceived = (invite: BattleInvite) => {
      setMyInvites(prev => {
        if (prev.some(i => i.battleId === invite.battleId)) return prev;
        return [invite, ...prev];
      });
    };

    onBattleInviteReceived(handleInviteReceived);
    return () => { offBattleInviteReceived(handleInviteReceived); };
  }, [user]);

  // ─── Socket: know instantly when sent invite is rejected (replaces polling invite status) ───
  useEffect(() => {
    if (!inviteBattleId) return;

    const handleRejected = ({ battleId }: { battleId: string }) => {
      if (battleId === inviteBattleId) {
        setInviteSent(false);
        setInviteBattleId(null);
        setSelectedUser(null);
        alert('Your invite was declined.');
      }
    };

    onBattleInviteRejected(handleRejected);
    return () => { offBattleInviteRejected(handleRejected); };
  }, [inviteBattleId]);

  // Cancel battle when user leaves the page or closes browser
  // NOTE: Tab switching and window blur handlers removed to allow testing with multiple accounts
  useEffect(() => {
    if (!myBattleId || !isSearching) return;

    const cancelBattle = async () => {
      try {
        // Use sendBeacon for reliable delivery on page unload
        const token = localStorage.getItem('authToken');
        navigator.sendBeacon(
          `https://nextstepbackend-qhxw.onrender.com/api/battles/${myBattleId}/cancel`,
          JSON.stringify({ token })
        );
      } catch (error) {
        console.error('Error cancelling battle:', error);
      }
    };

    // Handle tab close/refresh only
    window.addEventListener('beforeunload', cancelBattle);

    // Handle navigation within app
    return () => {
      window.removeEventListener('beforeunload', cancelBattle);
      // Cancel battle if navigating away while searching
      if (myBattleId && isSearching) {
        apiRequest(`/battles/${myBattleId}`, { method: 'DELETE' }).catch(() => {});
      }
    };
  }, [myBattleId, isSearching]);

  // Search timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isSearching) {
      interval = setInterval(() => {
        setSearchTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSearching]);

  // Auto-connect to bot after 12 seconds if no opponent found (silently)
  useEffect(() => {
    if (isSearching && searchTime >= 15 && myBattleId && !isCreatingBotBattle) {
      // Silently connect to bot - user won't know
      handlePlayVsBot();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSearching, searchTime, myBattleId, isCreatingBotBattle]);

  const handleFindMatch = async () => {
    console.log('handleFindMatch called', { user, wallet, selectedEntry });

    if (!user) {
      alert('Please log in to find a match');
      return;
    }

    if (!wallet) {
      alert('Wallet not loaded. Please wait or refresh the page.');
      return;
    }

    if ((wallet.coins || 0) < selectedEntry.fee) {
      alert(`Insufficient coins! You have ${wallet.coins || 0} coins but need ${selectedEntry.fee} coins.`);
      return;
    }

    setIsSearching(true);
    setSearchTime(0);

    try {
      // First check for existing battles to join immediately
      const matchingBattle = waitingBattles.find(
        (b) => b.difficulty === selectedDifficulty &&
               b.entryFee === selectedEntry.fee &&
               b.creatorId !== user.id
      );

      if (matchingBattle) {
        // Join existing battle - backend handles coin deduction
        await joinBattle(matchingBattle);
      } else {
        // Create new battle - backend handles coin deduction
        await createBattle();
      }
    } catch (error) {
      console.error('Error finding match:', error);
      alert('Failed to find match. Please try again.');
      setIsSearching(false);
    }
  };

  const createBattle = async () => {
    try {
      setIsCreating(true);

      // Ensure wallet exists before verification
      if (!wallet) {
        alert('Wallet not initialized. Please refresh the page.');
        setIsSearching(false);
        return;
      }

      // Simple coin check
      if ((wallet.coins || 0) < selectedEntry.fee) {
        alert(`Insufficient coins! You have ${wallet.coins || 0} coins but need ${selectedEntry.fee} coins.`);
        setIsSearching(false);
        return;
      }

      const battleRequest = {
        difficulty: selectedDifficulty as 'easy' | 'medium' | 'hard',
        entryFee: selectedEntry.fee,
        userId: user!.id,
        userName: userprofile?.name || user!.email?.split('@')[0] || 'User',
        userAvatar: userprofile?.profilePic || '',
        rating: wallet?.rating || 1000
      };

      console.log('Creating battle with request:', battleRequest);
      const battleId = await joinOrCreateBattle(battleRequest);
      console.log('Battle created with ID:', battleId);
      // Backend handles coin deduction

      setMyBattleId(battleId);

    } catch (error: unknown) {
      console.error('Error creating battle:', error);
      alert(error instanceof Error ? error.message : 'Failed to create battle');
      setIsSearching(false);
    } finally {
      setIsCreating(false);
    }
  };

  const joinBattle = async (battle: WaitingBattle) => {
    try {
      // Ensure wallet exists before verification
      if (!wallet) {
        alert('Wallet not initialized. Please refresh the page.');
        setIsSearching(false);
        return;
      }

      // Simple coin check
      if ((wallet.coins || 0) < battle.entryFee) {
        alert(`Insufficient coins! You have ${wallet.coins || 0} coins but need ${battle.entryFee} coins.`);
        setIsSearching(false);
        return;
      }

      console.log('Joining battle:', battle.id);
      await apiRequest(`/battles/${battle.id}/join`, {
        method: 'POST',
        body: JSON.stringify({
          userId: user!.id,
          userName: userprofile?.name || user!.email?.split('@')[0] || 'User',
          userAvatar: userprofile?.profilePic || '',
          rating: wallet?.rating || 1000
        })
      });
      // Backend handles coin deduction

      // Navigate to battle room
      navigate(`/dashboard/codearena/battle/${battle.id}`);

    } catch (error: unknown) {
      console.error('Error joining battle:', error);
      alert(error instanceof Error ? error.message : 'Failed to join battle. Battle may have been taken by another player.');
      setIsSearching(false);
    }
  };

  const handleCancelSearch = async () => {
    if (myBattleId) {
      try {
        // Delete the battle document - backend handles refund automatically
        await apiRequest(`/battles/${myBattleId}`, { method: 'DELETE' });
      } catch (error) {
        console.error('Error cancelling battle:', error);
      }
    }

    setIsSearching(false);
    setMyBattleId(null);
    setSearchTime(0);
  };

  const handlePlayVsBot = async () => {
    if (isCreatingBotBattle) return;
    setIsCreatingBotBattle(true);

    try {
      // Cancel existing waiting battle first
      if (myBattleId) {
        try {
          await apiRequest(`/battles/${myBattleId}`, { method: 'DELETE' });
        } catch {
          console.log('Could not delete own battle, may already be matched');
        }
      }

      // Create bot battle
      const { battleId } = await createBotBattle({
        difficulty: selectedDifficulty as 'easy' | 'medium' | 'hard',
        entryFee: selectedEntry.fee,
        userId: user!.id,
        userName: userprofile?.name || user!.email?.split('@')[0] || 'User',
        userAvatar: userprofile?.profilePic || '',
        rating: wallet?.rating || 1000
      });

      console.log('Battle created:', battleId);
      navigate(`/dashboard/codearena/battle/${battleId}`);
    } catch (error: unknown) {
      console.error('Error creating bot battle:', error);
      alert(error instanceof Error ? error.message : 'Failed to find match');
    } finally {
      setIsCreatingBotBattle(false);
      setIsSearching(false);
    }
  };

  // Debounced username search
  const handleInviteSearch = (value: string) => {
    setInviteSearch(value);
    setSelectedUser(null);
    setInviteSent(false);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (value.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearchingUsers(true);
    searchTimeoutRef.current = setTimeout(async () => {
      const results = await searchUsersForInvite(value);
      setSearchResults(results);
      setIsSearchingUsers(false);
    }, 400);
  };

  const handleSendInvite = async () => {
    if (!selectedUser || !user || !wallet || isSendingInvite) return;

    if (wallet.coins < selectedEntry.fee) {
      alert(`Insufficient coins! Need ${selectedEntry.fee} coins.`);
      return;
    }

    setIsSendingInvite(true);
    try {
      const battleId = await inviteUserToBattle({
        targetUserId: selectedUser.id,
        difficulty: selectedDifficulty as 'easy' | 'medium' | 'hard',
        entryFee: selectedEntry.fee,
        userId: user.id,
        userName: userprofile?.name || user.email?.split('@')[0] || 'User',
        userAvatar: userprofile?.profilePic || '',
        rating: wallet.rating || 1000
      });

      if (battleId) {
        setInviteSent(true);
        setInviteBattleId(battleId);
      }
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Failed to send invite');
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleCancelInvite = async () => {
    if (inviteBattleId) {
      try {
        await apiRequest(`/battles/${inviteBattleId}`, { method: 'DELETE' });
      } catch {
        /* ignore */
      }
    }
    setInviteSent(false);
    setInviteBattleId(null);
    setSelectedUser(null);
    setInviteSearch('');
    setSearchResults([]);
  };

  const handleAcceptInvite = async (invite: BattleInvite) => {
    if (!wallet || wallet.coins < invite.entryFee) {
      alert(`Insufficient coins! Need ${invite.entryFee} coins.`);
      return;
    }
    try {
      await acceptBattleInvite(
        invite.battleId,
        userprofile?.name || user?.email?.split('@')[0] || 'User',
        userprofile?.profilePic || '',
        wallet.rating || 1000
      );
      navigate(`/dashboard/codearena/battle/${invite.battleId}`);
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Failed to accept invite');
    }
  };

  const handleRejectInvite = async (invite: BattleInvite) => {
    try {
      await rejectBattleInvite(invite.battleId);
      setMyInvites(prev => prev.filter(i => i.battleId !== invite.battleId));
    } catch (error: unknown) {
      alert(error instanceof Error ? error.message : 'Failed to reject invite');
    }
  };

  const formatSearchTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Debug wallet state
  const walletCoins = wallet?.coins ?? 0;
  const hasEnoughCoins = walletCoins >= selectedEntry.fee;
  const isButtonDisabled = !wallet || !hasEnoughCoins || isSearching || isCreating;

  console.log('BattleLobby render:', { wallet, walletCoins, selectedEntry, hasEnoughCoins, isButtonDisabled });

  const diffColors: Record<string, { gradient: string; glow: string; badge: string; icon: string }> = {
    easy: { gradient: 'from-teal-400 to-teal-500', glow: '', badge: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30', icon: '🌱' },
    medium: { gradient: 'from-teal-400 to-teal-500', glow: '', badge: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30', icon: '⚡' },
    hard: { gradient: 'from-teal-400 to-teal-500', glow: '', badge: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30', icon: '🔥' },
  };
  const currentDiffColor = diffColors[selectedDifficulty] || diffColors.medium;

  return (
    <div className="space-y-4 pb-20 md:pb-6">

      {/* ═══════ Hero Banner ═══════ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-5 border border-gray-200 dark:border-gray-700/50 shadow-sm dark:shadow-none">
        {/* Animated background orbs */}
        <motion.div animate={{ x: [0, 30, 0], y: [0, -20, 0] }} transition={{ duration: 8, repeat: Infinity }} className="absolute -top-10 -right-10 w-40 h-40 bg-[#00ADB5]/10 rounded-full blur-3xl" />
        <motion.div animate={{ x: [0, -20, 0], y: [0, 15, 0] }} transition={{ duration: 10, repeat: Infinity }} className="absolute -bottom-10 -left-10 w-36 h-36 bg-purple-500/10 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="p-2.5 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl shadow-lg shadow-green-500/20"
              >
                <Swords className="w-6 h-6 text-white" />
              </motion.div>
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Code Arena</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Real-time 1v1 coding battles</p>
              </div>
            </div>

            {/* Wallet Chip */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
              <Coins className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              <span className="text-amber-600 dark:text-amber-300 font-bold text-base">{wallet?.coins?.toLocaleString() || 0}</span>
            </div>
          </div>

          {/* Quick stats row */}
          <div className="flex items-center gap-3 mt-4">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              {waitingBattles.length} online
            </div>
            <div className="w-px h-3 bg-gray-300 dark:bg-gray-700" />
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Shield className="w-3 h-3" /> Ranked
            </div>
            <div className="w-px h-3 bg-gray-300 dark:bg-gray-700" />
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Trophy className="w-3 h-3 text-amber-500 dark:text-amber-400" /> {wallet?.rating || 1000} SR
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ Searching Overlay ═══════ */}
      <AnimatePresence>
        {isSearching && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 max-w-sm w-full mx-4 text-center relative overflow-hidden shadow-xl dark:shadow-none"
            >
              <motion.div animate={{ x: [0, 40, 0] }} transition={{ duration: 6, repeat: Infinity }} className="absolute -top-16 -right-16 w-32 h-32 bg-[#00ADB5]/10 rounded-full blur-2xl" />

              <div className="relative z-10">
                <div className="relative w-20 h-20 mx-auto mb-5">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-0 rounded-full border-[3px] border-gray-200 dark:border-gray-700 border-t-[#00ADB5]"
                  />
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-2 rounded-full border-[3px] border-gray-200 dark:border-gray-700 border-b-purple-500"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Swords className="w-6 h-6 text-[#00ADB5]" />
                  </div>
                </div>

                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Finding Opponent</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">
                  <span className={`font-bold bg-gradient-to-r ${currentDiffColor.gradient} bg-clip-text text-transparent`}>{selectedDifficulty.charAt(0).toUpperCase() + selectedDifficulty.slice(1)}</span> battle
                </p>
                {searchTime >= 5 && !isCreatingBotBattle && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[#00ADB5] text-xs mb-1 animate-pulse">
                    Expanding search...
                  </motion.p>
                )}
                {isCreatingBotBattle && (
                  <p className="text-green-400 text-xs font-semibold mb-1">Opponent found!</p>
                )}

                <div className="text-3xl font-mono font-bold text-gray-900 dark:text-white my-4 tabular-nums tracking-wider">
                  {formatSearchTime(searchTime)}
                </div>

                <div className="flex justify-center gap-4 mb-6 text-xs">
                  <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                    <Users className="w-3.5 h-3.5 text-green-500 dark:text-green-400" />
                    {waitingBattles.length} waiting
                  </span>
                  <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                    <Coins className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                    {selectedEntry.fee} entry
                  </span>
                </div>

                <button
                  onClick={handleCancelSearch}
                  className="w-full py-3 bg-red-500/10 border border-red-500/30 text-red-400 font-semibold rounded-xl hover:bg-red-500/20 transition-all text-sm"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════ Pending Invites ═══════ */}
      {myInvites.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          {myInvites.map((invite) => (
            <motion.div
              key={invite.battleId}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              className="relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-500/5 via-indigo-500/5 to-purple-500/5 border border-purple-200 dark:border-purple-500/20 p-4 mb-2"
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/5 rounded-full blur-2xl" />
              <div className="flex items-center gap-3 relative z-10">
                <div className="relative">
                  <img
                    src={invite.creatorAvatar || `https://api.dicebear.com/9.x/adventurer/svg?seed=${invite.fromUserId}`}
                    alt={invite.fromUsername}
                    className="w-10 h-10 rounded-full ring-2 ring-purple-500/30"
                  />
                  <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-purple-500 rounded-full border-2 border-white dark:border-gray-900" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 dark:text-white font-semibold text-base truncate">@{invite.fromUsername} <span className="text-gray-500 dark:text-gray-400 font-normal">challenged you</span></p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded border ${diffColors[invite.difficulty]?.badge || 'bg-gray-700 text-gray-300'}`}>
                      {invite.difficulty}
                    </span>
                    <span className="text-xs text-amber-400 flex items-center gap-0.5"><Coins className="w-3 h-3" />{invite.entryFee}</span>
                    <span className="text-xs text-green-400 flex items-center gap-0.5"><Trophy className="w-3 h-3" />{invite.prize}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleAcceptInvite(invite)}
                    className="px-3.5 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-green-500/20 hover:shadow-green-500/30 transition-shadow flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" /> Accept
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleRejectInvite(invite)}
                    className="p-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 rounded-lg hover:text-red-400 hover:border-red-500/30 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* ═══════ Battle Setup (two-column on desktop) ═══════ */}
      <div className="grid lg:grid-cols-5 gap-4">

        {/* Left: Config */}
        <div className="lg:col-span-3 space-y-4">
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 shadow-sm dark:shadow-none">
            {/* Difficulty */}
            <p className="text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Difficulty</p>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {difficulties.map((diff) => {
                const dc = diffColors[diff.id];
                const active = selectedDifficulty === diff.id;
                return (
                  <motion.button
                    key={diff.id}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSelectedDifficulty(diff.id)}
                    className={`relative p-3 rounded-xl border transition-all ${
                      active
                        ? `border-transparent bg-gradient-to-br ${dc.gradient} shadow-xl ${dc.glow}`
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <span className="text-lg block">{dc.icon}</span>
                    <p className={`font-bold text-base mt-1 ${active ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>{diff.label}</p>
                    <p className={`text-xs ${active ? 'text-white/70' : 'text-gray-500'}`}>{diff.rating}</p>
                    <div className={`flex items-center justify-center gap-0.5 text-xs mt-0.5 ${active ? 'text-white/60' : 'text-gray-400 dark:text-gray-600'}`}>
                      <Clock className="w-2.5 h-2.5" />{diff.time}m
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Entry Fee */}
            <p className="text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Stakes</p>
            <div className="grid grid-cols-4 gap-2 mb-5">
              {entryOptions.map((option) => {
                const active = selectedEntry.fee === option.fee;
                const locked = wallet?.coins < option.fee;
                return (
                  <motion.button
                    key={option.fee}
                    whileHover={{ scale: locked ? 1 : 1.03 }}
                    whileTap={{ scale: locked ? 1 : 0.97 }}
                    onClick={() => setSelectedEntry(option)}
                    disabled={locked}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      active
                        ? 'border-amber-500/50 bg-amber-500/10 shadow-lg shadow-amber-500/10'
                        : locked
                        ? 'border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800/30 opacity-40 cursor-not-allowed'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className={`font-bold text-base ${active ? 'text-amber-500 dark:text-amber-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      {option.fee} <Coins className="w-3.5 h-3.5 inline text-amber-500" />
                    </div>
                    <div className={`text-xs mt-0.5 ${active ? 'text-green-500 dark:text-green-400' : 'text-gray-500'}`}>
                      Win {option.prize}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Find Match */}
            <motion.button
              whileHover={{ scale: !isButtonDisabled ? 1.02 : 1 }}
              whileTap={{ scale: !isButtonDisabled ? 0.97 : 1 }}
              onClick={handleFindMatch}
              disabled={isButtonDisabled}
              className={`w-full py-3.5 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all ${
                !isButtonDisabled
                  ? `bg-gradient-to-r ${currentDiffColor.gradient} text-white shadow-xl ${currentDiffColor.glow} hover:shadow-2xl cursor-pointer`
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 border border-gray-200 dark:border-gray-700 cursor-not-allowed'
              }`}
            >
              {isCreating ? (
                <>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full" />
                  Matchmaking...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Find Match
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </motion.button>

            {!wallet && <p className="text-center text-amber-500/60 dark:text-amber-400/60 text-xs mt-2">Loading wallet...</p>}
            {wallet && !hasEnoughCoins && (
              <p className="text-center text-red-400/80 text-xs mt-2">
                Need {selectedEntry.fee - walletCoins} more coins
              </p>
            )}
            {wallet && hasEnoughCoins && (
              <p className="text-center text-green-400/60 text-xs mt-2 flex items-center justify-center gap-1">
                <Shield className="w-3 h-3" /> Ready &bull; {walletCoins} coins
              </p>
            )}
          </div>
        </div>

        {/* Right: Invite a Player */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 h-full flex flex-col shadow-sm dark:shadow-none">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-purple-500/10 rounded-lg border border-purple-500/20">
                <UserPlus className="w-4 h-4 text-purple-500 dark:text-purple-400" />
              </div>
              <p className="font-bold text-base text-gray-900 dark:text-white">Challenge a Friend</p>
            </div>

            {!inviteSent ? (
              <div className="flex-1 flex flex-col">
                {/* Search Input */}
                <div className="relative mb-3">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={inviteSearch}
                    onChange={(e) => handleInviteSearch(e.target.value)}
                    placeholder="Type a username..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 placeholder-gray-400 dark:placeholder-gray-600 transition-colors"
                  />
                  {isSearchingUsers && (
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-purple-500/40 border-t-purple-400 rounded-full" />
                  )}
                </div>

                {/* Results dropdown */}
                {searchResults.length > 0 && !selectedUser && (
                  <div className="space-y-0.5 mb-3 max-h-44 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/80">
                    {searchResults.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => { setSelectedUser(u); setSearchResults([]); setInviteSearch(u.username); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-purple-500/10 transition-colors text-left first:rounded-t-xl last:rounded-b-xl"
                      >
                        <img src={u.avatar} alt={u.username} className="w-7 h-7 rounded-full ring-1 ring-gray-200 dark:ring-gray-700" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">@{u.username}</p>
                          <p className="text-xs text-gray-500 truncate">{u.name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {inviteSearch.length >= 2 && !isSearchingUsers && searchResults.length === 0 && !selectedUser && (
                  <p className="text-xs text-gray-500 dark:text-gray-600 mb-3">No users found for &ldquo;{inviteSearch}&rdquo;</p>
                )}

                {/* Selected User Chip */}
                {selectedUser && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between p-3 mb-3 bg-purple-500/10 rounded-xl border border-purple-200 dark:border-purple-500/20"
                  >
                    <div className="flex items-center gap-2.5">
                      <img src={selectedUser.avatar} alt={selectedUser.username} className="w-9 h-9 rounded-full ring-2 ring-purple-500/30" />
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">@{selectedUser.username}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{selectedUser.name}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => { setSelectedUser(null); setInviteSearch(''); }}
                      className="p-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <X className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  </motion.div>
                )}

                {/* Challenge Button */}
                <div className="mt-auto">
                  <motion.button
                    whileHover={{ scale: selectedUser ? 1.02 : 1 }}
                    whileTap={{ scale: selectedUser ? 0.97 : 1 }}
                    onClick={handleSendInvite}
                    disabled={!selectedUser || isSendingInvite || !hasEnoughCoins}
                    className={`w-full py-3 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all ${
                      selectedUser && hasEnoughCoins
                        ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 cursor-pointer'
                        : 'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                    }`}
                  >
                    {isSendingInvite ? (
                      <>
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Swords className="w-4 h-4" />
                        {selectedUser ? `Challenge @${selectedUser.username}` : 'Select a player'}
                      </>
                    )}
                  </motion.button>
                  {selectedUser && hasEnoughCoins && (
                    <p className="text-center text-xs text-gray-500 dark:text-gray-600 mt-1.5">{selectedEntry.fee} coins entry &bull; Win {selectedEntry.prize}</p>
                  )}
                </div>
              </div>
            ) : (
              /* Waiting state */
              <div className="flex-1 flex flex-col items-center justify-center py-6">
                <div className="relative w-16 h-16 mb-4">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} className="absolute inset-0 rounded-full border-[3px] border-gray-200 dark:border-gray-700 border-t-purple-500" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <img src={selectedUser?.avatar} alt="" className="w-9 h-9 rounded-full" />
                  </div>
                </div>
                <p className="text-sm font-bold text-gray-900 dark:text-white mb-0.5">Invite sent to @{selectedUser?.username}</p>
                <p className="text-xs text-gray-500 mb-4">Waiting for response...</p>
                <button
                  onClick={handleCancelInvite}
                  className="px-5 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm font-semibold hover:bg-red-500/20 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════ Open Battles ═══════ */}
      {waitingBattles.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-green-500/10 rounded-lg border border-green-500/20">
                <Users className="w-4 h-4 text-green-500 dark:text-green-400" />
              </div>
              <p className="font-bold text-base text-gray-900 dark:text-white">Open Battles</p>
            </div>
            <span className="flex items-center gap-1.5 text-xs text-green-400">
              <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full bg-green-400" />
              {waitingBattles.length} live
            </span>
          </div>

          <div className="space-y-2">
            {waitingBattles.map((battle) => (
              <motion.div
                key={battle.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={battle.creatorProfilePic || `https://api.dicebear.com/9.x/adventurer/svg?seed=${battle.creatorId}`}
                    alt={battle.creatorName}
                    className="w-9 h-9 rounded-full ring-1 ring-gray-200 dark:ring-gray-700"
                  />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-base">{battle.creatorName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${diffColors[battle.difficulty]?.badge || 'bg-gray-700 text-gray-400'}`}>
                        {battle.difficulty}
                      </span>
                      <span className="text-xs text-gray-500">{battle.creatorRating} SR</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-amber-500 dark:text-amber-400 font-bold text-base">
                      <Coins className="w-3.5 h-3.5" />{battle.entryFee}
                    </div>
                    <div className="text-xs text-green-400/80">Win {battle.prize}</div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={async () => {
                      if (wallet?.coins >= battle.entryFee) {
                        await joinBattle(battle);
                      }
                    }}
                    disabled={wallet?.coins < battle.entryFee}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                      wallet?.coins >= battle.entryFee
                        ? 'bg-[#00ADB5] text-white shadow-lg shadow-[#00ADB5]/20 hover:shadow-[#00ADB5]/30'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                    }`}
                  >
                    Join
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ═══════ How It Works ═══════ */}
      <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 shadow-sm dark:shadow-none">
        <p className="text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">How It Works</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Coins, title: 'Stake Coins', desc: 'Entry fee fuels the pool', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
            { icon: Swords, title: 'Battle', desc: 'Solve the problem faster', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
            { icon: Trophy, title: 'Win Prize', desc: 'Winner takes the pool', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
          ].map((step, i) => (
            <div key={i} className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-800">
              <div className={`w-9 h-9 rounded-lg ${step.color} border flex items-center justify-center mx-auto mb-2`}>
                <step.icon className="w-4 h-4" />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{step.title}</h4>
              <p className="text-xs text-gray-500 mt-0.5">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BattleLobby;
