import type { Challenge } from '@apptypes/index';
import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { fetchChallenges } from '@services/arenaService';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const DIFFICULTIES = ['all', 'easy', 'medium', 'hard'];
const TOPICS = ['All', 'Arrays', 'Strings', 'Trees', 'Graphs', 'DP', 'Sorting', 'Hashing', 'Recursion', 'Stack', 'Queue'];
const STATUS_FILTERS = ['All', 'Solved', 'Attempted', 'Unsolved'] as const;
const SORT_OPTIONS = [
  { id: 'newest', label: '🆕 Newest' },
  { id: 'submissions', label: '📤 Most Submitted' },
  { id: 'acceptance', label: '✅ Acceptance Rate' },
] as const;
const DIFF_COLORS = { easy: COLORS.success, medium: COLORS.warning, hard: COLORS.danger };

type StatusFilter = (typeof STATUS_FILTERS)[number];
type SortOption = (typeof SORT_OPTIONS)[number]['id'];

export default function ProblemListScreen() {
  const navigation = useNavigation<any>();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [difficulty, setDifficulty] = useState('all');
  const [topic, setTopic] = useState('All');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showSort, setShowSort] = useState(false);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const data = await fetchChallenges({
        difficulty: difficulty !== 'all' ? difficulty : undefined,
        topic: topic !== 'All' ? topic : undefined,
        search: searchQuery || undefined,
      });
      setChallenges(data?.challenges || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { setLoading(true); load(); }, [difficulty, topic]);
  useEffect(() => {
    const t = setTimeout(() => load(), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const toggleBookmark = useCallback((id: string) => {
    setBookmarks(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const filtered = useMemo(() => {
    let list = [...challenges];
    // Status filter
    if (statusFilter === 'Solved') list = list.filter(c => c.isSolved);
    else if (statusFilter === 'Attempted') list = list.filter(c => !c.isSolved && (c as any).isAttempted);
    else if (statusFilter === 'Unsolved') list = list.filter(c => !c.isSolved);
    // Sort
    if (sortBy === 'submissions') list.sort((a, b) => (b.submissionCount ?? 0) - (a.submissionCount ?? 0));
    else if (sortBy === 'acceptance') list.sort((a, b) => (b as any).acceptanceRate - (a as any).acceptanceRate || 0);
    return list;
  }, [challenges, statusFilter, sortBy]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const renderItem = ({ item }: { item: Challenge }) => {
    const diffColor = DIFF_COLORS[item.difficulty as keyof typeof DIFF_COLORS] || COLORS.textMuted;
    const isBookmarked = bookmarks.has(item.id);
    return (
      <TouchableOpacity
        style={styles.challengeCard}
        onPress={() => navigation.navigate('ProblemDetail', { challengeId: item.id })}
        activeOpacity={0.8}
      >
        <View style={styles.cardTop}>
          <View style={[styles.diffDot, { backgroundColor: diffColor }]} />
          <View style={styles.cardInfo}>
            <Text style={styles.challengeTitle}>{item.title}</Text>
            <View style={styles.cardMeta}>
              <View style={[styles.diffBadge, { backgroundColor: `${diffColor}20` }]}>
                <Text style={[styles.diffText, { color: diffColor }]}>{item.difficulty}</Text>
              </View>
              {item.topic && <Text style={styles.topicText}>{item.topic}</Text>}
              {(item as any).company && <Text style={styles.companyTag}>🏢 {(item as any).company}</Text>}
              {item.isSolved && (
                <View style={styles.solvedBadge}>
                  <Ionicons name="checkmark-circle" size={12} color={COLORS.success} />
                  <Text style={styles.solvedText}>Solved</Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity onPress={() => toggleBookmark(item.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name={isBookmarked ? 'bookmark' : 'bookmark-outline'} size={18} color={isBookmarked ? COLORS.warning : COLORS.textMuted} />
          </TouchableOpacity>
        </View>
        <View style={styles.cardBottom}>
          <Text style={styles.acceptRate}>✅ {(item as any).acceptanceRate ?? '—'}%</Text>
          <Text style={styles.submissionsText}>📤 {item.submissionCount ?? 0}</Text>
          <Text style={styles.coinsText}>🪙 {(item as any).coins ?? 0}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>📝 Problems</Text>
        <Text style={styles.count}>{filtered.length}</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={() => setShowSort(!showSort)} style={styles.sortBtn}>
          <Ionicons name="swap-vertical" size={18} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Sort dropdown */}
      {showSort && (
        <View style={styles.sortDropdown}>
          {SORT_OPTIONS.map(opt => (
            <TouchableOpacity key={opt.id} style={[styles.sortItem, sortBy === opt.id && styles.sortItemActive]} onPress={() => { setSortBy(opt.id); setShowSort(false); }}>
              <Text style={[styles.sortItemText, sortBy === opt.id && { color: COLORS.primary }]}>{opt.label}</Text>
              {sortBy === opt.id && <Ionicons name="checkmark" size={16} color={COLORS.primary} />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={17} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search problems..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Status filter */}
      <View style={styles.statusRow}>
        {STATUS_FILTERS.map(sf => (
          <TouchableOpacity key={sf} style={[styles.statusChip, statusFilter === sf && styles.activeStatusChip]} onPress={() => setStatusFilter(sf)}>
            <Text style={[styles.statusText, statusFilter === sf && styles.activeStatusText]}>{sf}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Difficulty filter */}
      <View style={styles.diffRow}>
        {DIFFICULTIES.map(d => (
          <TouchableOpacity
            key={d}
            style={[styles.diffChip, difficulty === d && styles.activeDiffChip, difficulty !== 'all' && difficulty === d && { backgroundColor: `${DIFF_COLORS[d as keyof typeof DIFF_COLORS] ?? COLORS.primary}20`, borderColor: DIFF_COLORS[d as keyof typeof DIFF_COLORS] ?? COLORS.primary }]}
            onPress={() => setDifficulty(d)}
          >
            <Text style={[styles.diffChipText, difficulty === d && { color: d === 'all' ? COLORS.primary : DIFF_COLORS[d as keyof typeof DIFF_COLORS] }]}>
              {d === 'all' ? 'All' : d.charAt(0).toUpperCase() + d.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Topic filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topicScroll}>
        {TOPICS.map(t => (
          <TouchableOpacity key={t} style={[styles.topicChip, topic === t && styles.activeTopicChip]} onPress={() => setTopic(t)}>
            <Text style={[styles.topicChipText, topic === t && styles.activeTopicChipText]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={i => i.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 40 }}>🔍</Text>
              <Text style={styles.empty}>No problems found</Text>
              <Text style={styles.emptyHint}>Try adjusting your filters</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  count: { fontSize: 13, color: COLORS.textMuted, backgroundColor: COLORS.surface, paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border },
  sortBtn: { padding: 6, backgroundColor: `${COLORS.primary}15`, borderRadius: RADIUS.md },
  sortDropdown: { marginHorizontal: 16, marginBottom: 8, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' },
  sortItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11 },
  sortItemActive: { backgroundColor: `${COLORS.primary}10` },
  sortItemText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, gap: 8 },
  searchInput: { flex: 1, height: 42, color: COLORS.textPrimary, fontSize: 14 },
  statusRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  statusChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  activeStatusChip: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}15` },
  statusText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  activeStatusText: { color: COLORS.primary },
  diffRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  diffChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  activeDiffChip: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}15` },
  diffChipText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '700' },
  topicScroll: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  topicChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  activeTopicChip: { backgroundColor: `${COLORS.accent}15`, borderColor: COLORS.accent },
  topicChipText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  activeTopicChipText: { color: COLORS.accent },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, gap: 10, paddingBottom: 32 },
  emptyState: { alignItems: 'center', paddingVertical: 50, gap: 6 },
  empty: { textAlign: 'center', color: COLORS.textMuted, fontSize: 15, fontWeight: '600' },
  emptyHint: { fontSize: 12, color: COLORS.textMuted },
  challengeCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  diffDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  cardInfo: { flex: 1 },
  challengeTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 6 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  diffBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: RADIUS.full },
  diffText: { fontSize: 10, fontWeight: '700' },
  topicText: { fontSize: 11, color: COLORS.textMuted },
  companyTag: { fontSize: 11, color: COLORS.primary },
  solvedBadge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  solvedText: { fontSize: 11, color: COLORS.success, fontWeight: '600' },
  cardBottom: { flexDirection: 'row', gap: 16, paddingLeft: 20 },
  acceptRate: { fontSize: 11, color: COLORS.textMuted },
  submissionsText: { fontSize: 11, color: COLORS.textMuted },
  coinsText: { fontSize: 11, color: COLORS.warning },
});
