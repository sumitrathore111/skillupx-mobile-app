import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { createTechReview } from '@services/connectService';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput, TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const CATEGORIES = ['Technology', 'Framework', 'Library', 'Tool', 'Platform', 'Other'];
const RATINGS = [1, 2, 3, 4, 5];

export default function WriteReviewScreen() {
  const navigation = useNavigation<any>();
  const [title, setTitle] = useState('');
  const [website, setWebsite] = useState('');
  const [category, setCategory] = useState('');
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState('');
  const [pros, setPros] = useState('');
  const [cons, setCons] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!title || !content || !category || rating === 0) {
      Alert.alert('Missing Fields', 'Please fill in title, content, category, and rating');
      return;
    }
    setLoading(true);
    try {
      await createTechReview({ title, website, category, rating, content, pros, cons });
      Alert.alert('Success', 'Review submitted!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Write a Tech Review</Text>
        <Text style={styles.subtitle}>Share your experience with the developer community</Text>

        {/* Title */}
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. React Native vs Flutter"
          placeholderTextColor={COLORS.textMuted}
          value={title}
          onChangeText={setTitle}
          maxLength={100}
        />

        {/* Website */}
        <Text style={styles.label}>Website / URL</Text>
        <TextInput
          style={styles.input}
          placeholder="https://example.com"
          placeholderTextColor={COLORS.textMuted}
          value={website}
          onChangeText={setWebsite}
          keyboardType="url"
          autoCapitalize="none"
        />

        {/* Category */}
        <Text style={styles.label}>Category *</Text>
        <View style={styles.chipRow}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, category === cat && styles.activeChip]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.chipText, category === cat && styles.activeChipText]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Rating */}
        <Text style={styles.label}>Rating *</Text>
        <View style={styles.ratingRow}>
          {RATINGS.map(r => (
            <TouchableOpacity key={r} onPress={() => setRating(r)} style={styles.starBtn}>
              <Ionicons
                name={rating >= r ? 'star' : 'star-outline'}
                size={30}
                color={rating >= r ? COLORS.warning : COLORS.textMuted}
              />
            </TouchableOpacity>
          ))}
          {rating > 0 && <Text style={styles.ratingLabel}>{['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][rating]}</Text>}
        </View>

        {/* Content */}
        <Text style={styles.label}>Review *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Write your full review here..."
          placeholderTextColor={COLORS.textMuted}
          value={content}
          onChangeText={setContent}
          multiline
          numberOfLines={6}
          maxLength={2000}
        />
        <Text style={styles.charCount}>{content.length}/2000</Text>

        {/* Pros */}
        <Text style={styles.label}>Pros <Text style={styles.optional}>(optional)</Text></Text>
        <TextInput
          style={[styles.input, styles.smallArea]}
          placeholder="What's great about it?"
          placeholderTextColor={COLORS.textMuted}
          value={pros}
          onChangeText={setPros}
          multiline
          numberOfLines={3}
        />

        {/* Cons */}
        <Text style={styles.label}>Cons <Text style={styles.optional}>(optional)</Text></Text>
        <TextInput
          style={[styles.input, styles.smallArea]}
          placeholder="What could be better?"
          placeholderTextColor={COLORS.textMuted}
          value={cons}
          onChangeText={setCons}
          multiline
          numberOfLines={3}
        />

        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.disabledBtn]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.submitBtnText}>Submit Review</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 20, paddingBottom: 48 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 13, color: COLORS.textMuted, marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8, marginTop: 16 },
  optional: { fontWeight: '400', color: COLORS.textMuted },
  input: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 12, color: COLORS.textPrimary, fontSize: 14, borderWidth: 1, borderColor: COLORS.border },
  textArea: { height: 130, textAlignVertical: 'top' },
  smallArea: { height: 80, textAlignVertical: 'top' },
  charCount: { fontSize: 11, color: COLORS.textMuted, textAlign: 'right', marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  activeChip: { backgroundColor: `${COLORS.primary}20`, borderColor: COLORS.primary },
  chipText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  activeChipText: { color: COLORS.primary },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  starBtn: { padding: 4 },
  ratingLabel: { fontSize: 13, color: COLORS.warning, fontWeight: '600', marginLeft: 8 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: 15, marginTop: 28 },
  disabledBtn: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
