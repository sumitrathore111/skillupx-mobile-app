import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { enrollInRoadmap, fetchRoadmapBySlug, markTopicComplete, markTopicIncomplete } from '@services/roadmapService';
import type { RoadmapDetail, Topic } from '@apptypes/index';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type RouteParams = { slug: string; roadmapId?: string };

const PHASE_ICONS = ['🌱', '📖', '🔨', '🚀', '🎯'];

export default function RoadmapDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { slug } = route.params as RouteParams;
  const [roadmap, setRoadmap] = useState<RoadmapDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const data = await fetchRoadmapBySlug(slug);
      setRoadmap(data);
      navigation.setOptions({ title: data.title });
      if (data.phases?.length) {
        setExpandedPhases(new Set([data.phases[0].id || data.phases[0]._id || '0']));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }

  const onRefresh = () => { setRefreshing(true); load(); };

  async function handleEnroll() {
    if (!roadmap) return;
    setEnrolling(true);
    try {
      await enrollInRoadmap(roadmap.id);
      setRoadmap(prev => prev ? { ...prev, isEnrolled: true } : prev);
      Alert.alert('Enrolled!', `You're now enrolled in "${roadmap.title}"`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to enroll');
    } finally { setEnrolling(false); }
  }

  async function handleTopicToggle(phaseId: string, topic: Topic) {
    if (!roadmap?.isEnrolled) { Alert.alert('Enroll First', 'Please enroll in this roadmap to track progress'); return; }
    try {
      const fn = topic.isCompleted ? markTopicIncomplete : markTopicComplete;
      await fn(roadmap.id, phaseId, topic.id || topic._id!);
      // Optimistic update
      setRoadmap(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          phases: prev.phases.map(phase =>
            (phase.id || phase._id) === phaseId
              ? {
                  ...phase,
                  topics: phase.topics.map(t =>
                    (t.id || t._id) === (topic.id || topic._id) ? { ...t, isCompleted: !topic.isCompleted } : t
                  ),
                }
              : phase
          ),
        };
      });
    } catch (e) { console.error(e); }
  }

  function togglePhase(phaseId: string) {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      next.has(phaseId) ? next.delete(phaseId) : next.add(phaseId);
      return next;
    });
  }

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  if (!roadmap) return <View style={styles.loading}><Text style={styles.error}>Roadmap not found</Text></View>;

  const totalTopics = roadmap.phases.reduce((acc, p) => acc + (p.topics?.length ?? 0), 0);
  const completedTopics = roadmap.phases.reduce((acc, p) => acc + (p.topics?.filter(t => t.isCompleted).length ?? 0), 0);
  const progress = totalTopics > 0 ? Math.round(completedTopics / totalTopics * 100) : 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero section */}
        <View style={styles.hero}>
          <Text style={styles.title}>{roadmap.title}</Text>
          {roadmap.description && <Text style={styles.description}>{roadmap.description}</Text>}
          <View style={styles.heroMeta}>
            <View style={styles.metaChip}><Text style={styles.metaChipText}>{roadmap.difficulty}</Text></View>
            <View style={styles.metaChip}><Text style={styles.metaChipText}>{totalTopics} topics</Text></View>
            <View style={styles.metaChip}><Text style={styles.metaChipText}>{roadmap.phases.length} phases</Text></View>
          </View>

          {/* Progress */}
          {roadmap.isEnrolled && (
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
          {!roadmap.isEnrolled && (
            <TouchableOpacity style={[styles.enrollBtn, enrolling && styles.enrollBtnDisabled]} onPress={handleEnroll} disabled={enrolling}>
              {enrolling ? <ActivityIndicator color="#fff" /> : <><Ionicons name="map" size={18} color="#fff" /><Text style={styles.enrollBtnText}>Enroll in Roadmap</Text></>}
            </TouchableOpacity>
          )}
        </View>

        {/* Phases */}
        <View style={styles.phasesSection}>
          <Text style={styles.phasesTitle}>Learning Path</Text>
          {roadmap.phases.map((phase, phaseIdx) => {
            const phaseKey = phase.id || phase._id || String(phaseIdx);
            const isExpanded = expandedPhases.has(phaseKey);
            const phaseDone = phase.topics?.filter(t => t.isCompleted).length ?? 0;
            return (
              <View key={phaseKey} style={styles.phaseCard}>
                <TouchableOpacity style={styles.phaseHeader} onPress={() => togglePhase(phaseKey)} activeOpacity={0.8}>
                  <Text style={styles.phaseEmoji}>{PHASE_ICONS[phaseIdx % PHASE_ICONS.length]}</Text>
                  <View style={styles.phaseInfo}>
                    <Text style={styles.phaseName}>{phase.name}</Text>
                    <Text style={styles.phaseMeta}>{phaseDone}/{phase.topics?.length ?? 0} done</Text>
                  </View>
                  <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
                {isExpanded && (
                  <View style={styles.topicsList}>
                    {phase.topics?.map((topic, topicIdx) => (
                      <TouchableOpacity
                        key={topic.id || topic._id || String(topicIdx)}
                        style={styles.topicRow}
                        onPress={() => navigation.navigate('TopicDetail', { topic, phaseId: phaseKey, roadmapId: roadmap.id, isEnrolled: roadmap.isEnrolled })}
                        activeOpacity={0.8}
                      >
                        <TouchableOpacity
                          style={[styles.topicCheck, topic.isCompleted && styles.topicCheckDone]}
                          onPress={() => handleTopicToggle(phaseKey, topic)}
                        >
                          {topic.isCompleted && <Ionicons name="checkmark" size={14} color="#fff" />}
                        </TouchableOpacity>
                        <View style={styles.topicInfo}>
                          <Text style={[styles.topicTitle, topic.isCompleted && styles.topicTitleDone]}>{topic.name}</Text>
                          {topic.resources?.length > 0 && (
                            <Text style={styles.topicMeta}>{topic.resources.length} resources</Text>
                          )}
                        </View>
                        <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  error: { color: COLORS.textMuted, fontSize: 15 },
  hero: { padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 8 },
  description: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 12 },
  heroMeta: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  metaChip: { backgroundColor: COLORS.surface, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border },
  metaChipText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  progressSection: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressLabel: { fontSize: 13, color: COLORS.textSecondary },
  progressPct: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  progressBarBg: { height: 8, backgroundColor: `${COLORS.primary}20`, borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  progressBarFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 4 },
  progressSub: { fontSize: 11, color: COLORS.textMuted },
  enrollBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: 14 },
  enrollBtnDisabled: { opacity: 0.6 },
  enrollBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  phasesSection: { padding: 16 },
  phasesTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 },
  phaseCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10, overflow: 'hidden' },
  phaseHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  phaseEmoji: { fontSize: 22 },
  phaseInfo: { flex: 1 },
  phaseName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  phaseMeta: { fontSize: 11, color: COLORS.textMuted },
  topicsList: { borderTopWidth: 1, borderTopColor: COLORS.border },
  topicRow: { flexDirection: 'row', alignItems: 'center', padding: 12, paddingLeft: 16, gap: 10, borderBottomWidth: 1, borderBottomColor: `${COLORS.border}60` },
  topicCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  topicCheckDone: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  topicInfo: { flex: 1 },
  topicTitle: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '500' },
  topicTitleDone: { color: COLORS.textMuted, textDecorationLine: 'line-through' },
  topicMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
});
