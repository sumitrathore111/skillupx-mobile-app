import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { fetchChallenges } from '@services/arenaService';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const DIFFICULTIES = ['all', 'easy', 'medium', 'hard'];
const TOPICS = ['all', 'arrays', 'strings', 'linked-list', 'trees', 'graphs', 'dp', 'sorting', 'searching', 'math', 'stacks', 'queues'];
const DIFF_COLORS: Record<string, string> = { easy: COLORS.success, medium: COLORS.warning, hard: COLORS.danger };

export default function PracticeChallengesScreen() {
  const navigation = useNavigation<any>();
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('all');
  const [topic, setTopic] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async (p = 1) => {
    try {
      const data = await fetchChallenges({ page: p, difficulty, topic, search: search.trim() || undefined });
      if (p === 1) setChallenges(data?.challenges || []);
      else setChallenges(prev => [...prev, ...(data?.challenges || [])]);
      setTotal(data?.total || 0);
      setPage(p);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [difficulty, topic, search]);

  useEffect(() => { setLoading(true); load(1); }, [load]);

  const renderChallenge = ({ item }: { item: any }) => {
    const diff = (item.difficulty || '').toLowerCase();
    return (
      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ProblemDetail', { challengeId: item._id || item.id, challengeTitle: item.title })}>
        <View style={styles.cardTop}>
          <View style={[styles.diffBadge, { backgroundColor: (DIFF_COLORS[diff] || COLORS.textMuted) + '20' }]}>
            <Text style={[styles.diffText, { color: DIFF_COLORS[diff] || COLORS.textMuted }]}>{item.difficulty}</Text>
          </View>
          {item.coinReward && (
            <View style={styles.coinBadge}><Text style={{ fontSize: 11 }}>🪙</Text><Text style={styles.coinVal}>{item.coinReward}</Text></View>
          )}
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        {item.category && <Text style={styles.cardCategory}>{item.category}</Text>}
        <View style={styles.cardMeta}>
          {item.points && <View style={styles.metaItem}><Ionicons name="star" size={12} color={COLORS.warning} /><Text style={styles.metaText}>{item.points} pts</Text></View>}
          {item.solvedBy !== undefined && <View style={styles.metaItem}><Ionicons name="people" size={12} color={COLORS.accent} /><Text style={styles.metaText}>{item.solvedBy} solved</Text></View>}
          {item.tags?.length > 0 && <View style={styles.metaItem}><Ionicons name="pricetag" size={12} color={COLORS.primary} /><Text style={styles.metaText}>{item.tags.slice(0, 2).join(', ')}</Text></View>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Practice Challenges</Text>
        <Text style={styles.totalBadge}>{total}</Text>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={COLORS.textMuted} />
          <TextInput style={styles.searchInput} value={search} onChangeText={setSearch}
            placeholder="Search challenges..." placeholderTextColor={COLORS.textMuted} returnKeyType="search" />
        </View>
      </View>

      {/* Difficulty filter */}
      <View style={styles.filterRow}>
        {DIFFICULTIES.map(d => (
          <TouchableOpacity key={d} style={[styles.filterChip, difficulty === d && styles.filterChipActive]}
            onPress={() => setDifficulty(d)}>
            <Text style={[styles.filterText, difficulty === d && styles.filterTextActive]}>{d === 'all' ? 'All' : d.charAt(0).toUpperCase() + d.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Topic filter (horizontal scroll) */}
      <FlatList horizontal data={TOPICS} keyExtractor={i => i} showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 6, paddingBottom: 8 }}
        renderItem={({ item: t }) => (
          <TouchableOpacity style={[styles.topicChip, topic === t && styles.topicChipActive]}
            onPress={() => setTopic(t)}>
            <Text style={[styles.topicText, topic === t && { color: '#fff' }]}>{t === 'all' ? 'All Topics' : t.charAt(0).toUpperCase() + t.slice(1)}</Text>
          </TouchableOpacity>
        )}
      />

      {/* List */}
      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <FlatList data={challenges} renderItem={renderChallenge} keyExtractor={i => i._id || i.id || i.title}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(1); }} tintColor={COLORS.primary} />}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
          onEndReached={() => { if (challenges.length < total) load(page + 1); }}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={<View style={styles.centered}><Ionicons name="code-slash-outline" size={48} color={COLORS.textMuted} /><Text style={styles.emptyText}>No challenges found</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  totalBadge: { backgroundColor: COLORS.primary + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full, fontSize: 12, fontWeight: '700', color: COLORS.primary },
  searchRow: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, paddingHorizontal: 12, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, paddingVertical: 10, color: COLORS.textPrimary, fontSize: 14 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 6, paddingBottom: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  filterTextActive: { color: '#fff' },
  topicChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  topicChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  topicText: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 8 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  diffBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  diffText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  coinBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  coinVal: { fontSize: 11, fontWeight: '700', color: COLORS.warning },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  cardCategory: { fontSize: 12, color: COLORS.accent, fontWeight: '600' },
  cardMeta: { flexDirection: 'row', gap: 12, marginTop: 2 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: COLORS.textMuted },
  emptyText: { fontSize: 14, color: COLORS.textMuted, marginTop: 12 },
});
