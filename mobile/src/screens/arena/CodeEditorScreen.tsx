import type { SubmissionResult } from '@apptypes/index';
import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
    analyzeCodeAI,
    createDiscussion,
    executeCode,
    fetchChallengeById,
    getAIHint,
    getDiscussions,
    submitSolution,
    voteDiscussion,
} from '@services/arenaService';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type RouteParams = { challengeId: string; challengeTitle: string; difficulty: string };

const LANGUAGES = [
  { id: 'javascript', label: 'JS', color: '#F7DF1E' },
  { id: 'typescript', label: 'TS', color: '#3178C6' },
  { id: 'python', label: 'Py', color: '#3572A5' },
  { id: 'java', label: 'Java', color: '#B07219' },
  { id: 'cpp', label: 'C++', color: '#555555' },
];

const STARTER_CODE: Record<string, string> = {
  javascript: `/**\n * @param {number[]} nums\n * @return {number}\n */\nfunction solution(nums) {\n  // Write your solution here\n  \n}`,
  typescript: `function solution(nums: number[]): number {\n  // Write your solution here\n  \n}`,
  python: `def solution(nums: List[int]) -> int:\n    # Write your solution here\n    pass`,
  java: `class Solution {\n    public int solution(int[] nums) {\n        // Write your solution here\n        return 0;\n    }\n}`,
  cpp: `class Solution {\npublic:\n    int solution(vector<int>& nums) {\n        // Write your solution here\n        return 0;\n    }\n};`,
};

const HINT_LEVELS = ['Gentle Nudge', 'Approach Hint', 'Near Solution'];

type BottomTab = 'output' | 'hints' | 'discuss' | 'notes';

