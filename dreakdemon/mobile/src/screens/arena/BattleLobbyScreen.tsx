import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { createBattle, createBotBattle, fetchChallenges, fetchWaitingBattles, joinBattle } from '@services/arenaService';
import { getSocket } from '@services/socketService';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

export default function BattleLobbyScreen() {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<'find' | 'waiting'>('find');
  const [selDiff, setSelDiff] = useState('Medium');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [botLoading, setBotLoading] = useState(false);

  const { data: waitingBattles, isLoading: loadingWaiting, refetch: refetchWaiting } =
    useQuery({ queryKey: ['waitingBattles'], queryFn: fetchWaitingBattles });

  const { data: challengesData } = useQuery({
    queryKey: ['challenges', selDiff.toLowerCase()],
    queryFn: () => fetchChallenges({ difficulty: selDiff.toLowerCase() }),
  });
  const challenges: any[] = challengesData?.challenges ?? [];

  const createMutation = useMutation({
    mutationFn: () => {
      if (!challengeId) throw new Error('Select a challenge first');
      return createBattle({ challengeId, difficulty: selDiff.toLowerCase() });
    },
    onSuccess: (battle) => navigation.navigate('BattleRoom', { battleId: battle._id }),
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const joinMutation = useMutation({
    mutationFn: (battleId: string) => joinBattle(battleId),
    onSuccess: (battle) => navigation.navigate('BattleRoom', { battleId: battle._id }),
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  useEffect(() => {
    const socket = getSocket();
    socket.emit('joinBattleLobby');
    socket.on('battleMatched', (battle: any) => {
      navigation.navigate('BattleRoom', { battleId: battle._id });
    });
    return () => { socket.off('battleMatched'); };
  }, []);

  async function handleBotBattle() {
    setBotLoading(true);
    try {
      const battle = await createBotBattle(selDiff.toLowerCase());
      navigation.navigate('BattleRoom', { battleId: battle._id });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally { setBotLoading(false); }
  }

  function diffColor(d: string) {
    if (d.toLowerCase() === 'easy') return COLORS.success;
    if (d.toLowerCase() === 'medium') return COLORS.warning;
    return COLORS.error;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Battle Lobby</Text>
      </View>

      {/* Tab */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, activeTab === 'find' && styles.activeTab]} onPress={() => setActiveTab('find')}>
          <Text style={[styles.tabText, activeTab === 'find' && styles.activeTabText]}>⚔️ Start Battle</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'waiting' && styles.activeTab]} onPress={() => setActiveTab('waiting')}>
          <Text style={[styles.tabText, activeTab === 'waiting' && styles.activeTabText]}>🔍 Open Battles</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'find' ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Difficulty */}
          <Text style={styles.sectionLabel}>Select Difficulty</Text>
          <View style={styles.diffRow}>
            {DIFFICULTIES.map(d => (
              <TouchableOpacity
                key={d}
                style={[styles.diffChip, selDiff === d && { borderColor: diffColor(d), backgroundColor: `${diffColor(d)}20` }]}
                onPress={() => setSelDiff(d)}
              >
                <Text style={[styles.diffText, { color: selDiff === d ? diffColor(d) : COLORS.textMuted }]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Challenge picker */}
          <Text style={styles.sectionLabel}>Pick a Challenge</Text>
          {(challenges as any[]).map((c: any) => (
            <TouchableOpacity
              key={c._id}
              style={[styles.challengeRow, challengeId === c._id && styles.challengeSelected]}
              onPress={() => setChallengeId(c._id)}
            >
              <View style={[styles.diffDot, { backgroundColor: diffColor(c.difficulty) }]} />
              <Text style={[styles.challengeName, challengeId === c._id && { color: COLORS.primary }]} numberOfLines={1}>{c.title}</Text>
              {challengeId === c._id && <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />}
            </TouchableOpacity>
          ))}

          {/* Buttons */}
          <TouchableOpacity
            style={[styles.primaryBtn, !challengeId && styles.disabledBtn]}
            onPress={() => createMutation.mutate()}
            disabled={!challengeId || createMutation.isPending}
          >
            {createMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>⚔️ Create Battle</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryBtn, botLoading && styles.disabledBtn]}
            onPress={handleBotBattle}
            disabled={botLoading}
          >
            {botLoading ? <ActivityIndicator color={COLORS.primary} /> : <Text style={styles.secondaryBtnText}>🤖 Battle vs Bot</Text>}
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          <TouchableOpacity style={styles.refreshBtn} onPress={() => refetchWaiting()}>
            <Ionicons name="refresh" size={16} color={COLORS.primary} />
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
          {loadingWaiting ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={(waitingBattles as any[]) || []}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.list}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>🕹️</Text>
                  <Text style={styles.emptyText}>No open battles right now</Text>
                  <Text style={styles.emptySubtext}>Create one and wait for an opponent</Text>
                </View>
              }
              renderItem={({ item }) => (
                <View style={styles.battleCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.battleChallenge}>{item.challengeTitle || 'Unknown Challenge'}</Text>
                    <View style={styles.battleMeta}>
                      <Text style={[styles.battleDiff, { color: diffColor(item.difficulty) }]}>{item.difficulty}</Text>
                      <Text style={styles.battleCreator}>by {item.creatorName}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.joinBtn}
                    onPress={() => joinMutation.mutate(item._id)}
                    disabled={joinMutation.isPending}
                  >
                    <Text style={styles.joinBtnText}>Join</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flex: 1, paddingVertical: 13, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  activeTabText: { color: COLORS.primary },
  scroll: { padding: 16, gap: 10 },
  sectionLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginTop: 12 },
  diffRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  diffChip: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.border },
  diffText: { fontWeight: '700', fontSize: 13 },
  challengeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, marginBottom: 4 },
  challengeSelected: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}12` },
  diffDot: { width: 8, height: 8, borderRadius: 4 },
  challengeName: { flex: 1, fontSize: 13, color: COLORS.textPrimary },
  primaryBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  secondaryBtn: { borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 13, alignItems: 'center', marginTop: 10 },
  secondaryBtnText: { color: COLORS.primary, fontSize: 15, fontWeight: '700' },
  disabledBtn: { opacity: 0.5 },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 14 },
  refreshText: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
  list: { padding: 14, gap: 10 },
  battleCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  battleChallenge: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  battleMeta: { flexDirection: 'row', gap: 10 },
  battleDiff: { fontSize: 12, fontWeight: '700' },
  battleCreator: { fontSize: 12, color: COLORS.textMuted },
  joinBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: 18, paddingVertical: 8 },
  joinBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, fontWeight: '700' },
  emptySubtext: { fontSize: 13, color: COLORS.textMuted, marginTop: 4 },
});
