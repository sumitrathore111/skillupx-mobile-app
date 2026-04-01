import { COLORS, RADIUS, SHADOWS, SIZES } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { apiRequest } from '@services/api';
import { fetchWallet } from '@services/arenaService';
import { useAuthStore } from '@store/authStore';
import type { DashboardStats, EarnedBadge } from '@apptypes/index';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BADGE_DEFINITIONS = [
  { id: 'gold_badge', name: 'Gold Badge', icon: '💻', description: 'Finish 5 Projects', requirement: { type: 'projects', count: 5 } },
  { id: 'battle_master', name: '+500 Coins', icon: '⚔️', description: 'Win 50 Battles', requirement: { type: 'battles', count: 50 } },
  { id: 'collaborator_badge', name: 'Collaborator', icon: '👥', description: 'Join 3 Teams', requirement: { type: 'teams', count: 3 } },
  { id: 'elite_status', name: 'Elite Status', icon: '🏆', description: 'Get 3 Certificates', requirement: { type: 'certificates', count: 3 } },
  { id: 'star_developer', name: 'Star Developer', icon: '⭐', description: 'Reach 4.8+ Rating', requirement: { type: 'rating', count: 4.8 } },
  { id: 'coding_master', name: 'Coding Master', icon: '🎯', description: 'Solve 100+ DSA', requirement: { type: 'challenges', count: 100 } },
];

