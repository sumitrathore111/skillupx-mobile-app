import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getBattleHistory } from '@services/arenaService';
import { useAuthStore } from '@store/authStore';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const FILTERS = ['All', 'Won', 'Lost', 'Draw'] as const;

export default function BattleHistoryScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const [filter, setFilter] = useState<typeof FILTERS[number]>('All');

  const { data: battles, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['battleHistory'],
    queryFn: getBattleHistory,
  });

  const allBattles = (battles as any[]) || [];

  const stats = useMemo(() => {
    const total = allBattles.length;
    let wins = 0, losses = 0, draws = 0, earnings = 0;
    allBattles.forEach((b: any) => {
      if (b.result === 'draw') draws++;
      else if (b.winnerId === user?.id) { wins++; earnings += (b.coinsChange || 0); }
      else losses++;
    });
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
    return { total, wins, losses, draws, winRate, earnings };
  }, [allBattles, user]);

  const filtered = useMemo(() => {
    if (filter === 'All') return allBattles;
    return allBattles.filter((b: any) => {
      if (filter === 'Draw') return b.result === 'draw';
      if (filter === 'Won') return b.winnerId === user?.id;
      return b.winnerId && b.winnerId !== user?.id;
    });
  }, [allBattles, filter, user]);

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function getResult(battle: any) {
    if (battle.result === 'draw') return { label: 'Draw', color: COLORS.warning, icon: '🤝' };
    const won = battle.winnerId === user?.id;
    return won
      ? { label: 'Won', color: COLORS.success, icon: '🏆' }
      : { label: 'Lost', color: COLORS.danger, icon: '😔' };
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>⚔️ Battle History</Text>
      </View>

      {/* Stats Row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.statsRow}>
        {[
          { label: 'Total', value: stats.total, color: COLORS.primary },
          { label: 'Wins', value: stats.wins, color: COLORS.success },
          { label: 'Losses', value: stats.losses, color: COLORS.danger },
          { label: 'Win Rate', value: `${stats.winRate}%`, color: COLORS.warning },
          { label: 'Earnings', value: `${stats.earnings} 🪙`, color: COLORS.primary },
        ].map((st) => (
          <View key={st.label} style={s.statCard}>
            <Text style={[s.statValue, { color: st.color }]}>{st.value}</Text>
            <Text style={s.statLabel}>{st.label}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Filter tabs */}
      <View style={s.filterRow}>
        {FILTERS.map(f => {
          const count = f === 'All' ? allBattles.length
            : f === 'Won' ? stats.wins
            : f === 'Lost' ? stats.losses
            : stats.draws;
          return (
            <TouchableOpacity key={f} style={[s.filterTab, filter === f && s.filterActive]} onPress={() => setFilter(f)}>
              <Text style={[s.filterText, filter === f && s.filterActiveText]}>{f}</Text>
              <View style={[s.filterBadge, filter === f && { backgroundColor: COLORS.primary }]}>
                <Text style={[s.filterBadgeText, filter === f && { color: '#fff' }]}>{count}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          contentContainerStyle={s.list}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Text style={{ fontSize: 48 }}>⚔️</Text>
              <Text style={s.emptyText}>No battles found</Text>
              <TouchableOpacity style={s.startBtn} onPress={() => navigation.navigate('BattleLobby')}>
                <Text style={s.startBtnText}>Start a Battle</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => {
            const res = getResult(item);
            return (
              <TouchableOpacity
                style={[s.battleCard, { borderLeftColor: res.color }]}
                onPress={() => navigation.navigate('BattleResult', {
                  battleId: item._id,
                  winnerId: item.winnerId,
                  coinsEarned: Math.abs(item.coinsChange || 0),
                  result: item.result,
                })}
                activeOpacity={0.7}
              >
                <Text style={s.resultIcon}>{res.icon}</Text>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={s.challengeTitle}>{item.challengeTitle || 'Unknown Challenge'}</Text>
                  <View style={s.metaRow}>
                    <Text style={s.metaText}>vs {item.opponentName || 'Bot'}</Text>
                    <Text style={s.metaDot}>·</Text>
                    <Text style={[s.diffText, { color: item.difficulty === 'easy' ? COLORS.success : item.difficulty === 'medium' ? COLORS.warning : COLORS.danger }]}>
                      {item.difficulty}
                    </Text>
                    <Text style={s.metaDot}>·</Text>
                    <Text style={s.metaText}>{formatDate(item.createdAt)}</Text>
                  </View>
                </View>
                <View style={s.rightCol}>
                  <Text style={[s.resultLabel, { color: res.color }]}>{res.label}</Text>
                  {item.coinsChange !== undefined && (
                    <Text style={[s.coinsChange, { color: item.coinsChange >= 0 ? COLORS.success : COLORS.danger }]}>
                      {item.coinsChange >= 0 ? '+' : ''}{item.coinsChange} 🪙
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },

  // Stats
  statsRow: { paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  statCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, minWidth: 80 },
  statValue: { fontSize: 18, fontWeight: '900' },
  statLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', marginTop: 2, textTransform: 'uppercase' },

  // Filter
  filterRow: { flexDirection: 'row', paddingHorizontal: 14, gap: 6, marginBottom: 4 },
  filterTab: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border },
  filterActive: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}15` },
  filterText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  filterActiveText: { color: COLORS.primary },
  filterBadge: { backgroundColor: COLORS.border, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  filterBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted },

  // List
  list: { padding: 14, gap: 10, paddingBottom: 30 },
  battleCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 14, borderWidth: 1, borderColor: COLORS.border, borderLeftWidth: 4 },
  resultIcon: { fontSize: 24 },
  challengeTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: COLORS.textMuted },
  metaDot: { fontSize: 12, color: COLORS.textMuted },
  diffText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  rightCol: { alignItems: 'flex-end', gap: 3 },
  resultLabel: { fontSize: 13, fontWeight: '800' },
  coinsChange: { fontSize: 12, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, fontWeight: '700', marginTop: 4 },
  startBtn: { marginTop: 12, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: 24, paddingVertical: 10 },
  startBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
