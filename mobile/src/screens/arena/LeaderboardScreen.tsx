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
import { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
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

const WEEKLY_REWARDS = [
  { rank: '1st', reward: '500 🪙', color: '#FFD700' },
  { rank: '2nd', reward: '300 🪙', color: '#C0C0C0' },
  { rank: '3rd', reward: '150 🪙', color: '#CD7F32' },
  { rank: '4-10', reward: '50 🪙', color: COLORS.textMuted },
];

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

  const myRank = useMemo(() => {
    const idx = entries.findIndex(e => e?.odId === user?.id || e?.userId === user?.id || e?._id === user?.id);
    if (idx < 0) return null;
    return { rank: idx + 1, entry: entries[idx] };
  }, [entries, user]);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>🏆 Leaderboard</Text>
      </View>

      {/* Tabs */}
      <View style={s.tabBar}>
        {TABS.map(t => (
          <TouchableOpacity key={t.id} style={[s.tab, tab === t.id && s.activeTab]} onPress={() => setTab(t.id)}>
            <Text style={[s.tabText, tab === t.id && s.activeTabText]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Your Rank Card */}
      {myRank && (
        <View style={s.myRankCard}>
          <View style={s.myRankLeft}>
            <Text style={s.myRankPos}>#{myRank.rank}</Text>
            <View>
              <Text style={s.myRankName}>{user?.name || 'You'}</Text>
              <Text style={s.myRankScore}>{myRank.entry?.score ?? myRank.entry?.coins ?? 0} pts</Text>
            </View>
          </View>
          {myRank.entry?.battlesWon != null && (
            <View style={s.myRankStats}>
              <Text style={s.myRankStat}>🏆 {myRank.entry.battlesWon}</Text>
              <Text style={s.myRankStat}>✅ {myRank.entry.problemsSolved ?? 0}</Text>
            </View>
          )}
        </View>
      )}

      {/* Top 3 podium */}
      {!isLoading && entries.length >= 3 && (
        <View style={s.podium}>
          {[entries[1], entries[0], entries[2]].map((entry, idx) => {
            const actualRank = idx === 0 ? 2 : idx === 1 ? 1 : 3;
            const medal = medalFor(actualRank)!;
            const height = actualRank === 1 ? 90 : actualRank === 2 ? 70 : 55;
            return (
              <View key={entry?._id || idx} style={s.podiumSlot}>
                <Text style={s.podiumEmoji}>{medal.emoji}</Text>
                <View style={[s.podiumAvatar, { borderColor: medal.color }]}>
                  {entry?.avatar ? (
                    <Image source={{ uri: entry.avatar }} style={s.avatarImg} />
                  ) : (
                    <Text style={s.avatarText}>{entry?.name?.charAt(0) || '?'}</Text>
                  )}
                </View>
                <Text style={s.podiumName} numberOfLines={1}>{entry?.name || '...'}</Text>
                <Text style={s.podiumScore}>{entry?.score ?? entry?.coins ?? 0} pts</Text>
                <View style={[s.podiumBar, { height, backgroundColor: medal.color + '30', borderColor: medal.color + '60' }]} />
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
          contentContainerStyle={s.list}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={
            entries.length === 0 ? (
              <View style={s.emptyState}><Text style={{ fontSize: 40 }}>🏆</Text><Text style={s.emptyText}>No rankings yet</Text></View>
            ) : null
          }
          ListFooterComponent={tab === 'weekly' ? (
            <View style={s.rewardsCard}>
              <Text style={s.rewardsTitle}>🎁 Weekly Rewards</Text>
              {WEEKLY_REWARDS.map(r => (
                <View key={r.rank} style={s.rewardRow}>
                  <Text style={[s.rewardRank, { color: r.color }]}>{r.rank}</Text>
                  <Text style={s.rewardAmount}>{r.reward}</Text>
                </View>
              ))}
            </View>
          ) : null}
          renderItem={({ item, index }) => {
            const rank = index + 4;
            const isMe = item?.odId === user?.id || item?.userId === user?.id || item?._id === user?.id;
            return (
              <View style={[s.rankRow, isMe && s.myRow]}>
                <Text style={s.rankNum}>{rank}</Text>
                <View style={s.rankAvatar}>
                  {item?.avatar ? (
                    <Image source={{ uri: item.avatar }} style={s.smallAvatar} />
                  ) : (
                    <Text style={s.smallAvatarText}>{item?.name?.charAt(0) || '?'}</Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.rankName, isMe && { color: COLORS.primary }]}>{item?.name || 'Unknown'}{isMe ? ' (You)' : ''}</Text>
                  {item?.title && <Text style={s.rankTitle}>{item.title}</Text>}
                </View>
                <View style={s.scoreCol}>
                  <Text style={s.rankScore}>{item?.score ?? item?.coins ?? 0}</Text>
                  <Text style={s.scoreLabel}>pts</Text>
                </View>
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

  // My Rank card
  myRankCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', margin: 14, marginBottom: 4, padding: 14, backgroundColor: `${COLORS.primary}12`, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: `${COLORS.primary}30` },
  myRankLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  myRankPos: { fontSize: 22, fontWeight: '900', color: COLORS.primary },
  myRankName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  myRankScore: { fontSize: 12, color: COLORS.textMuted },
  myRankStats: { flexDirection: 'row', gap: 10 },
  myRankStat: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },

  // Podium
  podium: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, gap: 12 },
  podiumSlot: { flex: 1, alignItems: 'center', gap: 4 },
  podiumEmoji: { fontSize: 24 },
  podiumAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  avatarImg: { width: 44, height: 44, borderRadius: 22 },
  avatarText: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  podiumName: { fontSize: 11, fontWeight: '700', color: COLORS.textPrimary, maxWidth: 80, textAlign: 'center' },
  podiumScore: { fontSize: 11, color: COLORS.textMuted },
  podiumBar: { width: '100%', borderTopWidth: 2, borderRadius: 4, marginTop: 4 },

  // List
  list: { padding: 14, gap: 8, paddingBottom: 30 },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 12, borderWidth: 1, borderColor: COLORS.border },
  myRow: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}10` },
  rankNum: { width: 28, fontSize: 14, fontWeight: '800', color: COLORS.textMuted, textAlign: 'center' },
  rankAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  smallAvatar: { width: 36, height: 36, borderRadius: 18 },
  smallAvatarText: { fontSize: 14, fontWeight: '800', color: COLORS.primary },
  rankName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  rankTitle: { fontSize: 11, color: COLORS.textMuted },
  scoreCol: { alignItems: 'flex-end' },
  rankScore: { fontSize: 16, fontWeight: '900', color: COLORS.primary },
  scoreLabel: { fontSize: 10, color: COLORS.textMuted },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: 15, color: COLORS.textMuted },

  // Weekly rewards
  rewardsCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 16, marginTop: 12, borderWidth: 1, borderColor: COLORS.border },
  rewardsTitle: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 10 },
  rewardRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rewardRank: { fontSize: 13, fontWeight: '700' },
  rewardAmount: { fontSize: 13, color: COLORS.warning, fontWeight: '700' },
});
