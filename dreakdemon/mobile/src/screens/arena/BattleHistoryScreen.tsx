import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getBattleHistory } from '@services/arenaService';
import { useAuthStore } from '@store/authStore';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BattleHistoryScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();

  const { data: battles, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['battleHistory'],
    queryFn: getBattleHistory,
  });

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function getResult(battle: any) {
    if (battle.result === 'draw') return { label: 'Draw', color: COLORS.warning, icon: '🤝' };
    const won = battle.winnerId === user?._id;
    return won
      ? { label: 'Won', color: COLORS.success, icon: '🏆' }
      : { label: 'Lost', color: COLORS.error, icon: '😔' };
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Battle History</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={(battles as any[]) || []}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>⚔️</Text>
              <Text style={styles.emptyText}>No battles yet</Text>
              <Text style={styles.emptySubtext}>Challenge someone to a battle!</Text>
              <TouchableOpacity style={styles.startBtn} onPress={() => navigation.navigate('BattleLobby')}>
                <Text style={styles.startBtnText}>Start a Battle</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => {
            const res = getResult(item);
            return (
              <View style={[styles.battleCard, { borderLeftColor: res.color }]}>
                <Text style={styles.resultIcon}>{res.icon}</Text>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.challengeTitle}>{item.challengeTitle || 'Unknown Challenge'}</Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>vs {item.opponentName || 'Bot'}</Text>
                    <Text style={styles.metaDot}>·</Text>
                    <Text style={[styles.diffText, { color: item.difficulty === 'easy' ? COLORS.success : item.difficulty === 'medium' ? COLORS.warning : COLORS.error }]}>
                      {item.difficulty}
                    </Text>
                    <Text style={styles.metaDot}>·</Text>
                    <Text style={styles.metaText}>{formatDate(item.createdAt)}</Text>
                  </View>
                </View>
                <View style={styles.rightCol}>
                  <Text style={[styles.resultLabel, { color: res.color }]}>{res.label}</Text>
                  {item.coinsChange !== undefined && (
                    <Text style={[styles.coinsChange, { color: item.coinsChange >= 0 ? COLORS.success : COLORS.error }]}>
                      {item.coinsChange >= 0 ? '+' : ''}{item.coinsChange} 🪙
                    </Text>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  list: { padding: 14, gap: 10 },
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
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, fontWeight: '700', marginTop: 4 },
  emptySubtext: { fontSize: 13, color: COLORS.textMuted },
  startBtn: { marginTop: 12, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: 24, paddingVertical: 10 },
  startBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
