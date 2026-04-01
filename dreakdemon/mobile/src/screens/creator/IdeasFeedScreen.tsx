import type { Idea } from '@/types/index';
import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { fetchIdeas, likeIdea } from '@services/creatorService';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function IdeasFeedScreen() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadIdeas = useCallback(async () => {
    try {
      const data = await fetchIdeas({ search: searchQuery || undefined });
      setIdeas(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    setLoading(true);
    loadIdeas();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => loadIdeas(), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const onRefresh = () => {
    setRefreshing(true);
    loadIdeas();
  };

  async function handleLike(idea: Idea) {
    try {
      await likeIdea(idea.id);
      setIdeas((prev) =>
        prev.map((i) =>
          i.id === idea.id
            ? { ...i, likes: idea.isLiked ? i.likes - 1 : i.likes + 1, isLiked: !idea.isLiked }
            : i
        )
      );
    } catch (e) {
      console.error(e);
    }
  }

  const renderIdea = ({ item }: { item: Idea }) => (
    <View style={styles.ideaCard}>
      <Text style={styles.ideaTitle}>{item.title}</Text>
      <Text numberOfLines={3} style={styles.ideaDesc}>
        {item.description}
      </Text>
      <View style={styles.ideaFooter}>
        <TouchableOpacity style={styles.likeBtn} onPress={() => handleLike(item)}>
          <Ionicons
            name={item.isLiked ? 'heart' : 'heart-outline'}
            size={18}
            color={item.isLiked ? COLORS.danger : COLORS.textMuted}
          />
          <Text style={[styles.likeCount, item.isLiked && { color: COLORS.danger }]}>
            {item.likes}
          </Text>
        </TouchableOpacity>
        <Text style={styles.authorText}>{item.authorId || 'Anonymous'}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Ideas Feed</Text>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search ideas..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={ideas}
          keyExtractor={(item) => item.id}
          renderItem={renderIdea}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="bulb-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No ideas yet</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { fontSize: 24, fontWeight: '700', color: COLORS.textPrimary, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.md, marginHorizontal: 20, paddingHorizontal: 14, marginBottom: 12 },
  searchInput: { flex: 1, color: COLORS.textPrimary, paddingVertical: 12, marginLeft: 8, fontSize: 15 },
  list: { paddingHorizontal: 20, paddingBottom: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyText: { color: COLORS.textMuted, fontSize: 15, marginTop: 12 },
  ideaCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  ideaTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 6 },
  ideaDesc: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 12 },
  ideaFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  likeCount: { fontSize: 13, color: COLORS.textMuted },
  authorText: { fontSize: 12, color: COLORS.textMuted },
});
