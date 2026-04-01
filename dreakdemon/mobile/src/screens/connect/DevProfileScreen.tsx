import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { fetchDeveloperById, fetchOrCreateChat } from '@services/connectService';
import type { DeveloperProfile } from '@apptypes/index';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type RouteParams = { developerId: string };

const SKILL_COLORS = [COLORS.primary, COLORS.accent, COLORS.success, COLORS.warning, '#FF6B6B', '#A855F7'];

export default function DevProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { developerId } = route.params as RouteParams;
  const [developer, setDeveloper] = useState<DeveloperProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    try {
      const dev = await fetchDeveloperById(developerId);
      setDeveloper(dev);
      navigation.setOptions({ title: dev.name });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleMessage() {
    if (!developer) return;
    setChatLoading(true);
    try {
      await fetchOrCreateChat(developer.id);
      navigation.navigate('Chat', { participantId: developer.id, participantName: developer.name });
    } catch (e) {
      Alert.alert('Error', 'Could not start chat');
    } finally { setChatLoading(false); }
  }

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  if (!developer) return <View style={styles.loading}><Text style={styles.error}>Developer not found</Text></View>;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{developer.name?.[0]?.toUpperCase()}</Text>
            {developer.isOnline && <View style={styles.onlineDot} />}
          </View>
          <Text style={styles.name}>{developer.name}</Text>
          <Text style={styles.username}>@{developer.username}</Text>
          {developer.rating && (
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={13} color={COLORS.warning} />
              <Text style={styles.ratingText}>{developer.rating.toFixed(1)}</Text>
            </View>
          )}
          {developer.bio && <Text style={styles.bio}>{developer.bio}</Text>}
          {/* Action buttons */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleMessage} disabled={chatLoading}>
              {chatLoading
                ? <ActivityIndicator size={16} color="#fff" />
                : <><Ionicons name="chatbubble" size={17} color="#fff" /><Text style={styles.primaryBtnText}>Message</Text></>}
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          {[
            { label: 'Problems', value: developer.stats?.problemsSolved ?? 0, icon: 'code-slash-outline' },
            { label: 'Battles Won', value: developer.stats?.battlesWon ?? 0, icon: 'flash-outline' },
            { label: 'Roadmaps', value: developer.stats?.roadmapsCompleted ?? 0, icon: 'map-outline' },
            { label: 'Streak', value: `${developer.stats?.currentStreak ?? 0}d`, icon: 'flame-outline' },
          ].map(stat => (
            <View key={stat.label} style={styles.statCard}>
              <Ionicons name={stat.icon as any} size={20} color={COLORS.primary} />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Skills */}
        {developer.skills?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skills</Text>
            <View style={styles.skillsGrid}>
              {developer.skills.map((skill, i) => (
                <View key={skill} style={[styles.skillChip, { backgroundColor: `${SKILL_COLORS[i % SKILL_COLORS.length]}20`, borderColor: `${SKILL_COLORS[i % SKILL_COLORS.length]}40` }]}>
                  <Text style={[styles.skillText, { color: SKILL_COLORS[i % SKILL_COLORS.length] }]}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Interests */}
        {developer.interests?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Interests</Text>
            <View style={styles.skillsGrid}>
              {developer.interests.map(int => (
                <View key={int} style={styles.interestChip}>
                  <Text style={styles.interestText}>{int}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Links */}
        {(developer.github || developer.linkedin || developer.portfolio) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Links</Text>
            {developer.github && (
              <View style={styles.linkRow}>
                <Ionicons name="logo-github" size={18} color={COLORS.textMuted} />
                <Text style={styles.linkText}>{developer.github}</Text>
              </View>
            )}
            {developer.linkedin && (
              <View style={styles.linkRow}>
                <Ionicons name="logo-linkedin" size={18} color={COLORS.textMuted} />
                <Text style={styles.linkText}>{developer.linkedin}</Text>
              </View>
            )}
            {developer.portfolio && (
              <View style={styles.linkRow}>
                <Ionicons name="globe-outline" size={18} color={COLORS.textMuted} />
                <Text style={styles.linkText}>{developer.portfolio}</Text>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loading: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  error: { color: COLORS.textMuted, fontSize: 15 },
  header: { alignItems: 'center', padding: 24, paddingBottom: 16 },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 14, position: 'relative' },
  avatarText: { fontSize: 34, fontWeight: '800', color: '#fff' },
  onlineDot: { position: 'absolute', bottom: 3, right: 3, width: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.success, borderWidth: 2.5, borderColor: COLORS.background },
  name: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center' },
  username: { fontSize: 14, color: COLORS.textMuted, marginBottom: 6 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${COLORS.warning}20`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full, marginBottom: 10 },
  ratingText: { fontSize: 13, fontWeight: '700', color: COLORS.warning },
  bio: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, maxWidth: 280, marginBottom: 16 },
  actions: { flexDirection: 'row', gap: 12 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: RADIUS.lg },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  statsGrid: { flexDirection: 'row', marginHorizontal: 16, marginTop: 8, gap: 8 },
  statCard: { flex: 1, alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, paddingVertical: 14, borderWidth: 1, borderColor: COLORS.border, gap: 4 },
  statValue: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  statLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  section: { marginHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 10 },
  skillsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 1 },
  skillText: { fontSize: 12, fontWeight: '600' },
  interestChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: `${COLORS.accent}15`, borderWidth: 1, borderColor: `${COLORS.accent}30` },
  interestText: { fontSize: 12, color: COLORS.accent, fontWeight: '600' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  linkText: { fontSize: 13, color: COLORS.textSecondary },
});
