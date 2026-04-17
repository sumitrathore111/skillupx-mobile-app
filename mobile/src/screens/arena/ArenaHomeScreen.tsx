/**
 * ArenaHomeScreen — exact React Native conversion of frontend CodeArena home content.
 * Fetches wallet with userId, uses .coins, shows live battles + top players + stats.
 */
import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { apiRequest } from '@services/api';
import {
    acceptBattleInvite,
    fetchGlobalLeaderboard,
    fetchWallet,
    getBattleInvites,
    getUserBattleStats,
    getUserProgress,
    initializeWallet,
    rejectBattleInvite,
} from '@services/arenaService';
import { useAuthStore } from '@store/authStore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ArenaHomeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const [wallet, setWallet] = useState<any>(null);
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userStats, setUserStats] = useState({
    problemsSolved: 0,
    battlesWon: 0,
    currentStreak: 0,
    globalRank: '-' as string | number,
  });
  const [liveBattles, setLiveBattles] = useState<any[]>([]);
  const [topPlayers, setTopPlayers] = useState<any[]>([]);
  const [loadingBattles, setLoadingBattles] = useState(true);
  const [loadingPlayers, setLoadingPlayers] = useState(true);

  useEffect(() => { load(); }, []);

  // Refresh live battles every 30s + top players every 60s (same as frontend)
  useEffect(() => {
    const battlesInterval = setInterval(loadLiveBattles, 30000);
    const playersInterval = setInterval(loadTopPlayers, 60000);
    return () => {
      clearInterval(battlesInterval);
      clearInterval(playersInterval);
    };
  }, []);

  async function load() {
    if (!user?.id) { setLoading(false); return; }
    try {
      // Parallel fetch — same approach as frontend
      const [walletResult, invResult] = await Promise.allSettled([
        fetchWallet(user.id),
        getBattleInvites(),
      ]);

      let w = walletResult.status === 'fulfilled' ? walletResult.value : null;
      // Initialize wallet if doesn't exist (same as frontend)
      if (!w) {
        try { w = await initializeWallet(user.id); } catch {}
      }
      if (w) setWallet(w);
      if (invResult.status === 'fulfilled') setInvites(invResult.value);

      // Fetch stats in parallel (same as frontend)
      fetchUserStats(user.id);
      loadLiveBattles();
      loadTopPlayers();
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }

  // Same stat fetching as frontend CodeArena
  async function fetchUserStats(userId: string) {
    try {
      const [battleStatsResponse, userProgressData, leaderboard] = await Promise.all([
        getUserBattleStats(userId).catch(() => null),
        getUserProgress(userId).catch(() => null),
        fetchGlobalLeaderboard().catch(() => null),
      ]);

      const solvedCount = (userProgressData as any)?.solvedChallenges?.length || 0;
      const battlesWon = (battleStatsResponse as any)?.battlesWon || 0;
      const currentStreak = (battleStatsResponse as any)?.currentStreak || 0;

      let globalRank: string | number = '-';
      if (leaderboard) {
        const userRanking = leaderboard.find((p: any) => p.odId === userId);
        if (userRanking) globalRank = (userRanking as any).rank;
      }

      setUserStats({ problemsSolved: solvedCount, battlesWon, currentStreak, globalRank });
    } catch {
      setUserStats({ problemsSolved: 0, battlesWon: 0, currentStreak: 0, globalRank: '-' });
    }
  }

  // Fetch live battles (same as frontend — active/waiting/countdown)
  async function loadLiveBattles() {
    try {
      const [activeRes, waitingRes, countdownRes] = await Promise.all([
        apiRequest<any>('GET', '/battles?status=active').catch(() => ({ battles: [] })),
        apiRequest<any>('GET', '/battles?status=waiting').catch(() => ({ battles: [] })),
        apiRequest<any>('GET', '/battles?status=countdown').catch(() => ({ battles: [] })),
      ]);

      const all = [
        ...(activeRes?.battles || []),
        ...(countdownRes?.battles || []),
        ...(waitingRes?.battles || []),
      ].slice(0, 5).map((b: any) => ({
        id: b.id || b._id,
        status: b.status,
        difficulty: b.difficulty,
        entryFee: b.entryFee,
        participants: b.participants?.length > 0
          ? b.participants.map((p: any) => ({
              userName: p.userName || p.odName || 'Player',
            }))
          : [{ userName: b.creatorName || 'Player' }],
      }));

      setLiveBattles(all);
    } catch { setLiveBattles([]); }
    finally { setLoadingBattles(false); }
  }

  // Fetch top 3 players (same as frontend)
  async function loadTopPlayers() {
    try {
      const rankings = await fetchGlobalLeaderboard();
      setTopPlayers(rankings?.slice(0, 3) || []);
    } catch { setTopPlayers([]); }
    finally { setLoadingPlayers(false); }
  }

  const onRefresh = () => { setRefreshing(true); load(); };

  async function acceptInvite(inviteId: string) {
    if (!user) return;
    try {
      const battle = await acceptBattleInvite(
        inviteId,
        user.name || 'Player',
        user.profilePic || '',
        1000
      );
      setInvites(prev => prev.filter(i => (i.id || i._id) !== inviteId));
      navigation.navigate('BattleRoom', { battleId: battle.id || battle._id || battle.battleId });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to accept invite');
    }
  }

  async function rejectInvite(inviteId: string) {
    try {
      await rejectBattleInvite(inviteId);
      setInvites(prev => prev.filter(i => (i.id || i._id) !== inviteId));
    } catch {}
  }

  if (loading) return <View style={st.loading}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  const stats = [
    { label: 'Problems Solved', value: userStats.problemsSolved, icon: '✅', color: COLORS.success },
    { label: 'Battles Won', value: userStats.battlesWon, icon: '⚔️', color: COLORS.primary },
    { label: 'Current Streak', value: userStats.currentStreak, icon: '🔥', color: COLORS.warning },
    { label: 'Global Rank', value: userStats.globalRank === '-' ? '-' : `#${userStats.globalRank}`, icon: '🏆', color: '#F59E0B' },
  ];

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with wallet */}
        <View style={st.header}>
          <View>
            <Text style={st.pageTitle}>CodeArena</Text>
            <Text style={st.pageSubtitle}>Battle. Code. Win.</Text>
          </View>
          <TouchableOpacity style={st.coinBadge} onPress={() => navigation.navigate('Wallet')}>
            <Text style={st.coinEmoji}>🪙</Text>
            <Text style={st.coinText}>{wallet?.coins?.toLocaleString() || 0}</Text>
          </TouchableOpacity>
        </View>

        {/* Hero */}
        <View style={st.heroCard}>
          <Text style={st.heroTitle}>Welcome Back! 👋</Text>
          <Text style={st.heroSub}>Ready to test your coding skills? Battle other developers or practice with problems.</Text>
          <View style={st.heroButtons}>
            <TouchableOpacity style={st.heroBtn} onPress={() => navigation.navigate('BattleLobby')}>
              <Ionicons name="flash" size={16} color="#fff" />
              <Text style={st.heroBtnText}>Find Match</Text>
            </TouchableOpacity>
            <TouchableOpacity style={st.heroBtnOutline} onPress={() => navigation.navigate('ProblemList')}>
              <Ionicons name="code-slash" size={16} color={COLORS.textPrimary} />
              <Text style={st.heroBtnOutlineText}>Practice</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={st.statsGrid}>
          {stats.map((s, i) => (
            <View key={s.label} style={st.statCard}>
              <Text style={st.statEmoji}>{s.icon}</Text>
              <Text style={st.statValue}>{s.value}</Text>
              <Text style={st.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={st.actionsGrid}>
          {[
            { label: 'Quick Battle', desc: 'Compete in a 1v1 duel', icon: 'flash', color: '#EF4444', onPress: () => navigation.navigate('BattleLobby') },
            { label: 'Practice DSA', desc: 'Solve problems & improve', icon: 'code-slash', color: COLORS.success, onPress: () => navigation.navigate('ProblemList') },
            { label: 'Leaderboard', desc: 'View global rankings', icon: 'trophy', color: '#F59E0B', onPress: () => navigation.navigate('Leaderboard') },
          ].map(action => (
            <TouchableOpacity key={action.label} style={st.actionCard} onPress={action.onPress} activeOpacity={0.8}>
              <View style={[st.actionIcon, { backgroundColor: `${action.color}20` }]}>
                <Ionicons name={action.icon as any} size={22} color={action.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.actionLabel}>{action.label}</Text>
                <Text style={st.actionDesc}>{action.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Battle Invites */}
        {invites.length > 0 && (
          <View style={st.section}>
            <Text style={st.sectionTitle}>Battle Invites 🎮</Text>
            {invites.map(invite => (
              <View key={invite.id || invite._id} style={st.inviteCard}>
                <View style={st.inviteInfo}>
                  <Text style={st.inviteFrom}>{invite.senderName} challenged you!</Text>
                  <Text style={st.inviteChallenge}>{invite.challengeTitle || 'Random problem'}</Text>
                </View>
                <View style={st.inviteButtons}>
                  <TouchableOpacity style={st.acceptBtn} onPress={() => acceptInvite(invite.id || invite._id)}>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={st.rejectBtn} onPress={() => rejectInvite(invite.id || invite._id)}>
                    <Ionicons name="close" size={16} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Live Battles (same as frontend) */}
        <View style={st.section}>
          <View style={st.sectionHeader}>
            <Text style={st.sectionTitle}>Live Battles</Text>
            <View style={st.liveDot}>
              <View style={st.liveDotInner} />
              <Text style={st.liveText}>Live</Text>
            </View>
          </View>
          {loadingBattles ? (
            <ActivityIndicator color={COLORS.textMuted} style={{ marginVertical: 20 }} />
          ) : liveBattles.length === 0 ? (
            <View style={st.emptyBox}>
              <Ionicons name="people" size={28} color={COLORS.textMuted} style={{ opacity: 0.3 }} />
              <Text style={st.emptyText}>No active battles</Text>
              <TouchableOpacity onPress={() => navigation.navigate('BattleLobby')}>
                <Text style={st.emptyLink}>Start a battle</Text>
              </TouchableOpacity>
            </View>
          ) : (
            liveBattles.map((b, i) => (
              <View key={b.id || i} style={st.battleRow}>
                <View style={st.battleAvatars}>
                  {b.participants?.slice(0, 2).map((p: any, idx: number) => (
                    <View key={idx} style={[st.battleAv, idx === 0 ? st.battleAv1 : st.battleAv2]}>
                      <Text style={st.battleAvText}>{p.userName?.[0] || '?'}</Text>
                    </View>
                  ))}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.battleNames}>
                    {b.participants?.[0]?.userName || 'Player'} vs {b.participants?.[1]?.userName || 'Waiting...'}
                  </Text>
                  <Text style={st.battleDiff}>{b.difficulty || 'Medium'}</Text>
                </View>
                <View style={[st.statusBadge, b.status === 'waiting' ? st.statusWaiting : st.statusActive]}>
                  <Text style={[st.statusText, { color: b.status === 'waiting' ? COLORS.primary : '#F97316' }]}>
                    {b.status === 'waiting' ? 'Waiting' : 'In Progress'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Top Players (same as frontend) */}
        <View style={st.section}>
          <View style={st.sectionHeader}>
            <Text style={st.sectionTitle}>Top Players 👑</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Leaderboard')}>
              <Text style={st.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>
          {loadingPlayers ? (
            <ActivityIndicator color={COLORS.textMuted} style={{ marginVertical: 20 }} />
          ) : topPlayers.length === 0 ? (
            <View style={st.emptyBox}>
              <Text style={st.emptyText}>No rankings yet</Text>
            </View>
          ) : (
            topPlayers.map((player: any, idx: number) => (
              <View key={player.odId || idx} style={st.playerRow}>
                <View style={[st.rankBadge, idx === 0 && st.rank1, idx === 1 && st.rank2, idx === 2 && st.rank3]}>
                  <Text style={[st.rankText, idx === 0 && { color: '#F59E0B' }, idx === 1 && { color: '#9CA3AF' }, idx === 2 && { color: '#F97316' }]}>
                    {player.rank || idx + 1}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.playerName}>{player.odName}</Text>
                  <Text style={st.playerSub}>{player.problemsSolved || 0} solved</Text>
                </View>
                <Text style={st.playerCoins}>🪙 {player.coins || player.totalCoins || 0}</Text>
              </View>
            ))
          )}
        </View>

        {/* Battle History */}
        <TouchableOpacity style={st.historyBtn} onPress={() => navigation.navigate('BattleHistory')}>
          <Ionicons name="time-outline" size={18} color={COLORS.textSecondary} />
          <Text style={st.historyBtnText}>View Battle History</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 14 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary },
  pageSubtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  coinBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${COLORS.warning}20`, paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.full, borderWidth: 1, borderColor: `${COLORS.warning}40` },
  coinEmoji: { fontSize: 16 },
  coinText: { fontSize: 15, fontWeight: '800', color: COLORS.warning },

  // Hero
  heroCard: { marginHorizontal: 16, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 },
  heroTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  heroSub: { fontSize: 13, color: COLORS.textMuted, lineHeight: 18, marginBottom: 12 },
  heroButtons: { flexDirection: 'row', gap: 10 },
  heroBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: RADIUS.md },
  heroBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  heroBtnOutline: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 16, paddingVertical: 10, borderRadius: RADIUS.md },
  heroBtnOutlineText: { color: COLORS.textPrimary, fontWeight: '700', fontSize: 14 },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8, marginBottom: 16 },
  statCard: { width: '47%', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, gap: 4 },
  statEmoji: { fontSize: 22 },
  statValue: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  statLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', textAlign: 'center' },

  // Quick Actions
  actionsGrid: { paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  actionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 12 },
  actionIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  actionLabel: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  actionDesc: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },

  // Sections
  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  viewAll: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },

  // Live
  liveDot: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${COLORS.success}15`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  liveDotInner: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.success },
  liveText: { fontSize: 10, color: COLORS.success, fontWeight: '700' },

  // Empty
  emptyBox: { alignItems: 'center', paddingVertical: 20, gap: 4 },
  emptyText: { fontSize: 13, color: COLORS.textMuted },
  emptyLink: { fontSize: 12, color: COLORS.primary, marginTop: 4 },

  // Battle rows
  battleRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 12, marginBottom: 6, gap: 10 },
  battleAvatars: { flexDirection: 'row', width: 36 },
  battleAv: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.background },
  battleAv1: { backgroundColor: COLORS.primary, zIndex: 1 },
  battleAv2: { backgroundColor: '#A855F7', marginLeft: -8 },
  battleAvText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  battleNames: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  battleDiff: { fontSize: 11, color: COLORS.textMuted, textTransform: 'capitalize' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  statusWaiting: { backgroundColor: `${COLORS.primary}15` },
  statusActive: { backgroundColor: '#FFF7ED' },
  statusText: { fontSize: 10, fontWeight: '700' },

  // Player rows
  playerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 12, marginBottom: 6, gap: 10 },
  rankBadge: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.border },
  rank1: { backgroundColor: '#FEF3C7' },
  rank2: { backgroundColor: '#F3F4F6' },
  rank3: { backgroundColor: '#FFF7ED' },
  rankText: { fontSize: 12, fontWeight: '800', color: COLORS.textMuted },
  playerName: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  playerSub: { fontSize: 11, color: COLORS.textMuted },
  playerCoins: { fontSize: 13, fontWeight: '600', color: '#F59E0B' },

  // Invites
  inviteCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: `${COLORS.primary}30`, marginBottom: 8, gap: 12 },
  inviteInfo: { flex: 1 },
  inviteFrom: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  inviteChallenge: { fontSize: 12, color: COLORS.textMuted },
  inviteButtons: { flexDirection: 'row', gap: 8 },
  acceptBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.success, justifyContent: 'center', alignItems: 'center' },
  rejectBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: `${COLORS.danger}20`, justifyContent: 'center', alignItems: 'center' },

  // History
  historyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  historyBtnText: { flex: 1, fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
});
