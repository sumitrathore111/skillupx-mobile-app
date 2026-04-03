import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import {
    fetchProjectById,
    fetchProjectJoinRequests,
    respondToJoinRequest,
} from '@services/creatorService';
import {
    createBoardTask,
    createSprint,
    deleteBoardTask,
    deleteProjectFile,
    getBoardTasks,
    getGitHubActivity,
    getGitHubStatus,
    getLeaderboard,
    getProjectActivity,
    getProjectFiles,
    getProjectMembers,
    getProjectMessages,
    getSprints,
    moveBoardTask,
    removeMember,
    sendProjectMessage,
    updateIdeaStatus,
    uploadProjectFile,
} from '@services/projectsService';
import { useAuthStore } from '@store/authStore';
import * as DocumentPicker from 'expo-document-picker';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Linking,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ───────────────────────────── Types ─────────────────────────────
type Tab = 'board' | 'sprints' | 'github' | 'members' | 'files' | 'chat' | 'activity' | 'analytics';

interface JoinRequestItem {
  id: string;
  _id?: string;
  userId: string;
  userName: string;
  userEmail: string;
  requestedAt?: string;
  createdAt?: string;
  skills?: string;
  experience?: string;
  motivation?: string;
  message?: string;
  status: string;
}

// ───────────────────────────── Constants ──────────────────────────
const COLUMNS = ['To Do', 'In Progress', 'In Review', 'Done'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const PRIORITY_COLORS: Record<string, string> = {
  low: '#4CAF50',
  medium: '#FF9800',
  high: '#FF5722',
  critical: '#F44336',
};

const ACTIVITY_ICONS: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  task_created: { icon: 'add-circle', color: COLORS.success },
  task_updated: { icon: 'create', color: COLORS.primary },
  task_completed: { icon: 'checkmark-circle', color: COLORS.success },
  task_deleted: { icon: 'trash', color: COLORS.danger },
  task_moved: { icon: 'swap-horizontal', color: COLORS.warning },
  task_commented: { icon: 'chatbubble', color: '#6366F1' },
  sprint_started: { icon: 'play-circle', color: COLORS.primary },
  sprint_completed: { icon: 'flag', color: COLORS.success },
  member_joined: { icon: 'person-add', color: COLORS.primary },
  file_uploaded: { icon: 'cloud-upload', color: '#8B5CF6' },
  time_logged: { icon: 'time', color: COLORS.warning },
  github_push: { icon: 'git-commit', color: '#6B7280' },
  github_commit: { icon: 'git-commit', color: '#6B7280' },
  github_pr_opened: { icon: 'git-pull-request', color: '#3B82F6' },
  github_pr_merged: { icon: 'git-merge', color: '#8B5CF6' },
  github_pr_closed: { icon: 'git-pull-request', color: COLORS.danger },
  github_issue_opened: { icon: 'alert-circle', color: COLORS.success },
  github_issue_closed: { icon: 'checkmark-circle', color: '#8B5CF6' },
  github_review: { icon: 'chatbox', color: COLORS.warning },
};

