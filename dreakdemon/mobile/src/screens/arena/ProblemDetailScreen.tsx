import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { fetchChallengeById } from '@services/arenaService';
import type { ChallengeDetail } from '@apptypes/index';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type RouteParams = { challengeId: string };
type DetailTab = 'description' | 'examples' | 'hints';

const DIFF_COLORS = { easy: COLORS.success, medium: COLORS.warning, hard: COLORS.error };

export default function ProblemDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { challengeId } = route.params as RouteParams;
  const [challenge, setChallenge] = useState<ChallengeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DetailTab>('description');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const data = await fetchChallengeById(challengeId);
      setChallenge(data);
      navigation.setOptions({ title: data.title });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  if (!challenge) return <View style={styles.loading}><Text style={styles.error}>Problem not found</Text></View>;

  const diffColor = DIFF_COLORS[challenge.difficulty as keyof typeof DIFF_COLORS] || COLORS.textMuted;

  return (
    <SafeAreaView style={styles.container}>
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
              <View style={styles.companyChip}><Text style={styles.companyText}>{challenge.company}</Text></View>
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
          {(['description', 'examples', 'hints'] as DetailTab[]).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
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
        </View>

        {/* Solve Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.solveBtn}
            onPress={() => navigation.navigate('CodeEditor', { challengeId, challengeTitle: challenge.title, difficulty: challenge.difficulty })}
          >
            <Ionicons name="code-slash" size={18} color="#fff" />
            <Text style={styles.solveBtnText}>Solve Problem</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  error: { color: COLORS.textMuted, fontSize: 15 },
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
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
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
  footer: { padding: 16 },
  solveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: 14 },
  solveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
