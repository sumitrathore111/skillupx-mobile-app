import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { executeCode, submitSolution } from '@services/arenaService';
import type { SubmissionResult } from '@apptypes/index';
import { useState } from 'react';
import {
    ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput, TouchableOpacity,
    View
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

export default function CodeEditorScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { challengeId, challengeTitle, difficulty } = route.params as RouteParams;
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState(STARTER_CODE['javascript']);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  function changeLanguage(lang: string) {
    setLanguage(lang);
    setCode(STARTER_CODE[lang] || '// Write your solution here');
    setResult(null);
    setShowResult(false);
  }

  async function handleRun() {
    if (!code.trim()) return;
    setRunning(true);
    setShowResult(false);
    try {
      const res = await executeCode(challengeId, code, language);
      setResult(res);
      setShowResult(true);
    } catch (e: any) {
      Alert.alert('Run Error', e.message || 'Failed to execute code');
    } finally { setRunning(false); }
  }

  async function handleSubmit() {
    if (!code.trim()) return;
    setSubmitting(true);
    setShowResult(false);
    try {
      const res = await submitSolution(challengeId, code, language);
      setResult(res);
      setShowResult(true);
      if (res.status === 'Accepted') {
        Alert.alert('✅ Accepted!', `Solved in ${res.runtime}ms. You earned ${res.coinsEarned ?? 0} 🪙`);
      }
    } catch (e: any) {
      Alert.alert('Submit Error', e.message || 'Failed to submit');
    } finally { setSubmitting(false); }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>{challengeTitle}</Text>
        <View style={styles.diffBadge}>
          <Text style={styles.diffText}>{difficulty}</Text>
        </View>
      </View>

      {/* Language picker */}
      <View style={styles.langRow}>
        {LANGUAGES.map(lang => (
          <TouchableOpacity
            key={lang.id}
            style={[styles.langChip, language === lang.id && { borderColor: lang.color, backgroundColor: `${lang.color}20` }]}
            onPress={() => changeLanguage(lang.id)}
          >
            <Text style={[styles.langText, { color: language === lang.id ? lang.color : COLORS.textMuted }]}>{lang.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Code editor */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.editorContainer}>
          <View style={styles.lineNumbers}>
            {code.split('\n').map((_, i) => (
              <Text key={i} style={styles.lineNum}>{i + 1}</Text>
            ))}
          </View>
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <TextInput
              style={styles.codeInput}
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

      {/* Result panel */}
      {showResult && result && (
        <View style={[styles.resultPanel, result.status === 'Accepted' ? styles.resultAccepted : styles.resultFailed]}>
          <View style={styles.resultHeader}>
            <Text style={[styles.resultStatus, result.status === 'Accepted' ? styles.acceptedText : styles.failedText]}>
              {result.status === 'Accepted' ? '✅ Accepted' : `❌ ${result.status}`}
            </Text>
            <TouchableOpacity onPress={() => setShowResult(false)}>
              <Ionicons name="close" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
          <View style={styles.resultMeta}>
            {result.runtime && <Text style={styles.resultMetaText}>⚡ {result.runtime}ms</Text>}
            {result.memory && <Text style={styles.resultMetaText}>💾 {result.memory}KB</Text>}
            {result.testsPassed !== undefined && (
              <Text style={styles.resultMetaText}>🧪 {result.testsPassed}/{result.totalTests} passed</Text>
            )}
            {result.coinsEarned && <Text style={styles.coinsEarned}>+{result.coinsEarned} 🪙</Text>}
          </View>
          {result.errorMessage && <Text style={styles.errorMessage}>{result.errorMessage}</Text>}
        </View>
      )}

      {/* Footer buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.runBtn, running && styles.disabledBtn]}
          onPress={handleRun}
          disabled={running || submitting}
        >
          {running ? <ActivityIndicator size={16} color={COLORS.primary} /> : <Ionicons name="play" size={16} color={COLORS.primary} />}
          <Text style={styles.runBtnText}>Run</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.disabledBtn]}
          onPress={handleSubmit}
          disabled={running || submitting}
        >
          {submitting ? <ActivityIndicator size={16} color="#fff" /> : <Ionicons name="checkmark-circle" size={16} color="#fff" />}
          <Text style={styles.submitBtnText}>Submit</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D12' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  diffBadge: { backgroundColor: `${COLORS.warning}20`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  diffText: { fontSize: 11, color: COLORS.warning, fontWeight: '700' },
  langRow: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 8, gap: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface },
  langChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: COLORS.border },
  langText: { fontSize: 12, fontWeight: '700' },
  editorContainer: { flex: 1, flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  lineNumbers: { width: 40, paddingTop: 12, paddingHorizontal: 6, backgroundColor: '#0A0A0F', alignItems: 'flex-end', borderRightWidth: 1, borderRightColor: COLORS.border },
  lineNum: { fontSize: 12, color: '#555', lineHeight: 21, fontFamily: 'monospace' },
  codeInput: { flex: 1, padding: 12, color: '#E0E0E0', fontSize: 13, fontFamily: 'monospace', lineHeight: 21, textAlignVertical: 'top' },
  resultPanel: { padding: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  resultAccepted: { backgroundColor: `${COLORS.success}10`, borderTopColor: `${COLORS.success}40` },
  resultFailed: { backgroundColor: `${COLORS.error}10`, borderTopColor: `${COLORS.error}40` },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  resultStatus: { fontSize: 14, fontWeight: '700' },
  acceptedText: { color: COLORS.success },
  failedText: { color: COLORS.error },
  resultMeta: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  resultMetaText: { fontSize: 12, color: COLORS.textMuted },
  coinsEarned: { fontSize: 12, color: COLORS.warning, fontWeight: '700' },
  errorMessage: { marginTop: 6, fontSize: 12, color: COLORS.error, fontFamily: 'monospace' },
  footer: { flexDirection: 'row', padding: 12, gap: 10, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border },
  runBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 11 },
  runBtnText: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
  submitBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 11 },
  submitBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  disabledBtn: { opacity: 0.55 },
});