export default function DevFeedScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [earnedBadges, setEarnedBadges] = useState<EarnedBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [walletData, progressData] = await Promise.allSettled([
        fetchWallet(user.id),
        apiRequest<any>('GET', `/users/${user.id}/progress`),
      ]);

      const wallet = walletData.status === 'fulfilled' ? walletData.value : null;
      const progress = progressData.status === 'fulfilled' ? progressData.value : null;

      setStats({
        problemsSolved: progress?.solvedChallenges?.length || wallet?.achievements?.problemsSolved || 0,
        battlesWon: wallet?.achievements?.battlesWon || 0,
        currentStreak: wallet?.achievements?.currentStreak || 0,
        globalRank: '-',
        coins: wallet?.coins || 0,
        activeProjects: 0,
        completedRoadmaps: 0,
      });

      const solved = progress?.solvedChallenges?.length || 0;
      const battlesWon = wallet?.achievements?.battlesWon || 0;
      const badges: EarnedBadge[] = [];
      if (solved >= 100) badges.push({ id: 'coding_master', name: 'Coding Master', icon: '🎯', description: 'Solved 100 problems', earnedAt: new Date().toISOString() });
      if (battlesWon >= 50) badges.push({ id: 'battle_master', name: 'Battle Master', icon: '⚔️', description: 'Won 50 battles', earnedAt: new Date().toISOString() });
      setEarnedBadges(badges);
    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);
  const onRefresh = () => { setRefreshing(true); loadData(); };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName}>{user?.name || 'Developer'} 👋</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => navigation.navigate('Query')} style={styles.headerIconBtn}>
              <Ionicons name="chatbubble-ellipses-outline" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('MyInvites')} style={styles.headerIconBtn}>
              <Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={styles.headerIconBtn}>
              <Ionicons name="notifications-outline" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <View style={styles.coinBadge}>
              <Text style={styles.coinIcon}>🪙</Text>
              <Text style={styles.coinText}>{stats?.coins || 0}</Text>
            </View>
            <TouchableOpacity style={styles.avatarContainer} onPress={() => navigation.navigate('Profile')}>
              <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() || 'U'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Streak Card */}
        {(stats?.currentStreak || 0) > 0 && (
          <View style={styles.streakCard}>
            <View style={styles.streakLeft}>
              <Text style={styles.streakFire}>🔥</Text>
              <View>
                <Text style={styles.streakCount}>{stats?.currentStreak} Day Streak!</Text>
                <Text style={styles.streakSub}>Keep it up, you're on fire</Text>
              </View>
            </View>
            <View style={styles.streakBadge}>
              <Text style={styles.streakBadgeText}>ACTIVE</Text>
            </View>
          </View>
        )}

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {[
            { label: 'Problems Solved', value: stats?.problemsSolved || 0, icon: '✅', color: COLORS.success },
            { label: 'Battles Won', value: stats?.battlesWon || 0, icon: '⚔️', color: COLORS.primary },
            { label: 'Day Streak', value: stats?.currentStreak || 0, icon: '🔥', color: COLORS.warning },
            { label: 'Global Rank', value: stats?.globalRank || '-', icon: '🏆', color: COLORS.accent },
          ].map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <Text style={styles.statIcon}>{stat.icon}</Text>
              <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          {[
            { label: 'Practice', icon: 'code-slash-outline', color: COLORS.primary, nav: () => navigation.navigate('Arena', { screen: 'ProblemList' }) },
            { label: 'Battle', icon: 'flash-outline', color: COLORS.danger, nav: () => navigation.navigate('Arena', { screen: 'BattleLobby' }) },
            { label: 'Roadmaps', icon: 'map-outline', color: COLORS.accent, nav: () => navigation.navigate('Roadmaps') },
            { label: 'Connect', icon: 'people-outline', color: COLORS.success, nav: () => navigation.navigate('Connect') },
          ].map((action) => (
            <TouchableOpacity key={action.label} style={styles.actionCard} onPress={action.nav} activeOpacity={0.75}>
              <View style={[styles.actionIcon, { backgroundColor: `${action.color}20` }]}>
                <Ionicons name={action.icon as any} size={22} color={action.color} />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Badges */}
        <View style={styles.badgesHeader}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          <Text style={styles.badgeCount}>{earnedBadges.length}/{BADGE_DEFINITIONS.length}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgesScroll}>
          {BADGE_DEFINITIONS.map((badge) => {
            const earned = earnedBadges.find(b => b.id === badge.id);
            return (
              <View key={badge.id} style={[styles.badgeCard, !earned && styles.badgeLocked]}>
                <Text style={[styles.badgeIcon, !earned && styles.badgeIconLocked]}>{badge.icon}</Text>
                <Text style={[styles.badgeName, !earned && styles.badgeTextLocked]}>{badge.name}</Text>
                <Text style={styles.badgeDesc}>{badge.description}</Text>
                {earned && <View style={styles.earnedDot} />}
              </View>
            );
          })}
        </ScrollView>

        {/* Today's Challenge CTA */}
        <TouchableOpacity
          style={styles.dailyChallengeCard}
          onPress={() => navigation.navigate('Arena', { screen: 'ProblemList' })}
          activeOpacity={0.85}
        >
          <View style={styles.dailyLeft}>
            <Text style={styles.dailyLabel}>Today's Challenge</Text>
            <Text style={styles.dailyTitle}>Solve a problem & earn coins</Text>
            <Text style={styles.dailySubtitle}>+15 🪙 per solved problem</Text>
          </View>
          <Ionicons name="arrow-forward-circle" size={40} color={COLORS.primary} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: SIZES.base, paddingBottom: 32 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 13, color: COLORS.textMuted },
  userName: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIconBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  coinBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${COLORS.warning}20`, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full },
  coinIcon: { fontSize: 14 },
  coinText: { fontSize: 13, fontWeight: '700', color: COLORS.warning },
  avatarContainer: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  streakCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: `${COLORS.warning}15`, borderRadius: RADIUS.lg,
    padding: 16, marginBottom: 16, borderWidth: 1, borderColor: `${COLORS.warning}30`,
  },
  streakLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  streakFire: { fontSize: 28 },
  streakCount: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  streakSub: { fontSize: 12, color: COLORS.textMuted },
  streakBadge: { backgroundColor: COLORS.warning, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  streakBadgeText: { fontSize: 10, fontWeight: '800', color: '#000' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1, minWidth: '45%', backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  statIcon: { fontSize: 22, marginBottom: 6 },
  statValue: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, textAlign: 'center' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 },
  quickActions: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  actionCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  actionIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  badgesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  badgeCount: { fontSize: 13, color: COLORS.textMuted },
  badgesScroll: { paddingRight: 16, paddingBottom: 4, gap: 10, marginBottom: 24 },
  badgeCard: {
    width: 100, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.primary + '40',
  },
  badgeLocked: { borderColor: COLORS.border, opacity: 0.5 },
  badgeIcon: { fontSize: 28, marginBottom: 6 },
  badgeIconLocked: { opacity: 0.4 },
  badgeName: { fontSize: 11, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  badgeTextLocked: { color: COLORS.textMuted },
  badgeDesc: { fontSize: 9, color: COLORS.textMuted, textAlign: 'center', marginTop: 2 },
  earnedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.success, marginTop: 4 },
  dailyChallengeCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: `${COLORS.primary}15`, borderRadius: RADIUS.lg,
    padding: 18, borderWidth: 1, borderColor: `${COLORS.primary}40`,
  },
  dailyLeft: { flex: 1 },
  dailyLabel: { fontSize: 11, fontWeight: '600', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  dailyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  dailySubtitle: { fontSize: 13, color: COLORS.textMuted },
});
