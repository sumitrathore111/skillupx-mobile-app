/**
 * BattleRoomScreen — exact React Native conversion of frontend BattleRoom.tsx
 * Uses API POLLING (not socket events) to fetch battle state, same as frontend.
 */
import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
    forfeitBattle,
    getBattle,
    getBotProgress,
    startBattle,
    submitBattleCode,
} from '@services/arenaService';
import { useAuthStore } from '@store/authStore';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    AppState,
    BackHandler,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type RouteParams = { battleId: string };

const LANGUAGES = ['python', 'javascript', 'java', 'cpp'];
const LANG_LABELS: Record<string, string> = { python: 'PY', javascript: 'JS', java: 'JA', cpp: 'C++' };

interface Participant {
  odId: string;
  odName: string;
  odProfilePic: string;
  rating: number;
  hasSubmitted: boolean;
  submissionResult?: any;
}

const defaultCode: Record<string, string> = {
  python: `# Battle Mode - Write your solution fast!
def solve():
    n = int(input())
    # Your code here
    print(result)

solve()`,
  javascript: `const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });
let lines = [];
rl.on('line', l => lines.push(l));
rl.on('close', () => {
    const n = parseInt(lines[0]);
    // Your code here
    console.log(result);
});`,
  java: `import java.util.*;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        // Your code here
        System.out.println(result);
    }
}`,
  cpp: `#include <bits/stdc++.h>
using namespace std;
int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    int n; cin >> n;
    // Your code here
    cout << result << endl;
    return 0;
}`,
};

