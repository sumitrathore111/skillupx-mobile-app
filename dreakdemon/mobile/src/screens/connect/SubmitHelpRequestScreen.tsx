import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { createHelpRequest } from '@services/connectService';
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

const TAGS = ['React', 'Node.js', 'TypeScript', 'Python', 'MongoDB', 'CSS', 'Git', 'Docker', 'AWS', 'Other'];

export default function SubmitHelpRequestScreen() {
  const navigation = useNavigation<any>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  function toggleTag(tag: string) {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  }

  async function handleSubmit() {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Missing Fields', 'Please fill in title and description');
      return;
    }
    setLoading(true);
    try {
      await createHelpRequest({ title: title.trim(), description: description.trim(), tags: selectedTags });
      Alert.alert('Posted!', 'Your help request has been posted to the community.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to submit');
    } finally { setLoading(false); }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.headerIcon}>
          <Ionicons name="help-buoy" size={32} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>Ask for Help</Text>
        <Text style={styles.subtitle}>Post your question to the developer community</Text>

        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="What do you need help with?"
          placeholderTextColor={COLORS.textMuted}
          value={title}
          onChangeText={setTitle}
          maxLength={150}
        />

        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe your problem in detail. Include what you've tried..."
          placeholderTextColor={COLORS.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={7}
          maxLength={3000}
        />
        <Text style={styles.charCount}>{description.length}/3000</Text>

        <Text style={styles.label}>Tags <Text style={styles.optional}>(optional)</Text></Text>
        <View style={styles.tagsGrid}>
          {TAGS.map(tag => (
            <TouchableOpacity
              key={tag}
              style={[styles.tag, selectedTags.includes(tag) && styles.activeTag]}
              onPress={() => toggleTag(tag)}
            >
              <Text style={[styles.tagText, selectedTags.includes(tag) && styles.activeTagText]}>{tag}</Text>
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
              <Ionicons name="paper-plane-outline" size={18} color="#fff" />
              <Text style={styles.submitText}>Post Help Request</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 20, paddingBottom: 48, alignItems: 'stretch' },
  headerIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: `${COLORS.primary}20`, justifyContent: 'center', alignItems: 'center', marginBottom: 12, alignSelf: 'center' },
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
  tagText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  activeTagText: { color: COLORS.primary },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: 15, marginTop: 28 },
  disabledBtn: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
