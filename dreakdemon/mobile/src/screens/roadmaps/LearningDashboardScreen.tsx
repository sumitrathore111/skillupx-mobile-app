import type { DashboardData } from '@apptypes/index';
import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getLearningDashboard, PHASE_LABELS } from '@services/roadmapService';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator, RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LearningDashboardScreen() {
  const navigation = useNavigation<any>();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const data = await getLearningDashboard();
      setDashboard(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }

  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  const stats = dashboard?.stats;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Learning Hub</Text>
          <TouchableOpacity style={styles.browseBtn} onPress={() => navigation.navigate('RoadmapList')}>
            <Ionicons name="add" size={16} color={COLORS.primary} />
            <Text style={styles.browseBtnText}>Browse</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        {stats && (
          <View style={styles.statsGrid}>
            {[
              { label: 'Roadmaps', value: stats.totalRoadmaps, icon: '📚', color: COLORS.primary },
              { label: 'Completed', value: stats.totalCompleted, icon: '🏆', color: COLORS.warning },
              { label: 'Topics Done', value: stats.totalTopics, icon: '✅', color: COLORS.success },
              { label: 'Streak', value: `${stats.currentStreak || 0}d`, icon: '🔥', color: '#FF6B6B' },
            ].map(stat => (
              <View key={stat.label} style={styles.statCard}>
                <Text style={styles.statEmoji}>{stat.icon}</Text>
                <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Overall progress */}
        {stats && stats.overallProgress > 0 && (
          <View style={styles.section}>
            <View style={styles.overallRow}>
              <Text style={styles.overallLabel}>Overall Progress</Text>
              <Text style={styles.overallPct}>{Math.round(stats.overallProgress)}%</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${stats.overallProgress}%` as any }]} />
            </View>
            <View style={styles.extraStats}>
              <View style={styles.extraStatItem}>
                <Ionicons name="time-outline" size={14} color={COLORS.textMuted} />
                <Text style={styles.extraStatText}>{Math.round((stats.totalTimeSpent || 0) / 60)}h spent</Text>
              </View>
              <View style={styles.extraStatItem}>
                <Ionicons name="flame-outline" size={14} color="#FF6B6B" />
                <Text style={styles.extraStatText}>Best: {stats.longestStreak || 0}d</Text>
              </View>
              {stats.badgeCount > 0 && (
                <View style={styles.extraStatItem}>
                  <Ionicons name="medal-outline" size={14} color={COLORS.warning} />
                  <Text style={styles.extraStatText}>{stats.badgeCount} badges</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Enrolled Roadmaps / Continue Learning */}
        {dashboard?.roadmapProgress && dashboard.roadmapProgress.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Continue Learning</Text>
            {dashboard.roadmapProgress.map(rp => {
              const roadmap = rp.roadmap;
              return (
                <TouchableOpacity
                  key={roadmap._id}
                  style={styles.roadmapProgressCard}
                  onPress={() => navigation.navigate('RoadmapDetail', { slug: roadmap.slug, title: roadmap.title })}
                  activeOpacity={0.8}
                >
                  <View style={styles.roadmapProgressHeader}>
                    {roadmap.icon ? <Text style={styles.roadmapIcon}>{roadmap.icon}</Text> : null}
                    <Text style={styles.roadmapProgressTitle} numberOfLines={1}>{roadmap.title}</Text>
                    <Text style={styles.progressPct}>{Math.round(rp.progressPercent)}%</Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${rp.progressPercent}%` as any }]} />
                  </View>
                  <Text style={styles.progressSubtext}>{rp.completedTopics}/{rp.totalTopics} topics</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Recent Activity */}
        {dashboard?.recentActivity && dashboard.recentActivity.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            {dashboard.recentActivity.slice(0, 8).map((activity, idx) => {
              const phaseInfo = PHASE_LABELS[activity.phase];
              return (
                <View key={idx} style={styles.activityRow}>
                  <View style={[styles.activityDot, { backgroundColor: phaseInfo?.color || COLORS.primary }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.activityTopic} numberOfLines={1}>{activity.topicTitle}</Text>
                    <Text style={styles.activityRoadmap}>{activity.roadmapTitle}</Text>
                  </View>
                  <Text style={styles.activityTime}>
                    {new Date(activity.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Badges */}
        {dashboard?.badges && dashboard.badges.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Achievements</Text>
            <View style={styles.badgesGrid}>
              {dashboard.badges.map(badge => (
                <View key={badge.id} style={styles.badgeCard}>
                  <Text style={styles.badgeEmoji}>🏅</Text>
                  <Text style={styles.badgeName}>{badge.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* No roadmaps */}
        {(!dashboard?.roadmapProgress || dashboard.roadmapProgress.length === 0) && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📚</Text>
            <Text style={styles.emptyTitle}>Start Learning</Text>
            <Text style={styles.emptyDesc}>Browse roadmaps and enroll in a learning path tailored to your goals</Text>
            <TouchableOpacity style={styles.startBtn} onPress={() => navigation.navigate('RoadmapList')}>
              <Text style={styles.startBtnText}>Browse Roadmaps</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  browseBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${COLORS.primary}20`, paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.lg },
  browseBtnText: { fontSize: 13, color: COLORS.primary, fontWeight: '700' },
  statsGrid: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 20, gap: 8 },
  statCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, gap: 3 },
  statEmoji: { fontSize: 18 },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 9, color: COLORS.textMuted, fontWeight: '600', textAlign: 'center' },
  section: { marginHorizontal: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 },
  // Overall progress
  overallRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  overallLabel: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  overallPct: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  extraStats: { flexDirection: 'row', gap: 16, marginTop: 8 },
  extraStatItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  extraStatText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  // Roadmap progress cards
  roadmapProgressCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  roadmapProgressHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  roadmapIcon: { fontSize: 20 },
  roadmapProgressTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  progressPct: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  progressBarBg: { height: 6, backgroundColor: `${COLORS.primary}20`, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  progressBarFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
  progressSubtext: { fontSize: 11, color: COLORS.textMuted },
  // Recent Activity
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  activityDot: { width: 8, height: 8, borderRadius: 4 },
  activityTopic: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  activityRoadmap: { fontSize: 11, color: COLORS.textMuted },
  activityTime: { fontSize: 10, color: COLORS.textMuted },
  // Badges
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badgeCard: { alignItems: 'center', width: 72, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 12, borderWidth: 1, borderColor: COLORS.border },
  badgeEmoji: { fontSize: 24, marginBottom: 4 },
  badgeName: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', textAlign: 'center' },
  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 52, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  startBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: RADIUS.lg },
  startBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
