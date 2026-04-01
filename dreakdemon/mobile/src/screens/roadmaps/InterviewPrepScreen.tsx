import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { fetchInterviewQuestions } from '@services/roadmapService';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const DIFFICULTIES = ['all', 'easy', 'medium', 'hard'];
const DIFF_COLORS: Record<string, string> = { easy: COLORS.success, medium: COLORS.warning, hard: COLORS.danger };

export default function InterviewPrepScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { roadmapId, title } = route.params || {};
  const [questions, setQuestions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [difficulty, setDifficulty] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async (p = 1) => {
    try {
      const res = await fetchInterviewQuestions(roadmapId, { difficulty, page: p, limit: 20 });
      if (p === 1) setQuestions(res.questions || []);
      else setQuestions(prev => [...prev, ...(res.questions || [])]);
      setTotal(res.total || 0);
      setPage(p);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [roadmapId, difficulty]);

  useEffect(() => { setLoading(true); load(1); }, [load]);

  const filtered = search.trim()
    ? questions.filter(q => (q.question || q.title || '').toLowerCase().includes(search.toLowerCase()))
    : questions;

  const renderQuestion = ({ item, index }: { item: any; index: number }) => {
    const isExpanded = expandedId === (item._id || String(index));
    const diff = (item.difficulty || 'medium').toLowerCase();
    return (
      <TouchableOpacity style={styles.card} onPress={() => setExpandedId(isExpanded ? null : (item._id || String(index)))}>
        <View style={styles.cardHeader}>
          <Text style={styles.qNumber}>Q{index + 1}</Text>
          <Text style={styles.question} numberOfLines={isExpanded ? undefined : 2}>{item.question || item.title}</Text>
          <View style={[styles.diffBadge, { backgroundColor: (DIFF_COLORS[diff] || COLORS.textMuted) + '20' }]}>
            <Text style={[styles.diffText, { color: DIFF_COLORS[diff] || COLORS.textMuted }]}>{diff}</Text>
          </View>
        </View>
        {item.category && <Text style={styles.categoryText}>{item.category}</Text>}
        {item.company && <Text style={styles.companyText}>📋 {item.company}</Text>}
        {isExpanded && item.answer && (
          <View style={styles.answerBox}>
            <View style={styles.answerHeader}>
              <Ionicons name="bulb" size={14} color={COLORS.success} />
              <Text style={styles.answerLabel}>Answer</Text>
            </View>
            <Text style={styles.answerText}>{item.answer}</Text>
          </View>
        )}
        <View style={styles.expandHint}>
          <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textMuted} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} /></TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Interview Prep</Text>
          {title && <Text style={styles.headerSub}>{title}</Text>}
        </View>
        <Text style={styles.totalBadge}>{total}</Text>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={COLORS.textMuted} />
          <TextInput style={styles.searchInput} value={search} onChangeText={setSearch}
            placeholder="Search questions..." placeholderTextColor={COLORS.textMuted} />
        </View>
      </View>

      {/* Difficulty filter */}
      <View style={styles.filterRow}>
        {DIFFICULTIES.map(d => (
          <TouchableOpacity key={d} style={[styles.filterChip, difficulty === d && styles.filterChipActive]}
            onPress={() => setDifficulty(d)}>
            <Text style={[styles.filterText, difficulty === d && { color: '#fff' }]}>{d === 'all' ? 'All' : d.charAt(0).toUpperCase() + d.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <FlatList data={filtered} renderItem={renderQuestion} keyExtractor={(i, idx) => i._id || String(idx)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(1); }} tintColor={COLORS.primary} />}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
          onEndReached={() => { if (questions.length < total) load(page + 1); }}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={<View style={styles.centered}><Ionicons name="school-outline" size={48} color={COLORS.textMuted} /><Text style={styles.emptyText}>No questions available</Text></View>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  headerSub: { fontSize: 12, color: COLORS.textMuted },
  totalBadge: { backgroundColor: COLORS.primary + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full, fontSize: 12, fontWeight: '700', color: COLORS.primary, overflow: 'hidden' },
  searchRow: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, paddingHorizontal: 12, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, paddingVertical: 10, color: COLORS.textPrimary, fontSize: 14 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 6, paddingBottom: 10 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  qNumber: { fontSize: 12, fontWeight: '800', color: COLORS.primary, marginTop: 2 },
  question: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, lineHeight: 20 },
  diffBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  diffText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  categoryText: { fontSize: 11, color: COLORS.accent, fontWeight: '600' },
  companyText: { fontSize: 11, color: COLORS.textMuted },
  answerBox: { backgroundColor: COLORS.success + '10', borderRadius: RADIUS.md, padding: 12, gap: 6, borderLeftWidth: 3, borderLeftColor: COLORS.success, marginTop: 4 },
  answerHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  answerLabel: { fontSize: 12, fontWeight: '700', color: COLORS.success },
  answerText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  expandHint: { alignItems: 'center', marginTop: 2 },
  emptyText: { fontSize: 14, color: COLORS.textMuted, marginTop: 12 },
});
