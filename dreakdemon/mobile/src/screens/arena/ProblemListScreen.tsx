import type { Challenge } from '@apptypes/index';
import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { fetchChallenges } from '@services/arenaService';
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

const DIFFICULTIES = ['all', 'easy', 'medium', 'hard'];
const TOPICS = ['All', 'Arrays', 'Strings', 'Trees', 'Graphs', 'DP', 'Sorting', 'Hashing', 'Recursion', 'Stack', 'Queue'];
const DIFF_COLORS = { easy: COLORS.success, medium: COLORS.warning, hard: COLORS.error };

export default function ProblemListScreen() {
  const navigation = useNavigation<any>();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [difficulty, setDifficulty] = useState('all');
  const [topic, setTopic] = useState('All');

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

  const onRefresh = () => { setRefreshing(true); load(); };

  const renderItem = ({ item }: { item: Challenge }) => {
    const diffColor = DIFF_COLORS[item.difficulty as keyof typeof DIFF_COLORS] || COLORS.textMuted;
    return (
      <TouchableOpacity
        style={styles.challengeCard}
        onPress={() => navigation.navigate('ProblemDetail', { challengeId: item.id })}
        activeOpacity={0.8}
      >
        <View style={styles.cardLeft}>
          <View style={[styles.diffDot, { backgroundColor: diffColor }]} />
          <View style={styles.cardInfo}>
            <Text style={styles.challengeTitle}>{item.title}</Text>
            <View style={styles.cardMeta}>
              <View style={[styles.diffBadge, { backgroundColor: `${diffColor}20` }]}>
                <Text style={[styles.diffText, { color: diffColor }]}>{item.difficulty}</Text>
              </View>
              {item.topic && <Text style={styles.topicText}>{item.topic}</Text>}
              {item.isSolved && (
                <View style={styles.solvedBadge}>
                  <Ionicons name="checkmark-circle" size={12} color={COLORS.success} />
                  <Text style={styles.solvedText}>Solved</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.submissionsText}>{item.submissionCount ?? 0}</Text>
          <Text style={styles.submissionsLabel}>submissions</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Problems</Text>
        <Text style={styles.count}>{challenges.length}</Text>
      </View>

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
          <TouchableOpacity
            key={t}
            style={[styles.topicChip, topic === t && styles.activeTopicChip]}
            onPress={() => setTopic(t)}
          >
            <Text style={[styles.topicChipText, topic === t && styles.activeTopicChipText]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <FlatList
          data={challenges}
          renderItem={renderItem}
          keyExtractor={i => i.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No problems found</Text>}
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
  searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, gap: 8 },
  searchInput: { flex: 1, height: 42, color: COLORS.textPrimary, fontSize: 14 },
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
  list: { padding: 16, gap: 8, paddingBottom: 32 },
  empty: { textAlign: 'center', color: COLORS.textMuted, marginTop: 40 },
  challengeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  cardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  diffDot: { width: 8, height: 8, borderRadius: 4 },
  cardInfo: { flex: 1 },
  challengeTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 6 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  diffBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: RADIUS.full },
  diffText: { fontSize: 10, fontWeight: '700' },
  topicText: { fontSize: 11, color: COLORS.textMuted },
  solvedBadge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  solvedText: { fontSize: 11, color: COLORS.success, fontWeight: '600' },
  cardRight: { alignItems: 'center' },
  submissionsText: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  submissionsLabel: { fontSize: 9, color: COLORS.textMuted },
});