export default function ProjectWorkspaceScreen() {
  const route = useRoute<any>();
  const { projectId, projectTitle } = route.params || {};
  const { user } = useAuthStore();

  // ── Core state
  const [activeTab, setActiveTab] = useState<Tab>('board');
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [isProjectCompleted, setIsProjectCompleted] = useState(false);
  const [markingCompleted, setMarkingCompleted] = useState(false);

  // ── Board state
  const [tasks, setTasks] = useState<any[]>([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', status: 'To Do', priority: 'medium', assignee: '' });

  // ── Sprint state
  const [sprints, setSprints] = useState<any[]>([]);
  const [showAddSprint, setShowAddSprint] = useState(false);
  const [newSprint, setNewSprint] = useState({ name: '', goal: '', startDate: '', endDate: '' });

  // ── Chat state
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');

  // ── Files state
  const [files, setFiles] = useState<any[]>([]);

  // ── Analytics state
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  // ── Members & join requests state
  const [members, setMembers] = useState<any[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequestItem[]>([]);

  // ── GitHub state
  const [githubConnected, setGithubConnected] = useState(false);
  const [githubRepoFullName, setGithubRepoFullName] = useState<string | undefined>();
  const [githubActivity, setGithubActivity] = useState<any[]>([]);

  // ── Activity state
  const [activities, setActivities] = useState<any[]>([]);

  // ── Tabs config (memoized so badge updates)
  const TABS = useMemo(() => {
    const tabs: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap; badge?: number; connected?: boolean }[] = [
      { key: 'board', label: 'Board', icon: 'grid' },
      { key: 'sprints', label: 'Sprints', icon: 'layers' },
      { key: 'github', label: 'GitHub', icon: 'git-branch', connected: githubConnected },
      { key: 'members', label: 'Members', icon: 'people', badge: isCreator ? joinRequests.filter(r => r.status === 'pending').length : 0 },
      { key: 'files', label: 'Files', icon: 'folder' },
      { key: 'chat', label: 'Chat', icon: 'chatbubbles' },
      { key: 'activity', label: 'Activity', icon: 'pulse' },
      { key: 'analytics', label: 'Stats', icon: 'bar-chart' },
    ];
    return tabs;
  }, [githubConnected, isCreator, joinRequests]);

  // ───────────────────── Data loaders ─────────────────────
  const loadProject = useCallback(async () => {
    try {
      const data = await fetchProjectById(projectId);
      setProject(data);
      const currentId = user?.id || (user as any)?._id;
      const ownerId = data?.owner || data?.creatorId || (data as any)?.createdBy || (data as any)?.userId;
      setIsCreator(!!(currentId && ownerId && String(ownerId) === String(currentId)));
      setIsProjectCompleted(data?.isCompleted || data?.status === 'completed');
    } catch (e) { console.error('loadProject', e); }
  }, [projectId, user]);

  const loadMembers = useCallback(async () => {
    try {
      const data = await getProjectMembers(projectId);
      setMembers(data || []);
      const currentId = user?.id || (user as any)?._id;
      const ownerMember = (data || []).find((m: any) => String(m.userId) === String(currentId) && m.role === 'owner');
      if (ownerMember) setIsCreator(true);
    } catch (e) { console.error('loadMembers', e); }
  }, [projectId, user]);

  const loadJoinRequests = useCallback(async () => {
    try {
      const data = await fetchProjectJoinRequests(projectId);
      const mapped: JoinRequestItem[] = (data || []).map((r: any) => ({
        id: r._id || r.id,
        _id: r._id,
        userId: r.userId?._id || r.userId,
        userName: r.userId?.name || r.userName || 'Unknown',
        userEmail: r.userId?.email || r.userEmail || '',
        requestedAt: r.createdAt || r.requestedAt,
        skills: r.skills,
        experience: r.experience,
        motivation: r.motivation || r.message,
        message: r.message,
        status: r.status || 'pending',
      }));
      setJoinRequests(mapped.filter(r => r.status === 'pending'));
    } catch (e) { console.error('loadJoinRequests', e); }
  }, [projectId]);

  const loadGitHubStatus = useCallback(async () => {
    try {
      const data = await getGitHubStatus(projectId);
      setGithubConnected(data.connected);
      if (data.repoFullName) setGithubRepoFullName(data.repoFullName);
    } catch { /* ignore */ }
  }, [projectId]);

  const loadBoard = useCallback(async () => {
    try { const data = await getBoardTasks(projectId); setTasks(data || []); } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [projectId]);

  const loadSprints = useCallback(async () => {
    try { const data = await getSprints(projectId); setSprints(data || []); } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [projectId]);

  const loadChat = useCallback(async () => {
    try { const data = await getProjectMessages(projectId); setMessages(data || []); } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [projectId]);

  const loadFiles = useCallback(async () => {
    try { const data = await getProjectFiles(projectId); setFiles(data || []); } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [projectId]);

  const loadAnalytics = useCallback(async () => {
    try { const data = await getLeaderboard(); setLeaderboard(data || []); } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  const loadGitHubActivity = useCallback(async () => {
    try { const data = await getGitHubActivity(projectId); setGithubActivity(data || []); } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [projectId]);

  const loadActivity = useCallback(async () => {
    try {
      const [projectActs, ghActs] = await Promise.all([
        getProjectActivity(projectId),
        githubConnected ? getGitHubActivity(projectId) : Promise.resolve([]),
      ]);
      const ghFormatted = (ghActs || []).map((a: any) => ({
        ...a,
        type: `github_${a.eventType}${a.action ? '_' + a.action : ''}`,
        userName: a.sender?.login || 'GitHub',
        title: formatGitHubTitle(a),
        isGitHub: true,
      }));
      const combined = [...(projectActs || []), ...ghFormatted].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setActivities(combined);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [projectId, githubConnected]);

  // ── Initial load
  useEffect(() => {
    loadProject();
    loadMembers();
    loadJoinRequests();
    loadGitHubStatus();
  }, [loadProject, loadMembers, loadJoinRequests, loadGitHubStatus]);

  // ── Tab switch loader
  useEffect(() => {
    setLoading(true);
    switch (activeTab) {
      case 'board': loadBoard(); break;
      case 'sprints': loadSprints(); break;
      case 'chat': loadChat(); break;
      case 'files': loadFiles(); break;
      case 'analytics': loadBoard().then(loadAnalytics); break;
      case 'github': loadGitHubActivity(); break;
      case 'members': loadMembers().then(() => loadJoinRequests()).then(() => setLoading(false)); break;
      case 'activity': loadActivity(); break;
    }
  }, [activeTab]);

  // ───────────────────── Handlers ─────────────────────
  const handleAddTask = async () => {
    if (!newTask.title.trim()) return;
    try {
      await createBoardTask(projectId, newTask as any);
      setShowAddTask(false);
      setNewTask({ title: '', description: '', status: 'To Do', priority: 'medium', assignee: '' });
      loadBoard();
    } catch (e: any) { Alert.alert('Error', e.message || 'Failed'); }
  };

  const handleMoveTask = async (taskId: string, newStatus: string) => {
    try { await moveBoardTask(projectId, taskId, newStatus); loadBoard(); } catch (e) { console.error(e); }
  };

  const handleDeleteTask = (taskId: string) => {
    Alert.alert('Delete Task', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await deleteBoardTask(projectId, taskId); loadBoard(); } catch (e) { console.error(e); } } },
    ]);
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !user) return;
    try { await sendProjectMessage(projectId, chatInput.trim()); setChatInput(''); loadChat(); } catch (e) { console.error(e); }
  };

  const handleAddSprint = async () => {
    if (!newSprint.name.trim()) return;
    try {
      await createSprint(projectId, newSprint);
      setShowAddSprint(false);
      setNewSprint({ name: '', goal: '', startDate: '', endDate: '' });
      loadSprints();
    } catch (e: any) { Alert.alert('Error', e.message || 'Failed'); }
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      await respondToJoinRequest(requestId, 'approved');
      setJoinRequests(prev => prev.filter(r => r.id !== requestId && r._id !== requestId));
      loadMembers();
      Alert.alert('Approved', 'Request approved! User has been added to the project.');
    } catch (e: any) { Alert.alert('Error', e.message || 'Failed to approve'); }
  };

  const handleRejectRequest = async (requestId: string) => {
    Alert.alert('Reject Request', 'Are you sure you want to reject this request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject', style: 'destructive', onPress: async () => {
          try {
            await respondToJoinRequest(requestId, 'rejected');
            setJoinRequests(prev => prev.filter(r => r.id !== requestId && r._id !== requestId));
            Alert.alert('Rejected', 'Request has been rejected.');
          } catch (e: any) { Alert.alert('Error', e.message || 'Failed to reject'); }
        },
      },
    ]);
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    Alert.alert('Remove Member', `Remove ${memberName} from the project?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          try { await removeMember(projectId, memberId); loadMembers(); } catch (e: any) { Alert.alert('Error', e.message || 'Failed'); }
        },
      },
    ]);
  };

  const handleMarkCompleted = () => {
    const ideaId = project?.ideaId || project?._id || projectId;
    if (!ideaId) { Alert.alert('Error', 'Cannot mark as completed: Project not linked to an idea'); return; }
    Alert.alert(
      'Mark Completed',
      'Mark this project as completed? This will show a completed badge on the project.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete', onPress: async () => {
            setMarkingCompleted(true);
            try {
              await updateIdeaStatus(ideaId, 'completed');
              setIsProjectCompleted(true);
              Alert.alert('Success', 'Project marked as completed!');
            } catch (e: any) { Alert.alert('Error', e.message || 'Failed to mark completed'); }
            finally { setMarkingCompleted(false); }
          },
        },
      ],
    );
  };

  const handleUploadFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.length) return;
      const file = result.assets[0];
      const formData = new FormData();
      formData.append('file', { uri: file.uri, name: file.name, type: file.mimeType || 'application/octet-stream' } as any);
      await uploadProjectFile(projectId, formData);
      loadFiles();
    } catch (e: any) { Alert.alert('Error', e.message || 'Upload failed'); }
  };

  const handleDeleteFile = (fileId: string, fileName: string) => {
    Alert.alert('Delete File', `Delete "${fileName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await deleteProjectFile(projectId, fileId); loadFiles(); } catch (e) { console.error(e); } } },
    ]);
  };

  // ───────────────────── Helpers ──────────────────────
  function formatGitHubTitle(activity: any): string {
    const type = activity.eventType;
    const action = activity.action;
    if (type === 'push') return `pushed ${activity.payload?.commits?.length || 0} commit(s)`;
    if (type === 'pull_request' && action === 'opened') return `opened PR: ${activity.payload?.title || ''}`;
    if (type === 'pull_request' && action === 'closed' && activity.payload?.merged) return `merged PR: ${activity.payload?.title || ''}`;
    if (type === 'pull_request' && action === 'closed') return `closed PR: ${activity.payload?.title || ''}`;
    if (type === 'issues' && action === 'opened') return `opened issue: ${activity.payload?.title || ''}`;
    if (type === 'issues' && action === 'closed') return `closed issue: ${activity.payload?.title || ''}`;
    if (type === 'pull_request_review') return `reviewed PR: ${activity.payload?.title || ''}`;
    return `${type} ${action || ''}`.trim();
  }

  function getDateGroup(dateStr: string): string {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }

  function getInitials(name: string): string {
    return name?.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || '?';
  }

  // ═══════════════════ RENDER: Board Tab ═══════════════════
  const renderBoard = () => (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 80 }}>
      {COLUMNS.map(col => {
        const colTasks = tasks.filter(t => t.status === col);
        return (
          <View key={col} style={styles.column}>
            <View style={styles.colHeader}>
              <Text style={styles.colTitle}>{col}</Text>
              <View style={styles.countBadge}><Text style={styles.countText}>{colTasks.length}</Text></View>
            </View>
            {colTasks.map(task => (
              <View key={task._id || task.id} style={styles.taskCard}>
                <View style={styles.taskTop}>
                  <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLORS[task.priority] || COLORS.textMuted }]} />
                  <Text style={styles.taskTitle} numberOfLines={2}>{task.title}</Text>
                </View>
                {task.description ? <Text style={styles.taskDesc} numberOfLines={2}>{task.description}</Text> : null}
                {task.assigneeName ? (
                  <View style={styles.assigneeRow}>
                    <View style={styles.assigneeAvatar}><Text style={styles.assigneeInitial}>{getInitials(task.assigneeName)}</Text></View>
                    <Text style={styles.assigneeText}>{task.assigneeName}</Text>
                  </View>
                ) : null}
                {task.labels?.length ? (
                  <View style={styles.labelsRow}>
                    {task.labels.slice(0, 3).map((l: string, i: number) => (
                      <View key={i} style={styles.labelChip}><Text style={styles.labelText}>{l}</Text></View>
                    ))}
                  </View>
                ) : null}
                <View style={styles.taskActions}>
                  {COLUMNS.filter(c => c !== col).map(c => (
                    <TouchableOpacity key={c} onPress={() => handleMoveTask(task._id || task.id, c)} style={styles.moveBtn}>
                      <Text style={styles.moveBtnText}>{c === 'Done' ? '✓' : '→'} {c.split(' ').map(w => w[0]).join('')}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity onPress={() => handleDeleteTask(task._id || task.id)}>
                    <Ionicons name="trash-outline" size={14} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        );
      })}
    </ScrollView>
  );

  // ═══════════════════ RENDER: Sprints Tab ═══════════════════
  const renderSprints = () => (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 80 }}>
      {sprints.length === 0 ? (
        <View style={styles.emptyCenter}><Ionicons name="layers-outline" size={48} color={COLORS.textMuted} /><Text style={styles.emptyText}>No sprints yet</Text></View>
      ) : sprints.map((sprint, idx) => (
        <View key={sprint._id || idx} style={styles.sprintCard}>
          <View style={styles.sprintHeader}>
            <Text style={styles.sprintName}>{sprint.name}</Text>
            <View style={[styles.statusChip, { backgroundColor: sprint.status === 'active' ? COLORS.success + '20' : COLORS.textMuted + '20' }]}>
              <Text style={[styles.statusChipText, { color: sprint.status === 'active' ? COLORS.success : COLORS.textMuted }]}>{sprint.status || 'planned'}</Text>
            </View>
          </View>
          {sprint.goal ? <Text style={styles.sprintGoal}>{sprint.goal}</Text> : null}
          {sprint.tasks?.length ? (
            <View style={styles.sprintStats}>
              <Ionicons name="list" size={12} color={COLORS.textMuted} />
              <Text style={styles.sprintStatText}>{sprint.tasks.length} task{sprint.tasks.length !== 1 ? 's' : ''}</Text>
            </View>
          ) : null}
          {sprint.startDate ? (
            <Text style={styles.sprintDate}>
              {new Date(sprint.startDate).toLocaleDateString()} — {sprint.endDate ? new Date(sprint.endDate).toLocaleDateString() : 'Ongoing'}
            </Text>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );

  // ═══════════════════ RENDER: GitHub Tab ═══════════════════
  const renderGitHub = () => {
    if (!githubConnected) {
      return (
        <View style={styles.emptyCenter}>
          <Ionicons name="git-branch-outline" size={56} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>GitHub Not Connected</Text>
          <Text style={styles.emptySubtext}>Connect a GitHub repository from the website to enable integration.</Text>
        </View>
      );
    }
    return (
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 80 }}>
        {/* Repo Info */}
        <TouchableOpacity
          style={styles.githubRepoCard}
          onPress={() => githubRepoFullName && Linking.openURL(`https://github.com/${githubRepoFullName}`)}
        >
          <Ionicons name="logo-github" size={24} color={COLORS.textPrimary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.githubRepoName}>{githubRepoFullName}</Text>
            <Text style={styles.githubRepoLink}>Tap to open on GitHub</Text>
          </View>
          <View style={styles.connectedDot} />
        </TouchableOpacity>

        {/* Recent Activity */}
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {githubActivity.length === 0 ? (
          <View style={styles.emptyMini}><Text style={styles.emptyText}>No recent activity</Text></View>
        ) : (
          githubActivity.slice(0, 20).map((act, idx) => {
            const typeKey = `github_${act.eventType}${act.action ? '_' + act.action : ''}`;
            const info = ACTIVITY_ICONS[typeKey] || ACTIVITY_ICONS.github_push || { icon: 'git-commit' as const, color: '#6B7280' };
            return (
              <View key={act._id || idx} style={styles.activityRow}>
                <View style={[styles.activityIcon, { backgroundColor: info.color + '20' }]}>
                  <Ionicons name={info.icon} size={14} color={info.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityText} numberOfLines={2}>
                    <Text style={styles.activityUser}>{act.sender?.login || 'GitHub'} </Text>
                    {formatGitHubTitle(act)}
                  </Text>
                  <Text style={styles.activityTime}>{new Date(act.createdAt).toLocaleString()}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    );
  };

  // ═══════════════════ RENDER: Members Tab ═══════════════════
  const renderMembers = () => (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 80 }}>
      {/* Pending Join Requests (Owner Only) */}
      {isCreator && joinRequests.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Pending Requests</Text>
            <View style={styles.pendingBadge}><Text style={styles.pendingBadgeText}>{joinRequests.length}</Text></View>
          </View>
          {joinRequests.map(req => (
            <View key={req.id} style={styles.requestCard}>
              <View style={styles.requestTop}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberInitial}>{getInitials(req.userName)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>{req.userName}</Text>
                  <Text style={styles.memberEmail}>{req.userEmail}</Text>
                  {req.requestedAt ? <Text style={styles.requestDate}>Requested {new Date(req.requestedAt).toLocaleDateString()}</Text> : null}
                </View>
              </View>
              {req.message || req.motivation ? (
                <View style={styles.requestMessage}>
                  <Text style={styles.requestMessageText}>"{req.message || req.motivation}"</Text>
                </View>
              ) : null}
              {req.skills ? <Text style={styles.requestDetail}>Skills: {req.skills}</Text> : null}
              {req.experience ? <Text style={styles.requestDetail}>Experience: {req.experience}</Text> : null}
              <View style={styles.requestActions}>
                <TouchableOpacity style={styles.approveBtn} onPress={() => handleApproveRequest(req.id)}>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                  <Text style={styles.approveBtnText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.rejectBtn} onPress={() => handleRejectRequest(req.id)}>
                  <Ionicons name="close" size={16} color="#fff" />
                  <Text style={styles.rejectBtnText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Team Members */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Team Members ({members.length})</Text>
        {members.length === 0 ? (
          <View style={styles.emptyMini}><Text style={styles.emptyText}>No members yet</Text></View>
        ) : (
          members.map((member, idx) => {
            const currentId = user?.id || (user as any)?._id;
            const isSelf = String(member.userId) === String(currentId);
            return (
              <View key={member.userId || idx} style={styles.memberRow}>
                <View style={[styles.memberAvatar, member.role === 'owner' && { borderColor: COLORS.primary, borderWidth: 2 }]}>
                  <Text style={styles.memberInitial}>{getInitials(member.name || 'U')}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.memberName}>{member.name || 'Member'}</Text>
                    {isSelf && <Text style={styles.youBadge}>You</Text>}
                  </View>
                  <Text style={styles.memberRole}>{member.role || 'member'}</Text>
                </View>
                {isCreator && !isSelf && member.role !== 'owner' && (
                  <TouchableOpacity onPress={() => handleRemoveMember(member.userId, member.name)} style={styles.removeMemberBtn}>
                    <Ionicons name="person-remove-outline" size={16} color={COLORS.danger} />
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );

  // ═══════════════════ RENDER: Chat Tab ═══════════════════
  const renderChat = () => (
    <View style={{ flex: 1 }}>
      <FlatList
        data={messages}
        keyExtractor={(i, idx) => i._id || String(idx)}
        contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 8 }}
        renderItem={({ item }) => {
          const isMe = item.senderId === user?.id || item.senderId === (user as any)?._id;
          return (
            <View style={[styles.chatBubbleRow, isMe && { alignSelf: 'flex-end' }]}>
              <View style={[styles.chatBubble, isMe ? { backgroundColor: COLORS.primary } : { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border }]}>
                {!isMe && <Text style={styles.chatSender}>{item.senderName}</Text>}
                <Text style={[styles.chatMsg, isMe && { color: '#fff' }]}>{item.content || item.message}</Text>
                <Text style={[styles.chatTime, isMe && { color: 'rgba(255,255,255,0.6)' }]}>
                  {new Date(item.createdAt || item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<View style={styles.emptyCenter}><Ionicons name="chatbubbles-outline" size={48} color={COLORS.textMuted} /><Text style={styles.emptyText}>No messages yet</Text></View>}
      />
      <View style={styles.chatInputRow}>
        <TextInput
          style={styles.chatInput}
          value={chatInput}
          onChangeText={setChatInput}
          placeholder="Type a message..."
          placeholderTextColor={COLORS.textMuted}
          multiline
        />
        <TouchableOpacity style={[styles.chatSendBtn, !chatInput.trim() && { opacity: 0.4 }]} onPress={handleSendMessage} disabled={!chatInput.trim()}>
          <Ionicons name="send" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // ═══════════════════ RENDER: Files Tab ═══════════════════
  const renderFiles = () => (
    <View style={{ flex: 1 }}>
      <FlatList
        data={files}
        keyExtractor={(i, idx) => i._id || String(idx)}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 80 }}
        renderItem={({ item }) => {
          const ext = (item.name || item.filename || '').split('.').pop()?.toLowerCase();
          let icon: keyof typeof Ionicons.glyphMap = 'document-outline';
          if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) icon = 'image-outline';
          else if (['mp4', 'mov', 'avi', 'mkv'].includes(ext || '')) icon = 'videocam-outline';
          else if (['mp3', 'wav', 'ogg'].includes(ext || '')) icon = 'musical-notes-outline';
          else if (['js', 'ts', 'py', 'java', 'cpp', 'html', 'css', 'json'].includes(ext || '')) icon = 'code-outline';
          else if (['zip', 'rar', 'tar', 'gz'].includes(ext || '')) icon = 'archive-outline';
          return (
            <View style={styles.fileCard}>
              <Ionicons name={icon} size={22} color={COLORS.accent} />
              <View style={{ flex: 1 }}>
                <Text style={styles.fileName} numberOfLines={1}>{item.name || item.filename}</Text>
                <Text style={styles.fileMeta}>
                  {item.size ? `${(item.size / 1024).toFixed(1)} KB` : ''}
                  {item.size ? ' · ' : ''}
                  {new Date(item.uploadedAt || item.createdAt).toLocaleDateString()}
                </Text>
              </View>
              {isCreator && (
                <TouchableOpacity onPress={() => handleDeleteFile(item._id || item.id, item.name || item.filename)}>
                  <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                </TouchableOpacity>
              )}
            </View>
          );
        }}
        ListEmptyComponent={<View style={styles.emptyCenter}><Ionicons name="folder-open-outline" size={48} color={COLORS.textMuted} /><Text style={styles.emptyText}>No files uploaded</Text></View>}
      />
    </View>
  );

  // ═══════════════════ RENDER: Activity Tab ═══════════════════
  const renderActivity = () => {
    if (activities.length === 0) {
      return (
        <View style={styles.emptyCenter}>
          <Ionicons name="pulse-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>No activity yet</Text>
        </View>
      );
    }

    // Group by date
    const groups: Record<string, any[]> = {};
    activities.forEach(act => {
      const group = getDateGroup(act.createdAt);
      if (!groups[group]) groups[group] = [];
      groups[group].push(act);
    });

    return (
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 80 }}>
        {Object.entries(groups).map(([dateLabel, items]) => (
          <View key={dateLabel} style={styles.activityGroup}>
            <Text style={styles.activityDateLabel}>{dateLabel}</Text>
            {items.map((act, idx) => {
              const typeKey = act.type || 'task_created';
              const info = ACTIVITY_ICONS[typeKey] || { icon: 'ellipse' as const, color: COLORS.textMuted };
              return (
                <View key={act._id || idx} style={styles.activityRow}>
                  <View style={[styles.activityIcon, { backgroundColor: info.color + '20' }]}>
                    <Ionicons name={info.icon} size={14} color={info.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.activityText} numberOfLines={2}>
                      <Text style={styles.activityUser}>{act.userName || 'Someone'} </Text>
                      {act.title || act.description || typeKey.replace(/_/g, ' ')}
                    </Text>
                    <Text style={styles.activityTime}>{new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                  </View>
                  {act.isGitHub && act.githubUrl ? (
                    <TouchableOpacity onPress={() => Linking.openURL(act.githubUrl)}>
                      <Ionicons name="open-outline" size={14} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
    );
  };

  // ═══════════════════ RENDER: Analytics Tab ═══════════════════
  const renderAnalytics = () => {
    const totalTasks = tasks.length;
    const doneTasks = tasks.filter(t => t.status === 'Done').length;
    const inProgress = tasks.filter(t => t.status === 'In Progress').length;
    const inReview = tasks.filter(t => t.status === 'In Review').length;
    const completion = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    return (
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 80 }}>
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {[
            { label: 'Total Tasks', value: totalTasks, icon: 'list' as const, color: COLORS.primary },
            { label: 'Completed', value: doneTasks, icon: 'checkmark-circle' as const, color: COLORS.success },
            { label: 'In Progress', value: inProgress, icon: 'time' as const, color: COLORS.warning },
            { label: 'In Review', value: inReview, icon: 'eye' as const, color: '#8B5CF6' },
            { label: 'Completion', value: `${completion}%`, icon: 'pie-chart' as const, color: COLORS.accent },
            { label: 'Members', value: members.length, icon: 'people' as const, color: '#6366F1' },
          ].map(s => (
            <View key={s.label} style={styles.statCard}>
              <Ionicons name={s.icon} size={20} color={s.color} />
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <Text style={styles.sectionTitle}>Project Progress</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${completion}%` }]} />
          </View>
          <Text style={styles.progressText}>{completion}% complete ({doneTasks}/{totalTasks} tasks)</Text>
        </View>

        {/* Priority Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tasks by Priority</Text>
          {PRIORITIES.map(p => {
            const count = tasks.filter(t => t.priority === p).length;
            return (
              <View key={p} style={styles.priorityRow}>
                <View style={[styles.priorityDotLg, { backgroundColor: PRIORITY_COLORS[p] }]} />
                <Text style={styles.priorityLabel}>{p.charAt(0).toUpperCase() + p.slice(1)}</Text>
                <Text style={styles.priorityCount}>{count}</Text>
              </View>
            );
          })}
        </View>

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Team Leaderboard</Text>
            {leaderboard.map((member, idx) => (
              <View key={member._id || member.userId || idx} style={styles.leaderRow}>
                <Text style={styles.leaderRank}>#{idx + 1}</Text>
                <View style={styles.leaderAvatar}><Text style={styles.memberInitial}>{getInitials(member.name || 'M')}</Text></View>
                <Text style={styles.leaderName}>{member.name || 'Member'}</Text>
                <Text style={styles.leaderScore}>{member.tasksCompleted || member.totalScore || member.score || 0}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    );
  };

  // ═══════════════════ MAIN RENDER ═══════════════════
  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle} numberOfLines={1}>{projectTitle || project?.title || 'Project Workspace'}</Text>
          {isCreator && !isProjectCompleted && (
            <TouchableOpacity style={styles.completeBtn} onPress={handleMarkCompleted} disabled={markingCompleted}>
              <Ionicons name="checkmark-circle" size={16} color="#fff" />
              <Text style={styles.completeBtnText}>{markingCompleted ? 'Marking...' : 'Complete'}</Text>
            </TouchableOpacity>
          )}
          {isProjectCompleted && (
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
              <Text style={styles.completedBadgeText}>Completed</Text>
            </View>
          )}
        </View>

        <View style={styles.headerMeta}>
          {githubConnected && githubRepoFullName && (
            <TouchableOpacity style={styles.githubBadge} onPress={() => Linking.openURL(`https://github.com/${githubRepoFullName}`)}>
              <Ionicons name="git-branch" size={12} color={COLORS.primary} />
              <Text style={styles.githubBadgeText}>{githubRepoFullName.split('/')[1]}</Text>
            </TouchableOpacity>
          )}
          <View style={styles.memberAvatars}>
            {members.slice(0, 4).map((m, i) => (
              <View key={m.userId || i} style={[styles.miniAvatar, { marginLeft: i > 0 ? -8 : 0, zIndex: 4 - i }]}>
                <Text style={styles.miniAvatarText}>{getInitials(m.name || 'U')}</Text>
              </View>
            ))}
            {members.length > 4 && (
              <View style={[styles.miniAvatar, { marginLeft: -8, backgroundColor: COLORS.surfaceElevated }]}>
                <Text style={styles.miniAvatarText}>+{members.length - 4}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* ── Tabs ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons name={tab.icon} size={14} color={activeTab === tab.key ? COLORS.primary : COLORS.textMuted} />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
            {tab.badge && tab.badge > 0 ? (
              <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{tab.badge}</Text></View>
            ) : null}
            {tab.connected ? <View style={styles.tabConnectedDot} /> : null}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Content ── */}
      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <>
          {activeTab === 'board' && renderBoard()}
          {activeTab === 'sprints' && renderSprints()}
          {activeTab === 'github' && renderGitHub()}
          {activeTab === 'members' && renderMembers()}
          {activeTab === 'chat' && renderChat()}
          {activeTab === 'files' && renderFiles()}
          {activeTab === 'activity' && renderActivity()}
          {activeTab === 'analytics' && renderAnalytics()}
        </>
      )}

      {/* ── FABs ── */}
      {activeTab === 'board' && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowAddTask(true)}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      )}
      {activeTab === 'sprints' && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowAddSprint(true)}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      )}
      {activeTab === 'files' && (
        <TouchableOpacity style={styles.fab} onPress={handleUploadFile}>
          <Ionicons name="cloud-upload" size={22} color="#fff" />
        </TouchableOpacity>
      )}

      {/* ══════════ Add Task Modal ══════════ */}
      <Modal visible={showAddTask} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Task</Text>
              <TouchableOpacity onPress={() => setShowAddTask(false)}><Ionicons name="close" size={24} color={COLORS.textPrimary} /></TouchableOpacity>
            </View>
            <TextInput style={styles.modalInput} value={newTask.title} onChangeText={v => setNewTask(p => ({ ...p, title: v }))}
              placeholder="Task title..." placeholderTextColor={COLORS.textMuted} />
            <TextInput style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]} value={newTask.description}
              onChangeText={v => setNewTask(p => ({ ...p, description: v }))} placeholder="Description..." placeholderTextColor={COLORS.textMuted} multiline />
            <Text style={styles.modalLabel}>Status</Text>
            <View style={styles.chipRow}>
              {COLUMNS.map(col => (
                <TouchableOpacity key={col} style={[styles.chip, newTask.status === col && styles.chipActive]}
                  onPress={() => setNewTask(p => ({ ...p, status: col }))}>
                  <Text style={[styles.chipText, newTask.status === col && { color: '#fff' }]}>{col}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.modalLabel}>Priority</Text>
            <View style={styles.chipRow}>
              {PRIORITIES.map(p => (
                <TouchableOpacity key={p} style={[styles.chip, newTask.priority === p && { backgroundColor: PRIORITY_COLORS[p] }]}
                  onPress={() => setNewTask(prev => ({ ...prev, priority: p }))}>
                  <Text style={[styles.chipText, newTask.priority === p && { color: '#fff' }]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.modalLabel}>Assignee</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              <TouchableOpacity style={[styles.chip, !newTask.assignee && styles.chipActive]}
                onPress={() => setNewTask(p => ({ ...p, assignee: '' }))}>
                <Text style={[styles.chipText, !newTask.assignee && { color: '#fff' }]}>Unassigned</Text>
              </TouchableOpacity>
              {members.map(m => (
                <TouchableOpacity key={m.userId} style={[styles.chip, newTask.assignee === m.userId && styles.chipActive]}
                  onPress={() => setNewTask(p => ({ ...p, assignee: m.userId }))}>
                  <Text style={[styles.chipText, newTask.assignee === m.userId && { color: '#fff' }]}>{m.name || 'Member'}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalBtn} onPress={handleAddTask}><Text style={styles.modalBtnText}>Create Task</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══════════ Add Sprint Modal ══════════ */}
      <Modal visible={showAddSprint} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Sprint</Text>
              <TouchableOpacity onPress={() => setShowAddSprint(false)}><Ionicons name="close" size={24} color={COLORS.textPrimary} /></TouchableOpacity>
            </View>
            <TextInput style={styles.modalInput} value={newSprint.name} onChangeText={v => setNewSprint(p => ({ ...p, name: v }))}
              placeholder="Sprint name..." placeholderTextColor={COLORS.textMuted} />
            <TextInput style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]} value={newSprint.goal}
              onChangeText={v => setNewSprint(p => ({ ...p, goal: v }))} placeholder="Sprint goal..." placeholderTextColor={COLORS.textMuted} multiline />
            <TouchableOpacity style={styles.modalBtn} onPress={handleAddSprint}><Text style={styles.modalBtnText}>Create Sprint</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ═══════════════════════════ STYLES ═══════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyCenter: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginTop: 8 },
  emptySubtext: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 40 },
  emptyText: { fontSize: 13, color: COLORS.textMuted },
  emptyMini: { alignItems: 'center', paddingVertical: 20 },

  // ── Header
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 8 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  completeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: COLORS.success, borderRadius: RADIUS.md },
  completeBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  completedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: COLORS.success + '20', borderRadius: RADIUS.md },
  completedBadgeText: { fontSize: 12, fontWeight: '700', color: COLORS.success },
  githubBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: COLORS.primary + '15', borderRadius: RADIUS.full },
  githubBadgeText: { fontSize: 11, fontWeight: '600', color: COLORS.primary },
  memberAvatars: { flexDirection: 'row', alignItems: 'center' },
  miniAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.background },
  miniAvatarText: { fontSize: 9, fontWeight: '700', color: '#fff' },

  // ── Tabs
  tabsRow: { flexDirection: 'row', gap: 4, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.full, backgroundColor: COLORS.surface },
  tabActive: { backgroundColor: COLORS.primary + '20' },
  tabText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  tabTextActive: { color: COLORS.primary },
  tabBadge: { minWidth: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.danger, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  tabBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
  tabConnectedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.success },

  // ── Board
  column: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 12, borderWidth: 1, borderColor: COLORS.border, gap: 8 },
  colHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  colTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  countBadge: { backgroundColor: COLORS.primary + '20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.full },
  countText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  taskCard: { backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: 10, borderWidth: 1, borderColor: COLORS.border, gap: 6 },
  taskTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  taskTitle: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  taskDesc: { fontSize: 11, color: COLORS.textMuted, lineHeight: 16 },
  assigneeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  assigneeAvatar: { width: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.primary + '30', justifyContent: 'center', alignItems: 'center' },
  assigneeInitial: { fontSize: 8, fontWeight: '700', color: COLORS.primary },
  assigneeText: { fontSize: 10, color: COLORS.textMuted },
  labelsRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  labelChip: { paddingHorizontal: 6, paddingVertical: 2, backgroundColor: COLORS.primary + '15', borderRadius: RADIUS.sm },
  labelText: { fontSize: 9, color: COLORS.primary, fontWeight: '600' },
  taskActions: { flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' },
  moveBtn: { paddingHorizontal: 6, paddingVertical: 3, backgroundColor: COLORS.primary + '15', borderRadius: RADIUS.sm },
  moveBtnText: { fontSize: 9, color: COLORS.primary, fontWeight: '600' },

  // ── Sprints
  sprintCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 8 },
  sprintHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sprintName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  statusChipText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  sprintGoal: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  sprintStats: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sprintStatText: { fontSize: 11, color: COLORS.textMuted },
  sprintDate: { fontSize: 11, color: COLORS.textMuted },

  // ── GitHub
  githubRepoCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  githubRepoName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  githubRepoLink: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  connectedDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.success },

  // ── Members
  section: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: COLORS.border, gap: 12 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  pendingBadge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.danger, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  pendingBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  requestCard: { backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: 12, borderWidth: 1, borderColor: COLORS.warning + '40', gap: 8 },
  requestTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  requestDate: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  requestMessage: { backgroundColor: COLORS.surfaceElevated, padding: 8, borderRadius: RADIUS.sm, borderLeftWidth: 3, borderLeftColor: COLORS.warning },
  requestMessageText: { fontSize: 12, color: COLORS.textSecondary, fontStyle: 'italic' },
  requestDetail: { fontSize: 11, color: COLORS.textMuted },
  requestActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, backgroundColor: COLORS.success, borderRadius: RADIUS.md },
  approveBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, backgroundColor: COLORS.danger, borderRadius: RADIUS.md },
  rejectBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  memberAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary + '30', justifyContent: 'center', alignItems: 'center' },
  memberInitial: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  memberName: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  memberEmail: { fontSize: 11, color: COLORS.textMuted },
  memberRole: { fontSize: 11, color: COLORS.textMuted, textTransform: 'capitalize' },
  youBadge: { fontSize: 9, fontWeight: '700', color: COLORS.primary, backgroundColor: COLORS.primary + '20', paddingHorizontal: 6, paddingVertical: 1, borderRadius: RADIUS.full, overflow: 'hidden' },
  removeMemberBtn: { padding: 6 },

  // ── Chat
  chatBubbleRow: { maxWidth: '80%', alignSelf: 'flex-start' },
  chatBubble: { padding: 10, borderRadius: RADIUS.lg },
  chatSender: { fontSize: 11, fontWeight: '700', color: COLORS.accent, marginBottom: 2 },
  chatMsg: { fontSize: 14, color: COLORS.textPrimary, lineHeight: 20 },
  chatTime: { fontSize: 10, color: COLORS.textMuted, marginTop: 4, alignSelf: 'flex-end' },
  chatInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.surface },
  chatInput: { flex: 1, backgroundColor: COLORS.background, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 10, color: COLORS.textPrimary, fontSize: 14, maxHeight: 80, borderWidth: 1, borderColor: COLORS.border },
  chatSendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },

  // ── Files
  fileCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  fileName: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  fileMeta: { fontSize: 11, color: COLORS.textMuted },

  // ── Activity
  activityGroup: { gap: 10 },
  activityDateLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  activityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 6 },
  activityIcon: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  activityText: { fontSize: 13, color: COLORS.textPrimary, lineHeight: 18 },
  activityUser: { fontWeight: '700' },
  activityTime: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },

  // ── Analytics
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '47%', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: COLORS.border },
  statValue: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  statLabel: { fontSize: 11, color: COLORS.textMuted },
  progressSection: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: COLORS.border, gap: 10 },
  progressBar: { height: 8, backgroundColor: COLORS.background, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.success, borderRadius: 4 },
  progressText: { fontSize: 12, color: COLORS.textMuted },
  priorityRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  priorityDotLg: { width: 10, height: 10, borderRadius: 5 },
  priorityLabel: { flex: 1, fontSize: 13, color: COLORS.textPrimary },
  priorityCount: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  leaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  leaderRank: { fontSize: 14, fontWeight: '800', color: COLORS.primary, width: 30 },
  leaderAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primary + '20', justifyContent: 'center', alignItems: 'center' },
  leaderName: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  leaderScore: { fontSize: 12, fontWeight: '600', color: COLORS.accent },

  // ── FAB
  fab: { position: 'absolute', bottom: 20, right: 20, width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', elevation: 5 },

  // ── Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 12, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  modalInput: { backgroundColor: COLORS.background, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 12, color: COLORS.textPrimary, fontSize: 14, borderWidth: 1, borderColor: COLORS.border },
  modalLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  modalBtn: { backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: RADIUS.md, alignItems: 'center', marginTop: 8 },
  modalBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
