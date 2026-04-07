import type { Project } from '@apptypes/index';
import { COLORS, RADIUS, SHADOWS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
    deleteIdea,
    fetchMyCompletedTasks,
    fetchMyIdeas,
    fetchMyInvites,
    fetchMyProjectsList,
    fetchProjectMembers,
    fetchProjects,
    fetchUserJoinRequests,
    sendJoinRequest,
} from '@services/creatorService';
import { useAuthStore } from '@store/authStore';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useMemo, useState } from 'react';
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

const GLASS = 'rgba(255,255,255,0.05)';
const GLASS_BORDER = 'rgba(255,255,255,0.08)';

// ──────────────────────────────────────────────────────────
// Types & constants – matching frontend BrowseProjects
// ──────────────────────────────────────────────────────────
type MainTab = 'browse' | 'completed' | 'myProjects';
type MyProjectsView = 'projects' | 'ideas';
type SortMode = 'trending' | 'popular' | 'recent';

const CATEGORIES = ['All', 'Web Development', 'Mobile App', 'AI/ML', 'Data Science', 'Game Development', 'IoT', 'Blockchain'];
const TASKS_REQUIRED = 50;
const PRIMARY = COLORS.primary;

// ──────────────────────────────────────────────────────────
export default function CreatorHomeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<MainTab>('browse');

  // ── Browse state ─────────────────────────────────────────
  const [projects, setProjects]         = useState<Project[]>([]);
  const [loading, setLoading]           = useState(false);
  const [refreshing, setRefreshing]     = useState(false);
  const [searchQuery, setSearchQuery]   = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [sortMode, setSortMode]         = useState<SortMode>('recent');

  // Join-request tracking (same as frontend userJoinRequests + userMemberships)
  const [userJoinRequests, setUserJoinRequests] = useState<any[]>([]);
  const [userMemberships, setUserMemberships]   = useState<Set<string>>(new Set());
  const [projectPendingRequests, setProjectPendingRequests] = useState<Record<string, number>>({});

  // ── Completed tasks state ────────────────────────────────
  const [completedTasks, setCompletedTasks]   = useState<any[]>([]);
  const [completedCount, setCompletedCount]   = useState(0);
  const [completedLoading, setCompletedLoading] = useState(false);

  // ── My projects / ideas state ────────────────────────────
  const [myProjects, setMyProjects]       = useState<Project[]>([]);
  const [myIdeas, setMyIdeas]             = useState<any[]>([]);
  const [myProjectsView, setMyProjectsView] = useState<MyProjectsView>('projects');
  const [myProjectsLoading, setMyProjectsLoading] = useState(false);

  // ── Join application modal ───────────────────────────────
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [selectedProject, setSelectedProject]   = useState<Project | null>(null);
  const [application, setApplication] = useState({ skills: '', experience: '', motivation: '', availability: '' });
  const [joinSubmitting, setJoinSubmitting]     = useState(false);

  // ── Details modal ────────────────────────────────────────
  const [detailsVisible, setDetailsVisible]     = useState(false);
  const [detailProject, setDetailProject]       = useState<Project | null>(null);

  // ── Pending invites count ────────────────────────────────
  const [pendingInviteCount, setPendingInviteCount] = useState(0);

  // ─────────────────────────────────────────────────────────
  // Data loading – matching frontend loadProjects + loadAccessData
  // ─────────────────────────────────────────────────────────
  const loadBrowseData = useCallback(async () => {
    try {
      const params: any = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (categoryFilter !== 'All') params.category = categoryFilter;
      if (sortMode === 'recent') params.sort = 'newest';
      else if (sortMode === 'popular') params.sort = 'popular';
      else if (sortMode === 'trending') params.sort = 'trending';

      const data = await fetchProjects(params);
      setProjects(data);

      // Load user access data (join requests + memberships) like frontend
      if (user) {
        try {
          const requests = await fetchUserJoinRequests(user.id);
          setUserJoinRequests(requests);

          // Build memberships set from approved requests
          const memberSet = new Set<string>();
          requests.forEach((r: any) => {
            if (r.status === 'approved') {
              const pid = typeof r.projectId === 'object' ? r.projectId?._id : r.projectId;
              if (pid) memberSet.add(String(pid));
            }
          });
          setUserMemberships(memberSet);
        } catch (e) { console.error('loadAccessData', e); }

        // Load pending request counts for owned projects
        try {
          const myP = await fetchMyProjectsList();
          const pending: Record<string, number> = {};
          for (const p of myP) {
            const pid = (p as any)._id || p.id;
            try {
              const members = await fetchProjectMembers(pid);
              pending[pid] = members.filter((m: any) => m.status === 'pending').length;
            } catch { /* ignore */ }
          }
          setProjectPendingRequests(pending);
        } catch { /* ignore */ }
      }
    } catch (e) { console.error('loadBrowseData', e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [searchQuery, categoryFilter, sortMode, user]);

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

  const loadCompletedTasks = useCallback(async () => {
    if (!user) return;
    setCompletedLoading(true);
    try {
      const result = await fetchMyCompletedTasks(user.id);
      setCompletedTasks(result.completedTasks);
      setCompletedCount(result.count);
    } catch (e) { console.error(e); }
    finally { setCompletedLoading(false); }
  }, [user]);

  // Load invite count on mount
  useEffect(() => {
    (async () => {
      try {
        const invites = await fetchMyInvites();
        setPendingInviteCount(invites.filter((i: any) => i.status === 'pending').length);
      } catch { /* ignore */ }
    })();
  }, []);

  useEffect(() => {
    if (activeTab === 'browse')     { setLoading(true); loadBrowseData(); }
    if (activeTab === 'completed')  loadCompletedTasks();
    if (activeTab === 'myProjects') loadMyProjects();
  }, [activeTab]);

  useEffect(() => { if (activeTab === 'browse') { setLoading(true); loadBrowseData(); } }, [categoryFilter, sortMode]);
  useEffect(() => {
    if (activeTab !== 'browse') return;
    const t = setTimeout(() => { setLoading(true); loadBrowseData(); }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);
  useEffect(() => { if (activeTab === 'myProjects') loadMyProjects(); }, [myProjectsView]);

  const onRefresh = () => {
    setRefreshing(true);
    if (activeTab === 'browse')     loadBrowseData();
    else if (activeTab === 'completed') loadCompletedTasks();
    else loadMyProjects();
  };

  // ─────────────────────────────────────────────────────────
  // Helpers — matching frontend role-based button logic
  // ─────────────────────────────────────────────────────────
  const getJoinStatus = (projectId: string) => {
    const req = userJoinRequests.find((r: any) => {
      const id = typeof r.projectId === 'object' ? r.projectId?._id : r.projectId;
      return String(id) === String(projectId);
    });
    return req ? req.status : null;
  };

  const isMember = (projectId: string) => userMemberships.has(String(projectId));

  const getOwnerId = (project: Project) => {
    const o = (project as any).owner;
    if (o && typeof o === 'object') return String(o._id || o.id || '');
    if (o) return String(o);
    return String(project.creatorId || '');
  };

  const getButtonState = (project: Project) => {
    const pid    = (project as any)._id || project.id;
    const status = getJoinStatus(pid);
    const isOwner  = getOwnerId(project) === String(user?.id);
    const isCompleted = (project as any).isCompleted || project.status === 'completed' || project.status === 'Completed';

    if (!user)     return { label: 'Login to Join',  action: 'none' as const,    color: COLORS.textMuted, disabled: true };
    if (isOwner)   return { label: 'Manage →',        action: 'manage' as const,  color: PRIMARY,          disabled: false };
    if (status === 'approved' || isMember(pid))
      return { label: 'Open Workspace', action: 'open' as const, color: COLORS.success, disabled: false };
    if (isCompleted) return { label: 'Completed', action: 'none' as const, color: COLORS.success, disabled: true };
    if (status === 'pending')  return { label: 'Pending…',       action: 'none' as const, color: COLORS.warning, disabled: true };
    if (status === 'rejected') return { label: 'Request Again',  action: 'request' as const, color: PRIMARY,     disabled: false };
    return { label: 'Request to Join', action: 'request' as const, color: PRIMARY, disabled: false };
  };

  const handleButtonPress = (project: Project) => {
    const { action } = getButtonState(project);
    const pid = (project as any)._id || project.id;
    if (action === 'manage' || action === 'open') {
      navigation.navigate('ProjectWorkspace', { projectId: pid, projectTitle: project.title });
    } else if (action === 'request') {
      setSelectedProject(project);
      setApplication({ skills: '', experience: '', motivation: '', availability: '' });
      setJoinModalVisible(true);
    }
  };

  const submitJoinRequest = async () => {
    if (!selectedProject) return;
    if (!application.skills.trim())     { Alert.alert('Required', 'Please enter your skills'); return; }
    if (!application.motivation.trim()) { Alert.alert('Required', 'Please explain why you want to join'); return; }
    setJoinSubmitting(true);
    try {
      const msg = `Skills: ${application.skills}\nExperience: ${application.experience}\nMotivation: ${application.motivation}\nAvailability: ${application.availability}`;
      await sendJoinRequest((selectedProject as any)._id || selectedProject.id, undefined, msg);
      Alert.alert('Application Sent!', `${selectedProject.title} — the project owner will review your request.`);
      setJoinModalVisible(false);
      loadBrowseData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to submit');
    } finally { setJoinSubmitting(false); }
  };

  const shortDate = (d: string) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getMemberCount = (project: Project): number => {
    if (Array.isArray(project.members)) return project.members.length;
    if (typeof project.memberCount === 'number') return project.memberCount;
    if (typeof project.members === 'number') return project.members;
    return 0;
  };

  const handleDownloadCertificate = async () => {
    try {
      const userName = user?.name || user?.username || 'Developer';
      const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      const html = `
        <html>
        <head>
          <style>
            body { margin: 0; padding: 40px; font-family: Georgia, serif; background: #ffffff; }
            .cert { border: 8px double ${PRIMARY}; padding: 60px 40px; text-align: center; min-height: 600px; display: flex; flex-direction: column; justify-content: center; align-items: center; }
            .logo { font-size: 28px; font-weight: bold; color: ${PRIMARY}; letter-spacing: 4px; margin-bottom: 10px; }
            .subtitle { font-size: 14px; color: #666; letter-spacing: 2px; margin-bottom: 40px; }
            .title { font-size: 22px; color: #333; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 3px; }
            .name { font-size: 36px; font-weight: bold; color: ${PRIMARY}; margin: 20px 0; border-bottom: 3px solid ${PRIMARY}; padding-bottom: 10px; display: inline-block; }
            .desc { font-size: 16px; color: #555; line-height: 1.8; max-width: 500px; margin: 20px auto; }
            .tasks { font-size: 18px; font-weight: bold; color: ${PRIMARY}; margin: 10px 0 30px; }
            .date { font-size: 14px; color: #888; margin-top: 40px; }
            .badge { font-size: 48px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="cert">
            <div class="badge">🏆</div>
            <div class="logo">SKILLUPX</div>
            <div class="subtitle">PROJECT COLLABORATION HUB</div>
            <div class="title">Certificate of Achievement</div>
            <div style="font-size: 14px; color: #888;">This is to certify that</div>
            <div class="name">${userName}</div>
            <div class="desc">has successfully completed <strong>${completedCount}</strong> verified tasks across multiple collaborative projects, demonstrating exceptional skill and dedication.</div>
            <div class="tasks">${completedCount} Tasks Completed</div>
            <div class="date">Issued on ${dateStr}</div>
          </div>
        </body>
        </html>`;
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'SkillUpX Certificate' });
      } else {
        Alert.alert('Certificate Saved', `Certificate saved to: ${uri}`);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to generate certificate');
    }
  };

  // ── Filtered + sorted projects ───────────────────────────
  const filteredProjects = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return projects.filter(p => {
      const matchSearch = !q || p.title.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
        || p.tags?.some(t => t.toLowerCase().includes(q))
        || p.techStack?.some(t => t.toLowerCase().includes(q));
      const matchCat    = categoryFilter === 'All' || (p as any).category === categoryFilter;
      const isCompleted = (p as any).isCompleted || p.status === 'completed' || p.status === 'Completed';
      const matchStatus = statusFilter === 'all'
        || (statusFilter === 'completed' && isCompleted)
        || (statusFilter === 'active' && !isCompleted);
      return matchSearch && matchCat && matchStatus;
    });
  }, [projects, searchQuery, categoryFilter, statusFilter]);

  // Completed tasks grouped by project
  const completedByProject = useMemo(() =>
    completedTasks.reduce((acc: Record<string, any[]>, t: any) => {
      const key = t.projectId || t.projectTitle || 'Unknown Project';
      if (!acc[key]) acc[key] = [];
      acc[key].push(t);
      return acc;
    }, {}),
  [completedTasks]);

  // ─────────────────────────────────────────────────────────
  // Project card (Browse tab) – shows tech stack + creator
  // ─────────────────────────────────────────────────────────
  const renderProjectCard = ({ item }: { item: Project }) => {
    const btn         = getButtonState(item);
    const isCompleted = (item as any).isCompleted || item.status === 'completed' || item.status === 'Completed';
    const pid = (item as any)._id || item.id;
    const isOwner = getOwnerId(item) === String(user?.id);
    const pendingCount = projectPendingRequests[pid] || 0;

    return (
      <View style={S.card}>
        {/* Title + status */}
        <View style={S.cardTop}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <Text style={S.cardTitle} numberOfLines={2}>{item.title}</Text>
              {isOwner && <View style={S.creatorBadge}><Text style={S.creatorBadgeText}>CREATOR</Text></View>}
            </View>
            <Text style={S.cardDesc} numberOfLines={2}>{item.description}</Text>
            {/* Creator name */}
            {(item.creatorName || item.ownerName) && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
                <View style={S.creatorAvatar}>
                  <Text style={S.creatorAvatarText}>{(item.creatorName || item.ownerName)?.[0]?.toUpperCase()}</Text>
                </View>
                <Text style={S.metaText}>{item.creatorName || item.ownerName}</Text>
              </View>
            )}
          </View>
          <View style={[S.statusBadge, { backgroundColor: isCompleted ? COLORS.success + '30' : '#16A34A20' }]}>
            <Text style={[S.statusBadgeText, { color: isCompleted ? COLORS.success : '#22C55E' }]}>
              {isCompleted ? '✓ Completed' : 'Active'}
            </Text>
          </View>
        </View>

        {/* Progress */}
        <View style={{ marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
            <Text style={S.progressLabel}>Progress</Text>
            <Text style={[S.progressLabel, { color: PRIMARY, fontWeight: '700' }]}>{item.progress || 0}%</Text>
          </View>
          <View style={S.progressBg}>
            <View style={[S.progressFill, { width: `${Math.min(item.progress || 0, 100)}%` as any }]} />
          </View>
        </View>

        {/* Tech Stack */}
        {item.techStack && item.techStack.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {item.techStack.map(tech => (
                <View key={tech} style={S.techTag}><Text style={S.techTagText}>{tech}</Text></View>
              ))}
            </View>
          </ScrollView>
        )}

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {item.tags.map(tag => (
                <View key={tag} style={S.tag}><Text style={S.tagText}>{tag}</Text></View>
              ))}
            </View>
          </ScrollView>
        )}

        {/* Footer */}
        <View style={S.cardFooter}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Ionicons name="people-outline" size={12} color={COLORS.textMuted} />
              <Text style={S.metaText}>{getMemberCount(item)}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Ionicons name="calendar-outline" size={12} color={COLORS.textMuted} />
              <Text style={S.metaText}>{shortDate(item.createdAt)}</Text>
            </View>
            {item.category && (
              <View style={S.categoryChip}>
                <Text style={S.categoryChipText}>{item.category}</Text>
              </View>
            )}
            {isOwner && pendingCount > 0 && (
              <View style={S.pendingBadge}>
                <Text style={S.pendingBadgeText}>{pendingCount} pending</Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={S.detailsBtn} onPress={() => { setDetailProject(item); setDetailsVisible(true); }}>
              <Text style={S.detailsBtnText}>Details</Text>
            </TouchableOpacity>
            {isCompleted && btn.action !== 'manage' && btn.action !== 'open' ? (
              <View style={[S.actionBtn, { backgroundColor: COLORS.success }]}>
                <Text style={S.actionBtnText}>Completed</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[S.actionBtn, { backgroundColor: btn.color, opacity: btn.disabled ? 0.5 : 1 }]}
                onPress={() => handleButtonPress(item)}
                disabled={btn.disabled}
              >
                <Text style={S.actionBtnText}>{btn.label}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  // ── My Project card (owner) ───────────────────────────────
  const renderMyProjectCard = ({ item }: { item: Project }) => {
    const pid = (item as any)._id || item.id;
    const pendingCount = projectPendingRequests[pid] || 0;
    return (
      <TouchableOpacity
        style={S.card}
        onPress={() => navigation.navigate('ProjectWorkspace', { projectId: pid, projectTitle: item.title })}
        activeOpacity={0.85}
      >
        <View style={S.cardTop}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Text style={S.cardTitle} numberOfLines={2}>{item.title}</Text>
              <View style={S.creatorBadge}><Text style={S.creatorBadgeText}>CREATOR</Text></View>
              {pendingCount > 0 && (
                <View style={S.pendingBadge}><Text style={S.pendingBadgeText}>{pendingCount}</Text></View>
              )}
            </View>
            <Text style={S.cardDesc} numberOfLines={2}>{item.description}</Text>
          </View>
        </View>
        {/* Tech stack */}
        {item.techStack && item.techStack.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {item.techStack.map(tech => (
                <View key={tech} style={S.techTag}><Text style={S.techTagText}>{tech}</Text></View>
              ))}
            </View>
          </ScrollView>
        )}
        <View style={{ marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
            <Text style={S.progressLabel}>Progress</Text>
            <Text style={[S.progressLabel, { color: PRIMARY, fontWeight: '700' }]}>{item.progress || 0}%</Text>
          </View>
          <View style={S.progressBg}>
            <View style={[S.progressFill, { width: `${Math.min(item.progress || 0, 100)}%` as any }]} />
          </View>
        </View>
        <View style={S.cardFooter}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="people-outline" size={13} color={COLORS.textMuted} />
            <Text style={S.metaText}>{getMemberCount(item)} members</Text>
          </View>
          <View style={[S.actionBtn, { backgroundColor: PRIMARY }]}>
            <Text style={S.actionBtnText}>Manage →</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Idea card (with status + edit/delete) ─────────────────
  const renderIdeaCard = ({ item }: { item: any }) => {
    const statusColor = item.status === 'approved' ? COLORS.success : item.status === 'rejected' ? COLORS.danger : COLORS.warning;
    return (
      <View style={[S.card, { borderLeftWidth: 4, borderLeftColor: PRIMARY }]}>
        <View style={S.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={S.cardTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={S.cardDesc} numberOfLines={2}>{item.description}</Text>
            {item.category && <Text style={[S.metaText, { marginTop: 4, color: PRIMARY }]}>{item.category}</Text>}
            <Text style={[S.metaText, { marginTop: 4 }]}>Submitted {shortDate(item.submittedAt || item.createdAt)}</Text>
          </View>
          <View style={{ gap: 8, alignItems: 'flex-end' }}>
            <View style={[S.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <Text style={[S.statusBadgeText, { color: statusColor }]}>
                {item.status === 'pending' ? '⏳ Pending' : item.status === 'approved' ? '✅ Approved' : '❌ Rejected'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity onPress={() => navigation.navigate('SubmitIdea', { editIdea: item })}>
                <Ionicons name="create-outline" size={18} color={PRIMARY} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => Alert.alert('Delete Idea', 'Are you sure you want to delete this idea?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: async () => {
                  try { await deleteIdea(item._id || item.id); loadMyProjects(); }
                  catch (e: any) { Alert.alert('Error', e.message); }
                }},
              ])}>
                <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
        {item.tags && item.tags.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {item.tags.map((tag: string) => (
              <View key={tag} style={S.tag}><Text style={S.tagText}>{tag}</Text></View>
            ))}
          </View>
        )}
      </View>
    );
  };

  // ─────────────────────────────────────────────────────────
  // Main render
  // ─────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={S.root} edges={['top']}>

      {/* ── Header ───────────────────────────────────────── */}
      <View style={S.header}>
        <LinearGradient colors={[PRIMARY + '15', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.headerGradient} />
        <View style={{ flex: 1 }}>
          <Text style={S.headerTitle}>Project Collaboration Hub</Text>
          <Text style={S.headerSub}>Join exciting projects or submit your own idea</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={S.inviteBtn} onPress={() => navigation.navigate('MyInvites')}>
            <Ionicons name="mail-outline" size={17} color={PRIMARY} />
            {pendingInviteCount > 0 && (
              <View style={S.inviteBadge}>
                <Text style={S.inviteBadgeText}>{pendingInviteCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={S.submitBtn} onPress={() => navigation.navigate('SubmitIdea')}>
            <Ionicons name="bulb-outline" size={15} color="#fff" />
            <Text style={S.submitBtnText}>Submit Idea</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── 3-Tab bar ────────────────────────────────────── */}
      <View style={S.tabBar}>
        {([
          { key: 'browse'     as MainTab, label: 'Browse',    icon: 'search-outline'         as keyof typeof Ionicons.glyphMap },
          { key: 'completed'  as MainTab, label: 'Completed', icon: 'checkmark-done-outline' as keyof typeof Ionicons.glyphMap },
          { key: 'myProjects' as MainTab, label: 'Projects',  icon: 'code-slash-outline'     as keyof typeof Ionicons.glyphMap },
        ]).map(tab => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity key={tab.key} style={[S.tabItem, active && S.tabItemActive]} onPress={() => setActiveTab(tab.key)}>
              <Ionicons name={tab.icon} size={14} color={active ? '#fff' : COLORS.textMuted} />
              <Text style={[S.tabLabel, active && S.tabLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ══════════════════════════════════════════════════════
          BROWSE TAB
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'browse' && (
        <View style={{ flex: 1 }}>
          {/* Search */}
          <View style={S.searchBox}>
            <Ionicons name="search-outline" size={16} color={COLORS.textMuted} />
            <TextInput
              style={S.searchInput}
              placeholder="Search projects, tech stack..."
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Category chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.chipRow} style={{ maxHeight: 44 }}>
            {CATEGORIES.map(cat => {
              const active = categoryFilter === cat;
              return (
                <TouchableOpacity key={cat} style={[S.chip, active && S.chipActive]} onPress={() => setCategoryFilter(cat)}>
                  <Text style={[S.chipText, active && S.chipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Status + sort row */}
          <View style={S.filterRow}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {(['all', 'active', 'completed'] as const).map(s => (
                <TouchableOpacity key={s} style={[S.smallChip, statusFilter === s && S.smallChipActive]} onPress={() => setStatusFilter(s)}>
                  <Text style={[S.smallChipText, statusFilter === s && S.smallChipTextActive]}>
                    {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {[{ k: 'recent' as SortMode, l: '🕐' }, { k: 'trending' as SortMode, l: '🔥' }, { k: 'popular' as SortMode, l: '⭐' }].map(s => (
                <TouchableOpacity key={s.k} style={[S.iconChip, sortMode === s.k && S.iconChipActive]} onPress={() => setSortMode(s.k)}>
                  <Text style={{ fontSize: 14 }}>{s.l}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Count */}
          <View style={{ paddingHorizontal: 16, marginBottom: 6 }}>
            <Text style={S.countText}><Text style={{ color: PRIMARY, fontWeight: '700' }}>{filteredProjects.length}</Text> projects available</Text>
          </View>

          {loading ? (
            <View style={S.centered}><ActivityIndicator size="large" color={PRIMARY} /></View>
          ) : (
            <FlatList
              data={filteredProjects}
              renderItem={renderProjectCard}
              keyExtractor={i => String((i as any)._id || i.id)}
              contentContainerStyle={S.list}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
              ListEmptyComponent={
                <View style={S.centered}>
                  <Ionicons name="code-slash-outline" size={48} color={COLORS.textMuted} />
                  <Text style={S.emptyTitle}>No projects found</Text>
                  <Text style={S.emptyDesc}>Try adjusting your filters or submit a new idea!</Text>
                </View>
              }
            />
          )}
        </View>
      )}

      {/* ══════════════════════════════════════════════════════
          COMPLETED TASKS TAB
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'completed' && (
        <ScrollView
          contentContainerStyle={S.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
        >
          {/* Certificate progress */}
          <View style={S.certCard}>
            <Text style={S.certTitle}>🏆 Certification Progress</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={S.certSub}>{completedCount} of {TASKS_REQUIRED} tasks completed</Text>
              <Text style={[S.certSub, { color: PRIMARY, fontWeight: '700' }]}>
                {Math.round((completedCount / TASKS_REQUIRED) * 100)}%
              </Text>
            </View>
            <View style={S.progressBg}>
              <View style={[S.progressFill, { width: `${Math.min((completedCount / TASKS_REQUIRED) * 100, 100)}%` as any }]} />
            </View>
            {completedCount >= TASKS_REQUIRED ? (
              <View style={{ gap: 10, marginTop: 10 }}>
                <Text style={[S.certDesc, { color: COLORS.success, fontWeight: '700' }]}>
                  🎉 You've earned your certificate!
                </Text>
                <TouchableOpacity style={S.downloadCertBtn} onPress={handleDownloadCertificate}>
                  <Ionicons name="download-outline" size={16} color="#fff" />
                  <Text style={S.downloadCertText}>Download Certificate (PDF)</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={[S.certDesc, { marginTop: 10 }]}>
                Complete <Text style={{ color: PRIMARY, fontWeight: '700' }}>{TASKS_REQUIRED - completedCount}</Text> more tasks to earn your Verified Certificate.
              </Text>
            )}
          </View>

          <Text style={S.sectionTitle}>✅ Tasks You've Completed</Text>

          {completedLoading ? (
            <View style={S.centered}><ActivityIndicator size="large" color={PRIMARY} /></View>
          ) : completedTasks.length === 0 ? (
            <View style={[S.centered, { paddingVertical: 40 }]}>
              <Ionicons name="bulb-outline" size={48} color={COLORS.textMuted} />
              <Text style={S.emptyTitle}>No completed tasks yet</Text>
              <Text style={S.emptyDesc}>Complete tasks in project workspaces to earn verification.</Text>
              <TouchableOpacity style={[S.submitBtn, { marginTop: 16 }]} onPress={() => setActiveTab('browse')}>
                <Text style={S.submitBtnText}>Browse Projects</Text>
              </TouchableOpacity>
            </View>
          ) : (
            Object.entries(completedByProject).map(([projKey, tasks]) => (
              <View key={projKey} style={[S.card, { marginBottom: 16 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <View style={S.projTag}><Text style={S.projTagText}>PROJECT</Text></View>
                  <Text style={[S.metaText, { color: PRIMARY, fontWeight: '700' }]}>{tasks.length} task{tasks.length !== 1 ? 's' : ''}</Text>
                </View>
                <Text style={S.cardTitle}>{(tasks[0] as any)?.projectTitle || projKey}</Text>
                <View style={{ marginTop: 10 }}>
                  {tasks.map((t: any, idx: number) => (
                    <View key={t.id || idx} style={S.taskRow}>
                      <Text style={S.taskIdx}>{idx + 1}.</Text>
                      <Text style={S.taskTitle}>{t.title || t.name || 'Task'}</Text>
                      <View style={S.verifiedBadge}>
                        <Text style={S.verifiedText}>🏅 Verified</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* ══════════════════════════════════════════════════════
          MY PROJECTS TAB
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'myProjects' && (
        <View style={{ flex: 1 }}>
          <View style={S.subTabRow}>
            {([
              { key: 'projects' as MyProjectsView, label: 'Projects' },
              { key: 'ideas'    as MyProjectsView, label: 'Ideas'    },
            ]).map(t => (
              <TouchableOpacity key={t.key} style={[S.subTab, myProjectsView === t.key && S.subTabActive]} onPress={() => setMyProjectsView(t.key)}>
                <Text style={[S.subTabText, myProjectsView === t.key && S.subTabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {myProjectsLoading ? (
            <View style={S.centered}><ActivityIndicator size="large" color={PRIMARY} /></View>
          ) : myProjectsView === 'projects' ? (
            <FlatList
              data={myProjects}
              renderItem={renderMyProjectCard}
              keyExtractor={i => String((i as any)._id || i.id)}
              contentContainerStyle={S.list}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
              ListEmptyComponent={
                <View style={S.centered}>
                  <Ionicons name="code-slash-outline" size={48} color={COLORS.textMuted} />
                  <Text style={S.emptyTitle}>No projects yet</Text>
                  <Text style={S.emptyDesc}>Join existing projects or create your own once your idea is approved</Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                    <TouchableOpacity style={[S.submitBtn, { backgroundColor: COLORS.surfaceElevated }]} onPress={() => setActiveTab('browse')}>
                      <Text style={[S.submitBtnText, { color: COLORS.textPrimary }]}>Browse Projects</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={S.submitBtn} onPress={() => navigation.navigate('SubmitIdea')}>
                      <Text style={S.submitBtnText}>Submit Idea</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              }
            />
          ) : (
            <FlatList
              data={myIdeas}
              renderItem={renderIdeaCard}
              keyExtractor={i => String(i._id || i.id)}
              contentContainerStyle={S.list}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
              ListEmptyComponent={
                <View style={S.centered}>
                  <Ionicons name="bulb-outline" size={48} color={COLORS.textMuted} />
                  <Text style={S.emptyTitle}>No ideas submitted yet</Text>
                  <Text style={S.emptyDesc}>Submit your project idea and get it approved</Text>
                  <TouchableOpacity style={[S.submitBtn, { marginTop: 16 }]} onPress={() => navigation.navigate('SubmitIdea')}>
                    <Text style={S.submitBtnText}>Submit Your First Idea</Text>
                  </TouchableOpacity>
                </View>
              }
            />
          )}
        </View>
      )}

      {/* ══════════════════════════════════════════════════════
          APPLICATION MODAL
      ══════════════════════════════════════════════════════ */}
      <Modal visible={joinModalVisible} animationType="slide" transparent onRequestClose={() => setJoinModalVisible(false)}>
        <View style={S.modalOverlay}>
          <View style={S.modalSheet}>
            <View style={S.modalHandle} />
            <View style={S.modalHeader}>
              <View>
                <Text style={S.modalTitle}>Apply to Join Project</Text>
                {selectedProject && <Text style={S.modalSub}>{selectedProject.title}</Text>}
              </View>
              <TouchableOpacity onPress={() => setJoinModalVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={S.fieldLabel}>Your Skills <Text style={{ color: COLORS.danger }}>*</Text></Text>
              <TextInput style={S.fieldInput} placeholder="e.g., React, Node.js, Python, UI/UX Design..." placeholderTextColor={COLORS.textMuted} value={application.skills} onChangeText={v => setApplication(a => ({ ...a, skills: v }))} multiline numberOfLines={3} textAlignVertical="top" />

              <Text style={S.fieldLabel}>Relevant Experience</Text>
              <TextInput style={S.fieldInput} placeholder="Share your previous projects or work experience..." placeholderTextColor={COLORS.textMuted} value={application.experience} onChangeText={v => setApplication(a => ({ ...a, experience: v }))} multiline numberOfLines={3} textAlignVertical="top" />

              <Text style={S.fieldLabel}>Why do you want to join? <Text style={{ color: COLORS.danger }}>*</Text></Text>
              <TextInput style={S.fieldInput} placeholder="Explain your motivation and what you'll bring to the team..." placeholderTextColor={COLORS.textMuted} value={application.motivation} onChangeText={v => setApplication(a => ({ ...a, motivation: v }))} multiline numberOfLines={3} textAlignVertical="top" />

              <Text style={S.fieldLabel}>Availability</Text>
              <TextInput style={S.fieldInput} placeholder="e.g., 10 hours/week, weekends only..." placeholderTextColor={COLORS.textMuted} value={application.availability} onChangeText={v => setApplication(a => ({ ...a, availability: v }))} />

              <TouchableOpacity
                style={[S.applyBtn, (!application.skills.trim() || !application.motivation.trim() || joinSubmitting) && { opacity: 0.5 }]}
                onPress={submitJoinRequest}
                disabled={!application.skills.trim() || !application.motivation.trim() || joinSubmitting}
              >
                {joinSubmitting
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={S.applyBtnText}>Submit Application</Text>
                }
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════
          DETAILS MODAL — shows tech stack, category, github
      ══════════════════════════════════════════════════════ */}
      <Modal visible={detailsVisible} animationType="slide" transparent onRequestClose={() => setDetailsVisible(false)}>
        <View style={S.modalOverlay}>
          <View style={S.modalSheet}>
            <View style={S.modalHandle} />
            <View style={S.modalHeader}>
              <Text style={[S.modalTitle, { flex: 1, marginRight: 8 }]} numberOfLines={2}>{detailProject?.title}</Text>
              <TouchableOpacity onPress={() => setDetailsVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            {detailProject && (
              <ScrollView>
                <View style={[S.statusBadge, { alignSelf: 'flex-start', marginBottom: 12, backgroundColor: COLORS.success + '20' }]}>
                  <Text style={[S.statusBadgeText, { color: COLORS.success }]}>{detailProject.status}</Text>
                </View>

                {(detailProject.creatorName || detailProject.ownerName) && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                    <View style={S.creatorAvatar}>
                      <Text style={S.creatorAvatarText}>{(detailProject.creatorName || detailProject.ownerName)?.[0]?.toUpperCase()}</Text>
                    </View>
                    <Text style={[S.metaText, { fontSize: 13 }]}>Created by {detailProject.creatorName || detailProject.ownerName}</Text>
                  </View>
                )}

                <Text style={S.fieldLabel}>Description</Text>
                <Text style={[S.cardDesc, { marginBottom: 16, marginTop: 4 }]}>{detailProject.description}</Text>

                {detailProject.techStack && detailProject.techStack.length > 0 && (
                  <>
                    <Text style={[S.fieldLabel, { marginBottom: 8 }]}>Tech Stack</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                      {detailProject.techStack.map(tech => <View key={tech} style={S.techTag}><Text style={S.techTagText}>{tech}</Text></View>)}
                    </View>
                  </>
                )}

                <View style={{ flexDirection: 'row', gap: 24, marginBottom: 16 }}>
                  <View>
                    <Text style={S.metaText}>Members</Text>
                    <Text style={[S.cardTitle, { color: PRIMARY }]}>{getMemberCount(detailProject)}</Text>
                  </View>
                  <View>
                    <Text style={S.metaText}>Progress</Text>
                    <Text style={[S.cardTitle, { color: PRIMARY }]}>{detailProject.progress || 0}%</Text>
                  </View>
                  <View>
                    <Text style={S.metaText}>Created</Text>
                    <Text style={[S.cardTitle, { fontSize: 13 }]}>{shortDate(detailProject.createdAt)}</Text>
                  </View>
                </View>

                {detailProject.category && (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={S.fieldLabel}>Category</Text>
                    <View style={[S.categoryChip, { alignSelf: 'flex-start', marginTop: 4 }]}>
                      <Text style={S.categoryChipText}>{detailProject.category}</Text>
                    </View>
                  </View>
                )}

                {detailProject.tags && detailProject.tags.length > 0 && (
                  <>
                    <Text style={[S.fieldLabel, { marginBottom: 8 }]}>Tags</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                      {detailProject.tags.map(tag => <View key={tag} style={S.tag}><Text style={S.tagText}>{tag}</Text></View>)}
                    </View>
                  </>
                )}

                {(detailProject.githubRepo || detailProject.repositoryUrl) && (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={S.fieldLabel}>GitHub Repository</Text>
                    <Text style={[S.metaText, { color: PRIMARY, marginTop: 4 }]}>
                      {detailProject.githubRepo || detailProject.repositoryUrl}
                    </Text>
                  </View>
                )}

                <TouchableOpacity style={S.applyBtn} onPress={() => { setDetailsVisible(false); handleButtonPress(detailProject!); }}>
                  <Text style={S.applyBtnText}>{getButtonState(detailProject).label}</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// ──────────────────────────────────────────────────────────
// Styles — matching website dark+teal design system
// ──────────────────────────────────────────────────────────
const S = StyleSheet.create({
  root:    { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 48 },

  header:        { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, gap: 12, overflow: 'hidden' },
  headerGradient:{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  headerTitle:   { fontSize: 20, fontWeight: '900', color: COLORS.textPrimary, lineHeight: 24, letterSpacing: -0.3 },
  headerSub:     { fontSize: 12, color: COLORS.textMuted, marginTop: 3 },
  submitBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: PRIMARY, paddingHorizontal: 14, paddingVertical: 10, borderRadius: RADIUS.lg, ...SHADOWS.primary },
  submitBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  inviteBtn:     { width: 38, height: 38, borderRadius: 19, backgroundColor: GLASS, borderWidth: 1, borderColor: GLASS_BORDER, justifyContent: 'center', alignItems: 'center' },
  inviteBadge:   { position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.danger, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  inviteBadgeText:{ fontSize: 9, fontWeight: '900', color: '#fff' },

  tabBar:        { flexDirection: 'row', marginHorizontal: 16, marginBottom: 10, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 3, borderWidth: 1, borderColor: COLORS.border },
  tabItem:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderRadius: RADIUS.md },
  tabItemActive: { backgroundColor: PRIMARY },
  tabLabel:      { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  tabLabelActive:{ color: '#fff' },

  searchBox:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 8, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12 },
  searchInput:  { flex: 1, height: 42, color: COLORS.textPrimary, fontSize: 14 },

  chipRow:      { paddingHorizontal: 16, gap: 6, paddingBottom: 2 },
  chip:         { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  chipActive:   { backgroundColor: PRIMARY, borderColor: PRIMARY },
  chipText:     { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  chipTextActive:{ color: '#fff' },

  filterRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginTop: 8, marginBottom: 6 },
  smallChip:         { paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  smallChipActive:   { backgroundColor: PRIMARY + '20', borderColor: PRIMARY },
  smallChipText:     { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  smallChipTextActive: { color: PRIMARY },
  iconChip:          { width: 30, height: 30, borderRadius: RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  iconChipActive:    { backgroundColor: PRIMARY + '20', borderColor: PRIMARY },

  countText: { fontSize: 12, color: COLORS.textMuted },
  list: { padding: 16, gap: 14, paddingBottom: 40 },

  card: { backgroundColor: GLASS, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: GLASS_BORDER, padding: 16, ...SHADOWS.sm },
  cardTop:   { flexDirection: 'row', marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary, lineHeight: 20 },
  cardDesc:  { fontSize: 13, color: COLORS.textMuted, lineHeight: 18, marginTop: 4 },

  statusBadge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },

  progressLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  progressBg:    { height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' },
  progressFill:  { height: '100%', backgroundColor: PRIMARY, borderRadius: 3 },

  tag:     { paddingHorizontal: 10, paddingVertical: 3, backgroundColor: PRIMARY + '20', borderRadius: RADIUS.full },
  tagText: { fontSize: 11, color: PRIMARY, fontWeight: '600' },

  techTag:     { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: PRIMARY + '15', borderRadius: RADIUS.full, borderWidth: 1, borderColor: PRIMARY + '30' },
  techTagText: { fontSize: 11, color: PRIMARY, fontWeight: '600' },

  categoryChip:     { paddingHorizontal: 10, paddingVertical: 3, backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.border },
  categoryChipText: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '600' },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12, marginTop: 4, flexWrap: 'wrap', gap: 8 },
  metaText:   { fontSize: 11, color: COLORS.textMuted },

  detailsBtn:     { paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: PRIMARY },
  detailsBtnText: { fontSize: 12, color: PRIMARY, fontWeight: '600' },
  actionBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.md },
  actionBtnText:  { fontSize: 12, color: '#fff', fontWeight: '700' },

  creatorBadge:     { paddingHorizontal: 7, paddingVertical: 2, backgroundColor: '#7C3AED20', borderRadius: RADIUS.sm },
  creatorBadgeText: { fontSize: 9, fontWeight: '800', color: '#7C3AED' },
  creatorAvatar:     { width: 20, height: 20, borderRadius: 10, backgroundColor: PRIMARY, justifyContent: 'center', alignItems: 'center' },
  creatorAvatarText: { fontSize: 10, fontWeight: '700', color: '#fff' },

  pendingBadge:     { paddingHorizontal: 8, paddingVertical: 2, backgroundColor: COLORS.warning + '20', borderRadius: RADIUS.full },
  pendingBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.warning },

  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginTop: 12 },
  emptyDesc:  { fontSize: 13, color: COLORS.textMuted, marginTop: 4, textAlign: 'center' },

  certCard:    { backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: PRIMARY + '50', padding: 16, marginBottom: 16 },
  certTitle:   { fontSize: 18, fontWeight: '900', color: COLORS.textPrimary, marginBottom: 12 },
  certSub:     { fontSize: 13, color: COLORS.textMuted },
  certDesc:    { fontSize: 12, color: COLORS.textMuted },
  downloadCertBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: PRIMARY, paddingVertical: 12, borderRadius: RADIUS.md },
  downloadCertText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  sectionTitle:{ fontSize: 17, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 12 },
  taskRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: COLORS.border, gap: 8 },
  taskIdx:     { fontSize: 14, color: COLORS.success, fontWeight: '700', width: 24 },
  taskTitle:   { flex: 1, fontSize: 13, color: COLORS.textPrimary, fontWeight: '600' },
  verifiedBadge: { paddingHorizontal: 8, paddingVertical: 3, backgroundColor: COLORS.success + '20', borderRadius: RADIUS.full },
  verifiedText:  { fontSize: 10, color: COLORS.success, fontWeight: '700' },
  projTag:     { paddingHorizontal: 8, paddingVertical: 2, backgroundColor: PRIMARY, borderRadius: RADIUS.full },
  projTagText: { fontSize: 9, color: '#fff', fontWeight: '800' },

  subTabRow:       { flexDirection: 'row', marginHorizontal: 16, marginBottom: 10, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 3, borderWidth: 1, borderColor: COLORS.border },
  subTab:          { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: RADIUS.md },
  subTabActive:    { backgroundColor: PRIMARY },
  subTabText:      { fontSize: 13, fontWeight: '700', color: COLORS.textMuted },
  subTabTextActive:{ color: '#fff' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet:   { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalHandle:  { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  modalTitle:   { fontSize: 20, fontWeight: '900', color: COLORS.textPrimary },
  modalSub:     { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  fieldLabel:   { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6 },
  fieldInput:   { backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, padding: 12, color: COLORS.textPrimary, fontSize: 13, marginBottom: 14, minHeight: 48 },
  applyBtn:     { backgroundColor: PRIMARY, borderRadius: RADIUS.lg, padding: 14, alignItems: 'center', marginTop: 4, marginBottom: 16 },
  applyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
