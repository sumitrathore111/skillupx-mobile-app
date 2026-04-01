import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { getUserProfile, updateUserProfile } from '@services/userService';
import { useAuthStore } from '@store/authStore';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert,
    KeyboardAvoidingView, Platform,
    ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const EMOJI_LIST = ['😀','😎','🤓','🧑‍💻','👨‍💻','👩‍💻','🦊','🐱','🐶','🐼','🦁','🐸','🐵','🦄','🐲','🔥','⚡','🚀','💎','🎯','🏆','⭐','🌟','💡','🎨','🎮','🎵','🌈','💜','💙','💚','💛','🧡','❤️','🖤','🤍','💀','👻','🤖','👾'];

export default function ProfileScreen() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', institute: '', github: '',
    yearOfStudy: '', location: '', bio: '', avatar: '',
    skills: [] as string[], skillInput: '',
  });

  const load = useCallback(async () => {
    try {
      const data = await getUserProfile(user?.id || '');
      setProfile(data);
      setForm({
        name: data.name || '', email: data.email || '', phone: data.phone || '',
        institute: data.institute || '', github: (data as any).github || '',
        yearOfStudy: String(data.yearOfStudy || ''), location: data.location || '',
        bio: data.bio || '', avatar: (data as any).avatar || '',
        skills: data.skills || [], skillInput: '',
      });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { skillInput, ...rest } = form;
      await updateUserProfile(user?.id || '', rest as any);
      setEditing(false);
      load();
      Alert.alert('Success', 'Profile updated!');
    } catch (e: any) { Alert.alert('Error', e.message || 'Failed to update'); }
    finally { setSaving(false); }
  };

  const addSkill = () => {
    if (form.skillInput.trim() && !form.skills.includes(form.skillInput.trim())) {
      setForm(p => ({ ...p, skills: [...p.skills, p.skillInput.trim()], skillInput: '' }));
    }
  };

  const removeSkill = (s: string) => setForm(p => ({ ...p, skills: p.skills.filter(x => x !== s) }));

  if (loading) return <SafeAreaView style={styles.container}><View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={editing ? handleSave : () => setEditing(true)} disabled={saving}>
          <Text style={styles.editBtn}>{saving ? 'Saving...' : editing ? 'Save' : 'Edit'}</Text>
        </TouchableOpacity>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarEmoji}>{form.avatar || '🧑‍💻'}</Text>
            </View>
            {editing && (
              <TouchableOpacity onPress={() => setShowEmoji(!showEmoji)} style={styles.changeAvatarBtn}>
                <Text style={styles.changeAvatarText}>Change Avatar</Text>
              </TouchableOpacity>
            )}
          </View>
          {showEmoji && editing && (
            <View style={styles.emojiGrid}>
              {EMOJI_LIST.map(e => (
                <TouchableOpacity key={e} onPress={() => { setForm(p => ({ ...p, avatar: e })); setShowEmoji(false); }}
                  style={[styles.emojiBtn, form.avatar === e && styles.emojiBtnActive]}>
                  <Text style={{ fontSize: 24 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Fields */}
          {[
            { label: 'Name', key: 'name', icon: 'person' as const },
            { label: 'Email', key: 'email', icon: 'mail' as const },
            { label: 'Phone', key: 'phone', icon: 'call' as const },
            { label: 'Institute', key: 'institute', icon: 'school' as const },
            { label: 'GitHub', key: 'github', icon: 'logo-github' as const },
            { label: 'Year of Study', key: 'yearOfStudy', icon: 'calendar' as const },
            { label: 'Location', key: 'location', icon: 'location' as const },
          ].map(f => (
            <View key={f.key} style={styles.fieldCard}>
              <View style={styles.fieldHeader}>
                <Ionicons name={f.icon} size={16} color={COLORS.accent} />
                <Text style={styles.fieldLabel}>{f.label}</Text>
              </View>
              {editing ? (
                <TextInput style={styles.fieldInput} value={(form as any)[f.key]}
                  onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                  placeholderTextColor={COLORS.textMuted} placeholder={f.label} />
              ) : (
                <Text style={styles.fieldValue}>{(form as any)[f.key] || 'Not set'}</Text>
              )}
            </View>
          ))}

          {/* Bio */}
          <View style={styles.fieldCard}>
            <View style={styles.fieldHeader}>
              <Ionicons name="document-text" size={16} color={COLORS.accent} />
              <Text style={styles.fieldLabel}>Bio</Text>
            </View>
            {editing ? (
              <TextInput style={[styles.fieldInput, { height: 80, textAlignVertical: 'top' }]}
                value={form.bio} onChangeText={v => setForm(p => ({ ...p, bio: v }))}
                multiline placeholder="Tell us about yourself..." placeholderTextColor={COLORS.textMuted} />
            ) : (
              <Text style={styles.fieldValue}>{form.bio || 'No bio added'}</Text>
            )}
          </View>

          {/* Skills */}
          <View style={styles.fieldCard}>
            <View style={styles.fieldHeader}>
              <Ionicons name="code-slash" size={16} color={COLORS.accent} />
              <Text style={styles.fieldLabel}>Skills</Text>
            </View>
            <View style={styles.tagsWrap}>
              {form.skills.map(s => (
                <View key={s} style={styles.tag}>
                  <Text style={styles.tagText}>{s}</Text>
                  {editing && <TouchableOpacity onPress={() => removeSkill(s)}><Ionicons name="close-circle" size={14} color={COLORS.danger} /></TouchableOpacity>}
                </View>
              ))}
            </View>
            {editing && (
              <View style={styles.addSkillRow}>
                <TextInput style={[styles.fieldInput, { flex: 1 }]} value={form.skillInput}
                  onChangeText={v => setForm(p => ({ ...p, skillInput: v }))}
                  placeholder="Add skill..." placeholderTextColor={COLORS.textMuted}
                  onSubmitEditing={addSkill} returnKeyType="done" />
                <TouchableOpacity onPress={addSkill} style={styles.addSkillBtn}>
                  <Ionicons name="add" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Stats (read-only) */}
          {profile && (
            <View style={styles.statsGrid}>
              {[
                { label: 'Problems', value: profile.challengesSolved || 0, icon: 'code' as const },
                { label: 'Battles', value: profile.battlesWon || 0, icon: 'flash' as const },
                { label: 'Projects', value: profile.projectsCount || 0, icon: 'rocket' as const },
                { label: 'Coins', value: profile.coins || 0, icon: 'wallet' as const },
              ].map(s => (
                <View key={s.label} style={styles.statCard}>
                  <Ionicons name={s.icon} size={20} color={COLORS.primary} />
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  editBtn: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  avatarSection: { alignItems: 'center', gap: 8 },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.surface, borderWidth: 2, borderColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarEmoji: { fontSize: 40 },
  changeAvatarBtn: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: COLORS.surface, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border },
  changeAvatarText: { fontSize: 12, color: COLORS.accent, fontWeight: '600' },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, backgroundColor: COLORS.surface, padding: 12, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border },
  emojiBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  emojiBtnActive: { backgroundColor: COLORS.primary + '30', borderWidth: 1, borderColor: COLORS.primary },
  fieldCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 8 },
  fieldHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase' },
  fieldInput: { backgroundColor: COLORS.background, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 10, color: COLORS.textPrimary, fontSize: 14, borderWidth: 1, borderColor: COLORS.border },
  fieldValue: { fontSize: 14, color: COLORS.textPrimary },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primary + '20', paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full },
  tagText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  addSkillRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  addSkillBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: COLORS.border },
  statValue: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  statLabel: { fontSize: 11, color: COLORS.textMuted },
});
