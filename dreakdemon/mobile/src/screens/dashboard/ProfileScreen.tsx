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
    education: [] as { degree: string; school: string; year: string }[],
    experience: [] as { title: string; company: string; year: string; desc: string }[],
    achievements: [] as string[],
    links: [] as { platform: string; url: string }[],
  });
  const [newEdu, setNewEdu] = useState({ degree: '', school: '', year: '' });
  const [newExp, setNewExp] = useState({ title: '', company: '', year: '', desc: '' });
  const [newAch, setNewAch] = useState('');
  const [newLink, setNewLink] = useState({ platform: '', url: '' });

  const load = useCallback(async () => {
    try {
      const data = await getUserProfile(user?.id || '');
      setProfile(data);
      setForm({
        name: data.name || '', email: data.email || '', phone: data.phone || '',
        institute: data.institute || '', github: (data as any).github || (data as any).githubUsername || '',
        yearOfStudy: String(data.yearOfStudy || ''), location: data.location || '',
        bio: data.bio || '', avatar: (data as any).avatar || '',
        skills: data.skills || [], skillInput: '',
        education: data.education || [],
        experience: data.experience || [],
        achievements: data.achievements || [],
        links: data.links || [],
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

  const addEducation = () => {
    if (newEdu.degree && newEdu.school && newEdu.year) {
      setForm(p => ({ ...p, education: [...p.education, { ...newEdu }] }));
      setNewEdu({ degree: '', school: '', year: '' });
    }
  };
  const removeEducation = (i: number) => setForm(p => ({ ...p, education: p.education.filter((_, idx) => idx !== i) }));

  const addExperience = () => {
    if (newExp.title && newExp.company) {
      setForm(p => ({ ...p, experience: [...p.experience, { ...newExp }] }));
      setNewExp({ title: '', company: '', year: '', desc: '' });
    }
  };
  const removeExperience = (i: number) => setForm(p => ({ ...p, experience: p.experience.filter((_, idx) => idx !== i) }));

  const addAchievement = () => {
    if (newAch.trim()) {
      setForm(p => ({ ...p, achievements: [...p.achievements, newAch.trim()] }));
      setNewAch('');
    }
  };
  const removeAchievement = (i: number) => setForm(p => ({ ...p, achievements: p.achievements.filter((_, idx) => idx !== i) }));

  const addLink = () => {
    if (newLink.platform && newLink.url) {
      setForm(p => ({ ...p, links: [...p.links, { ...newLink }] }));
      setNewLink({ platform: '', url: '' });
    }
  };
  const removeLink = (i: number) => setForm(p => ({ ...p, links: p.links.filter((_, idx) => idx !== i) }));

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
                <TouchableOpacity onPress={addSkill} style={styles.addBtn}>
                  <Ionicons name="add" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Education */}
          <View style={styles.fieldCard}>
            <View style={styles.fieldHeader}>
              <Ionicons name="school" size={16} color="#6366f1" />
              <Text style={styles.fieldLabel}>Education</Text>
            </View>
            {form.education.map((edu, i) => (
              <View key={i} style={styles.listItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listTitle}>{edu.degree}</Text>
                  <Text style={styles.listSub}>{edu.school} · {edu.year}</Text>
                </View>
                {editing && (
                  <TouchableOpacity onPress={() => removeEducation(i)}>
                    <Ionicons name="close-circle" size={20} color={COLORS.danger} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {form.education.length === 0 && !editing && (
              <Text style={styles.emptyText}>No education added</Text>
            )}
            {editing && (
              <View style={styles.addForm}>
                <TextInput style={styles.fieldInput} value={newEdu.degree}
                  onChangeText={v => setNewEdu(p => ({ ...p, degree: v }))}
                  placeholder="Degree" placeholderTextColor={COLORS.textMuted} />
                <TextInput style={styles.fieldInput} value={newEdu.school}
                  onChangeText={v => setNewEdu(p => ({ ...p, school: v }))}
                  placeholder="School" placeholderTextColor={COLORS.textMuted} />
                <View style={styles.addFormRow}>
                  <TextInput style={[styles.fieldInput, { flex: 1 }]} value={newEdu.year}
                    onChangeText={v => setNewEdu(p => ({ ...p, year: v }))}
                    placeholder="Year" placeholderTextColor={COLORS.textMuted} />
                  <TouchableOpacity onPress={addEducation} style={styles.addBtn}>
                    <Ionicons name="add" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Experience */}
          <View style={styles.fieldCard}>
            <View style={styles.fieldHeader}>
              <Ionicons name="briefcase" size={16} color="#eab308" />
              <Text style={styles.fieldLabel}>Experience / Projects</Text>
            </View>
            {form.experience.map((exp, i) => (
              <View key={i} style={styles.listItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listTitle}>{exp.title}</Text>
                  <Text style={styles.listSub}>{exp.company}{exp.year ? ` · ${exp.year}` : ''}</Text>
                  {!!exp.desc && <Text style={styles.listDesc}>{exp.desc}</Text>}
                </View>
                {editing && (
                  <TouchableOpacity onPress={() => removeExperience(i)}>
                    <Ionicons name="close-circle" size={20} color={COLORS.danger} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {form.experience.length === 0 && !editing && (
              <Text style={styles.emptyText}>No experience added</Text>
            )}
            {editing && (
              <View style={styles.addForm}>
                <TextInput style={styles.fieldInput} value={newExp.title}
                  onChangeText={v => setNewExp(p => ({ ...p, title: v }))}
                  placeholder="Title" placeholderTextColor={COLORS.textMuted} />
                <TextInput style={styles.fieldInput} value={newExp.company}
                  onChangeText={v => setNewExp(p => ({ ...p, company: v }))}
                  placeholder="Company" placeholderTextColor={COLORS.textMuted} />
                <TextInput style={styles.fieldInput} value={newExp.year}
                  onChangeText={v => setNewExp(p => ({ ...p, year: v }))}
                  placeholder="Year" placeholderTextColor={COLORS.textMuted} />
                <View style={styles.addFormRow}>
                  <TextInput style={[styles.fieldInput, { flex: 1 }]} value={newExp.desc}
                    onChangeText={v => setNewExp(p => ({ ...p, desc: v }))}
                    placeholder="Description" placeholderTextColor={COLORS.textMuted} />
                  <TouchableOpacity onPress={addExperience} style={styles.addBtn}>
                    <Ionicons name="add" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Achievements */}
          <View style={styles.fieldCard}>
            <View style={styles.fieldHeader}>
              <Ionicons name="trophy" size={16} color="#22c55e" />
              <Text style={styles.fieldLabel}>Achievements</Text>
            </View>
            <View style={styles.tagsWrap}>
              {form.achievements.map((ach, i) => (
                <View key={i} style={[styles.tag, { backgroundColor: '#22c55e20' }]}>
                  <Text style={[styles.tagText, { color: '#22c55e' }]}>{ach}</Text>
                  {editing && (
                    <TouchableOpacity onPress={() => removeAchievement(i)}>
                      <Ionicons name="close-circle" size={14} color={COLORS.danger} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
            {form.achievements.length === 0 && !editing && (
              <Text style={styles.emptyText}>No achievements added</Text>
            )}
            {editing && (
              <View style={styles.addSkillRow}>
                <TextInput style={[styles.fieldInput, { flex: 1 }]} value={newAch}
                  onChangeText={setNewAch}
                  placeholder="New achievement..." placeholderTextColor={COLORS.textMuted}
                  onSubmitEditing={addAchievement} returnKeyType="done" />
                <TouchableOpacity onPress={addAchievement} style={styles.addBtn}>
                  <Ionicons name="add" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Links */}
          <View style={styles.fieldCard}>
            <View style={styles.fieldHeader}>
              <Ionicons name="globe" size={16} color="#3b82f6" />
              <Text style={styles.fieldLabel}>Links</Text>
            </View>
            {form.links.map((link, i) => (
              <View key={i} style={styles.listItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listTitle}>{link.platform}</Text>
                  <Text style={[styles.listSub, { color: '#3b82f6' }]} numberOfLines={1}>{link.url}</Text>
                </View>
                {editing && (
                  <TouchableOpacity onPress={() => removeLink(i)}>
                    <Ionicons name="close-circle" size={20} color={COLORS.danger} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {form.links.length === 0 && !editing && (
              <Text style={styles.emptyText}>No links added</Text>
            )}
            {editing && (
              <View style={styles.addForm}>
                <TextInput style={styles.fieldInput} value={newLink.platform}
                  onChangeText={v => setNewLink(p => ({ ...p, platform: v }))}
                  placeholder="Platform (e.g. LinkedIn)" placeholderTextColor={COLORS.textMuted} />
                <View style={styles.addFormRow}>
                  <TextInput style={[styles.fieldInput, { flex: 1 }]} value={newLink.url}
                    onChangeText={v => setNewLink(p => ({ ...p, url: v }))}
                    placeholder="URL" placeholderTextColor={COLORS.textMuted} />
                  <TouchableOpacity onPress={addLink} style={styles.addBtn}>
                    <Ionicons name="add" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
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
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  listTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  listSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  listDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4, lineHeight: 18 },
  emptyText: { fontSize: 13, color: COLORS.textMuted, fontStyle: 'italic' },
  addForm: { gap: 8, marginTop: 8 },
  addFormRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: COLORS.border },
  statValue: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  statLabel: { fontSize: 11, color: COLORS.textMuted },
});
