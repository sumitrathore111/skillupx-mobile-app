import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { fetchLearningDashboard } from '@services/roadmapService';
import type { LearningDashboard } from '@apptypes/index';
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
  const [dashboard, setDashboard] = useState<LearningDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const data = await fetchLearningDashboard();
      setDashboard(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }

  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

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
        {dashboard && (
          <View style={styles.statsGrid}>
            {[
              { label: 'Topics Done', value: dashboard.completedTopics, icon: '✅', color: COLORS.success },
              { label: 'In Progress', value: dashboard.enrolledRoadmaps, icon: '📚', color: COLORS.primary },
              { label: 'Completed', value: dashboard.completedRoadmaps, icon: '🏆', color: COLORS.warning },
              { label: 'Streak', value: `${dashboard.learningStreak || 0}d`, icon: '🔥', color: '#FF6B6B' },
            ].map(stat => (
              <View key={stat.label} style={styles.statCard}>
                <Text style={styles.statEmoji}>{stat.icon}</Text>
                <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Enrolled Roadmaps */}
        {dashboard?.enrolledRoadmapsList && dashboard.enrolledRoadmapsList.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Continue Learning</Text>
            {dashboard.enrolledRoadmapsList.map(roadmap => {
              const progress = roadmap.completedTopics / Math.max(roadmap.totalTopics, 1) * 100;
              return (
                <TouchableOpacity
                  key={roadmap.id}
                  style={styles.roadmapProgressCard}
                  onPress={() => navigation.navigate('RoadmapDetail', { slug: roadmap.slug })}
                  activeOpacity={0.8}
                >
                  <View style={styles.roadmapProgressHeader}>
                    <Text style={styles.roadmapProgressTitle}>{roadmap.title}</Text>
                    <Text style={styles.progressPct}>{Math.round(progress)}%</Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${progress}%` as any }]} />
                  </View>
                  <Text style={styles.progressSubtext}>{roadmap.completedTopics}/{roadmap.totalTopics} topics</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Badges */}
        {dashboard?.earnedBadges && dashboard.earnedBadges.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Achievements</Text>
            <View style={styles.badgesGrid}>
              {dashboard.earnedBadges.map(badge => (
                <View key={badge.id} style={styles.badgeCard}>
                  <Text style={styles.badgeEmoji}>{badge.icon}</Text>
                  <Text style={styles.badgeName}>{badge.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* No roadmaps */}
        {(!dashboard?.enrolledRoadmapsList || dashboard.enrolledRoadmapsList.length === 0) && (
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
  roadmapProgressCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  roadmapProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  roadmapProgressTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  progressPct: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  progressBarBg: { height: 6, backgroundColor: `${COLORS.primary}20`, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  progressBarFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
  progressSubtext: { fontSize: 11, color: COLORS.textMuted },
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badgeCard: { alignItems: 'center', width: 72, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 12, borderWidth: 1, borderColor: COLORS.border },
  badgeEmoji: { fontSize: 24, marginBottom: 4 },
  badgeName: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', textAlign: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 52, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  startBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: RADIUS.lg },
  startBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
