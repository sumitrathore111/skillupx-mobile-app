/**
 * BattleResultScreen — exact React Native conversion of frontend BattleResults.tsx
 * Fetches ALL data from GET /battles/:id API (same as frontend), NOT from route params.
 */
import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
    createBotBattle,
    createRematchBattle,
    fetchWallet,
    getBattle,
} from '@services/arenaService';
import { useAuthStore } from '@store/authStore';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Easing,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type RouteParams = { battleId: string };

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

const CONFETTI_COLORS = ['#FFD700', '#00ADB5', '#FF6B6B', '#9B59B6', '#2ECC71', '#F39C12'];

function Confetti({ count = 30 }: { count?: number }) {
  const anims = useRef(
    Array.from({ length: count }, () => ({
      x: new Animated.Value(Math.random() * 350 - 50),
      y: new Animated.Value(-30),
      rotate: new Animated.Value(0),
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 6 + Math.random() * 8,
    }))
  ).current;

  useEffect(() => {
    anims.forEach((a, i) => {
      const dur = 2000 + Math.random() * 2000;
      Animated.loop(
        Animated.parallel([
          Animated.timing(a.y, { toValue: 700, duration: dur, delay: i * 80, useNativeDriver: true, easing: Easing.linear }),
          Animated.timing(a.rotate, { toValue: 1, duration: dur, delay: i * 80, useNativeDriver: true }),
        ])
      ).start();
    });
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {anims.map((a, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: a.x as any,
            width: a.size,
            height: a.size * 1.5,
            backgroundColor: a.color,
            borderRadius: 2,
            transform: [
              { translateY: a.y },
              { rotate: a.rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

export default function BattleResultScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { battleId } = route.params as RouteParams;
  const { user } = useAuthStore();

  const [battle, setBattle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isWinner, setIsWinner] = useState(false);
  const [myData, setMyData] = useState<Participant | null>(null);
  const [opponentData, setOpponentData] = useState<Participant | null>(null);
  const [ratingChange, setRatingChange] = useState(0);
  const [winByForfeit, setWinByForfeit] = useState(false);
  const [winReason, setWinReason] = useState('');
  const [isRequestingRematch, setIsRequestingRematch] = useState(false);
  const [rematchSent, setRematchSent] = useState(false);
  const [updatedCoins, setUpdatedCoins] = useState<number | null>(null);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rematchPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 50, useNativeDriver: true }).start();
  }, []);

  // Cleanup rematch poll on unmount
  useEffect(() => {
    return () => {
      if (rematchPollRef.current) clearInterval(rematchPollRef.current);
    };
  }, []);

  // ── Fetch battle results from API (same as frontend) ──
  useEffect(() => {
    if (!battleId) return;

    const fetchBattleResults = async () => {
      try {
        const response = await getBattle(battleId);
        const battleData = (response as any)?.battle || response;

        if (!battleData || !battleData.participants) {
          navigation.navigate('ArenaHome');
          return;
        }

        setBattle(battleData);

        // Find my data and opponent data using odId (same as frontend)
        const me = battleData.participants?.find((p: Participant) => p.odId === user?.id);
        const opp = battleData.participants?.find((p: Participant) => p.odId !== user?.id);

        setMyData(me || null);
        setOpponentData(opp || null);

        // Check if winner (same as frontend)
        const won = battleData.winnerId === user?.id;
        setIsWinner(won);

        // Check if won by forfeit
        if (battleData.status === 'forfeited' && battleData.forfeitedBy !== user?.id) {
          setWinByForfeit(true);
        }

        // Determine win/lose reason (exact same logic as frontend)
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

        // Rating change (simplified ELO, same as frontend)
        if (won) {
          setRatingChange(Math.floor(25 + Math.random() * 10));
        } else {
          setRatingChange(-Math.floor(15 + Math.random() * 10));
        }

        setLoading(false);

        // Refresh wallet to show updated balance (same as frontend)
        if (user?.id && battleData.status === 'completed') {
          try {
            const walletData = await fetchWallet(user.id);
            if (walletData) setUpdatedCoins(walletData.coins);
          } catch {}
        }
      } catch (error) {
        console.error('Error fetching battle results:', error);
        setLoading(false);
      }
    };

    fetchBattleResults();
  }, [battleId, user]);

  // ── Rematch — same as frontend ──
  const handleRematch = async () => {
    if (!user || !opponentData || !battle || isRequestingRematch || rematchSent) return;

    setIsRequestingRematch(true);
    try {
      const entryFee = battle.entryFee || 50;
      const difficulty = battle.difficulty || 'easy';

      const rematchBattleId = await createRematchBattle(
        {
          difficulty,
          entryFee,
          userId: user.id,
          userName: user.name || 'Player',
          userAvatar: user.profilePic || '',
          rating: myData?.rating || 1000,
          originalBattleId: battleId,
        },
        opponentData.odId,
        opponentData.odName
      );

      if (rematchBattleId) {
        setRematchSent(true);
        Alert.alert('Rematch Sent', `Waiting for ${opponentData.odName} to accept...`);

        // Poll for opponent to accept (same as frontend)
        rematchPollRef.current = setInterval(async () => {
          try {
            const data = await getBattle(rematchBattleId);
            const bd = (data as any)?.battle || data;
            if (bd?.status === 'countdown' && bd?.participants?.length === 2) {
              if (rematchPollRef.current) clearInterval(rematchPollRef.current);
              navigation.navigate('BattleRoom', { battleId: rematchBattleId });
            } else if (bd?.status === 'rejected') {
              if (rematchPollRef.current) clearInterval(rematchPollRef.current);
              setRematchSent(false);
              Alert.alert('Declined', `${opponentData.odName} declined the rematch.`);
            }
          } catch {
            if (rematchPollRef.current) clearInterval(rematchPollRef.current);
            setRematchSent(false);
          }
        }, 5000);

        // Timeout after 5 minutes
        setTimeout(() => {
          if (rematchPollRef.current) {
            clearInterval(rematchPollRef.current);
            setRematchSent(false);
            Alert.alert('Timeout', 'Rematch request timed out.');
          }
        }, 300000);
      }
    } catch (error) {
      console.error('Error creating rematch:', error);
      Alert.alert('Error', 'Failed to send rematch request.');
      setRematchSent(false);
    } finally {
      setIsRequestingRematch(false);
    }
  };

  // ── Play again (bot rematch) — same as frontend ──
  const handleBotRematch = async () => {
    if (!user || !battle) return;
    setIsRequestingRematch(true);
    try {
      const result = await createBotBattle({
        difficulty: (battle.difficulty || 'medium') as 'easy' | 'medium' | 'hard',
        entryFee: battle.entryFee || 50,
        userId: user.id,
        userName: user.name || 'Player',
        userAvatar: user.profilePic || '',
        rating: myData?.rating || 1000,
      });
      if (result?.battleId) {
        navigation.navigate('BattleRoom', { battleId: result.battleId });
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to find opponent');
    } finally {
      setIsRequestingRematch(false);
    }
  };

  const isBot = opponentData?.odId?.startsWith('bot_');

  const coinsDisplay = isWinner
    ? `+${battle?.prize || battle?.prizePool || 0}`
    : `-${battle?.entryFee || 0}`;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {isWinner && <Confetti />}

      {loading ? (
        <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 80 }} />
      ) : (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {/* Result Icon + Title */}
          <Animated.View style={[s.resultCenter, { transform: [{ scale: scaleAnim }] }]}>
            <Text style={s.resultEmoji}>{isWinner ? '🏆' : '😔'}</Text>
            <Text style={[s.resultTitle, isWinner ? s.winC : s.loseC]}>
              {isWinner ? 'Victory!' : 'Defeat'}
            </Text>
            {winByForfeit && isWinner && (
              <Text style={s.forfeitNote}>🚪 Your opponent left the battle!</Text>
            )}
          </Animated.View>

          {/* Win/Lose Reason */}
          {winReason ? (
            <View style={[s.reasonCard, isWinner ? s.reasonWin : s.reasonLose]}>
              <Text style={[s.reasonText, { color: isWinner ? COLORS.success : COLORS.danger }]}>
                📋 {winReason}
              </Text>
            </View>
          ) : null}

          {/* Players Comparison */}
          <View style={s.playersCard}>
            <View style={s.playerSlot}>
              <View style={[s.avatar, isWinner ? s.avatarWin : s.avatarDefault]}>
                <Text style={s.avatarText}>{myData?.odName?.charAt(0) || 'Y'}</Text>
              </View>
              <Text style={s.nameText}>{myData?.odName || 'You'}</Text>
              <Text style={s.levelText}>⭐ {myData?.rating || 1000}</Text>
              {isWinner && <Text style={s.crownText}>🏆 Winner</Text>}
            </View>

            <Text style={s.vsText}>VS</Text>

            <View style={s.playerSlot}>
              <View style={[s.avatar, !isWinner ? s.avatarWin : s.avatarOpp]}>
                <Text style={s.avatarText}>{opponentData?.odName?.charAt(0) || 'O'}</Text>
              </View>
              <Text style={s.nameText}>{opponentData?.odName || 'Opponent'} {isBot ? '🤖' : ''}</Text>
              <Text style={s.levelText}>⭐ {opponentData?.rating || 1000}</Text>
              {!isWinner && <Text style={s.crownText}>🏆 Winner</Text>}
            </View>
          </View>

          {/* Battle Stats */}
          <View style={s.compCard}>
            <Text style={s.compTitle}>Battle Stats</Text>
            <View style={s.compHeader}>
              <Text style={[s.compColH, { color: COLORS.primary }]}>You</Text>
              <Text style={s.compColHM}>Metric</Text>
              <Text style={[s.compColH, { color: COLORS.danger }]}>Opponent</Text>
            </View>
            {[
              {
                label: 'Tests Passed',
                mine: `${myData?.submissionResult?.passedCount || 0}/${myData?.submissionResult?.totalCount || 0}`,
                opp: `${opponentData?.submissionResult?.passedCount || 0}/${opponentData?.submissionResult?.totalCount || 0}`,
              },
              {
                label: 'Time',
                mine: myData?.submissionResult?.totalTime != null ? `${myData.submissionResult.totalTime}ms` : '-',
                opp: opponentData?.submissionResult?.totalTime != null ? `${opponentData.submissionResult.totalTime}ms` : '-',
              },
              {
                label: 'Submitted',
                mine: myData?.hasSubmitted ? '✅' : '❌',
                opp: opponentData?.hasSubmitted ? '✅' : '❌',
              },
            ].map((row, i) => (
              <View key={i} style={s.compRow}>
                <Text style={s.compVal}>{row.mine}</Text>
                <Text style={s.compMetric}>{row.label}</Text>
                <Text style={s.compVal}>{row.opp}</Text>
              </View>
            ))}
          </View>

          {/* Rewards */}
          <View style={s.rewardsRow}>
            <View style={[s.rewardCard, { borderColor: isWinner ? `${COLORS.success}40` : `${COLORS.danger}30` }]}>
              <Text style={s.rewardLabel}>{isWinner ? 'Coins Earned' : 'Entry Fee Lost'}</Text>
              <Text style={[s.rewardValue, { color: isWinner ? COLORS.success : COLORS.danger }]}>
                {coinsDisplay} 🪙
              </Text>
              {updatedCoins !== null && (
                <Text style={s.balanceText}>Balance: {updatedCoins.toLocaleString()}</Text>
              )}
            </View>
            <View style={[s.rewardCard, { borderColor: ratingChange >= 0 ? `${COLORS.success}40` : `${COLORS.danger}30` }]}>
              <Text style={s.rewardLabel}>Rating Change</Text>
              <Text style={[s.rewardValue, { color: ratingChange >= 0 ? COLORS.success : COLORS.danger }]}>
                {ratingChange >= 0 ? '+' : ''}{ratingChange}
              </Text>
            </View>
          </View>

          {/* Battle Summary */}
          <View style={s.summaryCard}>
            <Text style={s.compTitle}>Summary</Text>
            {battle?.challenge?.title && (
              <View style={s.sumRow}><Text style={s.sumL}>Challenge</Text><Text style={s.sumV}>{battle.challenge.title}</Text></View>
            )}
            {battle?.difficulty && (
              <View style={s.sumRow}><Text style={s.sumL}>Difficulty</Text><Text style={[s.sumV, { textTransform: 'capitalize' }]}>{battle.difficulty}</Text></View>
            )}
            {battle?.entryFee != null && battle.entryFee > 0 && (
              <View style={s.sumRow}><Text style={s.sumL}>Entry Fee</Text><Text style={s.sumV}>{battle.entryFee} 🪙</Text></View>
            )}
            {battle?.prize != null && (
              <View style={s.sumRow}><Text style={s.sumL}>Prize Pool</Text><Text style={s.sumV}>{battle.prize || battle.prizePool} 🪙</Text></View>
            )}
          </View>

          {/* XP Progress (same concept as frontend) */}
          <View style={s.xpCard}>
            <View style={s.xpHeader}>
              <Text style={s.xpLabel}>⭐ Experience Gained</Text>
              <Text style={s.xpValue}>+{isWinner ? 50 : 20} XP</Text>
            </View>
            <View style={s.xpTrack}>
              <View style={[s.xpFill, { width: `${isWinner ? 70 : 45}%` }]} />
            </View>
            <Text style={s.xpSub}>350/500 XP to Level Up</Text>
          </View>

          {/* Actions — same as frontend */}
          <View style={s.actions}>
            {isBot ? (
              <TouchableOpacity
                style={s.rematchBtn}
                onPress={handleBotRematch}
                disabled={isRequestingRematch}
              >
                {isRequestingRematch ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Ionicons name="flame" size={16} color="#fff" />
                    <Text style={s.rematchText}>🔥 Play Again</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[s.rematchBtn, rematchSent && s.rematchSentBtn]}
                onPress={handleRematch}
                disabled={isRequestingRematch || rematchSent}
              >
                {isRequestingRematch || rematchSent ? (
                  <>
                    <ActivityIndicator color="#fff" />
                    <Text style={s.rematchText}>
                      {rematchSent ? `⏳ Waiting for ${opponentData?.odName?.split(' ')[0] || 'Opponent'}...` : 'Sending...'}
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="refresh" size={16} color="#fff" />
                    <Text style={s.rematchText}>
                      🔥 Rematch {opponentData?.odName?.split(' ')[0] || 'Opponent'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity style={s.lobbyBtn} onPress={() => navigation.navigate('BattleLobby')}>
              <Text style={s.lobbyBtnText}>⚔️ New Battle</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.homeBtn} onPress={() => navigation.navigate('ArenaHome')}>
              <Text style={s.homeBtnText}>🏠 Back to Arena</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { alignItems: 'center', padding: 20, paddingBottom: 40 },
  resultCenter: { alignItems: 'center', marginTop: 20, marginBottom: 8 },
  resultEmoji: { fontSize: 72 },
  resultTitle: { fontSize: 34, fontWeight: '900', marginTop: 4 },
  winC: { color: COLORS.success },
  loseC: { color: COLORS.danger },
  forfeitNote: { fontSize: 14, color: COLORS.warning, marginTop: 4 },

  // Reason
  reasonCard: { width: '100%', paddingHorizontal: 16, paddingVertical: 10, borderRadius: RADIUS.lg, borderWidth: 1, marginVertical: 8 },
  reasonWin: { backgroundColor: `${COLORS.success}15`, borderColor: `${COLORS.success}30` },
  reasonLose: { backgroundColor: `${COLORS.danger}15`, borderColor: `${COLORS.danger}30` },
  reasonText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },

  // Players
  playersCard: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginVertical: 10 },
  playerSlot: { alignItems: 'center', flex: 1, gap: 4 },
  avatar: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  avatarWin: { backgroundColor: '#FFD70030', borderColor: '#FFD700' },
  avatarDefault: { backgroundColor: `${COLORS.primary}20`, borderColor: COLORS.primary },
  avatarOpp: { backgroundColor: `${COLORS.danger}20`, borderColor: COLORS.danger },
  avatarText: { fontSize: 20, fontWeight: '900', color: COLORS.textPrimary },
  nameText: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  levelText: { fontSize: 11, color: COLORS.textMuted },
  crownText: { fontSize: 11, fontWeight: '700', color: '#FFD700' },
  vsText: { fontSize: 22, fontWeight: '900', color: COLORS.primary },

  // Rewards
  rewardsRow: { flexDirection: 'row', gap: 12, marginVertical: 10, width: '100%' },
  rewardCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, alignItems: 'center', borderWidth: 1 },
  rewardLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  rewardValue: { fontSize: 22, fontWeight: '900', marginTop: 4 },
  balanceText: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },

  // Comparison
  compCard: { width: '100%', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  compTitle: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  compHeader: { flexDirection: 'row', marginBottom: 6 },
  compColH: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '800' },
  compColHM: { flex: 1, textAlign: 'center', fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  compRow: { flexDirection: 'row', paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border },
  compVal: { flex: 1, textAlign: 'center', fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  compMetric: { flex: 1, textAlign: 'center', fontSize: 12, color: COLORS.textMuted },

  // Summary
  summaryCard: { width: '100%', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  sumL: { fontSize: 13, color: COLORS.textMuted },
  sumV: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '600' },

  // XP
  xpCard: { width: '100%', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 },
  xpHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  xpLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  xpValue: { fontSize: 13, fontWeight: '700', color: '#A855F7' },
  xpTrack: { height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' },
  xpFill: { height: 6, borderRadius: 3, backgroundColor: '#A855F7' },
  xpSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },

  // Actions
  actions: { width: '100%', gap: 10 },
  rematchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 14 },
  rematchSentBtn: { backgroundColor: '#D97706' },
  rematchText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  lobbyBtn: { borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 13, alignItems: 'center' },
  lobbyBtnText: { color: COLORS.primary, fontSize: 15, fontWeight: '700' },
  homeBtn: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingVertical: 13, alignItems: 'center' },
  homeBtnText: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '600' },
});
