import type { ChallengeDetail } from '@apptypes/index';
import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { createDiscussion, fetchChallengeById, getDiscussions, voteDiscussion } from '@services/arenaService';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type RouteParams = { challengeId: string };
type DetailTab = 'description' | 'examples' | 'hints' | 'discuss';

const DIFF_COLORS = { easy: COLORS.success, medium: COLORS.warning, hard: COLORS.danger };

export default function ProblemDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { challengeId } = route.params as RouteParams;
  const [challenge, setChallenge] = useState<ChallengeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DetailTab>('description');
  const [bookmarked, setBookmarked] = useState(false);
  const [discussions, setDiscussions] = useState<any[]>([]);
  const [loadingDisc, setLoadingDisc] = useState(false);
  const [showNewPost, setShowNewPost] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const data = await fetchChallengeById(challengeId);
      setChallenge(data);
      navigation.setOptions({ title: data.title });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (activeTab === 'discuss') loadDiscussions();
  }, [activeTab]);

  async function loadDiscussions() {
    setLoadingDisc(true);
    try { const d = await getDiscussions(challengeId); setDiscussions(d || []); }
    catch (e) { console.error(e); }
    finally { setLoadingDisc(false); }
  }

  async function handleNewPost() {
    if (!postTitle.trim() || !postContent.trim()) return;
    try {
      await createDiscussion(challengeId, postTitle.trim(), postContent.trim());
      setShowNewPost(false); setPostTitle(''); setPostContent('');
      loadDiscussions();
    } catch (e) { Alert.alert('Error', 'Failed to create post'); }
  }

  async function handleVote(id: string) {
    try {
      await voteDiscussion(id);
      setDiscussions(prev => prev.map(d => d._id === id ? { ...d, votes: (d.votes ?? 0) + 1 } : d));
    } catch {}
  }

  async function handleShare() {
    try { await Share.share({ message: `Check out this problem: ${challenge?.title}`, title: challenge?.title }); } catch {}
  }

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  if (!challenge) return <View style={styles.loading}><Text style={styles.error}>Problem not found</Text></View>;

  const diffColor = DIFF_COLORS[challenge.difficulty as keyof typeof DIFF_COLORS] || COLORS.textMuted;
  const similar = (challenge as any).similarProblems || (challenge as any).relatedChallenges || [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header bar */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>{challenge.title}</Text>
        <TouchableOpacity onPress={() => setBookmarked(!bookmarked)} style={styles.navBtn}>
          <Ionicons name={bookmarked ? 'bookmark' : 'bookmark-outline'} size={20} color={bookmarked ? COLORS.warning : COLORS.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleShare} style={styles.navBtn}>
          <Ionicons name="share-outline" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Problem header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{challenge.title}</Text>
            <View style={[styles.diffBadge, { backgroundColor: `${diffColor}20` }]}>
              <Text style={[styles.diffText, { color: diffColor }]}>{challenge.difficulty}</Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            {challenge.topic && (
              <View style={styles.topicChip}><Text style={styles.topicChipText}>{challenge.topic}</Text></View>
            )}
            {challenge.company && (
              <View style={styles.companyChip}><Text style={styles.companyText}>🏢 {challenge.company}</Text></View>
            )}
            {challenge.isSolved && (
              <View style={styles.solvedChip}>
                <Ionicons name="checkmark-circle" size={12} color={COLORS.success} />
                <Text style={styles.solvedText}>Solved</Text>
              </View>
            )}
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.statItem}>✅ {challenge.acceptanceRate ?? 0}% acceptance</Text>
            <Text style={styles.statItem}>📤 {challenge.submissionCount ?? 0} submissions</Text>
            <Text style={styles.statItem}>🪙 {challenge.coins ?? 0} coins</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabBar}>
          {(['description', 'examples', 'hints', 'discuss'] as DetailTab[]).map(tab => (
            <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.activeTab]} onPress={() => setActiveTab(tab)}>
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab === 'discuss' ? '💬' : ''}{tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {activeTab === 'description' && (
            <Text style={styles.descText}>{challenge.description}</Text>
          )}

          {activeTab === 'examples' && (
            <>
              {challenge.examples?.length > 0 ? (
                challenge.examples.map((ex: any, idx: number) => (
                  <View key={idx} style={styles.exampleCard}>
                    <Text style={styles.exampleTitle}>Example {idx + 1}</Text>
                    <View style={styles.codeBlock}>
                      <Text style={styles.codeLabel}>Input:</Text>
                      <Text style={styles.codeText}>{ex.input}</Text>
                      <Text style={styles.codeLabel}>Output:</Text>
                      <Text style={styles.codeText}>{ex.output}</Text>
                      {ex.explanation && (
                        <>
                          <Text style={styles.codeLabel}>Explanation:</Text>
                          <Text style={styles.explainText}>{ex.explanation}</Text>
                        </>
                      )}
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.empty}>No examples provided</Text>
              )}
              {challenge.constraints && (
                <View style={styles.constraintsCard}>
                  <Text style={styles.constraintsTitle}>Constraints</Text>
                  <Text style={styles.constraintsText}>{challenge.constraints}</Text>
                </View>
              )}
            </>
          )}

          {activeTab === 'hints' && (
            <>
              {challenge.hints?.length > 0 ? (
                challenge.hints.map((hint: string, idx: number) => (
                  <View key={idx} style={styles.hintCard}>
                    <Text style={styles.hintNum}>Hint {idx + 1}</Text>
                    <Text style={styles.hintText}>{hint}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.empty}>No hints available</Text>
              )}
            </>
          )}

          {activeTab === 'discuss' && (
            <>
              <TouchableOpacity style={styles.newPostBtn} onPress={() => setShowNewPost(true)}>
                <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
                <Text style={styles.newPostText}>New Post</Text>
              </TouchableOpacity>
              {loadingDisc ? (
                <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
              ) : discussions.length === 0 ? (
                <View style={styles.emptyState}><Text style={{ fontSize: 36 }}>💬</Text><Text style={styles.empty}>No discussions yet. Be the first!</Text></View>
              ) : (
                discussions.map((d, i) => (
                  <View key={d._id || i} style={styles.discCard}>
                    <View style={styles.discVote}>
                      <TouchableOpacity onPress={() => handleVote(d._id)}>
                        <Ionicons name="arrow-up" size={18} color={COLORS.primary} />
                      </TouchableOpacity>
                      <Text style={styles.voteCount}>{d.votes ?? 0}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.discTitle}>{d.title}</Text>
                      <Text style={styles.discContent} numberOfLines={3}>{d.content}</Text>
                      <Text style={styles.discMeta}>{d.author?.name || 'Anonymous'} · {d.createdAt ? new Date(d.createdAt).toLocaleDateString() : ''}</Text>
                    </View>
                  </View>
                ))
              )}
            </>
          )}
        </View>

        {/* Similar Problems */}
        {similar.length > 0 && (
          <View style={styles.similarSection}>
            <Text style={styles.sectionTitle}>Similar Problems</Text>
            {similar.map((s: any, i: number) => {
              const dc = DIFF_COLORS[s.difficulty as keyof typeof DIFF_COLORS] || COLORS.textMuted;
              return (
                <TouchableOpacity key={s._id || i} style={styles.similarCard} onPress={() => navigation.push('ProblemDetail', { challengeId: s._id || s.id })}>
                  <View style={[styles.simDot, { backgroundColor: dc }]} />
                  <Text style={styles.simTitle} numberOfLines={1}>{s.title}</Text>
                  <View style={[styles.simDiff, { backgroundColor: `${dc}20` }]}>
                    <Text style={[styles.simDiffText, { color: dc }]}>{s.difficulty}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Solve Button */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.solveBtn} onPress={() => navigation.navigate('CodeEditor', { challengeId, challengeTitle: challenge.title, difficulty: challenge.difficulty })}>
            <Ionicons name="code-slash" size={18} color="#fff" />
            <Text style={styles.solveBtnText}>Solve Problem</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* New Post Modal */}
      <Modal visible={showNewPost} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Discussion</Text>
              <TouchableOpacity onPress={() => setShowNewPost(false)}>
                <Ionicons name="close" size={22} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <TextInput style={styles.modalInput} placeholder="Title" placeholderTextColor={COLORS.textMuted} value={postTitle} onChangeText={setPostTitle} />
            <TextInput style={[styles.modalInput, { height: 120, textAlignVertical: 'top' }]} placeholder="Write your thoughts..." placeholderTextColor={COLORS.textMuted} value={postContent} onChangeText={setPostContent} multiline />
            <TouchableOpacity style={styles.postBtn} onPress={handleNewPost}>
              <Text style={styles.postBtnText}>Post</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  error: { color: COLORS.textMuted, fontSize: 15 },
  navBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 6 },
  navBtn: { padding: 6 },
  navTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 },
  title: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, flex: 1 },
  diffBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.full },
  diffText: { fontSize: 11, fontWeight: '700' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  topicChip: { backgroundColor: `${COLORS.accent}15`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  topicChipText: { fontSize: 11, color: COLORS.accent, fontWeight: '600' },
  companyChip: { backgroundColor: `${COLORS.primary}15`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  companyText: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },
  solvedChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: `${COLORS.success}15`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  solvedText: { fontSize: 11, color: COLORS.success, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  statItem: { fontSize: 11, color: COLORS.textMuted },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  activeTabText: { color: COLORS.primary },
  content: { padding: 16, paddingBottom: 0 },
  descText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 24 },
  exampleCard: { marginBottom: 14 },
  exampleTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6 },
  codeBlock: { backgroundColor: '#0D0D12', borderRadius: RADIUS.md, padding: 12, borderWidth: 1, borderColor: COLORS.border },
  codeLabel: { fontSize: 11, color: COLORS.accent, fontWeight: '700', marginBottom: 2 },
  codeText: { fontSize: 13, color: '#E8F4FD', fontFamily: 'monospace', marginBottom: 8 },
  explainText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  constraintsCard: { marginTop: 8, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 12, borderWidth: 1, borderColor: COLORS.border },
  constraintsTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6 },
  constraintsText: { fontSize: 12, color: COLORS.textSecondary, fontFamily: 'monospace', lineHeight: 20 },
  hintCard: { marginBottom: 10, backgroundColor: `${COLORS.warning}10`, borderRadius: RADIUS.md, padding: 12, borderWidth: 1, borderLeftWidth: 3, borderColor: `${COLORS.warning}30`, borderLeftColor: COLORS.warning },
  hintNum: { fontSize: 12, fontWeight: '700', color: COLORS.warning, marginBottom: 4 },
  hintText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  empty: { textAlign: 'center', color: COLORS.textMuted, marginTop: 32 },
  emptyState: { alignItems: 'center', paddingVertical: 30, gap: 6 },
  // Discussions
  newPostBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-end', marginBottom: 12, padding: 8, backgroundColor: `${COLORS.primary}15`, borderRadius: RADIUS.md },
  newPostText: { fontSize: 13, color: COLORS.primary, fontWeight: '700' },
  discCard: { flexDirection: 'row', gap: 10, marginBottom: 10, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 12, borderWidth: 1, borderColor: COLORS.border },
  discVote: { alignItems: 'center', gap: 2 },
  voteCount: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  discTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  discContent: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 4 },
  discMeta: { fontSize: 11, color: COLORS.textMuted },
  // Similar
  similarSection: { padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 10 },
  similarCard: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  simDot: { width: 6, height: 6, borderRadius: 3 },
  simTitle: { flex: 1, fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  simDiff: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.full },
  simDiffText: { fontSize: 10, fontWeight: '700' },
  footer: { padding: 16 },
  solveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: 14 },
  solveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: 20, gap: 12, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  modalInput: { backgroundColor: COLORS.background, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: 12, fontSize: 14, color: COLORS.textPrimary },
  postBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 12, alignItems: 'center' },
  postBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
