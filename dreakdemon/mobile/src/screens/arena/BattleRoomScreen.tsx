import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getBattleDetails, submitSolution } from '@services/arenaService';
import { getSocket } from '@services/socketService';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    BackHandler,
    ScrollView,
    StyleSheet,
    Text,
    TextInput, TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type RouteParams = { battleId: string };

const LANGUAGES = ['javascript', 'python', 'java', 'cpp'];

export default function BattleRoomScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { battleId } = route.params as RouteParams;
  const [battle, setBattle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('// Write your solution here\n');
  const [language, setLanguage] = useState('javascript');
  const [timeLeft, setTimeLeft] = useState(0);
  const [opponentSubmitted, setOpponentSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadBattle();
    const socket = getSocket();
    socket.emit('joinBattleRoom', battleId);

    socket.on('battleStarted', (data: any) => {
      setTimeLeft(data.duration || 1800);
      startTimer(data.duration || 1800);
    });

    socket.on('opponentSubmitted', () => setOpponentSubmitted(true));

    socket.on('battleEnded', (data: any) => {
      if (timerRef.current) clearInterval(timerRef.current);
      navigation.replace('BattleResult', {
        battleId,
        winnerId: data.winnerId,
        coinsEarned: data.coinsEarned ?? 0,
        result: data.result,
      });
    });

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      Alert.alert('Leave Battle?', 'Leaving counts as a forfeit.', [
        { text: 'Stay', style: 'cancel' },
        { text: 'Forfeit', style: 'destructive', onPress: () => navigation.goBack() },
      ]);
      return true;
    });

    return () => {
      socket.off('battleStarted');
      socket.off('opponentSubmitted');
      socket.off('battleEnded');
      socket.emit('leaveBattleRoom', battleId);
      backHandler.remove();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [battleId]);

  async function loadBattle() {
    try {
      const data = await getBattleDetails(battleId);
      setBattle(data);
      if (data.timeLimit) {
        setTimeLeft(data.timeLimit * 60);
        startTimer(data.timeLimit * 60);
      }
    } catch { Alert.alert('Error', 'Failed to load battle'); }
    finally { setLoading(false); }
  }

  function startTimer(seconds: number) {
    if (timerRef.current) clearInterval(timerRef.current);
    let t = seconds;
    timerRef.current = setInterval(() => {
      t -= 1;
      setTimeLeft(t);
      if (t <= 0) { clearInterval(timerRef.current!); }
    }, 1000);
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  }

  async function handleSubmit() {
    if (!code.trim() || !battle) return;
    setSubmitting(true);
    try {
      await submitSolution(battle.challengeId, code, language, battleId);
    } catch (e: any) {
      Alert.alert('Submit Error', e.message);
    } finally { setSubmitting(false); }
  }

  if (loading) {
    return (
      <View style={styles.loadCenter}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadText}>Entering Battle Arena...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.playerInfo}>
          <Ionicons name="person-circle" size={24} color={COLORS.primary} />
          <Text style={styles.playerName}>You</Text>
        </View>
        <View style={[styles.timer, timeLeft < 60 && styles.timerWarning]}>
          <Ionicons name="time" size={14} color={timeLeft < 60 ? COLORS.error : COLORS.accent} />
          <Text style={[styles.timerText, timeLeft < 60 && styles.timerWarningText]}>{formatTime(timeLeft)}</Text>
        </View>
        <View style={styles.playerInfo}>
          <Ionicons name="person-circle" size={24} color={COLORS.error} />
          <Text style={[styles.playerName, { color: COLORS.textSecondary }]}>
            {battle?.opponentName || 'Opponent'}
          </Text>
          {opponentSubmitted && <Text style={styles.submittedBadge}>✅</Text>}
        </View>
      </View>

      {/* Problem title */}
      <View style={styles.problemBar}>
        <Text style={styles.problemTitle} numberOfLines={1}>
          {battle?.challengeTitle || 'Battle Challenge'}
        </Text>
        <View style={styles.langPicker}>
          {LANGUAGES.map(l => (
            <TouchableOpacity
              key={l}
              style={[styles.langBtn, language === l && styles.langBtnActive]}
              onPress={() => setLanguage(l)}
            >
              <Text style={[styles.langBtnText, language === l && { color: COLORS.primary }]}>{l.slice(0, 2).toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Code editor */}
      <ScrollView style={styles.editorWrap} keyboardShouldPersistTaps="handled">
        <TextInput
          style={styles.codeInput}
          value={code}
          onChangeText={setCode}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
        />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {opponentSubmitted && (
          <Text style={styles.opponentHint}>⚡ Opponent submitted!</Text>
        )}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.disabledBtn]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>⚔️ Submit Solution</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D12' },
  loadCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, gap: 12 },
  loadText: { color: COLORS.textMuted, fontSize: 14 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  playerInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  playerName: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  submittedBadge: { fontSize: 12 },
  timer: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: `${COLORS.accent}20`, paddingHorizontal: 12, paddingVertical: 5, borderRadius: RADIUS.full },
  timerWarning: { backgroundColor: `${COLORS.error}20` },
  timerText: { fontSize: 15, fontWeight: '800', color: COLORS.accent, fontFamily: 'monospace' },
  timerWarningText: { color: COLORS.error },
  problemBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 8 },
  problemTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  langPicker: { flexDirection: 'row', gap: 4 },
  langBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: COLORS.border },
  langBtnActive: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}20` },
  langBtnText: { fontSize: 10, color: COLORS.textMuted, fontWeight: '700' },
  editorWrap: { flex: 1 },
  codeInput: { flex: 1, padding: 14, color: '#E0E0E0', fontSize: 13, fontFamily: 'monospace', lineHeight: 22, minHeight: 400, textAlignVertical: 'top' },
  footer: { padding: 12, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border, gap: 6 },
  opponentHint: { textAlign: 'center', fontSize: 12, color: COLORS.warning, fontWeight: '600' },
  submitBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  disabledBtn: { opacity: 0.55 },
});
