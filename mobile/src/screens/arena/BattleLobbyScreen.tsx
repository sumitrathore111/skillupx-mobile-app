/**
 * BattleLobbyScreen — exact React Native conversion of frontend BattleLobby.tsx
 * Matches all frontend logic: socket events, auto-bot, coin checks, cancel on leave, etc.
 */
import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
    type BattleRequest,
    acceptBattleInvite,
    cancelBattle,
    createBotBattle,
    fetchWaitingBattles,
    fetchWallet,
    getBattleInvites,
    initializeWallet,
    inviteUserToBattle,
    joinBattle,
    joinOrCreateBattle,
    rejectBattleInvite,
    searchUsersForInvite
} from '@services/arenaService';
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
    onBattleRemoved,
} from '@services/socketService';
import { useAuthStore } from '@store/authStore';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ── Same config as frontend ──
const entryOptions = [
  { fee: 5, prize: 9 },
  { fee: 10, prize: 18 },
  { fee: 20, prize: 36 },
  { fee: 50, prize: 90 },
];

const difficulties = [
  { id: 'easy', label: 'Easy', rating: '800-1200', time: 15, icon: '🌱' },
  { id: 'medium', label: 'Medium', rating: '1200-1600', time: 20, icon: '⚡' },
  { id: 'hard', label: 'Hard', rating: '1600-2000', time: 30, icon: '🔥' },
];

interface WaitingBattle {
  id: string;
  _id?: string;
  creatorId: string;
  creatorName: string;
  creatorProfilePic?: string;
  creatorRating?: number;
  difficulty: string;
  entryFee: number;
  prize: number;
}

interface BattleInvite {
  battleId: string;
  fromUserId: string;
  fromUsername: string;
  creatorAvatar?: string;
  difficulty: string;
  entryFee: number;
  prize: number;
}