export default function BattleRoomScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { user } = useAuthStore();
  const { battleId } = route.params as RouteParams;

  // Battle state
  const [battle, setBattle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(5);
  const [timeLeft, setTimeLeft] = useState(0);

  // Challenge state
  const [challenge, setChallenge] = useState<any>(null);
  const [testCases, setTestCases] = useState<{ input: string; output: string }[]>([]);

  // Editor state
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('python');
  const [showProblem, setShowProblem] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [myResult, setMyResult] = useState<any>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const botPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const codeRef = useRef(code);
  const testCasesRef = useRef(testCases);
  const isSubmittingRef = useRef(false);
  const hasCalledStartRef = useRef(false);

  // Keep refs in sync
  useEffect(() => { codeRef.current = code; }, [code]);
  useEffect(() => { testCasesRef.current = testCases; }, [testCases]);

  // ── Hardware back button — forfeit warning ──
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (battle?.status === 'active' && !hasSubmitted) {
        Alert.alert(
          '⚠️ Leave Battle?',
          'Leaving will forfeit the match and your opponent will win the prize!',
          [
            { text: 'Stay', style: 'cancel' },
            { text: 'Forfeit', style: 'destructive', onPress: handleLeaveBattle },
          ]
        );
        return true;
      }
      return false;
    });
    return () => backHandler.remove();
  }, [battle?.status, hasSubmitted]);

  // ── Tab/app switch detection (same as frontend) ──
  useEffect(() => {
    if (battle?.status !== 'active' || hasSubmitted) return;

    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        setTabSwitchCount(prev => {
          const next = prev + 1;
          if (next >= 3) {
            // Auto-forfeit after 3 switches
            forfeitBattle(battleId).then(() => {
              navigation.navigate('BattleResult', { battleId });
            }).catch(() => {});
          } else {
            setShowTabWarning(true);
            Alert.alert('Warning', `You switched away! (${next}/3 — auto-forfeit at 3)`);
          }
          return next;
        });
      }
    });

    return () => sub.remove();
  }, [battle?.status, hasSubmitted, battleId]);

  // ── API POLLING — exact same as frontend (every 3 seconds) ──
  useEffect(() => {
    if (!battleId || !user) return;

    const fetchBattleData = async () => {
      try {
        const battleData = await getBattle(battleId);
        if (!battleData) {
          navigation.goBack();
          return;
        }
        setBattle(battleData);

        // Extract challenge & test cases (same as frontend normalization)
        if (battleData.challenge && !challenge) {
          if (
            battleData.challenge.description &&
            (Array.isArray(battleData.challenge.testCases) || Array.isArray(battleData.challenge.test_cases))
          ) {
            setChallenge(battleData.challenge);
            const rawCases = (battleData.challenge.testCases?.length > 0)
              ? battleData.challenge.testCases
              : (battleData.challenge.test_cases || []);
            const cases = rawCases.map((tc: any) => ({
              input: tc.input || '',
              output: tc.expectedOutput || tc.expected_output || tc.output || '',
            }));
            setTestCases(cases);
          }
        }

        // Check if current user already submitted
        const me = battleData.participants?.find((p: Participant) => p.odId === user?.id);
        if (me?.hasSubmitted && !hasSubmitted) {
          setHasSubmitted(true);
          if (me.submissionResult) {
            setMyResult({
              passed: me.submissionResult.passed,
              status: me.submissionResult.passed ? 'Accepted' : 'Wrong Answer',
              passedCount: me.submissionResult.passedCount,
              totalCount: me.submissionResult.totalCount,
              totalTime: me.submissionResult.totalTime,
            });
          }
        }

        // Navigate to results when battle is completed or forfeited (same as frontend)
        if (battleData.status === 'completed' || battleData.status === 'forfeited') {
          navigation.navigate('BattleResult', { battleId });
        }

        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch battle data', error);
        navigation.goBack();
      }
    };

    fetchBattleData(); // Initial fetch
    pollRef.current = setInterval(fetchBattleData, 3000); // Poll every 3 seconds

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [battleId, user, hasSubmitted, challenge]);

  // ── Countdown (when status === 'countdown') — same as frontend ──
  useEffect(() => {
    if (battle?.status === 'countdown') {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(countdown - 1), 1200);
        return () => clearTimeout(timer);
      } else if (countdown === 0 && !hasCalledStartRef.current) {
        // "FIGHT!" shown, then call start API (same as frontend)
        hasCalledStartRef.current = true;
        const timer = setTimeout(async () => {
          try {
            await startBattle(battleId);
          } catch (e) {
            console.error('Error starting battle:', e);
          }
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [battle?.status, countdown, battleId]);

  // Reset countdown when battle status changes to countdown
  useEffect(() => {
    if (battle?.status === 'countdown') {
      setCountdown(5);
    }
  }, [battle?.status]);

  // ── Battle timer (when status === 'active') — same as frontend ──
  useEffect(() => {
    if (battle?.status === 'active' && battle.startTime) {
      const startTime = new Date(battle.startTime).getTime();
      const duration = battle.timeLimit * 1000; // timeLimit in seconds

      timerRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = now - startTime;
        const remaining = Math.max(0, duration - elapsed);
        setTimeLeft(Math.ceil(remaining / 1000));

        if (remaining <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeUp();
        }
      }, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [battle?.status, battle?.startTime, battle?.timeLimit]);

  // ── Bot progress polling (same as frontend) ──
  useEffect(() => {
    if (!battleId || !battle || battle.status !== 'active') return;
    const opponent = battle.participants?.find((p: Participant) => p.odId !== user?.id);
    if (!opponent?.odId?.startsWith('bot_') || opponent?.hasSubmitted) return;

    const pollBot = async () => {
      try {
        const res = await getBotProgress(battleId);
        // Just poll — bot submits on its own server-side
      } catch {}
    };
    pollBot();
    botPollRef.current = setInterval(pollBot, 3000);
    return () => {
      if (botPollRef.current) clearInterval(botPollRef.current);
    };
  }, [battleId, battle?.status, battle?.participants, user?.id]);

  // ── Set default code when language changes ──
  useEffect(() => {
    if (!hasSubmitted) {
      setCode(defaultCode[language] || defaultCode.python);
    }
  }, [language]);

  // ── Time up → auto-submit ──
  const handleTimeUp = async () => {
    if (!hasSubmitted && !isSubmittingRef.current) {
      await handleSubmit();
    }
  };

  // ── Leave / forfeit (same as frontend) ──
  const handleLeaveBattle = async () => {
    if (!user || !battle || !battleId || isLeaving) return;
    setIsLeaving(true);
    try {
      await forfeitBattle(battleId);
      navigation.goBack();
    } catch (error) {
      console.error('Error forfeiting:', error);
      Alert.alert('Error', 'Failed to leave battle.');
      setIsLeaving(false);
    }
  };

  // ── Submit (same as frontend) ──
  const handleSubmit = async () => {
    if (!user || !battle || isSubmitting || hasSubmitted || !battleId || isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const result = await submitBattleCode(battleId, code, language);
      setMyResult({
        passed: result.passed,
        status: result.passed ? 'Accepted' : 'Wrong Answer',
        passedCount: result.passedCount,
        totalCount: result.totalCount,
        totalTime: result.totalTime,
      });
      setHasSubmitted(true);
    } catch (error: any) {
      console.error('Battle submission error:', error);
      setMyResult({
        passed: false,
        status: 'Error',
        error: error?.message || 'Submission failed. Please try again.',
        passedCount: 0,
        totalCount: testCases.length,
      });
    }

    setIsSubmitting(false);
    isSubmittingRef.current = false;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const getOpponent = (): Participant | undefined =>
    battle?.participants?.find((p: Participant) => p.odId !== user?.id);
  const getMe = (): Participant | undefined =>
    battle?.participants?.find((p: Participant) => p.odId === user?.id);

  const opponent = getOpponent();
  const me = getMe();
  const opponentSubmitted = opponent?.hasSubmitted || false;
  const isBot = opponent?.odId?.startsWith('bot_');

  const dc = (d: string) =>
    d === 'easy' ? COLORS.success : d === 'medium' ? COLORS.warning : COLORS.danger;

  // ── Loading screen ──
  if (loading) {
    return (
      <View style={st.loadCenter}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={st.loadText}>Entering Battle Arena...</Text>
      </View>
    );
  }

  // ── Countdown overlay (same as frontend) ──
  if (battle?.status === 'countdown' || (battle?.status === 'waiting' && countdown > 0)) {
    return (
      <View style={st.countdownContainer}>
        <View style={st.countdownContent}>
          <Text style={st.countdownArenaTitle}>⚔️ BATTLE ARENA ⚔️</Text>

          {/* Players */}
          <View style={st.countdownPlayers}>
            <View style={st.countdownPlayer}>
              <View style={[st.countdownAvatar, { borderColor: COLORS.primary }]}>
                <Text style={st.countdownAvatarText}>{me?.odName?.charAt(0) || 'Y'}</Text>
              </View>
              <Text style={st.countdownPlayerName}>{me?.odName || 'You'}</Text>
              <Text style={st.countdownRating}>⭐ {me?.rating || 1000}</Text>
            </View>

            <Text style={st.vsText}>VS</Text>

            <View style={st.countdownPlayer}>
              <View style={[st.countdownAvatar, { borderColor: COLORS.danger }]}>
                <Text style={st.countdownAvatarText}>{opponent?.odName?.charAt(0) || 'O'}</Text>
              </View>
              <Text style={st.countdownPlayerName}>{opponent?.odName || 'Opponent'}</Text>
              <Text style={st.countdownRating}>⭐ {opponent?.rating || 1000}</Text>
            </View>
          </View>

          {/* Countdown number */}
          <Text style={st.countdownNum}>{countdown > 0 ? countdown : 'FIGHT!'}</Text>
          <Text style={st.countdownLabel}>
            {countdown > 0 ? 'Get Ready!' : 'Battle Starting...'}
          </Text>

          {/* Battle info */}
          <View style={st.countdownInfo}>
            <Text style={[st.countdownDiff, { color: dc(battle?.difficulty) }]}>
              {battle?.difficulty?.toUpperCase()}
            </Text>
            <Text style={st.countdownFee}>🪙 {battle?.entryFee || 0} entry</Text>
            <Text style={st.countdownPrize}>🏆 {battle?.prize || 0} prize</Text>
          </View>
        </View>
      </View>
    );
  }

  // ── Active battle screen ──
  const challengeData = challenge || battle?.challenge || {};
  const problemDesc = challengeData.description || '';
  const examples = challengeData.examples || testCases?.slice(0, 2) || [];

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      {/* ─── Top Bar ─── */}
      <View style={st.topBar}>
        <View style={st.playerCol}>
          <Ionicons name="person-circle" size={22} color={COLORS.primary} />
          <Text style={st.playerName} numberOfLines={1}>{me?.odName || user?.name || 'You'}</Text>
          {hasSubmitted && <Text style={{ fontSize: 10 }}>✅</Text>}
        </View>

        <View style={[st.timer, timeLeft <= 60 && st.timerDanger]}>
          <Ionicons name="time" size={13} color={timeLeft <= 60 ? COLORS.danger : COLORS.primary} />
          <Text style={[st.timerText, timeLeft <= 60 && { color: COLORS.danger }]}>
            {formatTime(timeLeft)}
          </Text>
        </View>

        <View style={st.playerCol}>
          <Ionicons name="person-circle" size={22} color={COLORS.danger} />
          <Text style={[st.playerName, { color: COLORS.textSecondary }]} numberOfLines={1}>
            {opponent?.odName || 'Opponent'} {isBot && '🤖'}
          </Text>
          {opponentSubmitted && <Text style={{ fontSize: 10 }}>✅</Text>}
        </View>
      </View>

      {/* Tab warnings */}
      {tabSwitchCount > 0 && (
        <View style={st.warningBanner}>
          <Ionicons name="warning" size={14} color={COLORS.warning} />
          <Text style={st.warningText}>Tab switch warning: {tabSwitchCount}/3</Text>
        </View>
      )}

      {/* ─── Problem + Language Bar ─── */}
      <View style={st.problemBar}>
        <TouchableOpacity style={st.problemToggle} onPress={() => setShowProblem(!showProblem)}>
          <Ionicons name={showProblem ? 'chevron-up' : 'document-text'} size={14} color={COLORS.primary} />
          <Text style={st.problemTitle} numberOfLines={1}>
            {challengeData.title || 'Battle Challenge'}
          </Text>
          <View style={[st.diffBadge, { backgroundColor: `${dc(battle?.difficulty)}20` }]}>
            <Text style={[st.diffBadgeText, { color: dc(battle?.difficulty) }]}>
              {battle?.difficulty}
            </Text>
          </View>
        </TouchableOpacity>
        <View style={st.langRow}>
          {LANGUAGES.map(l => (
            <TouchableOpacity
              key={l}
              style={[st.langBtn, language === l && st.langActive]}
              onPress={() => !hasSubmitted && setLanguage(l)}
            >
              <Text style={[st.langText, language === l && { color: COLORS.primary }]}>
                {LANG_LABELS[l]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ─── Problem Description ─── */}
      {showProblem && (
        <ScrollView style={st.problemPanel} nestedScrollEnabled>
          <Text style={st.problemDesc}>{problemDesc}</Text>
          {examples.map((ex: any, i: number) => (
            <View key={i} style={st.exampleBox}>
              <Text style={st.exLabel}>Example {i + 1}</Text>
              {ex.input != null && (
                <Text style={st.exCode}>
                  Input: {typeof ex.input === 'string' ? ex.input : JSON.stringify(ex.input)}
                </Text>
              )}
              {(ex.output != null || ex.expectedOutput != null) && (
                <Text style={st.exCode}>
                  Output: {typeof (ex.output || ex.expectedOutput) === 'string'
                    ? (ex.output || ex.expectedOutput)
                    : JSON.stringify(ex.output || ex.expectedOutput)}
                </Text>
              )}
              {ex.explanation && <Text style={st.exExplain}>{ex.explanation}</Text>}
            </View>
          ))}
          {challengeData.constraints && (
            <View style={st.constraintBox}>
              <Text style={st.exLabel}>Constraints</Text>
              {(Array.isArray(challengeData.constraints) ? challengeData.constraints : [challengeData.constraints]).map((c: string, i: number) => (
                <Text key={i} style={st.constraintText}>• {c}</Text>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* ─── Code Editor ─── */}
      <ScrollView style={st.editorWrap} keyboardShouldPersistTaps="handled">
        <TextInput
          style={st.codeInput}
          value={code}
          onChangeText={setCode}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          placeholder="// Write your solution here"
          placeholderTextColor={COLORS.textMuted}
          editable={!hasSubmitted}
        />
      </ScrollView>

      {/* ─── Submission Result ─── */}
      {myResult && (
        <View style={[st.resultBar, myResult.passed ? st.resultPass : st.resultFail]}>
          <Ionicons
            name={myResult.passed ? 'checkmark-circle' : 'close-circle'}
            size={18}
            color={myResult.passed ? COLORS.success : COLORS.danger}
          />
          <Text style={[st.resultText, { color: myResult.passed ? COLORS.success : COLORS.danger }]}>
            {myResult.status} — {myResult.passedCount}/{myResult.totalCount} tests passed
          </Text>
          {myResult.error && (
            <Text style={st.resultError} numberOfLines={2}>{myResult.error}</Text>
          )}
        </View>
      )}

      {/* ─── Footer ─── */}
      <View style={st.footer}>
        {opponentSubmitted && !hasSubmitted && (
          <Text style={st.oppHint}>⚡ Opponent submitted! Hurry up!</Text>
        )}
        <View style={st.footerRow}>
          {/* Leave button */}
          <TouchableOpacity
            style={st.leaveBtn}
            onPress={() => {
              Alert.alert(
                '⚠️ Leave Battle?',
                'Leaving will forfeit the match!',
                [
                  { text: 'Stay', style: 'cancel' },
                  { text: 'Forfeit', style: 'destructive', onPress: handleLeaveBattle },
                ]
              );
            }}
            disabled={isLeaving || hasSubmitted}
          >
            <Ionicons name="exit" size={16} color={COLORS.danger} />
          </TouchableOpacity>

          {/* Submit button */}
          <TouchableOpacity
            style={[
              st.submitBtn,
              hasSubmitted && st.submitBtnDone,
              (isSubmitting || hasSubmitted) && { opacity: 0.7 },
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting || hasSubmitted}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : hasSubmitted ? (
              <Text style={st.submitBtnText}>✅ Submitted — Waiting</Text>
            ) : (
              <Text style={st.submitBtnText}>⚔️ Submit Solution</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const { width: SW } = Dimensions.get('window');
const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D12' },
  loadCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, gap: 12 },
  loadText: { color: COLORS.textMuted, fontSize: 14 },

  // Countdown
  countdownContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  countdownContent: { alignItems: 'center', padding: 24 },
  countdownArenaTitle: { fontSize: 18, fontWeight: '800', color: COLORS.primary, letterSpacing: 4, marginBottom: 24 },
  countdownPlayers: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 32 },
  countdownPlayer: { alignItems: 'center', gap: 4 },
  countdownAvatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center' },
  countdownAvatarText: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  countdownPlayerName: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  countdownRating: { fontSize: 11, color: COLORS.textMuted },
  vsText: { fontSize: 24, fontWeight: '900', color: COLORS.primary },
  countdownNum: { fontSize: 80, fontWeight: '900', color: COLORS.primary, marginBottom: 8 },
  countdownLabel: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 16 },
  countdownInfo: { flexDirection: 'row', gap: 16, marginTop: 8 },
  countdownDiff: { fontSize: 13, fontWeight: '700' },
  countdownFee: { fontSize: 13, color: COLORS.warning },
  countdownPrize: { fontSize: 13, color: COLORS.success },

  // Top bar
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  playerCol: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: SW * 0.3 },
  playerName: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  timer: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${COLORS.primary}20`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  timerDanger: { backgroundColor: `${COLORS.danger}20` },
  timerText: { fontSize: 14, fontWeight: '800', color: COLORS.primary, fontVariant: ['tabular-nums'] },

  // Warning
  warningBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: `${COLORS.warning}15` },
  warningText: { fontSize: 11, color: COLORS.warning, fontWeight: '600' },

  // Problem bar
  problemBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 6 },
  problemToggle: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  problemTitle: { flex: 1, fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  diffBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.full },
  diffBadgeText: { fontSize: 10, fontWeight: '700' },
  langRow: { flexDirection: 'row', gap: 3 },
  langBtn: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, borderWidth: 1, borderColor: COLORS.border },
  langActive: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}20` },
  langText: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted },

  // Problem panel
  problemPanel: { maxHeight: 200, backgroundColor: COLORS.surface, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  problemDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  exampleBox: { backgroundColor: `${COLORS.primary}08`, borderRadius: RADIUS.sm, padding: 10, marginTop: 8, borderWidth: 1, borderColor: COLORS.border },
  exLabel: { fontSize: 11, color: COLORS.primary, fontWeight: '700', marginBottom: 4 },
  exCode: { fontSize: 12, color: COLORS.textPrimary, marginTop: 2 },
  exExplain: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
  constraintBox: { marginTop: 10, padding: 10, backgroundColor: `${COLORS.warning}08`, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: `${COLORS.warning}20` },
  constraintText: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },

  // Editor
  editorWrap: { flex: 1 },
  codeInput: { flex: 1, padding: 14, color: '#E0E0E0', fontSize: 13, lineHeight: 22, minHeight: 300, textAlignVertical: 'top' },

  // Result bar
  resultBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1 },
  resultPass: { backgroundColor: `${COLORS.success}15`, borderTopColor: `${COLORS.success}30` },
  resultFail: { backgroundColor: `${COLORS.danger}15`, borderTopColor: `${COLORS.danger}30` },
  resultText: { fontSize: 13, fontWeight: '700' },
  resultError: { fontSize: 11, color: COLORS.danger, marginTop: 2 },

  // Footer
  footer: { padding: 10, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border, gap: 4 },
  oppHint: { textAlign: 'center', fontSize: 11, color: COLORS.warning, fontWeight: '600' },
  footerRow: { flexDirection: 'row', gap: 8 },
  leaveBtn: { width: 44, height: 44, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: `${COLORS.danger}40`, backgroundColor: `${COLORS.danger}15`, justifyContent: 'center', alignItems: 'center' },
  submitBtn: { flex: 1, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 12, alignItems: 'center' },
  submitBtnDone: { backgroundColor: COLORS.success },
  submitBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
