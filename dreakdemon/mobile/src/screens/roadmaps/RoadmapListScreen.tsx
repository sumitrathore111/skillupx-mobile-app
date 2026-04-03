import type { Roadmap } from '@apptypes/index';
import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
    CATEGORY_LABELS,
    DIFFICULTY_LABELS,
    getAllRoadmaps,
} from '@services/roadmapService';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

const CATEGORIES = ['all', ...Object.keys(CATEGORY_LABELS)];
const DIFFICULTIES = ['all', ...Object.keys(DIFFICULTY_LABELS)];

const DIFF_COLORS: Record<string, string> = {
  beginner: COLORS.success,
  intermediate: COLORS.warning,
  advanced: COLORS.danger,
  'all-levels': COLORS.primary,
};

export default function RoadmapListScreen() {
  const navigation = useNavigation<any>();
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');

  // Debounce search
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => setDebouncedSearch(searchQuery), 150);
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, [searchQuery]);

  const loadRoadmaps = useCallback(async () => {
    try {
      const data = await getAllRoadmaps();
      setRoadmaps(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadRoadmaps(); }, [loadRoadmaps]);

  const onRefresh = () => { setRefreshing(true); loadRoadmaps(); };

  // Memoized filtering
  const filteredRoadmaps = useMemo(() => {
    let filtered = [...roadmaps];
    if (selectedCategory !== 'all') filtered = filtered.filter(r => r.category === selectedCategory);
    if (selectedDifficulty !== 'all') filtered = filtered.filter(r => r.difficulty === selectedDifficulty);
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        r =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.tags?.some(tag => tag.toLowerCase().includes(q))
      );
    }
    return filtered;
  }, [roadmaps, debouncedSearch, selectedCategory, selectedDifficulty]);

  // Memoized stats
  const stats = useMemo(
    () => ({
      totalRoadmaps: roadmaps.length,
      totalTopics: roadmaps.reduce((sum, r) => sum + r.totalTopics, 0),
      totalResources: roadmaps.reduce((sum, r) => sum + r.totalResources, 0),
      totalLearners: roadmaps.reduce((sum, r) => sum + r.enrolledCount, 0),
    }),
    [roadmaps]
  );

  // Featured roadmaps
  const featuredRoadmaps = useMemo(() => roadmaps.filter(r => r.isFeatured), [roadmaps]);

  const renderFeatured = ({ item }: { item: Roadmap }) => (
    <TouchableOpacity
      style={styles.featuredCard}
      onPress={() => navigation.navigate('RoadmapDetail', { slug: item.slug })}
      activeOpacity={0.8}
    >
      <View style={[styles.featuredIcon, { backgroundColor: item.color || COLORS.primary }]}>
        <Text style={styles.featuredIconText}>{item.icon || '📚'}</Text>
      </View>
      <Text style={styles.featuredTitle} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.featuredMeta}>{item.totalTopics} topics • {item.enrolledCount} learners</Text>
      {item.userProgress?.isEnrolled && (
        <View style={styles.featuredProgress}>
          <View style={styles.featuredProgressBg}>
            <View style={[styles.featuredProgressFill, { width: `${item.userProgress.progressPercent}%` as any }]} />
          </View>
          <Text style={styles.featuredProgressText}>{item.userProgress.progressPercent}%</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderRoadmap = ({ item }: { item: Roadmap }) => {
    const diffColor = DIFF_COLORS[item.difficulty] || COLORS.textMuted;
    const progress = item.userProgress;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('RoadmapDetail', { slug: item.slug })}
        activeOpacity={0.8}
      >
        <View style={styles.cardTop}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardIcon}>{item.icon || '📚'}</Text>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          </View>
          <View style={[styles.diffBadge, { backgroundColor: `${diffColor}20` }]}>
            <Text style={[styles.diffText, { color: diffColor }]}>
              {DIFFICULTY_LABELS[item.difficulty] || item.difficulty}
            </Text>
          </View>
        </View>

        {item.description ? (
          <Text numberOfLines={2} style={styles.cardDesc}>{item.description}</Text>
        ) : null}

        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="layers-outline" size={13} color={COLORS.textMuted} />
            <Text style={styles.metaText}>{item.totalTopics} topics</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={13} color={COLORS.textMuted} />
            <Text style={styles.metaText}>{item.estimatedWeeks}w</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={13} color={COLORS.textMuted} />
            <Text style={styles.metaText}>{item.enrolledCount}</Text>
          </View>
          {item.rating > 0 && (
            <View style={styles.metaItem}>
              <Ionicons name="star" size={13} color={COLORS.warning} />
              <Text style={styles.metaText}>{item.rating.toFixed(1)}</Text>
            </View>
          )}
          <View style={styles.categoryChip}>
            <Text style={styles.categoryText}>{CATEGORY_LABELS[item.category] || item.category}</Text>
          </View>
        </View>

        {/* Tags */}
        {item.tags?.length > 0 && (
          <View style={styles.tagsRow}>
            {item.tags.slice(0, 4).map(tag => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Progress if enrolled */}
        {progress?.isEnrolled && (
          <View style={styles.enrolledSection}>
            <View style={styles.enrolledHeader}>
              <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
              <Text style={styles.enrolledText}>Enrolled</Text>
              <Text style={styles.progressPctText}>{progress.progressPercent}%</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progress.progressPercent}%` as any }]} />
            </View>
            <Text style={styles.progressSubText}>
              {progress.completedTopics}/{item.totalTopics} topics completed
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Ionicons name="map" size={20} color="#fff" />
          </View>
          <View>
            <Text style={styles.pageTitle}>Learning Roadmaps</Text>
            <Text style={styles.pageSubtitle}>Master IT skills with curated paths</Text>
          </View>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { icon: 'map-outline' as const, label: 'Roadmaps', value: stats.totalRoadmaps, color: '#3B82F6' },
          { icon: 'book-outline' as const, label: 'Topics', value: `${stats.totalTopics}+`, color: COLORS.success },
          { icon: 'link-outline' as const, label: 'Resources', value: `${stats.totalResources}+`, color: COLORS.warning },
          { icon: 'people-outline' as const, label: 'Learners', value: stats.totalLearners, color: '#8B5CF6' },
        ].map(stat => (
          <View key={stat.label} style={styles.statCard}>
            <View style={[styles.statIconBg, { backgroundColor: `${stat.color}20` }]}>
              <Ionicons name={stat.icon} size={16} color={stat.color} />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
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
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.filterChip, selectedCategory === cat && styles.activeFilterChip]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[styles.filterChipText, selectedCategory === cat && styles.activeFilterChipText]}>
              {cat === 'all' ? 'All Categories' : CATEGORY_LABELS[cat] || cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Difficulty filter */}
      <View style={styles.diffRow}>
        {DIFFICULTIES.map(diff => (
          <TouchableOpacity
            key={diff}
            style={[styles.diffChip, selectedDifficulty === diff && styles.activeDiffChip]}
            onPress={() => setSelectedDifficulty(diff)}
          >
            <Text style={[styles.diffChipText, selectedDifficulty === diff && styles.activeDiffChipText]}>
              {diff === 'all' ? 'All Levels' : DIFFICULTY_LABELS[diff] || diff}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredRoadmaps}
          renderItem={renderRoadmap}
          keyExtractor={i => i._id || i.slug}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            featuredRoadmaps.length > 0 ? (
              <View style={styles.featuredSection}>
                <Text style={styles.featuredSectionTitle}>⭐ Featured Roadmaps</Text>
                <FlatList
                  horizontal
                  data={featuredRoadmaps}
                  renderItem={renderFeatured}
                  keyExtractor={i => i._id}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 12 }}
                />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No roadmaps match your filters</Text>
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={() => { setSelectedCategory('all'); setSelectedDifficulty('all'); setSearchQuery(''); }}
              >
                <Text style={styles.clearBtnText}>Clear Filters</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  pageTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  pageSubtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  statsRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, gap: 8 },
  statCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, gap: 4 },
  statIconBg: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  statLabel: { fontSize: 9, color: COLORS.textMuted, fontWeight: '600' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, gap: 8 },
  searchInput: { flex: 1, height: 42, color: COLORS.textPrimary, fontSize: 14 },
  filterScroll: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  activeFilterChip: { backgroundColor: `${COLORS.primary}20`, borderColor: COLORS.primary },
  filterChipText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  activeFilterChipText: { color: COLORS.primary },
  diffRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  diffChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  activeDiffChip: { backgroundColor: `${COLORS.primary}15`, borderColor: COLORS.primary },
  diffChipText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  activeDiffChipText: { color: COLORS.primary },
  featuredSection: { marginBottom: 16 },
  featuredSectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 10 },
  featuredCard: { width: 200, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  featuredIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  featuredIconText: { fontSize: 20 },
  featuredTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  featuredMeta: { fontSize: 11, color: COLORS.textMuted },
  featuredProgress: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  featuredProgressBg: { flex: 1, height: 4, backgroundColor: `${COLORS.primary}20`, borderRadius: 2, overflow: 'hidden' },
  featuredProgressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 2 },
  featuredProgressText: { fontSize: 10, fontWeight: '700', color: COLORS.primary },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, gap: 12, paddingBottom: 32 },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 },
  cardIcon: { fontSize: 20 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  diffBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.full },
  diffText: { fontSize: 11, fontWeight: '700' },
  cardDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 10 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11, color: COLORS.textMuted },
  categoryChip: { marginLeft: 'auto', backgroundColor: `${COLORS.primary}15`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  categoryText: { fontSize: 10, color: COLORS.primary, fontWeight: '600' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  tag: { backgroundColor: `${COLORS.primary}10`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  tagText: { fontSize: 10, color: COLORS.primary, fontWeight: '600' },
  enrolledSection: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  enrolledHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  enrolledText: { fontSize: 11, color: COLORS.success, fontWeight: '600' },
  progressPctText: { marginLeft: 'auto', fontSize: 12, fontWeight: '800', color: COLORS.primary },
  progressBarBg: { height: 6, backgroundColor: `${COLORS.primary}20`, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  progressBarFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
  progressSubText: { fontSize: 10, color: COLORS.textMuted },
  emptyContainer: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center' },
  clearBtn: { backgroundColor: `${COLORS.primary}20`, paddingHorizontal: 16, paddingVertical: 8, borderRadius: RADIUS.lg },
  clearBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
});
