import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { fetchProjectById, sendJoinRequest } from '@services/creatorService';
import type { Project } from '@apptypes/index';
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

type RouteParams = { projectId: string };

export default function ProjectDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { projectId } = route.params as RouteParams;
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');

  useEffect(() => { loadProject(); }, []);

  async function loadProject() {
    try {
      const data = await fetchProjectById(projectId);
      setProject(data);
      navigation.setOptions({ title: data.title });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleJoin() {
    if (!selectedRole) { Alert.alert('Select Role', 'Please select the role you are applying for'); return; }
    setJoining(true);
    try {
      await sendJoinRequest(projectId, selectedRole, `I'm interested in contributing as ${selectedRole}`);
      Alert.alert('Sent!', 'Your join request has been sent to the project owner.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to send request');
    } finally { setJoining(false); }
  }

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  if (!project) return <View style={styles.loading}><Text style={styles.error}>Project not found</Text></View>;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Title section */}
        <View style={styles.titleSection}>
          <View style={styles.projectIcon}><Ionicons name="cube" size={28} color={COLORS.primary} /></View>
          <Text style={styles.title}>{project.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: project.status === 'active' ? `${COLORS.success}20` : `${COLORS.textMuted}20` }]}>
            <Text style={[styles.statusText, { color: project.status === 'active' ? COLORS.success : COLORS.textMuted }]}>{project.status}</Text>
          </View>
          <View style={styles.ownerRow}>
            <View style={styles.ownerAvatar}><Text style={styles.ownerAvatarText}>{project.ownerName?.[0]?.toUpperCase()}</Text></View>
            <Text style={styles.ownerName}>{project.ownerName}</Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.description}>{project.description}</Text>
        </View>

        {/* Tech Stack */}
        {project.techStack?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tech Stack</Text>
            <View style={styles.tagGrid}>
              {project.techStack.map(tech => (
                <View key={tech} style={styles.techTag}><Text style={styles.techTagText}>{tech}</Text></View>
              ))}
            </View>
          </View>
        )}

        {/* Roles Needed */}
        {project.rolesNeeded?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Roles Needed</Text>
            <View style={styles.tagGrid}>
              {project.rolesNeeded.map(role => (
                <TouchableOpacity
                  key={role}
                  style={[styles.roleTag, selectedRole === role && styles.selectedRoleTag]}
                  onPress={() => setSelectedRole(role)}
                >
                  <Text style={[styles.roleTagText, selectedRole === role && styles.selectedRoleTagText]}>{role}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {project.rolesNeeded.length > 0 && <Text style={styles.roleHint}>Tap a role to select it for your application</Text>}
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{project.memberCount ?? 0}</Text>
            <Text style={styles.statLabel}>Members</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{project.rolesNeeded?.length ?? 0}</Text>
            <Text style={styles.statLabel}>Open Roles</Text>
          </View>
        </View>

        {/* Join Button */}
        {project.status === 'active' && (
          <TouchableOpacity
            style={[styles.joinBtn, !selectedRole && styles.joinBtnDisabled, joining && styles.joinBtnDisabled]}
            onPress={handleJoin}
            disabled={!selectedRole || joining}
          >
            {joining ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="rocket-outline" size={20} color="#fff" />
                <Text style={styles.joinBtnText}>{selectedRole ? `Apply as ${selectedRole}` : 'Select a Role to Apply'}</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  error: { color: COLORS.textMuted, fontSize: 15 },
  scroll: { paddingBottom: 48 },
  titleSection: { alignItems: 'center', padding: 24, gap: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  projectIcon: { width: 64, height: 64, borderRadius: 16, backgroundColor: `${COLORS.primary}20`, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: RADIUS.full },
  statusText: { fontSize: 12, fontWeight: '700' },
  ownerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ownerAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  ownerAvatarText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  ownerName: { fontSize: 13, color: COLORS.textMuted },
  section: { padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 10 },
  description: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },
  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  techTag: { backgroundColor: `${COLORS.primary}15`, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full },
  techTagText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  roleTag: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.md, backgroundColor: COLORS.surface, borderWidth: 2, borderColor: COLORS.border },
  selectedRoleTag: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}15` },
  roleTagText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  selectedRoleTagText: { color: COLORS.primary },
  roleHint: { fontSize: 11, color: COLORS.textMuted, marginTop: 8 },
  statsRow: { flexDirection: 'row', padding: 16, gap: 12 },
  statCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  statValue: { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  statLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  joinBtn: { marginHorizontal: 20, marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: 15 },
  joinBtnDisabled: { opacity: 0.5 },
  joinBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