export default function BattleLobbyScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();

  // ── State (same as frontend) ──
  const [selectedDifficulty, setSelectedDifficulty] = useState('medium');
  const [selectedEntry, setSelectedEntry] = useState(entryOptions[1]); // 10 coins default
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [waitingBattles, setWaitingBattles] = useState<WaitingBattle[]>([]);
  const [myBattleId, setMyBattleId] = useState<string | null>(null);
  const [searchTime, setSearchTime] = useState(0);
  const [isCreatingBotBattle, setIsCreatingBotBattle] = useState(false);

  // Invite state
  const [inviteSearch, setInviteSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteBattleId, setInviteBattleId] = useState<string | null>(null);
  const [myInvites, setMyInvites] = useState<BattleInvite[]>([]);

  // Wallet
  const [wallet, setWallet] = useState<any>(null);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const searchTimerRef = useRef<ReturnType<typeof setInterval>>();
  const myBattleIdRef = useRef<string | null>(null);

  // Keep ref in sync
  useEffect(() => { myBattleIdRef.current = myBattleId; }, [myBattleId]);

  // ── Load wallet (initialize if not found, same as frontend) ──
  useEffect(() => {
    if (!user?.id) return;
    fetchWallet(user.id)
      .then(w => {
        if (w) { setWallet(w); return; }
        // Wallet doesn't exist — initialize then fetch
        return initializeWallet(user.id).then(() => fetchWallet(user.id)).then(setWallet);
      })
      .catch(() => {
        // If fetch fails, try to initialize
        initializeWallet(user.id)
          .then(() => fetchWallet(user.id))
          .then(setWallet)
          .catch(() => setWallet({ coins: 0, rating: 1000 }));
      });
  }, [user?.id]);

  // ── Socket setup (exact same as frontend) ──
  useEffect(() => {
    if (!user?.id) return;

    initializeSocket().then(() => {
      joinBattleLobby();
      joinUserRoom(user.id);
    });

    const handleBattleCreated = (data: any) => {
      setWaitingBattles(prev => {
        if (prev.find(b => (b.id || b._id) === (data.battleId || data._id || data.id))) return prev;
        const battleCreatorId = data.creatorId || data.userId;
        if (battleCreatorId === user.id) return prev;
        return [...prev, {
          id: data.battleId || data._id || data.id,
          creatorId: battleCreatorId,
          creatorName: data.creatorName || data.userName || 'Player',
          creatorProfilePic: data.creatorProfilePic || data.userAvatar,
          creatorRating: data.creatorRating || data.rating,
          difficulty: data.difficulty,
          entryFee: data.entryFee || 0,
          prize: data.prize || data.prizePool || 0,
        }];
      });
    };

    const handleBattleRemoved = (data: any) => {
      const removedId = data.battleId || data._id || data.id;
      setWaitingBattles(prev => prev.filter(b => (b.id || b._id) !== removedId));
    };

    const handleBattleMatched = (data: any) => {
      const matchedBattleId = data.battleId || data._id || data.id;
      console.log('⚔️ Battle matched!', matchedBattleId);
      setIsSearching(false);
      setMyBattleId(null);
      setSearchTime(0);
      navigation.navigate('BattleRoom', { battleId: matchedBattleId });
    };

    const handleInviteReceived = (data: any) => {
      setMyInvites(prev => {
        if (prev.find(i => i.battleId === data.battleId)) return prev;
        return [...prev, data];
      });
    };

    const handleInviteRejected = (data: any) => {
      setInviteSent(false);
      setInviteBattleId(null);
      setSelectedUser(null);
      Alert.alert('Invite Rejected', `${data.fromUsername || 'Player'} declined your challenge.`);
    };

    onBattleCreated(handleBattleCreated);
    onBattleRemoved(handleBattleRemoved);
    onBattleMatched(handleBattleMatched);
    onBattleInviteReceived(handleInviteReceived);
    onBattleInviteRejected(handleInviteRejected);

    loadWaitingBattles();
    getBattleInvites().then(setMyInvites).catch(() => {});

    return () => {
      offBattleCreated(handleBattleCreated);
      offBattleRemoved(handleBattleRemoved);
      offBattleMatched(handleBattleMatched);
      offBattleInviteReceived(handleInviteReceived);
      offBattleInviteRejected(handleInviteRejected);
      leaveBattleLobby();
      leaveUserRoom(user.id);
      if (myBattleIdRef.current) {
        cancelBattle(myBattleIdRef.current).catch(() => {});
      }
    };
  }, [user?.id]);

  // ── Auto-bot after 15 seconds (exact same as frontend) ──
  useEffect(() => {
    if (isSearching && searchTime >= 15 && !isCreatingBotBattle) {
      console.log('⏱️ 15 seconds — auto-creating bot battle');
      handlePlayVsBot();
    }
  }, [searchTime, isSearching, isCreatingBotBattle]);

  // ── Search timer ──
  useEffect(() => {
    if (isSearching) {
      searchTimerRef.current = setInterval(() => {
        setSearchTime(prev => prev + 1);
      }, 1000);
    } else {
      if (searchTimerRef.current) clearInterval(searchTimerRef.current);
      setSearchTime(0);
    }
    return () => {
      if (searchTimerRef.current) clearInterval(searchTimerRef.current);
    };
  }, [isSearching]);

  // ── Fetch waiting battles ──
  async function loadWaitingBattles() {
    try {
      const battles = await fetchWaitingBattles(selectedDifficulty);
      setWaitingBattles(
        battles
          .filter((b: any) => (b.creatorId || b.createdBy) !== user?.id)
          .map((b: any) => ({
            id: b._id || b.id,
            _id: b._id,
            creatorId: b.creatorId || b.createdBy,
            creatorName: b.creatorName || b.participants?.[0]?.odName || 'Player',
            creatorProfilePic: b.creatorProfilePic || b.participants?.[0]?.odProfilePic,
            creatorRating: b.creatorRating || b.participants?.[0]?.rating || 1000,
            difficulty: b.difficulty,
            entryFee: b.entryFee || 0,
            prize: b.prize || b.prizePool || 0,
          }))
      );
    } catch {}
  }

  useEffect(() => { loadWaitingBattles(); }, [selectedDifficulty]);

  // ── Find Match (exact same flow as frontend) ──
  const handleFindMatch = async () => {
    if (!user || !wallet) {
      Alert.alert('Error', 'Wallet not loaded. Please wait.');
      return;
    }
    if ((wallet.coins || 0) < selectedEntry.fee) {
      Alert.alert('Insufficient Coins', `You have ${wallet.coins || 0} coins but need ${selectedEntry.fee} coins.`);
      return;
    }

    setIsSearching(true);
    setSearchTime(0);

    try {
      const matchingBattle = waitingBattles.find(
        b => b.difficulty === selectedDifficulty &&
             b.entryFee === selectedEntry.fee &&
             b.creatorId !== user.id
      );
      if (matchingBattle) {
        await handleJoinBattle(matchingBattle);
      } else {
        await handleCreateBattle();
      }
    } catch (error: any) {
      console.error('Error finding match:', error);
      Alert.alert('Error', 'Failed to find match. Please try again.');
      setIsSearching(false);
    }
  };

  const handleCreateBattle = async () => {
    try {
      setIsCreating(true);
      if (!wallet || (wallet.coins || 0) < selectedEntry.fee) {
        Alert.alert('Insufficient Coins', `You have ${wallet?.coins || 0} coins but need ${selectedEntry.fee} coins.`);
        setIsSearching(false);
        return;
      }
      const battleRequest: BattleRequest = {
        difficulty: selectedDifficulty as 'easy' | 'medium' | 'hard',
        entryFee: selectedEntry.fee,
        userId: user!.id,
        userName: user!.name || user!.email?.split('@')[0] || 'User',
        userAvatar: (user as any)?.profilePic || (user as any)?.avatar || '',
        rating: wallet?.rating || 1000,
      };
      const battleId = await joinOrCreateBattle(battleRequest);
      setMyBattleId(battleId);
    } catch (error: any) {
      console.error('Error creating battle:', error);
      Alert.alert('Error', error?.message || 'Failed to create battle');
      setIsSearching(false);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinBattle = async (battle: WaitingBattle) => {
    if (!wallet || (wallet.coins || 0) < battle.entryFee) {
      Alert.alert('Insufficient Coins', `You have ${wallet?.coins || 0} coins but need ${battle.entryFee} coins.`);
      setIsSearching(false);
      return;
    }
    try {
      const bid = battle.id || battle._id!;
      await joinBattle(
        bid,
        user!.name || user!.email?.split('@')[0] || 'User',
        (user as any)?.profilePic || (user as any)?.avatar || '',
        wallet?.rating || 1000
      );
      navigation.navigate('BattleRoom', { battleId: bid });
    } catch (error: any) {
      console.error('Error joining battle:', error);
      Alert.alert('Error', error?.message || 'Failed to join battle.');
      setIsSearching(false);
    }
  };

  const handleCancelSearch = async () => {
    if (myBattleId) {
      try { await cancelBattle(myBattleId); } catch {}
    }
    setIsSearching(false);
    setMyBattleId(null);
    setSearchTime(0);
  };

  const handlePlayVsBot = async () => {
    if (isCreatingBotBattle) return;
    setIsCreatingBotBattle(true);
    try {
      if (myBattleId) {
        try { await cancelBattle(myBattleId); } catch {}
      }
      const { battleId } = await createBotBattle({
        difficulty: selectedDifficulty as 'easy' | 'medium' | 'hard',
        entryFee: selectedEntry.fee,
        userId: user!.id,
        userName: user!.name || user!.email?.split('@')[0] || 'User',
        userAvatar: (user as any)?.profilePic || (user as any)?.avatar || '',
        rating: wallet?.rating || 1000,
      });
      navigation.navigate('BattleRoom', { battleId });
    } catch (error: any) {
      console.error('Error creating bot battle:', error);
      Alert.alert('Error', error?.message || 'Failed to create bot battle');
    } finally {
      setIsCreatingBotBattle(false);
      setIsSearching(false);
    }
  };

  // ── Debounced user search (same as frontend) ──
  const handleInviteSearch = useCallback((value: string) => {
    setInviteSearch(value);
    setSelectedUser(null);
    setInviteSent(false);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (value.trim().length < 2) { setSearchResults([]); return; }
    setIsSearchingUsers(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try { setSearchResults(await searchUsersForInvite(value)); } catch {}
      setIsSearchingUsers(false);
    }, 400);
  }, []);

  const handleSendInvite = async () => {
    if (!selectedUser || !user || !wallet || isSendingInvite) return;
    if (wallet.coins < selectedEntry.fee) {
      Alert.alert('Insufficient Coins', `Need ${selectedEntry.fee} coins.`);
      return;
    }
    setIsSendingInvite(true);
    try {
      const battleId = await inviteUserToBattle({
        targetUserId: selectedUser.id || selectedUser._id,
        difficulty: selectedDifficulty as 'easy' | 'medium' | 'hard',
        entryFee: selectedEntry.fee,
        userId: user.id,
        userName: user.name || user.email?.split('@')[0] || 'User',
        userAvatar: (user as any)?.profilePic || (user as any)?.avatar || '',
        rating: wallet.rating || 1000,
      });
      if (battleId) {
        setInviteSent(true);
        setInviteBattleId(battleId);
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to send invite');
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleCancelInvite = async () => {
    if (inviteBattleId) {
      try { await cancelBattle(inviteBattleId); } catch {}
    }
    setInviteSent(false);
    setInviteBattleId(null);
    setSelectedUser(null);
    setInviteSearch('');
    setSearchResults([]);
  };

  const handleAcceptInvite = async (invite: BattleInvite) => {
    if (!wallet || wallet.coins < invite.entryFee) {
      Alert.alert('Insufficient Coins', `Need ${invite.entryFee} coins.`);
      return;
    }
    try {
      await acceptBattleInvite(
        invite.battleId,
        user!.name || user!.email?.split('@')[0] || 'User',
        (user as any)?.profilePic || (user as any)?.avatar || '',
        wallet.rating || 1000
      );
      navigation.navigate('BattleRoom', { battleId: invite.battleId });
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to accept invite');
    }
  };

  const handleRejectInvite = async (invite: BattleInvite) => {
    try {
      await rejectBattleInvite(invite.battleId);
      setMyInvites(prev => prev.filter(i => i.battleId !== invite.battleId));
    } catch {}
  };

  const formatSearchTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const diffColor = (d: string) =>
    d === 'easy' ? COLORS.success : d === 'medium' ? COLORS.warning : COLORS.danger;

  const walletCoins = wallet?.coins ?? 0;
  const hasEnoughCoins = walletCoins >= selectedEntry.fee;
  const isButtonDisabled = !wallet || !hasEnoughCoins || isSearching || isCreating;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>⚔️ Code Arena</Text>
          <Text style={s.headerSub}>Real-time 1v1 coding battles</Text>
        </View>
        <View style={s.walletChip}>
          <Text style={s.walletText}>🪙 {walletCoins.toLocaleString()}</Text>
        </View>
      </View>

      {/* Quick stats */}
      <View style={s.statsRow}>
        <View style={s.statDot} />
        <Text style={s.statText}>{waitingBattles.length} online</Text>
        <View style={s.statDivider} />
        <Ionicons name="shield-checkmark" size={12} color={COLORS.textMuted} />
        <Text style={s.statText}>Ranked</Text>
        <View style={s.statDivider} />
        <Text style={s.statText}>⭐ {wallet?.rating || 1000} SR</Text>
      </View>

      {/* ═══ Searching Overlay Modal ═══ */}
      <Modal visible={isSearching} transparent animationType="fade">
        <View style={s.searchOverlay}>
          <View style={s.searchModal}>
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginBottom: 16 }} />
            <Text style={s.searchTitle}>Finding Opponent</Text>
            <Text style={s.searchDiff}>
              {selectedDifficulty.charAt(0).toUpperCase() + selectedDifficulty.slice(1)} battle
            </Text>
            {searchTime >= 5 && !isCreatingBotBattle && (
              <Text style={s.searchExpanding}>Expanding search...</Text>
            )}
            {isCreatingBotBattle && (
              <Text style={s.searchFound}>Opponent found!</Text>
            )}
            <Text style={s.searchTimer}>{formatSearchTime(searchTime)}</Text>
            <View style={s.searchInfo}>
              <Text style={s.searchInfoText}>👥 {waitingBattles.length} waiting</Text>
              <Text style={s.searchInfoText}>🪙 {selectedEntry.fee} entry</Text>
            </View>
            <TouchableOpacity style={s.cancelBtn} onPress={handleCancelSearch}>
              <Text style={s.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* ═══ Pending Invites ═══ */}
        {myInvites.length > 0 && (
          <View style={s.section}>
            {myInvites.map(invite => (
              <View key={invite.battleId} style={s.inviteCard}>
                <View style={s.inviteLeft}>
                  <View style={s.inviteAvatar}>
                    <Text style={{ fontSize: 16 }}>⚔️</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.inviteFrom}>@{invite.fromUsername} <Text style={s.inviteChallenge}>challenged you</Text></Text>
                    <View style={s.inviteMeta}>
                      <Text style={[s.inviteDiff, { color: diffColor(invite.difficulty) }]}>{invite.difficulty}</Text>
                      <Text style={s.inviteFee}>🪙 {invite.entryFee}</Text>
                      <Text style={s.invitePrize}>🏆 {invite.prize}</Text>
                    </View>
                  </View>
                </View>
                <View style={s.inviteActions}>
                  <TouchableOpacity style={s.acceptBtn} onPress={() => handleAcceptInvite(invite)}>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                    <Text style={s.acceptText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.rejectBtn} onPress={() => handleRejectInvite(invite)}>
                    <Ionicons name="close" size={16} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ═══ Difficulty ═══ */}
        <Text style={s.sectionLabel}>DIFFICULTY</Text>
        <View style={s.diffRow}>
          {difficulties.map(diff => {
            const active = selectedDifficulty === diff.id;
            const color = diffColor(diff.id);
            return (
              <TouchableOpacity
                key={diff.id}
                style={[s.diffCard, active && { borderColor: color, backgroundColor: `${color}15` }]}
                onPress={() => setSelectedDifficulty(diff.id)}
              >
                <Text style={{ fontSize: 18 }}>{diff.icon}</Text>
                <Text style={[s.diffLabel, active && { color }]}>{diff.label}</Text>
                <Text style={[s.diffRating, active && { color: `${color}99` }]}>{diff.rating}</Text>
                <Text style={[s.diffTime, active && { color: `${color}80` }]}>⏱ {diff.time}m</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ═══ Stakes ═══ */}
        <Text style={s.sectionLabel}>STAKES</Text>
        <View style={s.feeRow}>
          {entryOptions.map(option => {
            const active = selectedEntry.fee === option.fee;
            const locked = walletCoins < option.fee;
            return (
              <TouchableOpacity
                key={option.fee}
                style={[s.feeCard, active && s.feeCardActive, locked && s.feeCardLocked]}
                onPress={() => !locked && setSelectedEntry(option)}
                disabled={locked}
              >
                <Text style={[s.feeValue, active && { color: COLORS.warning }]}>
                  {option.fee} 🪙
                </Text>
                <Text style={[s.feePrize, active && { color: COLORS.success }]}>
                  Win {option.prize}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ═══ Find Match button ═══ */}
        <TouchableOpacity
          style={[s.findMatchBtn, isButtonDisabled && s.findMatchBtnDisabled]}
          onPress={handleFindMatch}
          disabled={isButtonDisabled}
        >
          {isCreating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.findMatchText}>⚡ Find Match</Text>
          )}
        </TouchableOpacity>

        {!wallet && <Text style={s.walletHint}>Loading wallet...</Text>}
        {wallet && !hasEnoughCoins && (
          <Text style={s.coinHint}>Need {selectedEntry.fee - walletCoins} more coins</Text>
        )}
        {wallet && hasEnoughCoins && (
          <Text style={s.readyHint}>✅ Ready · {walletCoins} coins</Text>
        )}

        {/* ═══ Challenge a Friend ═══ */}
        <View style={s.inviteSection}>
          <View style={s.inviteSectionHeader}>
            <Ionicons name="person-add" size={16} color="#a855f7" />
            <Text style={s.inviteSectionTitle}>Challenge a Friend</Text>
          </View>

          {!inviteSent ? (
            <>
              <View style={s.searchBar}>
                <Ionicons name="at" size={16} color={COLORS.textMuted} />
                <TextInput
                  style={s.searchInput}
                  placeholder="Type a username..."
                  placeholderTextColor={COLORS.textMuted}
                  value={inviteSearch}
                  onChangeText={handleInviteSearch}
                  autoCapitalize="none"
                />
                {isSearchingUsers && <ActivityIndicator size="small" color="#a855f7" />}
              </View>

              {searchResults.length > 0 && !selectedUser && (
                <View style={s.resultsDropdown}>
                  {searchResults.map(u => (
                    <TouchableOpacity
                      key={u.id || u._id}
                      style={s.resultRow}
                      onPress={() => {
                        setSelectedUser(u);
                        setSearchResults([]);
                        setInviteSearch(u.username || u.name);
                      }}
                    >
                      <Text style={s.resultName}>@{u.username || u.name}</Text>
                      {u.rating && <Text style={s.resultRating}>⭐ {u.rating}</Text>}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {inviteSearch.length >= 2 && !isSearchingUsers && searchResults.length === 0 && !selectedUser && (
                <Text style={s.noResults}>No users found for "{inviteSearch}"</Text>
              )}

              {selectedUser && (
                <View style={s.selectedUserChip}>
                  <Text style={s.selectedUserName}>@{selectedUser.username || selectedUser.name}</Text>
                  <TouchableOpacity onPress={() => { setSelectedUser(null); setInviteSearch(''); }}>
                    <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity
                style={[s.challengeBtn, (!selectedUser || !hasEnoughCoins) && s.challengeBtnDisabled]}
                onPress={handleSendInvite}
                disabled={!selectedUser || isSendingInvite || !hasEnoughCoins}
              >
                {isSendingInvite ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={s.challengeBtnText}>
                    ⚔️ {selectedUser ? `Challenge @${selectedUser.username || selectedUser.name}` : 'Select a player'}
                  </Text>
                )}
              </TouchableOpacity>
              {selectedUser && hasEnoughCoins && (
                <Text style={s.challengeInfo}>{selectedEntry.fee} coins entry · Win {selectedEntry.prize}</Text>
              )}
            </>
          ) : (
            <View style={s.waitingInvite}>
              <ActivityIndicator color="#a855f7" style={{ marginBottom: 8 }} />
              <Text style={s.waitingText}>Invite sent to @{selectedUser?.username || selectedUser?.name}</Text>
              <Text style={s.waitingSubText}>Waiting for response...</Text>
              <TouchableOpacity style={s.cancelInviteBtn} onPress={handleCancelInvite}>
                <Text style={s.cancelInviteBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ═══ Open Battles ═══ */}
        {waitingBattles.length > 0 && (
          <View style={s.openBattlesSection}>
            <View style={s.openBattlesHeader}>
              <Ionicons name="people" size={16} color={COLORS.success} />
              <Text style={s.openBattlesTitle}>Open Battles</Text>
              <View style={s.liveDot} />
              <Text style={s.liveCount}>{waitingBattles.length} live</Text>
            </View>

            {waitingBattles.map(battle => (
              <View key={battle.id || battle._id} style={s.battleCard}>
                <View style={{ flex: 1 }}>
                  <Text style={s.battleCreator}>{battle.creatorName}</Text>
                  <View style={s.battleMeta}>
                    <Text style={[s.battleDiff, { color: diffColor(battle.difficulty) }]}>{battle.difficulty}</Text>
                    <Text style={s.battleRating}>{battle.creatorRating || 1000} SR</Text>
                  </View>
                </View>
                <View style={s.battleRight}>
                  <Text style={s.battleFee}>🪙 {battle.entryFee}</Text>
                  <Text style={s.battlePrize}>Win {battle.prize}</Text>
                </View>
                <TouchableOpacity
                  style={[s.joinBtn, walletCoins < battle.entryFee && s.joinBtnDisabled]}
                  onPress={() => handleJoinBattle(battle)}
                  disabled={walletCoins < battle.entryFee}
                >
                  <Text style={s.joinBtnText}>Join</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* ═══ How It Works ═══ */}
        <View style={s.howSection}>
          <Text style={s.sectionLabel}>HOW IT WORKS</Text>
          <View style={s.howRow}>
            {[
              { icon: '🪙', title: 'Stake Coins', desc: 'Entry fee fuels the pool' },
              { icon: '⚔️', title: 'Battle', desc: 'Solve the problem faster' },
              { icon: '🏆', title: 'Win Prize', desc: 'Winner takes the pool' },
            ].map((step, i) => (
              <View key={i} style={s.howCard}>
                <Text style={{ fontSize: 18 }}>{step.icon}</Text>
                <Text style={s.howTitle}>{step.title}</Text>
                <Text style={s.howDesc}>{step.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: COLORS.textPrimary },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  walletChip: { backgroundColor: `${COLORS.warning}20`, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: `${COLORS.warning}30` },
  walletText: { color: COLORS.warning, fontWeight: '800', fontSize: 14 },

  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  statDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.success },
  statText: { fontSize: 11, color: COLORS.textMuted },
  statDivider: { width: 1, height: 12, backgroundColor: COLORS.border, marginHorizontal: 4 },

  scroll: { padding: 16, paddingBottom: 40 },
  section: { marginBottom: 12 },
  sectionLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '700', letterSpacing: 1, marginBottom: 10, marginTop: 8 },

  // Difficulty
  diffRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  diffCard: { flex: 1, padding: 12, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', gap: 2 },
  diffLabel: { fontWeight: '800', fontSize: 14, color: COLORS.textPrimary },
  diffRating: { fontSize: 10, color: COLORS.textMuted },
  diffTime: { fontSize: 10, color: COLORS.textMuted },

  // Fee
  feeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  feeCard: { flex: 1, padding: 10, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center' },
  feeCardActive: { borderColor: `${COLORS.warning}60`, backgroundColor: `${COLORS.warning}10` },
  feeCardLocked: { opacity: 0.35 },
  feeValue: { fontWeight: '800', fontSize: 14, color: COLORS.textPrimary },
  feePrize: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },

  // Find Match
  findMatchBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  findMatchBtnDisabled: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  findMatchText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  walletHint: { textAlign: 'center', fontSize: 11, color: `${COLORS.warning}80`, marginTop: 6 },
  coinHint: { textAlign: 'center', fontSize: 11, color: `${COLORS.danger}90`, marginTop: 6 },
  readyHint: { textAlign: 'center', fontSize: 11, color: `${COLORS.success}80`, marginTop: 6 },

  // Searching overlay
  searchOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  searchModal: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: 32, width: '100%', maxWidth: 340, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  searchTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  searchDiff: { fontSize: 14, color: COLORS.primary, fontWeight: '700', marginBottom: 4 },
  searchExpanding: { fontSize: 12, color: COLORS.primary, marginBottom: 4 },
  searchFound: { fontSize: 12, color: COLORS.success, fontWeight: '700', marginBottom: 4 },
  searchTimer: { fontSize: 36, fontWeight: '900', color: COLORS.textPrimary, marginVertical: 12, fontVariant: ['tabular-nums'] },
  searchInfo: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  searchInfoText: { fontSize: 12, color: COLORS.textMuted },
  cancelBtn: { width: '100%', paddingVertical: 14, borderRadius: RADIUS.lg, backgroundColor: `${COLORS.danger}15`, borderWidth: 1, borderColor: `${COLORS.danger}30`, alignItems: 'center' },
  cancelBtnText: { color: COLORS.danger, fontWeight: '700', fontSize: 14 },

  // Invites
  inviteCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 12, borderWidth: 1, borderColor: `#a855f730`, marginBottom: 8 },
  inviteLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  inviteAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: `#a855f720`, justifyContent: 'center', alignItems: 'center' },
  inviteFrom: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  inviteChallenge: { fontWeight: '400', color: COLORS.textMuted },
  inviteMeta: { flexDirection: 'row', gap: 10, marginTop: 2 },
  inviteDiff: { fontSize: 11, fontWeight: '700' },
  inviteFee: { fontSize: 11, color: COLORS.warning },
  invitePrize: { fontSize: 11, color: COLORS.success },
  inviteActions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  acceptBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.success, paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.md },
  acceptText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  rejectBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: `${COLORS.danger}20`, justifyContent: 'center', alignItems: 'center' },

  // Challenge a friend
  inviteSection: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginTop: 16 },
  inviteSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  inviteSectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.background, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, height: 44 },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: 14 },
  resultsDropdown: { backgroundColor: COLORS.background, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, marginTop: 4 },
  resultRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  resultName: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  resultRating: { fontSize: 12, color: COLORS.warning, fontWeight: '600' },
  noResults: { fontSize: 12, color: COLORS.textMuted, marginTop: 6 },
  selectedUserChip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: `#a855f715`, borderRadius: RADIUS.lg, padding: 12, marginTop: 8, borderWidth: 1, borderColor: `#a855f730` },
  selectedUserName: { fontSize: 14, fontWeight: '700', color: '#a855f7' },
  challengeBtn: { backgroundColor: '#a855f7', borderRadius: RADIUS.lg, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  challengeBtnDisabled: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  challengeBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  challengeInfo: { textAlign: 'center', fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
  waitingInvite: { alignItems: 'center', paddingVertical: 20 },
  waitingText: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  waitingSubText: { fontSize: 12, color: COLORS.textMuted, marginBottom: 12 },
  cancelInviteBtn: { paddingHorizontal: 20, paddingVertical: 8, backgroundColor: `${COLORS.danger}15`, borderWidth: 1, borderColor: `${COLORS.danger}30`, borderRadius: RADIUS.md },
  cancelInviteBtnText: { color: COLORS.danger, fontWeight: '700', fontSize: 13 },

  // Open battles
  openBattlesSection: { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginTop: 16 },
  openBattlesHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  openBattlesTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, flex: 1 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.success },
  liveCount: { fontSize: 12, color: COLORS.success },
  battleCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: COLORS.background, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8 },
  battleCreator: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  battleMeta: { flexDirection: 'row', gap: 8, marginTop: 2 },
  battleDiff: { fontSize: 11, fontWeight: '700' },
  battleRating: { fontSize: 11, color: COLORS.textMuted },
  battleRight: { alignItems: 'flex-end' },
  battleFee: { fontSize: 14, fontWeight: '800', color: COLORS.warning },
  battlePrize: { fontSize: 11, color: COLORS.success },
  joinBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 18, paddingVertical: 8, borderRadius: RADIUS.md },
  joinBtnDisabled: { opacity: 0.4 },
  joinBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // How it works
  howSection: { marginTop: 20 },
  howRow: { flexDirection: 'row', gap: 8 },
  howCard: { flex: 1, padding: 12, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', gap: 4 },
  howTitle: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  howDesc: { fontSize: 10, color: COLORS.textMuted, textAlign: 'center' },
});
