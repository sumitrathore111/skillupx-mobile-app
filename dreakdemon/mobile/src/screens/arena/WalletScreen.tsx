import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { fetchWallet } from '@services/arenaService';
import { useAuthStore } from '@store/authStore';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type WalletTab = 'overview' | 'history';

const TX_ICONS: Record<string, string> = {
  earned: '💰',
  spent: '💸',
  battle_win: '🏆',
  battle_loss: '😔',
  problem_solved: '✅',
  purchase: '🛒',
  reward: '🎁',
  refund: '🔄',
  bonus: '🎉',
};

export default function WalletScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const [tab, setTab] = useState<WalletTab>('overview');

  const { data: wallet, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => fetchWallet(user?.id!),
  });

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  const stats = wallet?.stats || {};
  const transactions: any[] = wallet?.transactions || [];

  const filteredTx = useMemo(() => {
    return transactions;
  }, [transactions]);

  if (isLoading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} /></TouchableOpacity>
          <Text style={s.headerTitle}>💰 Wallet</Text>
        </View>
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>💰 Wallet</Text>
      </View>

      {/* Tab Toggle */}
      <View style={s.tabBar}>
        {(['overview', 'history'] as WalletTab[]).map(t => (
          <TouchableOpacity key={t} style={[s.tab, tab === t && s.activeTab]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab === t && s.activeTabText]}>{t === 'overview' ? '📊 Overview' : '📜 History'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'overview' ? (
        <FlatList
          data={[]}
          renderItem={() => null}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListHeaderComponent={
            <View style={s.overviewWrap}>
              {/* Balance card */}
              <View style={s.balanceCard}>
                <View style={s.coinIcon}>
                  <Text style={s.coinEmoji}>🪙</Text>
                </View>
                <Text style={s.balanceLabel}>Total Balance</Text>
                <Text style={s.balanceAmount}>{wallet?.coins?.toLocaleString() ?? 0}</Text>
                <Text style={s.balanceSub}>CodeArena Coins</Text>
              </View>

              {/* Stats grid — 6 items (2 rows x 3) */}
              <View style={s.statsGrid}>
                {[
                  { label: 'Total Earned', value: stats.totalEarned ?? 0, icon: '📈', color: COLORS.success },
                  { label: 'Total Spent', value: stats.totalSpent ?? 0, icon: '📉', color: COLORS.danger ?? '#EF4444' },
                  { label: 'Battles Won', value: stats.battlesWon ?? 0, icon: '🏆', color: COLORS.warning },
                  { label: 'Problems', value: stats.problemsSolved ?? 0, icon: '✅', color: COLORS.primary },
                  { label: 'Battle Rating', value: stats.rating ?? wallet?.rating ?? '—', icon: '⚔️', color: '#A78BFA' },
                  { label: 'Win Streak', value: stats.streak ?? wallet?.streak ?? 0, icon: '🔥', color: '#F97316' },
                ].map((st, i) => (
                  <View key={i} style={s.statCard}>
                    <Text style={s.statIcon}>{st.icon}</Text>
                    <Text style={[s.statValue, { color: st.color }]}>{st.value}</Text>
                    <Text style={s.statLabel}>{st.label}</Text>
                  </View>
                ))}
              </View>

              {/* Recent Transactions preview */}
              <Text style={s.sectionLabel}>Recent Transactions</Text>
              {transactions.length === 0 ? (
                <View style={s.emptyState}>
                  <Text style={{ fontSize: 36 }}>📭</Text>
                  <Text style={s.emptyText}>No transactions yet</Text>
                </View>
              ) : (
                transactions.slice(0, 5).map((item, i) => {
                  const isCredit = item.amount > 0;
                  const icon = TX_ICONS[item.type] || (isCredit ? '💰' : '💸');
                  return (
                    <View key={item._id || i} style={s.txRow}>
                      <View style={s.txIconWrap}><Text style={s.txIcon}>{icon}</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.txDesc}>{item.description || item.type}</Text>
                        <Text style={s.txDate}>{item.createdAt ? formatDate(item.createdAt) : ''}</Text>
                      </View>
                      <Text style={[s.txAmount, isCredit ? s.credit : s.debit]}>{isCredit ? '+' : ''}{item.amount} 🪙</Text>
                    </View>
                  );
                })
              )}
              {transactions.length > 5 && (
                <TouchableOpacity onPress={() => setTab('history')} style={s.viewAllBtn}>
                  <Text style={s.viewAllText}>View All Transactions →</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      ) : (
        /* History tab — full transaction list */
        <FlatList
          data={filteredTx}
          keyExtractor={(item, i) => item._id || String(i)}
          refreshing={isRefetching}
          onRefresh={refetch}
          contentContainerStyle={s.list}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Text style={{ fontSize: 36 }}>📭</Text>
              <Text style={s.emptyText}>No transactions yet</Text>
              <Text style={s.emptySubtext}>Earn coins by solving problems and winning battles</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isCredit = item.amount > 0;
            const icon = TX_ICONS[item.type] || (isCredit ? '💰' : '💸');
            return (
              <View style={s.txRow}>
                <View style={s.txIconWrap}><Text style={s.txIcon}>{icon}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.txDesc}>{item.description || item.type}</Text>
                  <Text style={s.txDate}>{item.createdAt ? formatDate(item.createdAt) : ''}</Text>
                </View>
                <Text style={[s.txAmount, isCredit ? s.credit : s.debit]}>{isCredit ? '+' : ''}{item.amount} 🪙</Text>
              </View>
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
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flex: 1, paddingVertical: 11, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  activeTabText: { color: COLORS.primary },

  overviewWrap: { paddingBottom: 30 },
  balanceCard: { margin: 16, marginBottom: 12, borderRadius: RADIUS.xl, padding: 28, alignItems: 'center', gap: 6, backgroundColor: `${COLORS.primary}15`, borderWidth: 1, borderColor: `${COLORS.primary}30` },
  coinIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: `${COLORS.warning}20`, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  coinEmoji: { fontSize: 32 },
  balanceLabel: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  balanceAmount: { fontSize: 52, fontWeight: '900', color: COLORS.textPrimary, lineHeight: 58 },
  balanceSub: { fontSize: 13, color: COLORS.textMuted },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10, marginBottom: 12 },
  statCard: { width: '30%', flexGrow: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 14, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: COLORS.border },
  statIcon: { fontSize: 22 },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center' },

  sectionLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 16, paddingBottom: 8, marginTop: 4 },
  list: { paddingHorizontal: 14, paddingBottom: 30 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  txIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  txIcon: { fontSize: 20 },
  txDesc: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '600' },
  txDate: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: '800' },
  credit: { color: COLORS.success },
  debit: { color: COLORS.danger ?? '#EF4444' },
  viewAllBtn: { alignSelf: 'center', marginTop: 12, paddingVertical: 8, paddingHorizontal: 18, backgroundColor: `${COLORS.primary}15`, borderRadius: RADIUS.md },
  viewAllText: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 15, color: COLORS.textSecondary, fontWeight: '700' },
  emptySubtext: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', maxWidth: 240 },
});