export default function CodeEditorScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { challengeId, challengeTitle, difficulty } = route.params as RouteParams;
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState(STARTER_CODE['javascript']);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [bottomTab, setBottomTab] = useState<BottomTab>('output');
  const [showProblem, setShowProblem] = useState(false);

  // Timer
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // AI Hints
  const [hints, setHints] = useState<string[]>([]);
  const [hintLoading, setHintLoading] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);

  // AI Analysis
  const [analysis, setAnalysis] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Discussions
  const [discussions, setDiscussions] = useState<any[]>([]);
  const [discLoading, setDiscLoading] = useState(false);
  const [showNewDisc, setShowNewDisc] = useState(false);
  const [discTitle, setDiscTitle] = useState('');
  const [discContent, setDiscContent] = useState('');

  // Notes
  const [notes, setNotes] = useState('');

  // Problem detail
  const [challenge, setChallenge] = useState<any>(null);

  // Custom test case
  const [customInput, setCustomInput] = useState('');
  const [showCustomTest, setShowCustomTest] = useState(false);

  useEffect(() => { loadChallenge(); }, []);

  async function loadChallenge() {
    try { setChallenge(await fetchChallengeById(challengeId)); } catch {}
  }

  function changeLanguage(lang: string) {
    setLanguage(lang);
    setCode(STARTER_CODE[lang] || '// Write your solution here');
    setResult(null);
  }

  // Timer
  function toggleTimer() {
    if (timerRunning) {
      if (timerRef.current) clearInterval(timerRef.current);
      setTimerRunning(false);
    } else {
      timerRef.current = setInterval(() => setElapsed(p => p + 1), 1000);
      setTimerRunning(true);
    }
  }
  function fmtTime(s: number) {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
  }
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  async function handleRun() {
    if (!code.trim()) return;
    setRunning(true);
    setBottomTab('output');
    try {
      const res = await executeCode({ challengeId, code, language });
      setResult(res);
    } catch (e: any) {
      setResult({ status: 'Error', errorMessage: e.message } as any);
    } finally { setRunning(false); }
  }

  async function handleSubmit() {
    if (!code.trim()) return;
    setSubmitting(true);
    setBottomTab('output');
    try {
      const res = await submitSolution({ challengeId, code, language });
      setResult(res);
      if (res.status === 'Accepted') {
        Alert.alert('Accepted!', `Solved in ${res.runtime}ms. You earned ${res.coinsEarned ?? 0} coins`);
      }
    } catch (e: any) {
      setResult({ status: 'Error', errorMessage: e.message } as any);
    } finally { setSubmitting(false); }
  }

  // AI Hints
  async function handleGetHint() {
    if (hintLevel >= 3) return;
    setHintLoading(true);
    try {
      const res = await getAIHint({ challengeId, level: hintLevel + 1, code });
      setHints(prev => [...prev, res.hint]);
      setHintLevel(prev => prev + 1);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to get hint');
    } finally { setHintLoading(false); }
  }

  // AI Analysis
  async function handleAnalyze() {
    setAnalyzing(true);
    try {
      setAnalysis(await analyzeCodeAI({ code, language, challengeId }));
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Analysis failed');
    } finally { setAnalyzing(false); }
  }

  // Discussions
  async function loadDiscussions() {
    setDiscLoading(true);
    try { setDiscussions(await getDiscussions(challengeId)); } catch {}
    finally { setDiscLoading(false); }
  }
  async function handlePostDiscussion() {
    if (!discTitle.trim() || !discContent.trim()) return;
    try {
      await createDiscussion(challengeId, discTitle, discContent);
      setShowNewDisc(false);
      setDiscTitle('');
      setDiscContent('');
      loadDiscussions();
    } catch (e: any) { Alert.alert('Error', e.message); }
  }
  async function handleVote(id: string) {
    try { await voteDiscussion(id); loadDiscussions(); } catch {}
  }

  const diffColor = difficulty?.toLowerCase() === 'easy' ? COLORS.success : difficulty?.toLowerCase() === 'medium' ? COLORS.warning : COLORS.danger;

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowProblem(true)}>
          <Text style={st.title} numberOfLines={1}>{challengeTitle}</Text>
        </TouchableOpacity>
        <View style={[st.diffBadge, { backgroundColor: `${diffColor}20` }]}>
          <Text style={[st.diffText, { color: diffColor }]}>{difficulty}</Text>
        </View>
        {/* Timer */}
        <TouchableOpacity style={st.timerBtn} onPress={toggleTimer}>
          <Ionicons name={timerRunning ? 'pause' : 'time'} size={14} color={COLORS.primary} />
          <Text style={st.timerText}>{fmtTime(elapsed)}</Text>
        </TouchableOpacity>
      </View>

      {/* Language picker */}
      <View style={st.langRow}>
        {LANGUAGES.map(lang => (
          <TouchableOpacity
            key={lang.id}
            style={[st.langChip, language === lang.id && { borderColor: lang.color, backgroundColor: `${lang.color}20` }]}
            onPress={() => changeLanguage(lang.id)}
          >
            <Text style={[st.langText, { color: language === lang.id ? lang.color : COLORS.textMuted }]}>{lang.label}</Text>
          </TouchableOpacity>
        ))}
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={st.aiBtn} onPress={handleAnalyze} disabled={analyzing}>
          {analyzing ? <ActivityIndicator size={12} color={COLORS.primary} /> : <Text style={st.aiBtnText}>🤖 AI</Text>}
        </TouchableOpacity>
      </View>

      {/* Code editor */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={st.editorContainer}>
          <View style={st.lineNumbers}>
            {code.split('\n').map((_, i) => (
              <Text key={i} style={st.lineNum}>{i + 1}</Text>
            ))}
          </View>
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <TextInput
              style={st.codeInput}
              value={code}
              onChangeText={setCode}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              scrollEnabled={false}
            />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* Bottom tabs */}
      <View style={st.bottomTabs}>
        {([['output', '📤 Output'], ['hints', '💡 Hints'], ['discuss', '💬 Discuss'], ['notes', '📝 Notes']] as const).map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={[st.bTab, bottomTab === key && st.bTabActive]}
            onPress={() => { setBottomTab(key); if (key === 'discuss' && discussions.length === 0) loadDiscussions(); }}
          >
            <Text style={[st.bTabText, bottomTab === key && st.bTabActiveText]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Bottom panel */}
      <View style={st.bottomPanel}>
        {/* Output */}
        {bottomTab === 'output' && (
          result ? (
            <ScrollView style={{ maxHeight: 100 }}>
              <View style={st.resultRow}>
                <Text style={{ color: result.status === 'Accepted' ? COLORS.success : COLORS.danger, fontWeight: '700', fontSize: 13 }}>
                  {result.status === 'Accepted' ? '✅ Accepted' : `❌ ${result.status}`}
                </Text>
                {result.runtime && <Text style={st.metaChip}>⚡ {result.runtime}ms</Text>}
                {result.memory && <Text style={st.metaChip}>💾 {result.memory}KB</Text>}
                {result.testsPassed != null && <Text style={st.metaChip}>🧪 {result.testsPassed}/{result.totalTests}</Text>}
                {result.coinsEarned ? <Text style={[st.metaChip, { color: COLORS.warning }]}>+{result.coinsEarned} 🪙</Text> : null}
              </View>
              {result.errorMessage && <Text style={st.errorMsg}>{result.errorMessage}</Text>}
              {analysis && (
                <View style={st.analysisBox}>
                  <Text style={st.analysisTitle}>🤖 AI Analysis</Text>
                  <Text style={st.analysisText}>{analysis.feedback || analysis.analysis || JSON.stringify(analysis)}</Text>
                </View>
              )}
            </ScrollView>
          ) : (
            <Text style={st.placeholder}>Run or submit code to see results</Text>
          )
        )}

        {/* Hints */}
        {bottomTab === 'hints' && (
          <ScrollView style={{ maxHeight: 120 }}>
            {hints.map((h, i) => (
              <View key={i} style={st.hintCard}>
                <Text style={st.hintLevel}>{HINT_LEVELS[i] || `Hint ${i + 1}`}</Text>
                <Text style={st.hintText}>{h}</Text>
              </View>
            ))}
            {hintLevel < 3 && (
              <TouchableOpacity style={st.hintBtn} onPress={handleGetHint} disabled={hintLoading}>
                {hintLoading ? <ActivityIndicator size="small" color={COLORS.primary} /> : (
                  <Text style={st.hintBtnText}>💡 Get {HINT_LEVELS[hintLevel]} ({hintLevel}/3)</Text>
                )}
              </TouchableOpacity>
            )}
            {hintLevel >= 3 && <Text style={st.placeholder}>All hints used</Text>}
          </ScrollView>
        )}

        {/* Discuss */}
        {bottomTab === 'discuss' && (
          <View style={{ maxHeight: 130 }}>
            <TouchableOpacity style={st.newDiscBtn} onPress={() => setShowNewDisc(true)}>
              <Text style={st.newDiscBtnText}>+ New Post</Text>
            </TouchableOpacity>
            {discLoading ? <ActivityIndicator size="small" color={COLORS.primary} /> : (
              <FlatList
                data={discussions}
                keyExtractor={(d) => d._id || d.id}
                renderItem={({ item }) => (
                  <View style={st.discCard}>
                    <TouchableOpacity onPress={() => handleVote(item._id || item.id)} style={st.voteCol}>
                      <Ionicons name="arrow-up" size={14} color={COLORS.primary} />
                      <Text style={st.voteCount}>{item.votes || 0}</Text>
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                      <Text style={st.discTitle}>{item.title}</Text>
                      <Text style={st.discBy}>{item.authorName || 'User'}</Text>
                    </View>
                  </View>
                )}
                ListEmptyComponent={<Text style={st.placeholder}>No discussions yet</Text>}
              />
            )}
          </View>
        )}

        {/* Notes */}
        {bottomTab === 'notes' && (
          <TextInput
            style={st.notesInput}
            value={notes}
            onChangeText={setNotes}
            multiline
            placeholder="Jot down your approach, ideas..."
            placeholderTextColor={COLORS.textMuted}
          />
        )}
      </View>

      {/* Footer buttons */}
      <View style={st.footer}>
        <TouchableOpacity style={[st.runBtn, running && { opacity: 0.5 }]} onPress={handleRun} disabled={running || submitting}>
          {running ? <ActivityIndicator size={14} color={COLORS.primary} /> : <Ionicons name="play" size={14} color={COLORS.primary} />}
          <Text style={st.runBtnText}>Run</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[st.submitBtn, submitting && { opacity: 0.5 }]} onPress={handleSubmit} disabled={running || submitting}>
          {submitting ? <ActivityIndicator size={14} color="#fff" /> : <Ionicons name="checkmark-circle" size={14} color="#fff" />}
          <Text style={st.submitBtnText}>Submit</Text>
        </TouchableOpacity>
      </View>

      {/* Problem description modal */}
      <Modal visible={showProblem} animationType="slide" transparent>
        <View style={st.modalOverlay}>
          <View style={st.modalContent}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>{challengeTitle}</Text>
              <TouchableOpacity onPress={() => setShowProblem(false)}><Ionicons name="close" size={22} color={COLORS.textPrimary} /></TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
              <Text style={st.problemDescText}>{challenge?.description || 'Loading...'}</Text>
              {challenge?.examples?.map((ex: any, i: number) => (
                <View key={i} style={st.exBox}>
                  <Text style={st.exLabel}>Example {i + 1}</Text>
                  {ex.input && <Text style={st.exCode}>Input: {typeof ex.input === 'string' ? ex.input : JSON.stringify(ex.input)}</Text>}
                  {ex.output != null && <Text style={st.exCode}>Output: {typeof ex.output === 'string' ? ex.output : JSON.stringify(ex.output)}</Text>}
                  {ex.explanation && <Text style={st.exExplain}>{ex.explanation}</Text>}
                </View>
              ))}
              {challenge?.constraints && (
                <View style={st.constraintBox}>
                  <Text style={st.exLabel}>Constraints</Text>
                  {(Array.isArray(challenge.constraints) ? challenge.constraints : [challenge.constraints]).map((c: string, i: number) => (
                    <Text key={i} style={st.constraintText}>• {c}</Text>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* New discussion modal */}
      <Modal visible={showNewDisc} animationType="slide" transparent>
        <View style={st.modalOverlay}>
          <View style={[st.modalContent, { maxHeight: 300 }]}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>New Discussion</Text>
              <TouchableOpacity onPress={() => setShowNewDisc(false)}><Ionicons name="close" size={22} color={COLORS.textPrimary} /></TouchableOpacity>
            </View>
            <View style={{ padding: 16, gap: 10 }}>
              <TextInput style={st.discInput} placeholder="Title" placeholderTextColor={COLORS.textMuted} value={discTitle} onChangeText={setDiscTitle} />
              <TextInput style={[st.discInput, { height: 80, textAlignVertical: 'top' }]} placeholder="Your post..." placeholderTextColor={COLORS.textMuted} value={discContent} onChangeText={setDiscContent} multiline />
              <TouchableOpacity style={st.postBtn} onPress={handlePostDiscussion}>
                <Text style={st.postBtnText}>Post</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D12' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  diffBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  diffText: { fontSize: 11, fontWeight: '700' },
  timerBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${COLORS.primary}15`, paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.full },
  timerText: { fontSize: 12, fontWeight: '700', color: COLORS.primary, fontFamily: 'monospace' },

  langRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 6, gap: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface, alignItems: 'center' },
  langChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: COLORS.border },
  langText: { fontSize: 11, fontWeight: '700' },
  aiBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full, backgroundColor: `${COLORS.primary}15`, borderWidth: 1, borderColor: `${COLORS.primary}30` },
  aiBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },

  editorContainer: { flex: 1, flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  lineNumbers: { width: 36, paddingTop: 12, paddingHorizontal: 4, backgroundColor: '#0A0A0F', alignItems: 'flex-end', borderRightWidth: 1, borderRightColor: COLORS.border },
  lineNum: { fontSize: 11, color: '#555', lineHeight: 21, fontFamily: 'monospace' },
  codeInput: { flex: 1, padding: 12, color: '#E0E0E0', fontSize: 13, fontFamily: 'monospace', lineHeight: 21, textAlignVertical: 'top' },

  // Bottom tabs
  bottomTabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface },
  bTab: { flex: 1, paddingVertical: 8, alignItems: 'center' },
  bTabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  bTabText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  bTabActiveText: { color: COLORS.primary },

  bottomPanel: { minHeight: 70, maxHeight: 150, backgroundColor: COLORS.surface, paddingHorizontal: 12, paddingVertical: 8 },
  resultRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 4 },
  metaChip: { fontSize: 11, color: COLORS.textMuted },
  errorMsg: { fontSize: 11, color: COLORS.danger, fontFamily: 'monospace', marginTop: 4 },
  placeholder: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', paddingVertical: 10 },

  // Analysis
  analysisBox: { marginTop: 8, backgroundColor: `${COLORS.primary}08`, padding: 10, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: `${COLORS.primary}20` },
  analysisTitle: { fontSize: 11, fontWeight: '700', color: COLORS.primary, marginBottom: 4 },
  analysisText: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },

  // Hints
  hintCard: { backgroundColor: `${COLORS.warning}08`, padding: 10, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: `${COLORS.warning}20`, marginBottom: 6 },
  hintLevel: { fontSize: 10, fontWeight: '700', color: COLORS.warning, textTransform: 'uppercase', marginBottom: 2 },
  hintText: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  hintBtn: { alignItems: 'center', paddingVertical: 10 },
  hintBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },

  // Discussion
  newDiscBtn: { alignSelf: 'flex-end', marginBottom: 6 },
  newDiscBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 12 },
  discCard: { flexDirection: 'row', gap: 8, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  voteCol: { alignItems: 'center', width: 30 },
  voteCount: { fontSize: 11, color: COLORS.primary, fontWeight: '700' },
  discTitle: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  discBy: { fontSize: 10, color: COLORS.textMuted },

  // Notes
  notesInput: { flex: 1, color: COLORS.textPrimary, fontSize: 13, textAlignVertical: 'top', minHeight: 60 },

  // Footer
  footer: { flexDirection: 'row', padding: 10, gap: 8, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border },
  runBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 11 },
  runBtnText: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
  submitBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 11 },
  submitBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  problemDescText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },
  exBox: { backgroundColor: `${COLORS.primary}08`, borderRadius: RADIUS.sm, padding: 12, marginTop: 10, borderWidth: 1, borderColor: COLORS.border },
  exLabel: { fontSize: 11, color: COLORS.primary, fontWeight: '700', marginBottom: 4 },
  exCode: { fontSize: 12, fontFamily: 'monospace', color: COLORS.textPrimary, marginTop: 2 },
  exExplain: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
  constraintBox: { marginTop: 12, padding: 12, backgroundColor: `${COLORS.warning}08`, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: `${COLORS.warning}20` },
  constraintText: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  discInput: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 12, color: COLORS.textPrimary, fontSize: 14 },
  postBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 12, alignItems: 'center' },
  postBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
