import type { InterviewQuestion, Resource, TopicDetail } from '@apptypes/index';
import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getTopicDetail, markTopicComplete, markTopicIncomplete, PHASE_LABELS } from '@services/roadmapService';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, Linking, ScrollView,
    StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type RouteParams = { topicId: string; roadmapSlug?: string };

const RESOURCE_ICONS: Record<string, string> = {
  video: 'logo-youtube',
  article: 'document-text-outline',
  documentation: 'book-outline',
  course: 'school-outline',
  tutorial: 'code-slash-outline',
};

const RESOURCE_COLORS: Record<string, string> = {
  video: '#FF0000',
  article: COLORS.primary,
  documentation: '#8B5CF6',
  course: COLORS.warning,
  tutorial: COLORS.success,
};

export default function TopicDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { topicId, roadmapSlug } = route.params as RouteParams;
  const [data, setData] = useState<TopicDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [expandedQ, setExpandedQ] = useState<string | null>(null);

  useEffect(() => { load(); }, [topicId]);

  async function load() {
    try {
      const res = await getTopicDetail(topicId);
      setData(res);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleToggleComplete() {
    if (!data) return;
    setCompleting(true);
    try {
      if (data.isCompleted) {
        await markTopicIncomplete(topicId);
      } else {
        await markTopicComplete(topicId);
      }
      setData(prev => prev ? { ...prev, isCompleted: !prev.isCompleted } : prev);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update');
    } finally { setCompleting(false); }
  }

  async function openResource(resource: Resource) {
    if (!resource.url) { Alert.alert('No URL', 'This resource has no URL'); return; }
    try {
      const supported = await Linking.canOpenURL(resource.url);
      if (supported) await Linking.openURL(resource.url);
      else Alert.alert('Cannot Open', 'Unable to open this URL');
    } catch (e) { Alert.alert('Error', 'Failed to open link'); }
  }

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  if (!data) return <View style={styles.loading}><Text style={styles.errorText}>Topic not found</Text></View>;

  const { topic, questions, navigation: topicNav, isCompleted } = data;
  const phaseInfo = PHASE_LABELS[topic.phase];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header with back */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
          {/* Breadcrumb */}
          <View style={styles.breadcrumb}>
            <Text style={styles.breadcrumbSlug}>{topic.roadmapId?.title || ''}</Text>
            <Ionicons name="chevron-forward" size={12} color={COLORS.textMuted} />
            <Text style={styles.breadcrumbPhase}>{phaseInfo?.label || topic.phase}</Text>
          </View>
        </View>

        {/* Topic header */}
        <View style={styles.topicHeader}>
          <View style={[styles.checkCircle, isCompleted && styles.checkDone]}>
            <Text style={styles.topicIcon}>{topic.icon || (isCompleted ? '✅' : '📖')}</Text>
          </View>
          <Text style={styles.topicTitle}>{topic.title}</Text>
          <View style={styles.topicBadges}>
            <View style={[styles.phaseBadge, { backgroundColor: `${phaseInfo?.color || COLORS.primary}20` }]}>
              <Text style={[styles.phaseBadgeText, { color: phaseInfo?.color || COLORS.primary }]}>
                {phaseInfo?.icon} {phaseInfo?.label || topic.phase}
              </Text>
            </View>
            {topic.estimatedHours > 0 && (
              <View style={styles.hoursBadge}>
                <Ionicons name="time-outline" size={12} color={COLORS.textMuted} />
                <Text style={styles.hoursText}>{topic.estimatedHours}h</Text>
              </View>
            )}
          </View>
          {isCompleted && (
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
              <Text style={styles.completedText}>Completed</Text>
            </View>
          )}
        </View>

        {/* Complete/Incomplete button */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.completeBtn, isCompleted && styles.incompleteBtnStyle]}
            onPress={handleToggleComplete}
            disabled={completing}
          >
            {completing
              ? <ActivityIndicator color="#fff" size="small" />
              : <>
                  <Ionicons name={isCompleted ? 'close-circle-outline' : 'checkmark-circle-outline'} size={18} color="#fff" />
                  <Text style={styles.completeBtnText}>{isCompleted ? 'Mark Incomplete' : 'Mark Complete'}</Text>
                </>
            }
          </TouchableOpacity>
        </View>

        {/* Description */}
        {topic.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <Text style={styles.descText}>{topic.description}</Text>
          </View>
        ) : null}

        {/* Key Concepts */}
        {topic.keyPoints?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Key Concepts</Text>
            <View style={styles.keyPointsWrap}>
              {topic.keyPoints.map((kp, i) => (
                <View key={i} style={styles.keyPointTag}>
                  <Text style={styles.keyPointText}>{kp}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Resources */}
        {topic.resources?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{topic.resources.length} Resources</Text>
            {topic.resources.map((resource, idx) => {
              const iconName = RESOURCE_ICONS[resource.type] || 'link-outline';
              const iconColor = RESOURCE_COLORS[resource.type] || COLORS.primary;
              return (
                <TouchableOpacity
                  key={String(idx)}
                  style={styles.resourceCard}
                  onPress={() => openResource(resource)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.resourceIcon, { backgroundColor: `${iconColor}20` }]}>
                    <Ionicons name={iconName as any} size={20} color={iconColor} />
                  </View>
                  <View style={styles.resourceInfo}>
                    <Text style={styles.resourceTitle}>{resource.title}</Text>
                    <View style={styles.resourceMetaRow}>
                      <View style={[styles.typeBadge, { backgroundColor: `${iconColor}15` }]}>
                        <Text style={[styles.typeText, { color: iconColor }]}>{resource.type}</Text>
                      </View>
                      {resource.platform ? <Text style={styles.platformText}>{resource.platform}</Text> : null}
                      {resource.duration ? <Text style={styles.durationText}>{resource.duration}</Text> : null}
                      {resource.isFree && (
                        <View style={styles.freeBadge}>
                          <Text style={styles.freeText}>Free</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Ionicons name="open-outline" size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Related Interview Questions */}
        {questions?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Related Interview Questions</Text>
            {questions.map((q: InterviewQuestion, idx) => {
              const isExpanded = expandedQ === q._id;
              const diffColor = q.difficulty === 'easy' ? COLORS.success : q.difficulty === 'medium' ? COLORS.warning : COLORS.danger;
              return (
                <TouchableOpacity key={q._id || idx} style={styles.questionCard} onPress={() => setExpandedQ(isExpanded ? null : q._id)}>
                  <View style={styles.questionHeader}>
                    <Text style={styles.questionText} numberOfLines={isExpanded ? undefined : 2}>{q.question}</Text>
                    <View style={[styles.qDiffBadge, { backgroundColor: `${diffColor}20` }]}>
                      <Text style={[styles.qDiffText, { color: diffColor }]}>{q.difficulty}</Text>
                    </View>
                  </View>
                  {isExpanded && q.answer && (
                    <View style={styles.answerBox}>
                      <View style={styles.answerHeader}>
                        <Ionicons name="bulb" size={14} color={COLORS.success} />
                        <Text style={styles.answerLabel}>Answer</Text>
                      </View>
                      <Text style={styles.answerText}>{q.answer}</Text>
                    </View>
                  )}
                  <View style={styles.expandHint}>
                    <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={COLORS.textMuted} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Related Projects */}
        {topic.relatedProjects?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Related Projects</Text>
            {topic.relatedProjects.map((project, i) => (
              <View key={i} style={styles.projectRow}>
                <Ionicons name="code-slash-outline" size={14} color={COLORS.primary} />
                <Text style={styles.projectText}>{project}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Prev/Next navigation */}
        <View style={styles.navRow}>
          {topicNav?.prevTopic ? (
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => navigation.replace('TopicDetail', { topicId: topicNav.prevTopic!._id, roadmapSlug })}
            >
              <Ionicons name="arrow-back" size={16} color={COLORS.primary} />
              <Text style={styles.navBtnText} numberOfLines={1}>
                {topicNav.prevTopic.title}
              </Text>
            </TouchableOpacity>
          ) : <View />}
          {topicNav?.nextTopic ? (
            <TouchableOpacity
              style={[styles.navBtn, styles.navBtnRight]}
              onPress={() => navigation.replace('TopicDetail', { topicId: topicNav.nextTopic!._id, roadmapSlug })}
            >
              <Text style={styles.navBtnText} numberOfLines={1}>
                {topicNav.nextTopic.title}
              </Text>
              <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          ) : <View />}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  errorText: { color: COLORS.textMuted, fontSize: 15 },
  scroll: { paddingBottom: 32 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  breadcrumb: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  breadcrumbSlug: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  breadcrumbPhase: { fontSize: 12, color: COLORS.textMuted },

  // Topic header
  topicHeader: { alignItems: 'center', padding: 24, gap: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  checkCircle: { width: 64, height: 64, borderRadius: 32, borderWidth: 2.5, borderColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.surface },
  checkDone: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  topicIcon: { fontSize: 28 },
  topicTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center' },
  topicBadges: { flexDirection: 'row', gap: 8 },
  phaseBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  phaseBadgeText: { fontSize: 11, fontWeight: '700' },
  hoursBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.surface, paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border },
  hoursText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  completedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${COLORS.success}20`, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full },
  completedText: { fontSize: 12, color: COLORS.success, fontWeight: '600' },

  // Action
  actionRow: { padding: 16 },
  completeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.success, borderRadius: RADIUS.lg, paddingVertical: 12 },
  incompleteBtnStyle: { backgroundColor: COLORS.danger },
  completeBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Sections
  section: { padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 },
  descText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },

  // Key points
  keyPointsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  keyPointTag: { backgroundColor: `${COLORS.primary}15`, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full },
  keyPointText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },

  // Resources
  resourceCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  resourceIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  resourceInfo: { flex: 1, gap: 4 },
  resourceTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  resourceMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  typeBadge: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2, borderRadius: RADIUS.full },
  typeText: { fontSize: 10, fontWeight: '700' },
  platformText: { fontSize: 10, color: COLORS.textMuted },
  durationText: { fontSize: 10, color: COLORS.textMuted },
  freeBadge: { backgroundColor: `${COLORS.success}20`, paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.full },
  freeText: { fontSize: 9, color: COLORS.success, fontWeight: '700' },

  // Questions
  questionCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8, gap: 6 },
  questionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  questionText: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, lineHeight: 18 },
  qDiffBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: RADIUS.full },
  qDiffText: { fontSize: 10, fontWeight: '700' },
  answerBox: { backgroundColor: `${COLORS.success}10`, borderRadius: RADIUS.md, padding: 10, gap: 4, borderLeftWidth: 3, borderLeftColor: COLORS.success },
  answerHeader: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  answerLabel: { fontSize: 11, fontWeight: '700', color: COLORS.success },
  answerText: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  expandHint: { alignItems: 'center' },

  // Projects
  projectRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  projectText: { fontSize: 13, color: COLORS.textSecondary },

  // Navigation
  navRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, gap: 12 },
  navBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: `${COLORS.primary}15`, paddingHorizontal: 12, paddingVertical: 10, borderRadius: RADIUS.lg, maxWidth: '48%' as any },
  navBtnRight: { flexDirection: 'row' },
  navBtnText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
});
