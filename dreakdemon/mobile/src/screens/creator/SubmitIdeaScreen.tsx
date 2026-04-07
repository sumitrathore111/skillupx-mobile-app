import { COLORS, RADIUS, SHADOWS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { submitIdea, updateIdea } from '@services/creatorService';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const GLASS = 'rgba(255,255,255,0.05)';
const GLASS_BORDER = 'rgba(255,255,255,0.08)';
const PRIMARY = COLORS.primary;

const AVAILABLE_TAGS = ['Web', 'Mobile', 'AI/ML', 'Blockchain', 'Gaming', 'DevTools', 'Social', 'Productivity', 'Open Source', 'SaaS', 'API', 'Education'];

const CATEGORIES: { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { label: 'Web Development', icon: 'globe-outline', color: '#3B82F6' },
  { label: 'Mobile App', icon: 'phone-portrait-outline', color: '#8B5CF6' },
  { label: 'AI/ML', icon: 'hardware-chip-outline', color: '#EC4899' },
  { label: 'Data Science', icon: 'bar-chart-outline', color: '#F59E0B' },
  { label: 'Game Development', icon: 'game-controller-outline', color: '#EF4444' },
  { label: 'IoT', icon: 'wifi-outline', color: '#22C55E' },
  { label: 'Blockchain', icon: 'link-outline', color: '#6366F1' },
  { label: 'Other', icon: 'ellipsis-horizontal-circle-outline', color: '#9CA3AF' },
];

export default function SubmitIdeaScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const editIdea = route.params?.editIdea;
  const isEditMode = !!editIdea;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [category, setCategory] = useState('');
  const [expectedTimeline, setExpectedTimeline] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editIdea) {
      setTitle(editIdea.title || '');
      setDescription(editIdea.description || '');
      setTags(editIdea.tags || []);
      setCategory(editIdea.category || '');
      setExpectedTimeline(editIdea.expectedTimeline || '');
    }
  }, [editIdea]);

  function toggleTag(tag: string) {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  }

  const isValid = title.trim() && description.trim() && category && expectedTimeline.trim();

  async function handleSubmit() {
    if (!title.trim()) { Alert.alert('Required', 'Please enter a title'); return; }
    if (!description.trim()) { Alert.alert('Required', 'Please describe your idea'); return; }
    if (!category) { Alert.alert('Required', 'Please select a category'); return; }
    if (!expectedTimeline.trim()) { Alert.alert('Required', 'Please enter expected timeline'); return; }
    setLoading(true);
    try {
      if (isEditMode) {
        await updateIdea(editIdea._id || editIdea.id, { title: title.trim(), description: description.trim(), tags, category, expectedTimeline: expectedTimeline.trim() });
        Alert.alert('Idea Updated!', 'Your idea has been updated successfully.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        await submitIdea({ title: title.trim(), description: description.trim(), tags, category, expectedTimeline: expectedTimeline.trim() });
        Alert.alert('Idea Posted!', '💡 Your idea is now live for the community to see.', [
          { text: 'Great!', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to submit idea');
    } finally { setLoading(false); }
  }

  return (
    <SafeAreaView style={S.root} edges={['top']}>
      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={S.headerTitle}>{isEditMode ? 'Edit Idea' : 'New Idea'}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={S.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Hero Card */}
        <View style={S.heroCard}>
          <LinearGradient
            colors={[`${PRIMARY}15`, `${COLORS.warning}10`, 'transparent']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={S.heroGradient}
          />
          <View style={S.heroIconWrap}>
            <View style={S.heroIcon}>
              <Text style={{ fontSize: 28 }}>💡</Text>
            </View>
            <View style={S.heroGlow} />
          </View>
          <Text style={S.heroTitle}>{isEditMode ? 'Refine Your Vision' : 'Bring Your Vision to Life'}</Text>
          <Text style={S.heroSubtitle}>{isEditMode ? 'Polish and update your idea details' : 'Share your concept and inspire the developer community'}</Text>
        </View>

        {/* ── Section: Title ── */}
        <View style={S.section}>
          <View style={S.labelRow}>
            <Ionicons name="text" size={14} color={PRIMARY} />
            <Text style={S.label}>Idea Title</Text>
            <Text style={S.required}>*</Text>
          </View>
          <View style={S.inputWrap}>
            <TextInput
              style={S.input}
              placeholder="Give your idea a catchy name..."
              placeholderTextColor={COLORS.textMuted}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
            {title.length > 0 && (
              <View style={S.inputCheck}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
              </View>
            )}
          </View>
        </View>

        {/* ── Section: Description ── */}
        <View style={S.section}>
          <View style={S.labelRow}>
            <Ionicons name="document-text" size={14} color={PRIMARY} />
            <Text style={S.label}>Description</Text>
            <Text style={S.required}>*</Text>
          </View>
          <TextInput
            style={[S.input, S.textArea]}
            placeholder="What would your app or tool do? Who is it for? Why is it useful?"
            placeholderTextColor={COLORS.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={8}
            maxLength={2000}
          />
          <View style={S.charCountRow}>
            <View style={S.charBar}>
              <View style={[S.charBarFill, { width: `${(description.length / 2000) * 100}%` }]} />
            </View>
            <Text style={[S.charCount, description.length > 1800 && { color: COLORS.warning }]}>{description.length}/2000</Text>
          </View>
        </View>

        {/* ── Section: Category ── */}
        <View style={S.section}>
          <View style={S.labelRow}>
            <Ionicons name="apps" size={14} color={PRIMARY} />
            <Text style={S.label}>Category</Text>
            <Text style={S.required}>*</Text>
          </View>
          <View style={S.categoryGrid}>
            {CATEGORIES.map(cat => {
              const active = category === cat.label;
              return (
                <TouchableOpacity
                  key={cat.label}
                  style={[S.categoryChip, active && { borderColor: cat.color, backgroundColor: cat.color + '15' }]}
                  onPress={() => setCategory(cat.label)}
                  activeOpacity={0.7}
                >
                  <View style={[S.categoryIconWrap, { backgroundColor: active ? cat.color + '25' : GLASS }]}>
                    <Ionicons name={cat.icon} size={16} color={active ? cat.color : COLORS.textMuted} />
                  </View>
                  <Text style={[S.categoryText, active && { color: cat.color, fontWeight: '700' }]}>{cat.label}</Text>
                  {active && (
                    <View style={[S.categoryCheck, { backgroundColor: cat.color }]}>
                      <Ionicons name="checkmark" size={10} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Section: Timeline ── */}
        <View style={S.section}>
          <View style={S.labelRow}>
            <Ionicons name="time" size={14} color={PRIMARY} />
            <Text style={S.label}>Expected Timeline</Text>
            <Text style={S.required}>*</Text>
          </View>
          <View style={S.inputWrap}>
            <TextInput
              style={S.input}
              placeholder="e.g., 2-3 months, 6 weeks, 1 year"
              placeholderTextColor={COLORS.textMuted}
              value={expectedTimeline}
              onChangeText={setExpectedTimeline}
              maxLength={100}
            />
            <View style={S.inputIconLeft}>
              <Ionicons name="calendar-outline" size={16} color={COLORS.textMuted} />
            </View>
          </View>
        </View>

        {/* ── Section: Tags ── */}
        <View style={S.section}>
          <View style={S.labelRow}>
            <Ionicons name="pricetags" size={14} color={PRIMARY} />
            <Text style={S.label}>Tags</Text>
            <Text style={S.optional}>(select up to 4)</Text>
          </View>
          <View style={S.tagsGrid}>
            {AVAILABLE_TAGS.map(tag => {
              const active = tags.includes(tag);
              const disabled = tags.length >= 4 && !active;
              return (
                <TouchableOpacity
                  key={tag}
                  style={[S.tag, active && S.tagActive, disabled && S.tagDisabled]}
                  onPress={() => !disabled && toggleTag(tag)}
                  disabled={disabled}
                  activeOpacity={0.7}
                >
                  {active && <Ionicons name="checkmark" size={12} color={PRIMARY} style={{ marginRight: 4 }} />}
                  <Text style={[S.tagText, active && S.tagTextActive]}>{tag}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {tags.length > 0 && (
            <View style={S.tagCounter}>
              <Text style={S.tagCounterText}>{tags.length}/4 selected</Text>
            </View>
          )}
        </View>

        {/* ── Completion Indicator ── */}
        <View style={S.completionBar}>
          {[
            { done: !!title.trim(), label: 'Title' },
            { done: !!description.trim(), label: 'Description' },
            { done: !!category, label: 'Category' },
            { done: !!expectedTimeline.trim(), label: 'Timeline' },
          ].map((step, i) => (
            <View key={step.label} style={S.completionStep}>
              <View style={[S.completionDot, step.done && S.completionDotDone]}>
                {step.done ? <Ionicons name="checkmark" size={10} color="#fff" /> : <Text style={S.completionDotNum}>{i + 1}</Text>}
              </View>
              <Text style={[S.completionLabel, step.done && { color: PRIMARY }]}>{step.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Submit Button ── */}
        <TouchableOpacity
          style={[S.submitBtn, (!isValid || loading) && S.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!isValid || loading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={isValid ? [PRIMARY, COLORS.primaryDark] : [COLORS.border, COLORS.border]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={S.submitGradient}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name={isEditMode ? 'checkmark-circle' : 'rocket'} size={20} color="#fff" />
                <Text style={S.submitText}>{isEditMode ? 'Update Idea' : 'Post Idea'}</Text>
                <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.6)" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: GLASS_BORDER,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: GLASS, justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },

  scroll: { paddingHorizontal: 20 },

  // Hero
  heroCard: {
    alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20, marginTop: 16,
    borderRadius: RADIUS.xl, borderWidth: 1, borderColor: GLASS_BORDER,
    backgroundColor: GLASS, overflow: 'hidden', position: 'relative',
  },
  heroGradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  heroIconWrap: { position: 'relative', marginBottom: 14 },
  heroIcon: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: `${COLORS.warning}15`, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: `${COLORS.warning}30`,
  },
  heroGlow: {
    position: 'absolute', width: 80, height: 80, borderRadius: 40, top: -8, left: -8,
    backgroundColor: `${COLORS.warning}08`,
  },
  heroTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center', marginBottom: 6 },
  heroSubtitle: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 19 },

  // Sections
  section: { marginTop: 24, gap: 10 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  required: { fontSize: 13, fontWeight: '700', color: COLORS.danger },
  optional: { fontSize: 11, fontWeight: '400', color: COLORS.textMuted, marginLeft: 4 },

  // Inputs
  inputWrap: { position: 'relative' },
  input: {
    backgroundColor: GLASS, borderRadius: RADIUS.lg, paddingHorizontal: 16, paddingVertical: 14,
    color: COLORS.textPrimary, fontSize: 14, borderWidth: 1, borderColor: GLASS_BORDER,
    lineHeight: 20,
  },
  textArea: { height: 140, textAlignVertical: 'top', paddingTop: 14 },
  inputCheck: { position: 'absolute', right: 14, top: '50%', marginTop: -8 },
  inputIconLeft: { position: 'absolute', right: 14, top: '50%', marginTop: -8 },

  // Char counter
  charCountRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  charBar: { flex: 1, height: 3, backgroundColor: GLASS_BORDER, borderRadius: 2, overflow: 'hidden' },
  charBarFill: { height: '100%', backgroundColor: PRIMARY, borderRadius: 2 },
  charCount: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },

  // Category grid
  categoryGrid: { gap: 8 },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: RADIUS.lg, backgroundColor: GLASS,
    borderWidth: 1, borderColor: GLASS_BORDER,
  },
  categoryIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  categoryText: { flex: 1, fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
  categoryCheck: {
    width: 18, height: 18, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center',
  },

  // Tags
  tagsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: RADIUS.full, backgroundColor: GLASS,
    borderWidth: 1, borderColor: GLASS_BORDER,
  },
  tagActive: { backgroundColor: `${PRIMARY}15`, borderColor: PRIMARY },
  tagDisabled: { opacity: 0.3 },
  tagText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  tagTextActive: { color: PRIMARY },
  tagCounter: { alignSelf: 'flex-end' },
  tagCounterText: { fontSize: 11, fontWeight: '600', color: PRIMARY },

  // Completion bar
  completionBar: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
    marginTop: 28, paddingVertical: 14, paddingHorizontal: 12,
    backgroundColor: GLASS, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: GLASS_BORDER,
  },
  completionStep: { alignItems: 'center', gap: 4 },
  completionDot: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: GLASS_BORDER, justifyContent: 'center', alignItems: 'center',
  },
  completionDotDone: { backgroundColor: PRIMARY },
  completionDotNum: { fontSize: 10, fontWeight: '800', color: COLORS.textMuted },
  completionLabel: { fontSize: 10, fontWeight: '600', color: COLORS.textMuted },

  // Submit
  submitBtn: { marginTop: 20, borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOWS.md },
  submitBtnDisabled: { opacity: 0.5 },
  submitGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 16,
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
});
