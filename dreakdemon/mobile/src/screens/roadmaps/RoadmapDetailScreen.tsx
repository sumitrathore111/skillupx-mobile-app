import type { RoadmapDetail, Topic } from '@apptypes/index';
import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  DIFFICULTY_LABELS,
  enrollInRoadmap,
  getRoadmapBySlug,
  markTopicComplete,
  markTopicIncomplete,
  PHASE_LABELS
} from '@services/roadmapService';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, RefreshControl,
  ScrollView, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type RouteParams = { slug: string };

const PHASES = ['foundation', 'beginner', 'intermediate', 'advanced', 'interview'] as const;

export default function RoadmapDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { slug } = route.params as RouteParams;
  const [data, setData] = useState<RoadmapDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set(['beginner']));
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await getRoadmapBySlug(slug);
      setData(res);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }

  const onRefresh = () => { setRefreshing(true); load(); };

  async function handleEnroll() {
    if (!data) return;
    setEnrolling(true);
    try {
      await enrollInRoadmap(data.roadmap._id);
      await load();
      Alert.alert('Enrolled!', `You're now enrolled in "${data.roadmap.title}"`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to enroll');
    } finally { setEnrolling(false); }
  }

  async function handleTopicToggle(topic: Topic) {
    if (!data?.userProgress?.isEnrolled) {
      Alert.alert('Enroll First', 'Please enroll in this roadmap to track progress');
      return;
    }
    const isCompleted = data.userProgress.completedTopicIds?.includes(topic._id);
    try {
      if (isCompleted) {
        await markTopicIncomplete(topic._id);
      } else {
        await markTopicComplete(topic._id);
      }
      // Optimistic update
      setData(prev => {
        if (!prev || !prev.userProgress) return prev;
        const ids = prev.userProgress.completedTopicIds || [];
        const newIds = isCompleted ? ids.filter(id => id !== topic._id) : [...ids, topic._id];
        const totalTopics = prev.roadmap.totalTopics || 1;
        return {
          ...prev,
          userProgress: {
            ...prev.userProgress,
            completedTopicIds: newIds,
            completedTopics: newIds.length,
            progressPercent: Math.round((newIds.length / totalTopics) * 100),
          },
        };
      });
    } catch (e) { console.error(e); }
  }

  function togglePhase(phase: string) {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      next.has(phase) ? next.delete(phase) : next.add(phase);
      return next;
    });
  }

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  if (!data) return <View style={styles.loading}><Text style={styles.error}>Roadmap not found</Text></View>;

  const { roadmap, topicsByPhase, userProgress, careerInfo } = data;
  const isEnrolled = userProgress?.isEnrolled ?? false;
  const completedIds = new Set(userProgress?.completedTopicIds || []);
  const totalTopics = roadmap.totalTopics;
  const rawCompleted = userProgress?.completedTopics;
  const completedTopics = typeof rawCompleted === 'number' ? rawCompleted : (Array.isArray(rawCompleted) ? rawCompleted.length : 0);
  const progress = userProgress?.progressPercent ?? 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <View style={styles.topBarRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Hero section */}
        <View style={styles.hero}>
          <View style={[styles.heroIconBg, { backgroundColor: roadmap.color || COLORS.primary }]}>
            <Text style={styles.heroIcon}>{roadmap.icon || '📚'}</Text>
          </View>
          <Text style={styles.title}>{roadmap.title}</Text>
          {roadmap.description ? <Text style={styles.description}>{roadmap.description}</Text> : null}

          <View style={styles.heroMeta}>
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>{DIFFICULTY_LABELS[roadmap.difficulty] || roadmap.difficulty}</Text>
            </View>
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>{totalTopics} topics</Text>
            </View>
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>{roadmap.estimatedWeeks} weeks</Text>
            </View>
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>{roadmap.totalResources} resources</Text>
            </View>
          </View>

          {/* Rating & enrolled */}
          <View style={styles.ratingRow}>
            {roadmap.rating > 0 && (
              <View style={styles.ratingItem}>
                <Ionicons name="star" size={14} color={COLORS.warning} />
                <Text style={styles.ratingText}>{roadmap.rating.toFixed(1)} ({roadmap.reviewCount})</Text>
              </View>
            )}
            <View style={styles.ratingItem}>
              <Ionicons name="people-outline" size={14} color={COLORS.textMuted} />
              <Text style={styles.ratingText}>{roadmap.enrolledCount} learners</Text>
            </View>
          </View>

          {/* Prerequisites */}
          {roadmap.prerequisites?.length > 0 && (
            <View style={styles.prereqSection}>
              <Text style={styles.prereqTitle}>Prerequisites</Text>
              {roadmap.prerequisites.map((p, i) => (
                <View key={i} style={styles.prereqRow}>
                  <Ionicons name="checkmark-circle-outline" size={14} color={COLORS.primary} />
                  <Text style={styles.prereqText}>{p}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Outcomes */}
          {roadmap.outcomes?.length > 0 && (
            <View style={styles.prereqSection}>
              <Text style={styles.prereqTitle}>What You'll Learn</Text>
              {roadmap.outcomes.map((o, i) => (
                <View key={i} style={styles.prereqRow}>
                  <Ionicons name="trophy-outline" size={14} color={COLORS.success} />
                  <Text style={styles.prereqText}>{o}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Progress */}
          {isEnrolled && (
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Your Progress</Text>
                <Text style={styles.progressPct}>{progress}%</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progress}%` as any }]} />
              </View>
              <Text style={styles.progressSub}>{completedTopics}/{totalTopics} topics completed</Text>
            </View>
          )}

          {/* Enroll button */}
          {!isEnrolled && (
            <TouchableOpacity style={[styles.enrollBtn, enrolling && styles.enrollBtnDisabled]} onPress={handleEnroll} disabled={enrolling}>
              {enrolling
                ? <ActivityIndicator color="#fff" />
                : <><Ionicons name="rocket-outline" size={18} color="#fff" /><Text style={styles.enrollBtnText}>Enroll in Roadmap</Text></>
              }
            </TouchableOpacity>
          )}

          {/* Quick actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => navigation.navigate('InterviewPrep', { roadmapId: roadmap._id, title: roadmap.title })}
            >
              <Ionicons name="school-outline" size={16} color={COLORS.primary} />
              <Text style={styles.quickBtnText}>Interview Prep</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => navigation.navigate('CareerInfo', { roadmapId: roadmap._id, title: roadmap.title })}
            >
              <Ionicons name="briefcase-outline" size={16} color={COLORS.primary} />
              <Text style={styles.quickBtnText}>Career Paths</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Phases */}
        <View style={styles.phasesSection}>
          <Text style={styles.phasesTitle}>Learning Path</Text>
          {PHASES.map(phase => {
            const topics = topicsByPhase[phase] || [];
            if (topics.length === 0) return null;
            const isExpanded = expandedPhases.has(phase);
            const phaseInfo = PHASE_LABELS[phase];
            const phaseDone = topics.filter(t => completedIds.has(t._id)).length;
            const phaseProgress = topics.length > 0 ? Math.round((phaseDone / topics.length) * 100) : 0;

            return (
              <View key={phase} style={styles.phaseCard}>
                <TouchableOpacity style={styles.phaseHeader} onPress={() => togglePhase(phase)} activeOpacity={0.8}>
                  <Text style={styles.phaseEmoji}>{phaseInfo.icon}</Text>
                  <View style={styles.phaseInfo}>
                    <Text style={styles.phaseName}>{phaseInfo.label}</Text>
                    <Text style={styles.phaseMeta}>{phaseDone}/{topics.length} done</Text>
                  </View>
                  <View style={styles.phaseProgressMini}>
                    <View style={styles.phaseProgressBg}>
                      <View style={[styles.phaseProgressFill, { width: `${phaseProgress}%` as any, backgroundColor: phaseInfo.color }]} />
                    </View>
                  </View>
                  <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
                {isExpanded && (
                  <View style={styles.topicsList}>
                    {topics.map((topic) => {
                      const isDone = completedIds.has(topic._id);
                      return (
                        <TouchableOpacity
                          key={topic._id}
                          style={styles.topicRow}
                          onPress={() => navigation.navigate('TopicDetail', { topicId: topic._id, roadmapSlug: slug })}
                          activeOpacity={0.8}
                        >
                          <TouchableOpacity
                            style={[styles.topicCheck, isDone && styles.topicCheckDone]}
                            onPress={() => handleTopicToggle(topic)}
                          >
                            {isDone && <Ionicons name="checkmark" size={14} color="#fff" />}
                          </TouchableOpacity>
                          <View style={styles.topicInfo}>
                            <Text style={[styles.topicTitle, isDone && styles.topicTitleDone]}>{topic.title}</Text>
                            <View style={styles.topicMetaRow}>
                              {topic.estimatedHours > 0 && (
                                <Text style={styles.topicMeta}>{topic.estimatedHours}h</Text>
                              )}
                              {topic.resources?.length > 0 && (
                                <Text style={styles.topicMeta}>{topic.resources.length} resources</Text>
                              )}
                            </View>
                          </View>
                          <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Question Stats & Career Info quick links */}
        {(data.questionStats?.length > 0 || data.careerInfo?.length > 0) && (
          <View style={styles.infoCardsSection}>
            {data.questionStats?.length > 0 && (
              <TouchableOpacity
                style={styles.infoCard}
                onPress={() => navigation.navigate('InterviewPrep', { roadmapId: roadmap._id, title: roadmap.title })}
                activeOpacity={0.8}
              >
                <View style={[styles.infoCardIcon, { backgroundColor: '#8B5CF620' }]}>
                  <Ionicons name="help-circle-outline" size={22} color="#8B5CF6" />
                </View>
                <Text style={styles.infoCardValue}>
                  {data.questionStats.reduce((sum: number, s: any) => sum + (s.count || 0), 0)}
                </Text>
                <Text style={styles.infoCardLabel}>Interview Questions</Text>
                <Text style={styles.infoCardAction}>Practice Now →</Text>
              </TouchableOpacity>
            )}
            {data.careerInfo?.length > 0 && (
              <TouchableOpacity
                style={styles.infoCard}
                onPress={() => navigation.navigate('CareerInfo', { roadmapId: roadmap._id, title: roadmap.title })}
                activeOpacity={0.8}
              >
                <View style={[styles.infoCardIcon, { backgroundColor: `${COLORS.success}20` }]}>
                  <Ionicons name="trending-up-outline" size={22} color={COLORS.success} />
                </View>
                <Text style={styles.infoCardValue}>{data.careerInfo.length}</Text>
                <Text style={styles.infoCardLabel}>Career Paths</Text>
                <Text style={styles.infoCardAction}>Explore →</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Long description */}
        {roadmap.longDescription ? (
          <View style={styles.longDescSection}>
            <Text style={styles.longDescTitle}>About This Roadmap</Text>
            <Text style={styles.longDescText}>{roadmap.longDescription}</Text>
          </View>
        ) : null}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  error: { color: COLORS.textMuted, fontSize: 15 },
  topBarRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },

  // Hero
  hero: { padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  heroIconBg: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  heroIcon: { fontSize: 28 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 8 },
  description: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 12 },
  heroMeta: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  metaChip: { backgroundColor: COLORS.surface, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border },
  metaChipText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  ratingRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  ratingItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 12, color: COLORS.textMuted },

  // Prerequisites/Outcomes
  prereqSection: { marginBottom: 12 },
  prereqTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6 },
  prereqRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  prereqText: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },

  // Progress
  progressSection: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressLabel: { fontSize: 13, color: COLORS.textSecondary },
  progressPct: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  progressBarBg: { height: 8, backgroundColor: `${COLORS.primary}20`, borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  progressBarFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 4 },
  progressSub: { fontSize: 11, color: COLORS.textMuted },

  // Enroll
  enrollBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: 14 },
  enrollBtnDisabled: { opacity: 0.6 },
  enrollBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Quick actions
  quickActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  quickBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: `${COLORS.primary}15`, borderRadius: RADIUS.lg, paddingVertical: 10, borderWidth: 1, borderColor: `${COLORS.primary}30` },
  quickBtnText: { fontSize: 12, color: COLORS.primary, fontWeight: '700' },

  // Phases
  phasesSection: { padding: 16 },
  phasesTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 },
  phaseCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10, overflow: 'hidden' },
  phaseHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  phaseEmoji: { fontSize: 22 },
  phaseInfo: { flex: 1 },
  phaseName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  phaseMeta: { fontSize: 11, color: COLORS.textMuted },
  phaseProgressMini: { width: 40 },
  phaseProgressBg: { height: 4, backgroundColor: `${COLORS.border}`, borderRadius: 2, overflow: 'hidden' },
  phaseProgressFill: { height: '100%', borderRadius: 2 },

  // Topics
  topicsList: { borderTopWidth: 1, borderTopColor: COLORS.border },
  topicRow: { flexDirection: 'row', alignItems: 'center', padding: 12, paddingLeft: 16, gap: 10, borderBottomWidth: 1, borderBottomColor: `${COLORS.border}60` },
  topicCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  topicCheckDone: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  topicInfo: { flex: 1 },
  topicTitle: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '500' },
  topicTitleDone: { color: COLORS.textMuted, textDecorationLine: 'line-through' },
  topicMetaRow: { flexDirection: 'row', gap: 8 },
  topicMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },

  // Long description
  longDescSection: { padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  longDescTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  longDescText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },

  // Info cards (questions + careers)
  infoCardsSection: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  infoCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', gap: 4 },
  infoCardIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  infoCardValue: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  infoCardLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', textAlign: 'center' },
  infoCardAction: { fontSize: 11, color: COLORS.primary, fontWeight: '700', marginTop: 4 },
});
