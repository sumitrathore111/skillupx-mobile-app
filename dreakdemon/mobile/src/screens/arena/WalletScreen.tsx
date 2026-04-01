import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { fetchWallet } from '@services/arenaService';
import { useQuery } from '@tanstack/react-query';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const TX_ICONS: Record<string, string> = {
  earned: '💰',
  spent: '💸',
  battle_win: '🏆',
  battle_loss: '😔',
  problem_solved: '✅',
  purchase: '🛒',
  reward: '🎁',
};

export default function WalletScreen() {
  const navigation = useNavigation<any>();

  const { data: wallet, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['wallet'],
    queryFn: fetchWallet,
  });

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} /></TouchableOpacity>
          <Text style={styles.headerTitle}>Wallet</Text>
        </View>
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  const stats = wallet?.stats || {};
  const transactions: any[] = wallet?.transactions || [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wallet</Text>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item) => item._id || item.id}
        refreshing={isRefetching}
        onRefresh={refetch}
        ListHeaderComponent={
          <View>
            {/* Balance card */}
            <View style={styles.balanceCard}>
              <View style={styles.coinIcon}>
                <Text style={styles.coinEmoji}>🪙</Text>
              </View>
              <Text style={styles.balanceLabel}>Total Balance</Text>
              <Text style={styles.balanceAmount}>{wallet?.balance ?? 0}</Text>
              <Text style={styles.balanceSub}>CodeArena Coins</Text>
            </View>

            {/* Stats grid */}
            <View style={styles.statsGrid}>
              {[
                { label: 'Total Earned', value: stats.totalEarned ?? 0, icon: '📈', color: COLORS.success },
                { label: 'Total Spent', value: stats.totalSpent ?? 0, icon: '📉', color: COLORS.error },
                { label: 'Battles Won', value: stats.battlesWon ?? 0, icon: '🏆', color: COLORS.warning },
                { label: 'Problems', value: stats.problemsSolved ?? 0, icon: '✅', color: COLORS.primary },
              ].map((s, i) => (
                <View key={i} style={styles.statCard}>
                  <Text style={styles.statIcon}>{s.icon}</Text>
                  <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Transaction History</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No transactions yet</Text>
            <Text style={styles.emptySubtext}>Earn coins by solving problems and winning battles</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isCredit = item.amount > 0;
          const icon = TX_ICONS[item.type] || (isCredit ? '💰' : '💸');
          return (
            <View style={styles.txRow}>
              <View style={styles.txIconWrap}>
                <Text style={styles.txIcon}>{icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.txDesc}>{item.description || item.type}</Text>
                <Text style={styles.txDate}>{item.createdAt ? formatDate(item.createdAt) : ''}</Text>
              </View>
              <Text style={[styles.txAmount, isCredit ? styles.credit : styles.debit]}>
                {isCredit ? '+' : ''}{item.amount} 🪙
              </Text>
            </View>
          );
        }}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  balanceCard: { margin: 16, borderRadius: RADIUS.xl, padding: 28, alignItems: 'center', gap: 6, backgroundColor: `${COLORS.primary}15`, borderWidth: 1, borderColor: `${COLORS.primary}30` },
  coinIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: `${COLORS.warning}20`, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  coinEmoji: { fontSize: 32 },
  balanceLabel: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  balanceAmount: { fontSize: 52, fontWeight: '900', color: COLORS.textPrimary, lineHeight: 58 },
  balanceSub: { fontSize: 13, color: COLORS.textMuted },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10, marginBottom: 8 },
  statCard: { flex: 1, minWidth: '44%', backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 14, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: COLORS.border },
  statIcon: { fontSize: 22 },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center' },
  sectionLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 16, paddingBottom: 8, marginTop: 4 },
  list: { paddingHorizontal: 14, paddingBottom: 30 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  txIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  txIcon: { fontSize: 20 },
  txDesc: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '600' },
  txDate: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: '800' },
  credit: { color: COLORS.success },
  debit: { color: COLORS.error },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 15, color: COLORS.textSecondary, fontWeight: '700' },
  emptySubtext: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', maxWidth: 240 },
});
