import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { submitIdea, updateIdea } from '@services/creatorService';
import { useEffect, useState } from 'react';
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

const AVAILABLE_TAGS = ['Web', 'Mobile', 'AI/ML', 'Blockchain', 'Gaming', 'DevTools', 'Social', 'productivity', 'Open Source', 'SaaS', 'API', 'Education'];

export default function SubmitIdeaScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const editIdea = route.params?.editIdea;
  const isEditMode = !!editIdea;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editIdea) {
      setTitle(editIdea.title || '');
      setDescription(editIdea.description || '');
      setTags(editIdea.tags || []);
    }
  }, [editIdea]);

  function toggleTag(tag: string) {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  }

  async function handleSubmit() {
    if (!title.trim()) { Alert.alert('Required', 'Please enter a title'); return; }
    if (!description.trim()) { Alert.alert('Required', 'Please describe your idea'); return; }
    setLoading(true);
    try {
      if (isEditMode) {
        await updateIdea(editIdea._id || editIdea.id, { title: title.trim(), description: description.trim(), tags });
        Alert.alert('Idea Updated!', 'Your idea has been updated successfully.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        await submitIdea({ title: title.trim(), description: description.trim(), tags });
        Alert.alert('Idea Posted!', '💡 Your idea is now live for the community to see.', [
          { text: 'Great!', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to submit idea');
    } finally { setLoading(false); }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.headerIcon}>
          <Text style={styles.emoji}>💡</Text>
        </View>
        <Text style={styles.title}>{isEditMode ? 'Edit Your Idea' : 'Share Your Idea'}</Text>
        <Text style={styles.subtitle}>{isEditMode ? 'Update your idea details' : 'Inspire other developers with your concept'}</Text>

        <Text style={styles.label}>Idea Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="Give your idea a catchy name"
          placeholderTextColor={COLORS.textMuted}
          value={title}
          onChangeText={setTitle}
          maxLength={100}
        />

        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe what your app or tool would do, who it's for, and why it's useful..."
          placeholderTextColor={COLORS.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={8}
          maxLength={2000}
        />
        <Text style={styles.charCount}>{description.length}/2000</Text>

        <Text style={styles.label}>Tags <Text style={styles.optional}>(select up to 4)</Text></Text>
        <View style={styles.tagsGrid}>
          {AVAILABLE_TAGS.map(tag => (
            <TouchableOpacity
              key={tag}
              style={[styles.tag, tags.includes(tag) && styles.activeTag, tags.length >= 4 && !tags.includes(tag) && styles.disabledTag]}
              onPress={() => (tags.length < 4 || tags.includes(tag)) && toggleTag(tag)}
              disabled={tags.length >= 4 && !tags.includes(tag)}
            >
              <Text style={[styles.tagText, tags.includes(tag) && styles.activeTagText]}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.disabledBtn]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name={isEditMode ? 'checkmark-circle' : 'sparkles'} size={18} color="#fff" />
              <Text style={styles.submitText}>{isEditMode ? 'Update Idea' : 'Post Idea'}</Text>
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
  headerIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: `${COLORS.warning}20`, justifyContent: 'center', alignItems: 'center', marginBottom: 12, alignSelf: 'center' },
  emoji: { fontSize: 30 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8, marginTop: 16 },
  optional: { fontWeight: '400', color: COLORS.textMuted },
  input: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 12, color: COLORS.textPrimary, fontSize: 14, borderWidth: 1, borderColor: COLORS.border },
  textArea: { height: 160, textAlignVertical: 'top' },
  charCount: { fontSize: 11, color: COLORS.textMuted, textAlign: 'right', marginTop: 4 },
  tagsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  activeTag: { backgroundColor: `${COLORS.primary}20`, borderColor: COLORS.primary },
  disabledTag: { opacity: 0.35 },
  tagText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  activeTagText: { color: COLORS.primary },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: 15, marginTop: 28 },
  disabledBtn: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
