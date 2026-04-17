import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { fetchMyJoinRequests, fetchMyProjects } from '@services/creatorService';
import type { Project } from '@apptypes/index';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Tab = 'projects' | 'requests';

export default function MyProjectsScreen() {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<Tab>('projects');
  const [projects, setProjects] = useState<Project[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { load(); }, [activeTab]);

  async function load() {
    setLoading(true);
    try {
      if (activeTab === 'projects') {
        const data = await fetchMyProjects();
        setProjects(data);
      } else {
        const data = await fetchMyJoinRequests();
        setRequests(data);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }

  const onRefresh = () => { setRefreshing(true); load(); };

  const renderProject = ({ item }: { item: Project }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ProjectDetail', { projectId: item.id })}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <View style={[styles.badge, { backgroundColor: item.status === 'active' ? `${COLORS.success}20` : `${COLORS.textMuted}15` }]}>
          <Text style={[styles.badgeText, { color: item.status === 'active' ? COLORS.success : COLORS.textMuted }]}>{item.status}</Text>
        </View>
      </View>
      <Text numberOfLines={2} style={styles.cardDesc}>{item.description}</Text>
      <View style={styles.cardFooter}>
        <View style={styles.memberRow}>
          <Ionicons name="people-outline" size={14} color={COLORS.textMuted} />
          <Text style={styles.memberText}>{item.memberCount ?? 0} members</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
      </View>
    </TouchableOpacity>
  );

  const renderRequest = ({ item }: { item: any }) => {
    const statusColor = { pending: COLORS.warning, accepted: COLORS.success, rejected: COLORS.error }[item.status as string] || COLORS.textMuted;
    return (
      <View style={[styles.card, { borderLeftWidth: 3, borderLeftColor: statusColor }]}>
        <Text style={styles.cardTitle}>{item.projectTitle || 'Project'}</Text>
        <Text style={styles.requestRole}>Role: {item.role}</Text>
        <View style={[styles.badge, { backgroundColor: `${statusColor}20` }]}>
          <Text style={[styles.badgeText, { color: statusColor }]}>{item.status}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>My Projects</Text>
      </View>
      <View style={styles.tabRow}>
        {(['projects', 'requests'] as Tab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab === 'projects' ? '🚀 My Projects' : '📬 Join Requests'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {loading ? (
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <FlatList
          data={(activeTab === 'projects' ? projects : requests) as any[]}
          renderItem={activeTab === 'projects' ? renderProject : renderRequest}
          keyExtractor={i => i.id || i._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>{activeTab === 'projects' ? "You haven't joined any projects yet" : 'No join requests yet'}</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  tabRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 3, borderWidth: 1, borderColor: COLORS.border },
  tab: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: RADIUS.md },
  activeTab: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted },
  activeTabText: { color: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, gap: 12, paddingBottom: 32 },
  empty: { textAlign: 'center', color: COLORS.textMuted, marginTop: 40 },
  card: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cardDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  memberText: { fontSize: 12, color: COLORS.textMuted },
  requestRole: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 8 },
});
