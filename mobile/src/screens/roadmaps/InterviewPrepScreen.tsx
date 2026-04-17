import type { InterviewQuestion } from '@apptypes/index';
import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getInterviewQuestions } from '@services/roadmapService';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const DIFFICULTIES = ['all', 'easy', 'medium', 'hard'];
const DIFF_COLORS: Record<string, string> = { easy: COLORS.success, medium: COLORS.warning, hard: COLORS.danger };

export default function InterviewPrepScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { roadmapId, title } = route.params || {};
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [difficulty, setDifficulty] = useState('all');
  const [category, setCategory] = useState('all');
  const [company, setCompany] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableCompanies, setAvailableCompanies] = useState<string[]>([]);

  const load = useCallback(async (p = 1) => {
    try {
      const res = await getInterviewQuestions(roadmapId, { difficulty, category, company, page: p, limit: 20 });
      if (p === 1) setQuestions(res.questions || []);
      else setQuestions(prev => [...prev, ...(res.questions || [])]);
      setTotal(res.pagination?.total || 0);
      setTotalPages(res.pagination?.totalPages || 1);
      setPage(p);
      if (res.filters) {
        if (res.filters.categories?.length) setAvailableCategories(res.filters.categories);
        if (res.filters.companies?.length) setAvailableCompanies(res.filters.companies);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [roadmapId, difficulty, category, company]);

  useEffect(() => { setLoading(true); load(1); }, [load]);

  const filtered = search.trim()
    ? questions.filter(q => q.question.toLowerCase().includes(search.toLowerCase()))
    : questions;

  const renderQuestion = ({ item, index }: { item: InterviewQuestion; index: number }) => {
    const isExpanded = expandedId === (item._id || String(index));
    const diff = item.difficulty;
    return (
      <TouchableOpacity style={styles.card} onPress={() => setExpandedId(isExpanded ? null : (item._id || String(index)))}>
        <View style={styles.cardHeader}>
          <Text style={styles.qNumber}>Q{index + 1}</Text>
          <Text style={styles.question} numberOfLines={isExpanded ? undefined : 2}>{item.question}</Text>
          <View style={[styles.diffBadge, { backgroundColor: (DIFF_COLORS[diff] || COLORS.textMuted) + '20' }]}>
            <Text style={[styles.diffText, { color: DIFF_COLORS[diff] || COLORS.textMuted }]}>{diff}</Text>
          </View>
        </View>
        <View style={styles.metaRow}>
          {item.category ? <View style={styles.catBadge}><Text style={styles.catText}>{item.category}</Text></View> : null}
          {item.company ? <Text style={styles.companyText}>📋 {item.company}</Text> : null}
          {item.tags?.length > 0 && (
            <View style={styles.tagsRow}>
              {item.tags.slice(0, 3).map(tag => (
                <View key={tag} style={styles.tagBadge}><Text style={styles.tagText}>{tag}</Text></View>
              ))}
            </View>
          )}
        </View>
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
        <View style={styles.totalBadge}><Text style={styles.totalBadgeText}>{total}</Text></View>
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

      {/* Category filter (if available) */}
      {availableCategories.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <TouchableOpacity style={[styles.filterChip, category === 'all' && styles.filterChipActive]}
            onPress={() => setCategory('all')}>
            <Text style={[styles.filterText, category === 'all' && { color: '#fff' }]}>All Categories</Text>
          </TouchableOpacity>
          {availableCategories.map(c => (
            <TouchableOpacity key={c} style={[styles.filterChip, category === c && styles.filterChipActive]}
              onPress={() => setCategory(c)}>
              <Text style={[styles.filterText, category === c && { color: '#fff' }]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Company filter (if available) */}
      {availableCompanies.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <TouchableOpacity style={[styles.filterChip, company === 'all' && styles.filterChipActive]}
            onPress={() => setCompany('all')}>
            <Text style={[styles.filterText, company === 'all' && { color: '#fff' }]}>All Companies</Text>
          </TouchableOpacity>
          {availableCompanies.map(c => (
            <TouchableOpacity key={c} style={[styles.filterChip, company === c && styles.filterChipActive]}
              onPress={() => setCompany(c)}>
              <Text style={[styles.filterText, company === c && { color: '#fff' }]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <FlatList data={filtered} renderItem={renderQuestion} keyExtractor={(i, idx) => i._id || String(idx)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(1); }} tintColor={COLORS.primary} />}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
          onEndReached={() => { if (page < totalPages) load(page + 1); }}
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
  totalBadge: { backgroundColor: `${COLORS.primary}20`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  totalBadgeText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
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
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  catBadge: { backgroundColor: `${COLORS.primary}15`, paddingHorizontal: 7, paddingVertical: 2, borderRadius: RADIUS.full },
  catText: { fontSize: 10, color: COLORS.primary, fontWeight: '600' },
  companyText: { fontSize: 11, color: COLORS.textMuted },
  tagsRow: { flexDirection: 'row', gap: 4 },
  tagBadge: { backgroundColor: COLORS.surface, paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border },
  tagText: { fontSize: 9, color: COLORS.textMuted, fontWeight: '600' },
  answerBox: { backgroundColor: `${COLORS.success}10`, borderRadius: RADIUS.md, padding: 12, gap: 6, borderLeftWidth: 3, borderLeftColor: COLORS.success, marginTop: 4 },
  answerHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  answerLabel: { fontSize: 12, fontWeight: '700', color: COLORS.success },
  answerText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  expandHint: { alignItems: 'center', marginTop: 2 },
  emptyText: { fontSize: 14, color: COLORS.textMuted, marginTop: 12 },
});
