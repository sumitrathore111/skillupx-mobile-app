import { COLORS, RADIUS } from '@constants/theme';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getBattleDetails } from '@services/arenaService';
import { useAuthStore } from '@store/authStore';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type RouteParams = { battleId: string; winnerId: string; coinsEarned: number; result: string };

export default function BattleResultScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { battleId, winnerId, coinsEarned, result } = route.params as RouteParams;
  const { user } = useAuthStore();

  const isWin = winnerId && user?._id === winnerId;
  const isDraw = result === 'draw' || (!winnerId);

  const { data: battle, isLoading } = useQuery({
    queryKey: ['battleResult', battleId],
    queryFn: () => getBattleDetails(battleId),
  });

  return (
    <SafeAreaView style={styles.container}>
      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 80 }} />
      ) : (
        <View style={styles.content}>
          {/* Result emoji */}
          <Text style={styles.resultEmoji}>
            {isDraw ? '🤝' : isWin ? '🏆' : '😔'}
          </Text>

          {/* Result title */}
          <Text style={[styles.resultTitle, isDraw ? styles.drawColor : isWin ? styles.winColor : styles.loseColor]}>
            {isDraw ? 'Draw!' : isWin ? 'You Won!' : 'You Lost!'}
          </Text>

          {/* Coins */}
          <View style={[styles.coinsBadge, isWin ? styles.coinsWin : styles.coinsLose]}>
            <Text style={styles.coinsLabel}>Coins</Text>
            <Text style={styles.coinsAmount}>
              {isWin ? '+' : isDraw ? '±' : '-'}{coinsEarned} 🪙
            </Text>
          </View>

          {/* Battle stats */}
          {battle && (
            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>Battle Summary</Text>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Challenge</Text>
                <Text style={styles.statValue}>{battle.challengeTitle}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Difficulty</Text>
                <Text style={[styles.statValue, { textTransform: 'capitalize' }]}>{battle.difficulty}</Text>
              </View>
              {battle.opponentName && (
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Opponent</Text>
                  <Text style={styles.statValue}>{battle.opponentName}</Text>
                </View>
              )}
              {battle.duration && (
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Duration</Text>
                  <Text style={styles.statValue}>{Math.floor(battle.duration / 60)}m {battle.duration % 60}s</Text>
                </View>
              )}
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => navigation.navigate('BattleLobby')}
            >
              <Text style={styles.primaryBtnText}>⚔️ Play Again</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => navigation.navigate('ArenaHome')}
            >
              <Text style={styles.secondaryBtnText}>Back to Arena</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  resultEmoji: { fontSize: 80 },
  resultTitle: { fontSize: 36, fontWeight: '900', textAlign: 'center' },
  winColor: { color: COLORS.success },
  loseColor: { color: COLORS.error },
  drawColor: { color: COLORS.warning },
  coinsBadge: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 24, paddingVertical: 10, borderRadius: RADIUS.full },
  coinsWin: { backgroundColor: `${COLORS.success}20`, borderWidth: 1, borderColor: `${COLORS.success}40` },
  coinsLose: { backgroundColor: `${COLORS.error}10`, borderWidth: 1, borderColor: `${COLORS.error}40` },
  coinsLabel: { fontSize: 14, color: COLORS.textMuted, fontWeight: '600' },
  coinsAmount: { fontSize: 22, fontWeight: '900', color: COLORS.textPrimary },
  statsCard: { width: '100%', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: COLORS.border, gap: 10 },
  statsTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statLabel: { fontSize: 13, color: COLORS.textMuted },
  statValue: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '600' },
  actions: { width: '100%', gap: 10, marginTop: 8 },
  primaryBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  secondaryBtn: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingVertical: 13, alignItems: 'center' },
  secondaryBtnText: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '600' },
});
