import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { CATEGORY_LABELS, fetchAllRoadmaps } from '@services/roadmapService';
import type { Roadmap } from '@apptypes/index';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const CATEGORIES = ['all', ...Object.keys(CATEGORY_LABELS)];
const DIFFICULTIES = ['all', 'beginner', 'intermediate', 'advanced'];
const DIFF_COLORS = { beginner: COLORS.success, intermediate: COLORS.warning, advanced: COLORS.error };

export default function RoadmapListScreen() {
  const navigation = useNavigation<any>();
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [difficulty, setDifficulty] = useState('all');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const data = await fetchAllRoadmaps();
      setRoadmaps(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }

  const onRefresh = () => { setRefreshing(true); load(); };

  const filtered = roadmaps.filter(r => {
    if (searchQuery && !r.title.toLowerCase().includes(searchQuery.toLowerCase()) && !r.description?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (category !== 'all' && r.category !== category) return false;
    if (difficulty !== 'all' && r.difficulty !== difficulty) return false;
    return true;
  });

  const renderRoadmap = ({ item }: { item: Roadmap }) => {
    const diffColor = DIFF_COLORS[item.difficulty as keyof typeof DIFF_COLORS] || COLORS.textMuted;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('RoadmapDetail', { slug: item.slug, roadmapId: item.id })}
        activeOpacity={0.8}
      >
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <View style={[styles.diffBadge, { backgroundColor: `${diffColor}20` }]}>
            <Text style={[styles.diffText, { color: diffColor }]}>{item.difficulty}</Text>
          </View>
        </View>
        {item.description && <Text numberOfLines={2} style={styles.cardDesc}>{item.description}</Text>}
        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="layers-outline" size={13} color={COLORS.textMuted} />
            <Text style={styles.metaText}>{item.totalTopics || 0} topics</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={13} color={COLORS.textMuted} />
            <Text style={styles.metaText}>{item.enrolledCount || 0} enrolled</Text>
          </View>
          <View style={styles.categoryChip}>
            <Text style={styles.categoryText}>{CATEGORY_LABELS[item.category] || item.category}</Text>
          </View>
        </View>
        {item.isEnrolled && (
          <View style={styles.enrolledBadge}>
            <Ionicons name="checkmark-circle" size={13} color={COLORS.success} />
            <Text style={styles.enrolledText}>Enrolled</Text>
            <Text style={styles.progressText}>{item.progress ?? 0}%</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Roadmaps</Text>
        <Text style={styles.pageSubtitle}>{filtered.length} paths available</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={17} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search roadmaps..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Category filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.filterChip, category === cat && styles.activeFilterChip]}
            onPress={() => setCategory(cat)}
          >
            <Text style={[styles.filterChipText, category === cat && styles.activeFilterChipText]}>
              {cat === 'all' ? 'All' : CATEGORY_LABELS[cat] || cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Difficulty filter */}
      <View style={styles.diffRow}>
        {DIFFICULTIES.map(diff => (
          <TouchableOpacity
            key={diff}
            style={[styles.diffChip, difficulty === diff && styles.activeDiffChip]}
            onPress={() => setDifficulty(diff)}
          >
            <Text style={[styles.diffChipText, difficulty === diff && styles.activeDiffChipText]}>
              {diff === 'all' ? 'All Levels' : diff.charAt(0).toUpperCase() + diff.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderRoadmap}
          keyExtractor={i => i.id || i.slug}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No roadmaps match your filters</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  pageSubtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, gap: 8 },
  searchInput: { flex: 1, height: 42, color: COLORS.textPrimary, fontSize: 14 },
  filterScroll: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  activeFilterChip: { backgroundColor: `${COLORS.primary}20`, borderColor: COLORS.primary },
  filterChipText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  activeFilterChipText: { color: COLORS.primary },
  diffRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  diffChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  activeDiffChip: { backgroundColor: `${COLORS.accent}15`, borderColor: COLORS.accent },
  diffChipText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  activeDiffChipText: { color: COLORS.accent },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, gap: 12, paddingBottom: 32 },
  empty: { textAlign: 'center', color: COLORS.textMuted, marginTop: 40 },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, flex: 1, marginRight: 8 },
  diffBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.full },
  diffText: { fontSize: 11, fontWeight: '700' },
  cardDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 10 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11, color: COLORS.textMuted },
  categoryChip: { marginLeft: 'auto', backgroundColor: `${COLORS.accent}15`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  categoryText: { fontSize: 10, color: COLORS.accent, fontWeight: '600' },
  enrolledBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  enrolledText: { fontSize: 11, color: COLORS.success, fontWeight: '600' },
  progressText: { marginLeft: 'auto', fontSize: 11, color: COLORS.textMuted },
});
