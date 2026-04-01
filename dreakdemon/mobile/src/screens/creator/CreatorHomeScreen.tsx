import { COLORS, RADIUS, SHADOWS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
    deleteIdea,
    fetchMyIdeas,
    fetchMyProjectsList,
    fetchProjects,
    fetchUserJoinRequests,
    sendJoinRequest,
} from '@services/creatorService';
import { useAuthStore } from '@store/authStore';
import type { Project } from '@apptypes/index';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type MainTab = 'browse' | 'tasks' | 'myProjects';
type MyProjectsView = 'projects' | 'ideas';
type SortMode = 'trending' | 'popular' | 'recent';

const CATEGORIES = ['All', 'Web Development', 'Mobile App', 'AI/ML', 'Data Science', 'Game Development', 'IoT', 'Blockchain'];
const STATUS_OPTIONS = ['All Status', 'Active', 'Completed'];

export default function CreatorHomeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<MainTab>('browse');

  // Browse state
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userJoinRequests, setUserJoinRequests] = useState<any[]>([]);

  // My Projects state
  const [myProjectsView, setMyProjectsView] = useState<MyProjectsView>('projects');
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [myIdeas, setMyIdeas] = useState<any[]>([]);
  const [myProjectsLoading, setMyProjectsLoading] = useState(true);

  // Join request modal
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [joinSkills, setJoinSkills] = useState('');
  const [joinExperience, setJoinExperience] = useState('');
  const [joinMotivation, setJoinMotivation] = useState('');
  const [joinAvailability, setJoinAvailability] = useState('');
  const [joinSubmitting, setJoinSubmitting] = useState(false);

  // Detail modal
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailProject, setDetailProject] = useState<Project | null>(null);

  const loadBrowseData = useCallback(async () => {
    try {
      const [projectsData, joinReqs] = await Promise.allSettled([
        fetchProjects({
          search: searchQuery || undefined,
          category: categoryFilter !== 'All' ? categoryFilter : undefined,
          status: statusFilter !== 'All Status' ? statusFilter.toLowerCase() : undefined,
          sort: sortMode,
        }),
        user ? fetchUserJoinRequests(user.id) : Promise.resolve([]),
      ]);
      if (projectsData.status === 'fulfilled') setProjects(projectsData.value);
      if (joinReqs.status === 'fulfilled') setUserJoinRequests(joinReqs.value);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [searchQuery, categoryFilter, statusFilter, sortMode, user]);

  const loadMyProjects = useCallback(async () => {
    setMyProjectsLoading(true);
    try {
      if (myProjectsView === 'projects') {
        const data = await fetchMyProjectsList();
        setMyProjects(data);
      } else {
        const data = await fetchMyIdeas();
        setMyIdeas(data);
      }
    } catch (e) { console.error(e); }
    finally { setMyProjectsLoading(false); }
  }, [myProjectsView]);

  useEffect(() => {
    if (activeTab === 'browse') { setLoading(true); loadBrowseData(); }
  }, [categoryFilter, statusFilter, sortMode]);

  useEffect(() => {
    if (activeTab === 'browse') {
      const t = setTimeout(() => { setLoading(true); loadBrowseData(); }, 300);
      return () => clearTimeout(t);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (activeTab === 'browse') { setLoading(true); loadBrowseData(); }
    if (activeTab === 'myProjects') loadMyProjects();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'myProjects') loadMyProjects();
  }, [myProjectsView]);

  const onRefresh = () => {
    setRefreshing(true);
    if (activeTab === 'browse') loadBrowseData();
    else if (activeTab === 'myProjects') loadMyProjects();
  };

  const getJoinStatus = (projectId: string) => {
    const req = userJoinRequests.find((r: any) => r.projectId === projectId);
    return req ? req.status : null;
  };

  const isProjectOwner = (project: Project) => project.creatorId === user?.id;
  const isProjectMember = (project: Project) => getJoinStatus(project.id) === 'approved' || isProjectOwner(project);

  const openJoinModal = (project: Project) => {
    setSelectedProject(project);
    setJoinSkills(''); setJoinExperience(''); setJoinMotivation(''); setJoinAvailability('');
    setJoinModalVisible(true);
  };

  const submitJoinRequest = async () => {
    if (!selectedProject) return;
    if (!joinSkills.trim()) { Alert.alert('Required', 'Please enter your skills'); return; }
    if (!joinMotivation.trim()) { Alert.alert('Required', 'Please explain why you want to join'); return; }
    setJoinSubmitting(true);
    try {
      const message = `Skills: ${joinSkills}\nExperience: ${joinExperience}\nMotivation: ${joinMotivation}\nAvailability: ${joinAvailability}`;
      await sendJoinRequest(selectedProject.id, undefined, message);
      Alert.alert('Application Submitted!', 'Your application has been sent to the project owner.');
      setJoinModalVisible(false);
      loadBrowseData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to submit application');
    } finally { setJoinSubmitting(false); }
  };

  const openDetails = (project: Project) => { setDetailProject(project); setDetailModalVisible(true); };
  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });

  // ============ RENDER PROJECT CARD ============
  const renderProjectCard = ({ item }: { item: Project }) => {
    const joinStatus = getJoinStatus(item.id);
    const owner = isProjectOwner(item);
    const member = isProjectMember(item);
    return (
      <View style={styles.projectCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.isCompleted && '✅ '}{item.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: item.status === 'active' ? `${COLORS.success}20` : `${COLORS.textMuted}20` }]}>
            <Text style={[styles.statusText, { color: item.status === 'active' ? COLORS.success : COLORS.textMuted }]}>
              {item.status === 'active' ? 'Active' : 'Completed'}
            </Text>
          </View>
        </View>
        <Text style={styles.cardOverviewLabel}>Overview</Text>
        <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
        <View style={styles.progressSection}>
          <Text style={styles.progressLabel}>Progress</Text>
          <Text style={[styles.progressValue, { color: COLORS.accent }]}>{item.progress || 0}%</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${Math.min(item.progress || 0, 100)}%` }]} />
        </View>
        {item.tags && item.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {item.tags.slice(0, 3).map(tag => (
              <View key={tag} style={styles.tagChip}><Text style={styles.tagText}>{tag}</Text></View>
            ))}
          </View>
        )}
        <View style={styles.cardFooter}>
          <View style={styles.cardMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={14} color={COLORS.textMuted} />
              <Text style={styles.metaText}>{item.members || 0}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={14} color={COLORS.textMuted} />
              <Text style={styles.metaText}>{formatDate(item.createdAt)}</Text>
            </View>
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.detailsBtn} onPress={() => openDetails(item)}>
              <Text style={styles.detailsBtnText}>Show Details</Text>
            </TouchableOpacity>
            {owner ? (
              <TouchableOpacity style={styles.manageBtn} onPress={() => navigation.navigate('ProjectDetail', { projectId: item.id, projectTitle: item.title })}>
                <Text style={styles.manageBtnText}>Manage →</Text>
              </TouchableOpacity>
            ) : member ? (
              <TouchableOpacity style={styles.manageBtn} onPress={() => navigation.navigate('ProjectDetail', { projectId: item.id, projectTitle: item.title })}>
                <Text style={styles.manageBtnText}>Open</Text>
              </TouchableOpacity>
            ) : joinStatus === 'pending' ? (
              <View style={styles.pendingBtn}><Text style={styles.pendingBtnText}>Pending...</Text></View>
            ) : (
              <TouchableOpacity style={styles.joinBtn} onPress={() => openJoinModal(item)}>
                <Text style={styles.joinBtnText}>Request to Join</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderMyProjectCard = ({ item }: { item: Project }) => (
    <TouchableOpacity style={styles.projectCard} onPress={() => navigation.navigate('ProjectDetail', { projectId: item.id, projectTitle: item.title })} activeOpacity={0.8}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'active' ? `${COLORS.success}20` : `${COLORS.textMuted}20` }]}>
          <Text style={[styles.statusText, { color: item.status === 'active' ? COLORS.success : COLORS.textMuted }]}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
      <View style={styles.progressSection}>
        <Text style={styles.progressLabel}>Progress</Text>
        <Text style={[styles.progressValue, { color: COLORS.accent }]}>{item.progress || 0}%</Text>
      </View>
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${Math.min(item.progress || 0, 100)}%` }]} />
      </View>
      <View style={styles.cardFooter}>
        <View style={styles.metaItem}>
          <Ionicons name="people-outline" size={14} color={COLORS.textMuted} />
          <Text style={styles.metaText}>{item.members || 0} members</Text>
        </View>
        <TouchableOpacity style={styles.manageBtn}><Text style={styles.manageBtnText}>Manage →</Text></TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderIdeaCard = ({ item }: { item: any }) => {
    const statusColor = item.status === 'approved' ? COLORS.success : item.status === 'rejected' ? COLORS.danger : COLORS.warning;
    return (
      <View style={styles.ideaCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {item.status === 'pending' ? 'Pending' : item.status === 'approved' ? 'Approved' : 'Rejected'}
            </Text>
          </View>
        </View>
        <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
        <View style={styles.ideaCardFooter}>
          <Text style={styles.metaText}>{item.category}</Text>
          <View style={styles.ideaActions}>
            <TouchableOpacity style={styles.ideaEditBtn} onPress={() => navigation.navigate('SubmitIdea', { editIdea: item })}>
              <Ionicons name="create-outline" size={16} color={COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.ideaDeleteBtn} onPress={() => {
              Alert.alert('Delete Idea', 'Are you sure?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: async () => {
                  try { await deleteIdea(item._id || item.id); loadMyProjects(); }
                  catch (e: any) { Alert.alert('Error', e.message); }
                }},
              ]);
            }}>
              <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Project Collaboration Hub</Text>
          <Text style={styles.pageSubtitle}>Join exciting projects or submit your own idea</Text>
        </View>
        <TouchableOpacity style={styles.submitIdeaBtn} onPress={() => navigation.navigate('SubmitIdea')}>
          <Ionicons name="bulb-outline" size={16} color="#fff" />
          <Text style={styles.submitIdeaBtnText}>Submit Idea</Text>
        </TouchableOpacity>
      </View>

      {/* Main Tabs */}
      <View style={styles.mainTabRow}>
        {([
          { key: 'browse' as MainTab, label: 'Browse Projects', icon: 'search-outline' },
          { key: 'tasks' as MainTab, label: 'Tasks Completed', icon: 'checkmark-circle-outline' },
          { key: 'myProjects' as MainTab, label: 'My Projects', icon: 'code-slash-outline' },
        ]).map(tab => (
          <TouchableOpacity key={tab.key} style={[styles.mainTab, activeTab === tab.key && styles.mainTabActive]} onPress={() => setActiveTab(tab.key)}>
            <Ionicons name={tab.icon as any} size={16} color={activeTab === tab.key ? '#fff' : COLORS.textMuted} />
            <Text style={[styles.mainTabText, activeTab === tab.key && styles.mainTabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* BROWSE PROJECTS */}
      {activeTab === 'browse' && (
        <View style={{ flex: 1 }}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={17} color={COLORS.textMuted} />
            <TextInput style={styles.searchInput} placeholder="Search projects..." placeholderTextColor={COLORS.textMuted} value={searchQuery} onChangeText={setSearchQuery} />
          </View>
          <View style={styles.filtersRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity key={cat} style={[styles.filterChip, categoryFilter === cat && styles.filterChipActive]} onPress={() => setCategoryFilter(cat)}>
                  <Text style={[styles.filterChipText, categoryFilter === cat && styles.filterChipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <View style={styles.statusSortRow}>
            <View style={styles.statusFilterRow}>
              {STATUS_OPTIONS.map(opt => (
                <TouchableOpacity key={opt} style={[styles.statusChip, statusFilter === opt && styles.statusChipActive]} onPress={() => setStatusFilter(opt)}>
                  <Text style={[styles.statusChipText, statusFilter === opt && styles.statusChipTextActive]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.sortRow}>
              {([{ key: 'trending' as SortMode, label: '📈 Trending' }, { key: 'popular' as SortMode, label: '⭐ Popular' }, { key: 'recent' as SortMode, label: '🕐 Recent' }]).map(s => (
                <TouchableOpacity key={s.key} style={[styles.sortChip, sortMode === s.key && styles.sortChipActive]} onPress={() => setSortMode(s.key)}>
                  <Text style={[styles.sortChipText, sortMode === s.key && styles.sortChipTextActive]}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.countRow}>
            <Ionicons name="filter-outline" size={14} color={COLORS.accent} />
            <Text style={styles.countText}><Text style={{ color: COLORS.accent }}>{projects.length}</Text> projects available</Text>
          </View>
          {loading ? (
            <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>
          ) : (
            <FlatList data={projects} renderItem={renderProjectCard} keyExtractor={i => i.id} contentContainerStyle={styles.listContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
              ListEmptyComponent={<View style={styles.centered}><Ionicons name="search-outline" size={48} color={COLORS.textMuted} /><Text style={styles.emptyText}>No projects found</Text></View>}
            />
          )}
        </View>
      )}

      {/* TASKS COMPLETED */}
      {activeTab === 'tasks' && (
        <ScrollView contentContainerStyle={styles.tasksContent} showsVerticalScrollIndicator={false}>
          <View style={styles.certCard}>
            <View style={styles.certHeader}>
              <View style={styles.certIconWrap}><Ionicons name="ribbon-outline" size={28} color={COLORS.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.certTitle}>Certification Progress</Text>
                <Text style={styles.certSubtitle}>Complete 50 verified tasks to unlock your certificate</Text>
              </View>
            </View>
            <View style={styles.certProgressRow}>
              <Text style={styles.certProgressText}>0 / 50 tasks</Text>
              <Text style={styles.certProgressPercent}>0%</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: '0%', backgroundColor: COLORS.primary }]} />
            </View>
            <View style={styles.certBtnRow}>
              <TouchableOpacity style={[styles.certDownloadBtn, { opacity: 0.4 }]} disabled>
                <Ionicons name="download-outline" size={16} color="#fff" />
                <Text style={styles.certDownloadText}>Download Certificate</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.emptyTasksSection}>
            <Ionicons name="checkmark-done-outline" size={56} color={COLORS.textMuted} />
            <Text style={styles.emptyTasksTitle}>No verified tasks yet</Text>
            <Text style={styles.emptyTasksSubtitle}>Join a project and complete tasks to see them here.</Text>
          </View>
        </ScrollView>
      )}

      {/* MY PROJECTS */}
      {activeTab === 'myProjects' && (
        <View style={{ flex: 1 }}>
          <View style={styles.subTabRow}>
            <TouchableOpacity style={[styles.subTab, myProjectsView === 'projects' && styles.subTabActive]} onPress={() => setMyProjectsView('projects')}>
              <Text style={[styles.subTabText, myProjectsView === 'projects' && styles.subTabTextActive]}>🚀 Projects</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.subTab, myProjectsView === 'ideas' && styles.subTabActive]} onPress={() => setMyProjectsView('ideas')}>
              <Text style={[styles.subTabText, myProjectsView === 'ideas' && styles.subTabTextActive]}>💡 Ideas</Text>
            </TouchableOpacity>
          </View>
          {myProjectsLoading ? (
            <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>
          ) : myProjectsView === 'projects' ? (
            <FlatList data={myProjects} renderItem={renderMyProjectCard} keyExtractor={i => i.id || (i as any)._id} contentContainerStyle={styles.listContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
              ListEmptyComponent={<View style={styles.centered}><Ionicons name="cube-outline" size={48} color={COLORS.textMuted} /><Text style={styles.emptyText}>No projects yet</Text><Text style={styles.emptySubtext}>Join a project or submit an idea to get started!</Text></View>}
            />
          ) : (
            <FlatList data={myIdeas} renderItem={renderIdeaCard} keyExtractor={i => i._id || i.id} contentContainerStyle={styles.listContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
              ListEmptyComponent={<View style={styles.centered}><Ionicons name="bulb-outline" size={48} color={COLORS.textMuted} /><Text style={styles.emptyText}>No ideas submitted yet</Text><TouchableOpacity onPress={() => navigation.navigate('SubmitIdea')}><Text style={styles.emptyLink}>Submit your first idea →</Text></TouchableOpacity></View>}
            />
          )}
        </View>
      )}

      {/* JOIN REQUEST MODAL */}
      <Modal visible={joinModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Apply to Join</Text>
              <TouchableOpacity onPress={() => setJoinModalVisible(false)}><Ionicons name="close" size={24} color={COLORS.textPrimary} /></TouchableOpacity>
            </View>
            {selectedProject && <Text style={styles.modalProjectTitle}>{selectedProject.title}</Text>}
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              <Text style={styles.fieldLabel}>Your Skills *</Text>
              <TextInput style={styles.modalInput} placeholder="React, Node.js, Python, UI/UX Design..." placeholderTextColor={COLORS.textMuted} value={joinSkills} onChangeText={setJoinSkills} multiline />
              <Text style={styles.fieldLabel}>Relevant Experience</Text>
              <TextInput style={[styles.modalInput, { height: 70 }]} placeholder="Share your previous projects or work experience..." placeholderTextColor={COLORS.textMuted} value={joinExperience} onChangeText={setJoinExperience} multiline />
              <Text style={styles.fieldLabel}>Why do you want to join? *</Text>
              <TextInput style={[styles.modalInput, { height: 80 }]} placeholder="Explain what interests you about this project..." placeholderTextColor={COLORS.textMuted} value={joinMotivation} onChangeText={setJoinMotivation} multiline />
              <Text style={styles.fieldLabel}>Weekly Availability</Text>
              <View style={styles.availabilityRow}>
                {['5-10 hrs', '10-20 hrs', '20+ hrs', 'Full-time'].map(opt => (
                  <TouchableOpacity key={opt} style={[styles.availChip, joinAvailability === opt && styles.availChipActive]} onPress={() => setJoinAvailability(opt)}>
                    <Text style={[styles.availChipText, joinAvailability === opt && styles.availChipTextActive]}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <TouchableOpacity style={[styles.submitApplicationBtn, joinSubmitting && { opacity: 0.6 }]} onPress={submitJoinRequest} disabled={joinSubmitting}>
              {joinSubmitting ? <ActivityIndicator color="#fff" /> : (
                <><Ionicons name="send" size={16} color="#fff" /><Text style={styles.submitApplicationText}>Submit Application</Text></>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* DETAIL MODAL */}
      <Modal visible={detailModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Project Details</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}><Ionicons name="close" size={24} color={COLORS.textPrimary} /></TouchableOpacity>
            </View>
            {detailProject && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.detailTitle}>{detailProject.title}</Text>
                <View style={[styles.statusBadge, { backgroundColor: detailProject.status === 'active' ? `${COLORS.success}20` : `${COLORS.textMuted}20`, alignSelf: 'flex-start', marginBottom: 16 }]}>
                  <Text style={[styles.statusText, { color: detailProject.status === 'active' ? COLORS.success : COLORS.textMuted }]}>{detailProject.status}</Text>
                </View>
                <Text style={styles.detailDesc}>{detailProject.description}</Text>
                <View style={styles.detailRow}><Text style={styles.detailLabel}>Category</Text><Text style={styles.detailValue}>{detailProject.category || 'N/A'}</Text></View>
                <View style={styles.detailRow}><Text style={styles.detailLabel}>Members</Text><Text style={styles.detailValue}>{detailProject.members || 0}</Text></View>
                <View style={styles.detailRow}><Text style={styles.detailLabel}>Created</Text><Text style={styles.detailValue}>{formatDate(detailProject.createdAt)}</Text></View>
                <View style={styles.detailRow}><Text style={styles.detailLabel}>Progress</Text><Text style={styles.detailValue}>{detailProject.progress || 0}%</Text></View>
                {detailProject.tags && detailProject.tags.length > 0 && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={styles.detailLabel}>Tags</Text>
                    <View style={styles.tagsRow}>{detailProject.tags.map(tag => (<View key={tag} style={styles.tagChip}><Text style={styles.tagText}>{tag}</Text></View>))}</View>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  pageTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  pageSubtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  submitIdeaBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.accent, paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.md },
  submitIdeaBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  mainTabRow: { flexDirection: 'row', marginHorizontal: 16, marginVertical: 10, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 3, borderWidth: 1, borderColor: COLORS.border },
  mainTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderRadius: RADIUS.md },
  mainTabActive: { backgroundColor: COLORS.primary },
  mainTabText: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  mainTabTextActive: { color: '#fff' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, gap: 8 },
  searchInput: { flex: 1, height: 42, color: COLORS.textPrimary, fontSize: 14 },
  filtersRow: { marginBottom: 6 },
  filterScroll: { paddingHorizontal: 16, gap: 6 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: `${COLORS.primary}20`, borderColor: COLORS.primary },
  filterChipText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  filterChipTextActive: { color: COLORS.primary },
  statusSortRow: { paddingHorizontal: 16, marginBottom: 6 },
  statusFilterRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  statusChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  statusChipActive: { backgroundColor: `${COLORS.accent}20`, borderColor: COLORS.accent },
  statusChipText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  statusChipTextActive: { color: COLORS.accent },
  sortRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 6 },
  sortChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  sortChipActive: { backgroundColor: `${COLORS.primary}15`, borderColor: COLORS.primary },
  sortChipText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  sortChipTextActive: { color: COLORS.primary },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, marginBottom: 8 },
  countText: { fontSize: 12, color: COLORS.textMuted },
  listContent: { padding: 16, gap: 14, paddingBottom: 32 },
  projectCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  cardOverviewLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 4 },
  cardDesc: { fontSize: 13, color: COLORS.textMuted, lineHeight: 18, marginBottom: 10 },
  progressSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  progressLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  progressValue: { fontSize: 13, fontWeight: '700' },
  progressBarBg: { height: 4, backgroundColor: COLORS.border, borderRadius: 2, marginBottom: 10, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: COLORS.accent, borderRadius: 2 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  tagChip: { backgroundColor: `${COLORS.primary}15`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full },
  tagText: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  cardMeta: { flexDirection: 'row', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: COLORS.textMuted },
  cardActions: { flexDirection: 'row', gap: 8 },
  detailsBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.primary },
  detailsBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  joinBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.md, backgroundColor: COLORS.accent },
  joinBtnText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  manageBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.md, backgroundColor: COLORS.primary },
  manageBtnText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  pendingBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.md, backgroundColor: `${COLORS.warning}20` },
  pendingBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.warning },
  emptyText: { fontSize: 15, color: COLORS.textMuted, marginTop: 12, textAlign: 'center' },
  emptySubtext: { fontSize: 12, color: COLORS.textMuted, marginTop: 4, textAlign: 'center' },
  emptyLink: { fontSize: 13, color: COLORS.primary, fontWeight: '700', marginTop: 8 },
  subTabRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 10, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 3, borderWidth: 1, borderColor: COLORS.border },
  subTab: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: RADIUS.md },
  subTabActive: { backgroundColor: COLORS.primary },
  subTabText: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted },
  subTabTextActive: { color: '#fff' },
  ideaCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  ideaCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10 },
  ideaActions: { flexDirection: 'row', gap: 12 },
  ideaEditBtn: { padding: 4 },
  ideaDeleteBtn: { padding: 4 },
  tasksContent: { padding: 16, paddingBottom: 32 },
  certCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 20, borderWidth: 1, borderColor: COLORS.border, marginBottom: 24, ...SHADOWS.sm },
  certHeader: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  certIconWrap: { width: 48, height: 48, borderRadius: 12, backgroundColor: `${COLORS.primary}20`, justifyContent: 'center', alignItems: 'center' },
  certTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  certSubtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  certProgressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  certProgressText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  certProgressPercent: { fontSize: 13, color: COLORS.accent, fontWeight: '700' },
  certBtnRow: { marginTop: 16, alignItems: 'center' },
  certDownloadBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: RADIUS.md },
  certDownloadText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  emptyTasksSection: { alignItems: 'center', paddingTop: 40 },
  emptyTasksTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textMuted, marginTop: 16 },
  emptyTasksSubtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 4, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  modalProjectTitle: { fontSize: 14, color: COLORS.accent, fontWeight: '600', marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6, marginTop: 12 },
  modalInput: { backgroundColor: COLORS.background, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 10, color: COLORS.textPrimary, fontSize: 13, borderWidth: 1, borderColor: COLORS.border, textAlignVertical: 'top' },
  availabilityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  availChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.full, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  availChipActive: { backgroundColor: `${COLORS.primary}20`, borderColor: COLORS.primary },
  availChipText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  availChipTextActive: { color: COLORS.primary },
  submitApplicationBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: 14, marginTop: 20 },
  submitApplicationText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  detailTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 8 },
  detailDesc: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22, marginBottom: 16 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  detailLabel: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  detailValue: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '600' },
});
