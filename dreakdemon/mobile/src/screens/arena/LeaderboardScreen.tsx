import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
    fetchGlobalLeaderboard,
    fetchMonthlyLeaderboard,
    fetchWeeklyLeaderboard,
} from '@services/arenaService';
import { useAuthStore } from '@store/authStore';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Tab = 'global' | 'weekly' | 'monthly';

const TABS: { id: Tab; label: string }[] = [
  { id: 'global', label: '🌐 Global' },
  { id: 'weekly', label: '📅 Weekly' },
  { id: 'monthly', label: '🗓️ Monthly' },
];

function medalFor(rank: number) {
  if (rank === 1) return { emoji: '🥇', color: '#FFD700' };
  if (rank === 2) return { emoji: '🥈', color: '#C0C0C0' };
  if (rank === 3) return { emoji: '🥉', color: '#CD7F32' };
  return null;
}

export default function LeaderboardScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const [tab, setTab] = useState<Tab>('global');

  const queryFnMap = {
    global: fetchGlobalLeaderboard,
    weekly: fetchWeeklyLeaderboard,
    monthly: fetchMonthlyLeaderboard,
  };

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['leaderboard', tab],
    queryFn: queryFnMap[tab],
  });

  const entries: any[] = data || [];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leaderboard</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tab, tab === t.id && styles.activeTab]}
            onPress={() => setTab(t.id)}
          >
            <Text style={[styles.tabText, tab === t.id && styles.activeTabText]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Top 3 podium */}
      {!isLoading && entries.length >= 3 && (
        <View style={styles.podium}>
          {[entries[1], entries[0], entries[2]].map((entry, idx) => {
            const actualRank = idx === 0 ? 2 : idx === 1 ? 1 : 3;
            const medal = medalFor(actualRank)!;
            const height = actualRank === 1 ? 90 : actualRank === 2 ? 70 : 55;
            return (
              <View key={entry?._id || idx} style={styles.podiumSlot}>
                <Text style={styles.podiumEmoji}>{medal.emoji}</Text>
                <View style={styles.podiumAvatar}>
                  {entry?.avatar ? (
                    <Image source={{ uri: entry.avatar }} style={styles.avatarImg} />
                  ) : (
                    <Text style={styles.avatarText}>{entry?.name?.charAt(0) || '?'}</Text>
                  )}
                </View>
                <Text style={styles.podiumName} numberOfLines={1}>{entry?.name || '...'}</Text>
                <Text style={styles.podiumScore}>{entry?.score ?? entry?.coins ?? 0} pts</Text>
                <View style={[styles.podiumBar, { height, backgroundColor: medal.color + '30', borderColor: medal.color + '60' }]} />
              </View>
            );
          })}
        </View>
      )}

      {/* List */}
      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={entries.slice(3)}
          keyExtractor={(item, i) => item?._id || String(i)}
          contentContainerStyle={styles.list}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={
            entries.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🏆</Text>
                <Text style={styles.emptyText}>No rankings yet</Text>
              </View>
            ) : null
          }
          renderItem={({ item, index }) => {
            const rank = index + 4;
            const isCurrentUser = item?.userId === user?._id || item?._id === user?._id;
            return (
              <View style={[styles.rankRow, isCurrentUser && styles.myRow]}>
                <Text style={styles.rankNum}>{rank}</Text>
                <View style={styles.rankAvatar}>
                  {item?.avatar ? (
                    <Image source={{ uri: item.avatar }} style={styles.smallAvatar} />
                  ) : (
                    <Text style={styles.smallAvatarText}>{item?.name?.charAt(0) || '?'}</Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rankName, isCurrentUser && { color: COLORS.primary }]}>{item?.name || 'Unknown'}{isCurrentUser ? ' (You)' : ''}</Text>
                  {item?.title && <Text style={styles.rankTitle}>{item.title}</Text>}
                </View>
                <View style={styles.scoreCol}>
                  <Text style={styles.rankScore}>{item?.score ?? item?.coins ?? 0}</Text>
                  <Text style={styles.scoreLabel}>pts</Text>
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
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flex: 1, paddingVertical: 11, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  activeTabText: { color: COLORS.primary },
  podium: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, gap: 12 },
  podiumSlot: { flex: 1, alignItems: 'center', gap: 4 },
  podiumEmoji: { fontSize: 24 },
  podiumAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.border },
  avatarImg: { width: 44, height: 44, borderRadius: 22 },
  avatarText: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  podiumName: { fontSize: 11, fontWeight: '700', color: COLORS.textPrimary, maxWidth: 80, textAlign: 'center' },
  podiumScore: { fontSize: 11, color: COLORS.textMuted },
  podiumBar: { width: '100%', borderTopWidth: 2, borderRadius: 4, marginTop: 4 },
  list: { padding: 14, gap: 8 },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 12, borderWidth: 1, borderColor: COLORS.border },
  myRow: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}10` },
  rankNum: { width: 28, fontSize: 14, fontWeight: '800', color: COLORS.textMuted, textAlign: 'center' },
  rankAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  smallAvatar: { width: 36, height: 36, borderRadius: 18 },
  smallAvatarText: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
  rankName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  rankTitle: { fontSize: 11, color: COLORS.textMuted },
  scoreCol: { alignItems: 'flex-end' },
  rankScore: { fontSize: 16, fontWeight: '900', color: COLORS.accent },
  scoreLabel: { fontSize: 10, color: COLORS.textMuted },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 15, color: COLORS.textMuted },
});
