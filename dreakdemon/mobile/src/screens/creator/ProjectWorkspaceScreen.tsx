import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  fetchProjectById,
  fetchProjectJoinRequests,
  respondToJoinRequest,
} from '@services/creatorService';
import {
  completeSprint,
  createBoardTask,
  createIssue,
  createSprint,
  deleteBoardTask,
  deleteMessage,
  deleteProjectFile,
  disconnectProjectFromGitHub,
  editMessage,
  getBoardTasks,
  getGitHubActivity,
  getGitHubCollaborators,
  getGitHubStatus,
  getLeaderboard,
  getProjectActivity,
  getProjectAnalytics,
  getProjectFiles,
  getProjectIssues,
  getProjectMembers,
  getProjectMessages,
  getRepoBranches,
  getRepoCommits,
  getRepoContributors,
  getRepoPulls,
  getSprints,
  inviteGitHubCollaborator,
  moveBoardTask,
  removeGitHubCollaborator,
  removeMember,
  sendProjectMessage,
  startSprint,
  updateIdeaStatus,
  updateIssueStatus,
  updateSprint,
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
type Tab = 'board' | 'sprints' | 'github' | 'members' | 'files' | 'chat' | 'activity' | 'analytics' | 'issues';

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

const LABEL_OPTIONS = ['bug', 'feature', 'enhancement', 'documentation', 'design', 'testing', 'refactor', 'urgent'];

export default function ProjectWorkspaceScreen() {
  const navigation = useNavigation<any>();
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
  const [newTask, setNewTask] = useState({ title: '', description: '', status: 'To Do', priority: 'medium', assignees: [] as string[], labels: [] as string[], dueDate: '', estimatedHours: '', storyPoints: '' });
  const [boardSearch, setBoardSearch] = useState('');
  const [boardPriorityFilter, setBoardPriorityFilter] = useState('all');
  const [boardAssigneeFilter, setBoardAssigneeFilter] = useState('all');

  // ── Sprint state
  const [sprints, setSprints] = useState<any[]>([]);
  const [showAddSprint, setShowAddSprint] = useState(false);
  const [newSprint, setNewSprint] = useState({ name: '', goal: '', startDate: '', endDate: '' });
  const [editingSprint, setEditingSprint] = useState<any>(null);

  // ── Chat state
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // ── Files state
  const [files, setFiles] = useState<any[]>([]);
  const [fileSearch, setFileSearch] = useState('');
  const [fileViewMode, setFileViewMode] = useState<'list' | 'grid'>('list');

  // ── Analytics state
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsView, setAnalyticsView] = useState<'tasks' | 'github'>('tasks');

  // ── Members & join requests state
  const [members, setMembers] = useState<any[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequestItem[]>([]);

  // ── GitHub state
  const [githubConnected, setGithubConnected] = useState(false);
  const [githubRepoFullName, setGithubRepoFullName] = useState<string | undefined>();
  const [githubActivity, setGithubActivity] = useState<any[]>([]);
  const [githubSubTab, setGithubSubTab] = useState<'activity' | 'commits' | 'prs' | 'branches' | 'collaborators'>('activity');
  const [githubCommits, setGithubCommits] = useState<any[]>([]);
  const [githubPRs, setGithubPRs] = useState<any[]>([]);
  const [githubBranches, setGithubBranches] = useState<any[]>([]);
  const [githubContributors, setGithubContributors] = useState<any[]>([]);
  const [githubCollaborators, setGithubCollaborators] = useState<any[]>([]);
  const [collabUsername, setCollabUsername] = useState('');

  // ── Activity state
  const [activities, setActivities] = useState<any[]>([]);

  // ── Issues state
  const [issues, setIssues] = useState<any[]>([]);
  const [showAddIssue, setShowAddIssue] = useState(false);
  const [newIssue, setNewIssue] = useState({ title: '', description: '' });

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
      { key: 'issues', label: 'Issues', icon: 'alert-circle', badge: issues.filter((i: any) => i.status === 'open').length },
      { key: 'analytics', label: 'Stats', icon: 'bar-chart' },
    ];
    return tabs;
  }, [githubConnected, isCreator, joinRequests, issues]);

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
    try {
      const [lb, analytics] = await Promise.all([
        getLeaderboard(),
        getProjectAnalytics(projectId).catch(() => null),
      ]);
      setLeaderboard(lb || []);
      setAnalyticsData(analytics);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [projectId]);

  const loadGitHubActivity = useCallback(async () => {
    try {
      const data = await getGitHubActivity(projectId);
      setGithubActivity(data || []);
      // Also load repo data if connected
      if (githubRepoFullName) {
        const [owner, repo] = githubRepoFullName.split('/');
        if (owner && repo) {
          const [commits, prs, branches, contributors, collaborators] = await Promise.all([
            getRepoCommits(owner, repo),
            getRepoPulls(owner, repo),
            getRepoBranches(owner, repo),
            getRepoContributors(owner, repo),
            getGitHubCollaborators(projectId),
          ]);
          setGithubCommits(commits);
          setGithubPRs(prs);
          setGithubBranches(branches);
          setGithubContributors(contributors);
          setGithubCollaborators(collaborators);
        }
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [projectId, githubRepoFullName]);

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

  const loadIssues = useCallback(async () => {
    try {
      const data = await getProjectIssues(projectId);
      setIssues(data || []);
    } catch (e) { console.error('loadIssues', e); }
  }, [projectId]);

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
      case 'issues': loadIssues().then(() => setLoading(false)); break;
    }
  }, [activeTab]);

  // ───────────────────── Handlers ─────────────────────
  const handleAddTask = async () => {
    if (!newTask.title.trim()) return;
    try {
      const taskData: any = {
        title: newTask.title,
        description: newTask.description,
        status: newTask.status,
        priority: newTask.priority,
        assignees: newTask.assignees,
        labels: newTask.labels,
      };
      if (newTask.dueDate) taskData.dueDate = newTask.dueDate;
      if (newTask.estimatedHours) taskData.estimatedHours = parseFloat(newTask.estimatedHours);
      if (newTask.storyPoints) taskData.storyPoints = parseInt(newTask.storyPoints, 10);
      await createBoardTask(projectId, taskData);
      setShowAddTask(false);
      setNewTask({ title: '', description: '', status: 'To Do', priority: 'medium', assignees: [], labels: [], dueDate: '', estimatedHours: '', storyPoints: '' });
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
    // If editing, update existing message
    if (editingMessage) {
      try {
        await editMessage(projectId, editingMessage, chatInput.trim());
        setEditingMessage(null);
        setChatInput('');
        loadChat();
      } catch (e) { console.error(e); }
      return;
    }
    try { await sendProjectMessage(projectId, chatInput.trim()); setChatInput(''); loadChat(); } catch (e) { console.error(e); }
  };

  const handleEditMessage = (messageId: string, currentText: string) => {
    setEditingMessage(messageId);
    setChatInput(currentText);
  };

  const handleDeleteMessage = (messageId: string) => {
    Alert.alert('Delete Message', 'Are you sure you want to delete this message?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteMessage(projectId, messageId); loadChat(); } catch (e) { console.error(e); }
      }},
    ]);
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setChatInput('');
  };

  const handleConnectGitHub = () => {
    navigation.navigate('GitHubConnect', { projectId, projectTitle });
  };

  const handleDisconnectGitHub = () => {
    Alert.alert(
      'Disconnect GitHub',
      'Are you sure you want to disconnect this repository? Sync will be stopped.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              await disconnectProjectFromGitHub(projectId);
              setGithubConnected(false);
              setGithubRepoFullName(undefined);
              setGithubActivity([]);
              Alert.alert('Disconnected', 'GitHub repository has been disconnected.');
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to disconnect');
            }
          },
        },
      ],
    );
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

  const handleStartSprint = async (sprintId: string) => {
    Alert.alert('Start Sprint', 'Start this sprint? It will become active.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Start', onPress: async () => {
        try { await startSprint(sprintId); loadSprints(); } catch (e: any) { Alert.alert('Error', e.message || 'Failed to start sprint'); }
      }},
    ]);
  };

  const handleCompleteSprint = async (sprintId: string) => {
    Alert.alert('Complete Sprint', 'Mark this sprint as completed?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Complete', onPress: async () => {
        try { await completeSprint(sprintId); loadSprints(); } catch (e: any) { Alert.alert('Error', e.message || 'Failed to complete sprint'); }
      }},
    ]);
  };

  const handleEditSprint = async () => {
    if (!editingSprint || !editingSprint.name.trim()) return;
    try {
      await updateSprint(projectId, editingSprint._id || editingSprint.id, {
        name: editingSprint.name,
        goal: editingSprint.goal,
        startDate: editingSprint.startDate,
        endDate: editingSprint.endDate,
      });
      setEditingSprint(null);
      loadSprints();
    } catch (e: any) { Alert.alert('Error', e.message || 'Failed to edit sprint'); }
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
  const renderBoard = () => {
    const searchLower = boardSearch.toLowerCase().trim();
    let filteredTasks = tasks;
    if (searchLower) {
      filteredTasks = filteredTasks.filter(t =>
        (t.title || '').toLowerCase().includes(searchLower) ||
        (t.description || '').toLowerCase().includes(searchLower) ||
        (t.assigneeName || '').toLowerCase().includes(searchLower) ||
        (t.labels || []).some((l: string) => l.toLowerCase().includes(searchLower))
      );
    }
    if (boardPriorityFilter !== 'all') {
      filteredTasks = filteredTasks.filter(t => t.priority === boardPriorityFilter);
    }
    if (boardAssigneeFilter !== 'all') {
      if (boardAssigneeFilter === 'unassigned') {
        filteredTasks = filteredTasks.filter(t => !t.assigneeName && (!t.assignees || t.assignees.length === 0));
      } else {
        filteredTasks = filteredTasks.filter(t => t.assigneeName === boardAssigneeFilter || (t.assignees || []).some((a: any) => (a.name || a) === boardAssigneeFilter));
      }
    }

    return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 80 }}>
      {/* Search Bar */}
      <View style={styles.boardSearchRow}>
        <Ionicons name="search-outline" size={16} color={COLORS.textMuted} />
        <TextInput
          style={styles.boardSearchInput}
          placeholder="Search tasks..."
          placeholderTextColor={COLORS.textMuted}
          value={boardSearch}
          onChangeText={setBoardSearch}
        />
        {boardSearch.length > 0 && (
          <TouchableOpacity onPress={() => setBoardSearch('')}>
            <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters Row */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {['all', ...PRIORITIES].map(p => (
            <TouchableOpacity key={p} style={[styles.chip, boardPriorityFilter === p && (p === 'all' ? styles.chipActive : { backgroundColor: PRIORITY_COLORS[p] })]}
              onPress={() => setBoardPriorityFilter(p)}>
              <Text style={[styles.chipText, boardPriorityFilter === p && { color: '#fff' }]}>{p === 'all' ? 'All Priority' : p}</Text>
            </TouchableOpacity>
          ))}
          <View style={{ width: 1, backgroundColor: COLORS.border, marginHorizontal: 4 }} />
          {['all', 'unassigned', ...members.map(m => m.name || 'Member')].map((a, i) => (
            <TouchableOpacity key={`${a}-${i}`} style={[styles.chip, boardAssigneeFilter === a && styles.chipActive]}
              onPress={() => setBoardAssigneeFilter(a)}>
              <Text style={[styles.chipText, boardAssigneeFilter === a && { color: '#fff' }]}>{a === 'all' ? 'All Members' : a === 'unassigned' ? 'Unassigned' : a}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {COLUMNS.map(col => {
        const colTasks = filteredTasks.filter(t => t.status === col);
        return (
          <View key={col} style={styles.column}>
            <View style={styles.colHeader}>
              <Text style={styles.colTitle}>{col}</Text>
              <View style={styles.countBadge}><Text style={styles.countText}>{colTasks.length}</Text></View>
            </View>
            {colTasks.map(task => (
              <TouchableOpacity
                key={task._id || task.id}
                style={styles.taskCard}
                onPress={() => navigation.navigate('TaskDetail', { taskId: task._id || task.id, projectId, isCreator })}
                activeOpacity={0.8}
              >
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
                  {COLUMNS.filter(c => c !== col).filter(c => c !== 'Done' || isCreator).map(c => (
                    <TouchableOpacity key={c} onPress={() => handleMoveTask(task._id || task.id, c)} style={styles.moveBtn}>
                      <Text style={styles.moveBtnText}>{c === 'Done' ? '✓' : '→'} {c.split(' ').map(w => w[0]).join('')}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity onPress={() => handleDeleteTask(task._id || task.id)}>
                    <Ionicons name="trash-outline" size={14} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        );
      })}
    </ScrollView>
    );
  };

  // ═══════════════════ RENDER: Sprints Tab ═══════════════════
  const renderSprints = () => {
    // Compute velocity: avg tasks per completed sprint
    const completedSprints = sprints.filter(s => s.status === 'completed');
    const totalCompletedTasks = completedSprints.reduce((sum, s) => sum + (s.tasks?.length || 0), 0);
    const velocity = completedSprints.length > 0 ? (totalCompletedTasks / completedSprints.length).toFixed(1) : '—';

    return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 80 }}>
      {/* Sprint Velocity Summary */}
      {sprints.length > 0 && (
        <View style={styles.sprintSummary}>
          <View style={styles.sprintSummaryItem}>
            <Ionicons name="layers" size={16} color={COLORS.primary} />
            <Text style={styles.sprintSummaryValue}>{sprints.length}</Text>
            <Text style={styles.sprintSummaryLabel}>Total</Text>
          </View>
          <View style={styles.sprintSummaryItem}>
            <Ionicons name="play-circle" size={16} color={COLORS.success} />
            <Text style={styles.sprintSummaryValue}>{sprints.filter(s => s.status === 'active').length}</Text>
            <Text style={styles.sprintSummaryLabel}>Active</Text>
          </View>
          <View style={styles.sprintSummaryItem}>
            <Ionicons name="checkmark-circle" size={16} color="#8B5CF6" />
            <Text style={styles.sprintSummaryValue}>{completedSprints.length}</Text>
            <Text style={styles.sprintSummaryLabel}>Done</Text>
          </View>
          <View style={styles.sprintSummaryItem}>
            <Ionicons name="speedometer" size={16} color={COLORS.warning} />
            <Text style={styles.sprintSummaryValue}>{velocity}</Text>
            <Text style={styles.sprintSummaryLabel}>Velocity</Text>
          </View>
        </View>
      )}

      {sprints.length === 0 ? (
        <View style={styles.emptyCenter}><Ionicons name="layers-outline" size={48} color={COLORS.textMuted} /><Text style={styles.emptyText}>No sprints yet</Text></View>
      ) : sprints.map((sprint, idx) => {
        const sprintTasks = sprint.tasks || [];
        const completedCount = sprintTasks.filter((t: any) => t.status === 'Done' || t.completed).length;
        const totalCount = sprintTasks.length;
        const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
        return (
        <View key={sprint._id || idx} style={styles.sprintCard}>
          <View style={styles.sprintHeader}>
            <Text style={styles.sprintName}>{sprint.name}</Text>
            <View style={[styles.statusChip, { backgroundColor: sprint.status === 'active' ? COLORS.success + '20' : sprint.status === 'completed' ? '#8B5CF620' : COLORS.textMuted + '20' }]}>
              <Text style={[styles.statusChipText, { color: sprint.status === 'active' ? COLORS.success : sprint.status === 'completed' ? '#8B5CF6' : COLORS.textMuted }]}>{sprint.status || 'planned'}</Text>
            </View>
          </View>
          {sprint.goal ? <Text style={styles.sprintGoal}>{sprint.goal}</Text> : null}
          {totalCount > 0 && (
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={styles.sprintStatText}>{completedCount}/{totalCount} tasks</Text>
                <Text style={[styles.sprintStatText, { color: COLORS.primary, fontWeight: '700' }]}>{pct}%</Text>
              </View>
              <View style={styles.sprintProgressBar}>
                <View style={[styles.sprintProgressFill, { width: `${pct}%` as any }]} />
              </View>
            </View>
          )}
          {!totalCount && sprint.tasks?.length !== undefined && (
            <View style={styles.sprintStats}>
              <Ionicons name="list" size={12} color={COLORS.textMuted} />
              <Text style={styles.sprintStatText}>{sprint.tasks.length} task{sprint.tasks.length !== 1 ? 's' : ''}</Text>
            </View>
          )}
          {sprint.startDate ? (
            <Text style={styles.sprintDate}>
              {new Date(sprint.startDate).toLocaleDateString()} — {sprint.endDate ? new Date(sprint.endDate).toLocaleDateString() : 'Ongoing'}
            </Text>
          ) : null}
          {/* Sprint Action Buttons (Creator only) */}
          {isCreator && (sprint.status === 'planning' || sprint.status === 'planned' || !sprint.status) && (
            <TouchableOpacity style={styles.sprintActionBtn} onPress={() => handleStartSprint(sprint._id || sprint.id)}>
              <Ionicons name="play-circle" size={16} color="#fff" />
              <Text style={styles.sprintActionText}>Start Sprint</Text>
            </TouchableOpacity>
          )}
          {isCreator && sprint.status === 'active' && (
            <TouchableOpacity style={[styles.sprintActionBtn, { backgroundColor: '#8B5CF6' }]} onPress={() => handleCompleteSprint(sprint._id || sprint.id)}>
              <Ionicons name="flag" size={16} color="#fff" />
              <Text style={styles.sprintActionText}>Complete Sprint</Text>
            </TouchableOpacity>
          )}
          {isCreator && (
            <TouchableOpacity style={[styles.sprintActionBtn, { backgroundColor: COLORS.surfaceElevated }]} onPress={() => setEditingSprint({ ...sprint, _id: sprint._id || sprint.id })}>
              <Ionicons name="create-outline" size={16} color={COLORS.primary} />
              <Text style={[styles.sprintActionText, { color: COLORS.primary }]}>Edit Sprint</Text>
            </TouchableOpacity>
          )}
        </View>
        );
      })}
    </ScrollView>
    );
  };

  // ═══════════════════ RENDER: GitHub Tab ═══════════════════
  const renderGitHub = () => {
    if (!githubConnected) {
      return (
        <View style={styles.emptyCenter}>
          <Ionicons name="git-branch-outline" size={56} color={COLORS.textMuted} />
          <Text style={styles.emptyTitle}>GitHub Not Connected</Text>
          <Text style={styles.emptySubtext}>Connect your GitHub repository to sync commits, pull requests, and issues.</Text>
          {isCreator && (
            <TouchableOpacity style={styles.connectGithubBtn} onPress={handleConnectGitHub}>
              <Ionicons name="logo-github" size={18} color="#fff" />
              <Text style={styles.connectGithubText}>Connect GitHub</Text>
            </TouchableOpacity>
          )}
          <View style={styles.githubFeaturesList}>
            {[
              { icon: 'git-commit' as const, text: 'Track commits & pushes' },
              { icon: 'git-pull-request' as const, text: 'Monitor pull requests' },
              { icon: 'alert-circle' as const, text: 'Sync issues automatically' },
              { icon: 'pulse' as const, text: 'Activity feed integration' },
            ].map((f, i) => (
              <View key={i} style={styles.githubFeatureRow}>
                <Ionicons name={f.icon} size={14} color={COLORS.primary} />
                <Text style={styles.githubFeatureText}>{f.text}</Text>
              </View>
            ))}
          </View>
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

        {/* Disconnect Button (Creator only) */}
        {isCreator && (
          <TouchableOpacity style={styles.disconnectGithubBtn} onPress={handleDisconnectGitHub}>
            <Ionicons name="unlink-outline" size={16} color={COLORS.danger} />
            <Text style={styles.disconnectGithubText}>Disconnect Repository</Text>
          </TouchableOpacity>
        )}

        {/* GitHub Sub-Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {([
            { key: 'activity', label: 'Activity', icon: 'pulse' },
            { key: 'commits', label: 'Commits', icon: 'git-commit' },
            { key: 'prs', label: 'PRs', icon: 'git-pull-request' },
            { key: 'branches', label: 'Branches', icon: 'git-branch' },
            { key: 'collaborators', label: 'Collaborators', icon: 'people' },
          ] as const).map(st => (
            <TouchableOpacity key={st.key} style={[styles.chip, githubSubTab === st.key && styles.chipActive]}
              onPress={() => setGithubSubTab(st.key)}>
              <Ionicons name={st.icon} size={12} color={githubSubTab === st.key ? '#fff' : COLORS.textMuted} />
              <Text style={[styles.chipText, githubSubTab === st.key && { color: '#fff' }]}>{st.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* GitHub Sub-Tab Content */}
        {githubSubTab === 'activity' && (
          <>
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
          </>
        )}

        {githubSubTab === 'commits' && (
          <>
            <Text style={styles.sectionTitle}>Commits ({githubCommits.length})</Text>
            {githubCommits.length === 0 ? (
              <View style={styles.emptyMini}><Text style={styles.emptyText}>No commits found</Text></View>
            ) : (
              githubCommits.slice(0, 30).map((c, idx) => (
                <TouchableOpacity key={c.sha || idx} style={styles.githubItemCard}
                  onPress={() => c.html_url && Linking.openURL(c.html_url)}>
                  <Ionicons name="git-commit" size={16} color="#6B7280" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.githubItemTitle} numberOfLines={2}>{c.commit?.message || c.message || 'Commit'}</Text>
                    <Text style={styles.githubItemMeta}>{c.commit?.author?.name || c.author?.login || 'Unknown'} · {new Date(c.commit?.author?.date || c.date).toLocaleDateString()}</Text>
                  </View>
                  <Text style={styles.githubSha}>{(c.sha || '').substring(0, 7)}</Text>
                </TouchableOpacity>
              ))
            )}
          </>
        )}

        {githubSubTab === 'prs' && (
          <>
            <Text style={styles.sectionTitle}>Pull Requests ({githubPRs.length})</Text>
            {githubPRs.length === 0 ? (
              <View style={styles.emptyMini}><Text style={styles.emptyText}>No pull requests</Text></View>
            ) : (
              githubPRs.map((pr, idx) => (
                <TouchableOpacity key={pr.id || idx} style={styles.githubItemCard}
                  onPress={() => pr.html_url && Linking.openURL(pr.html_url)}>
                  <Ionicons name={pr.merged ? 'git-merge' : pr.state === 'closed' ? 'git-pull-request' : 'git-pull-request'}
                    size={16} color={pr.merged ? '#8B5CF6' : pr.state === 'closed' ? COLORS.danger : '#3B82F6'} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.githubItemTitle} numberOfLines={2}>{pr.title}</Text>
                    <Text style={styles.githubItemMeta}>#{pr.number} by {pr.user?.login || 'Unknown'} · {pr.state}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </>
        )}

        {githubSubTab === 'branches' && (
          <>
            <Text style={styles.sectionTitle}>Branches ({githubBranches.length})</Text>
            {githubBranches.length === 0 ? (
              <View style={styles.emptyMini}><Text style={styles.emptyText}>No branches found</Text></View>
            ) : (
              githubBranches.map((b, idx) => (
                <View key={b.name || idx} style={styles.githubItemCard}>
                  <Ionicons name="git-branch" size={16} color={COLORS.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.githubItemTitle}>{b.name}</Text>
                  </View>
                  {b.protected && (
                    <View style={[styles.statusChip, { backgroundColor: COLORS.warning + '20' }]}>
                      <Text style={[styles.statusChipText, { color: COLORS.warning }]}>Protected</Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </>
        )}

        {githubSubTab === 'collaborators' && (
          <>
            <Text style={styles.sectionTitle}>Collaborators ({githubCollaborators.length})</Text>
            {isCreator && (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput style={[styles.modalInput, { flex: 1 }]} value={collabUsername} onChangeText={setCollabUsername}
                  placeholder="GitHub username..." placeholderTextColor={COLORS.textMuted} />
                <TouchableOpacity style={[styles.modalBtn, { paddingHorizontal: 16, marginTop: 0 }]}
                  onPress={async () => {
                    if (!collabUsername.trim()) return;
                    try {
                      await inviteGitHubCollaborator(projectId, collabUsername.trim());
                      setCollabUsername('');
                      Alert.alert('Invited', `Invitation sent to ${collabUsername.trim()}`);
                      loadGitHubActivity();
                    } catch (e: any) { Alert.alert('Error', e.message || 'Failed to invite'); }
                  }}>
                  <Text style={styles.modalBtnText}>Invite</Text>
                </TouchableOpacity>
              </View>
            )}
            {githubCollaborators.length === 0 ? (
              <View style={styles.emptyMini}><Text style={styles.emptyText}>No collaborators</Text></View>
            ) : (
              githubCollaborators.map((c, idx) => (
                <View key={c.login || c.id || idx} style={styles.githubItemCard}>
                  <View style={styles.memberAvatar}><Text style={styles.memberInitial}>{getInitials(c.login || 'U')}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.githubItemTitle}>{c.login}</Text>
                    <Text style={styles.githubItemMeta}>{c.role_name || c.permissions?.admin ? 'Admin' : 'Collaborator'}</Text>
                  </View>
                  {isCreator && (
                    <TouchableOpacity onPress={() => {
                      Alert.alert('Remove', `Remove ${c.login} as collaborator?`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Remove', style: 'destructive', onPress: async () => {
                          try { await removeGitHubCollaborator(projectId, c.login); loadGitHubActivity(); } catch (e: any) { Alert.alert('Error', e.message || 'Failed'); }
                        }},
                      ]);
                    }}>
                      <Ionicons name="person-remove-outline" size={16} color={COLORS.danger} />
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}

            {/* Contributors */}
            {githubContributors.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Contributors ({githubContributors.length})</Text>
                {githubContributors.map((c, idx) => (
                  <View key={c.login || c.id || idx} style={styles.githubItemCard}>
                    <View style={styles.memberAvatar}><Text style={styles.memberInitial}>{getInitials(c.login || 'U')}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.githubItemTitle}>{c.login}</Text>
                      <Text style={styles.githubItemMeta}>{c.contributions || 0} contributions</Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    );
  };

  // ═══════════════════ RENDER: Members Tab ═══════════════════
  const renderMembers = () => (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 80 }}>
      {/* Invite Members Button (Creator/Admin only) */}
      {isCreator && (
        <TouchableOpacity
          style={styles.inviteMemberBtn}
          onPress={() => navigation.navigate('InviteMember', { projectId, projectTitle })}
        >
          <Ionicons name="person-add" size={18} color="#fff" />
          <Text style={styles.inviteMemberText}>Invite Members</Text>
        </TouchableOpacity>
      )}

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
          const msgId = item._id || item.id;
          return (
            <View style={[styles.chatBubbleRow, isMe && { alignSelf: 'flex-end' }]}>
              <TouchableOpacity
                style={[styles.chatBubble, isMe ? { backgroundColor: COLORS.primary } : { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border }]}
                activeOpacity={0.8}
                onLongPress={() => {
                  if (isMe) {
                    Alert.alert('Message', undefined, [
                      { text: 'Edit', onPress: () => handleEditMessage(msgId, item.content || item.message || '') },
                      { text: 'Delete', style: 'destructive', onPress: () => handleDeleteMessage(msgId) },
                      { text: 'Cancel', style: 'cancel' },
                    ]);
                  }
                }}
              >
                {!isMe && <Text style={styles.chatSender}>{item.senderName}</Text>}
                <Text style={[styles.chatMsg, isMe && { color: '#fff' }]}>{item.content || item.message}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end' }}>
                  {item.edited && <Text style={[styles.chatTime, isMe && { color: 'rgba(255,255,255,0.6)' }]}>edited</Text>}
                  <Text style={[styles.chatTime, isMe && { color: 'rgba(255,255,255,0.6)' }]}>
                    {new Date(item.createdAt || item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={<View style={styles.emptyCenter}><Ionicons name="chatbubbles-outline" size={48} color={COLORS.textMuted} /><Text style={styles.emptyText}>No messages yet</Text></View>}
      />
      {/* Edit banner */}
      {editingMessage && (
        <View style={styles.editBanner}>
          <Ionicons name="create-outline" size={14} color={COLORS.primary} />
          <Text style={styles.editBannerText}>Editing message</Text>
          <TouchableOpacity onPress={handleCancelEdit}>
            <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.chatInputRow}>
        <TextInput
          style={styles.chatInput}
          value={chatInput}
          onChangeText={setChatInput}
          placeholder={editingMessage ? 'Edit message...' : 'Type a message...'}
          placeholderTextColor={COLORS.textMuted}
          multiline
        />
        <TouchableOpacity style={[styles.chatSendBtn, !chatInput.trim() && { opacity: 0.4 }]} onPress={handleSendMessage} disabled={!chatInput.trim()}>
          <Ionicons name={editingMessage ? 'checkmark' : 'send'} size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // ═══════════════════ RENDER: Files Tab ═══════════════════
  const renderFiles = () => {
    const searchLower = fileSearch.toLowerCase().trim();
    const filteredFiles = searchLower
      ? files.filter(f => (f.name || f.filename || '').toLowerCase().includes(searchLower))
      : files;

    const getFileIcon = (item: any): keyof typeof Ionicons.glyphMap => {
      const ext = (item.name || item.filename || '').split('.').pop()?.toLowerCase();
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) return 'image-outline';
      if (['mp4', 'mov', 'avi', 'mkv'].includes(ext || '')) return 'videocam-outline';
      if (['mp3', 'wav', 'ogg'].includes(ext || '')) return 'musical-notes-outline';
      if (['js', 'ts', 'py', 'java', 'cpp', 'html', 'css', 'json'].includes(ext || '')) return 'code-outline';
      if (['zip', 'rar', 'tar', 'gz'].includes(ext || '')) return 'archive-outline';
      if (['pdf', 'doc', 'docx', 'txt'].includes(ext || '')) return 'document-text-outline';
      return 'document-outline';
    };

    return (
    <View style={{ flex: 1 }}>
      {/* Search & view toggle */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 12 }}>
        <View style={[styles.boardSearchRow, { flex: 1 }]}>
          <Ionicons name="search-outline" size={16} color={COLORS.textMuted} />
          <TextInput
            style={styles.boardSearchInput}
            placeholder="Search files..."
            placeholderTextColor={COLORS.textMuted}
            value={fileSearch}
            onChangeText={setFileSearch}
          />
          {fileSearch.length > 0 && (
            <TouchableOpacity onPress={() => setFileSearch('')}>
              <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={() => setFileViewMode(v => v === 'list' ? 'grid' : 'list')} style={{ padding: 8, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border }}>
          <Ionicons name={fileViewMode === 'list' ? 'grid-outline' : 'list-outline'} size={18} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {fileViewMode === 'list' ? (
        <FlatList
          data={filteredFiles}
          keyExtractor={(i, idx) => i._id || String(idx)}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 80 }}
          renderItem={({ item }) => (
            <View style={styles.fileCard}>
              <Ionicons name={getFileIcon(item)} size={22} color={COLORS.accent} />
              <View style={{ flex: 1 }}>
                <Text style={styles.fileName} numberOfLines={1}>{item.name || item.filename}</Text>
                <Text style={styles.fileMeta}>
                  {item.size ? `${(item.size / 1024).toFixed(1)} KB` : ''}
                  {item.size ? ' · ' : ''}
                  {item.uploaderName ? `${item.uploaderName} · ` : ''}
                  {new Date(item.uploadedAt || item.createdAt).toLocaleDateString()}
                </Text>
              </View>
              {(item.url || item.fileUrl) && (
                <TouchableOpacity onPress={() => Linking.openURL(item.url || item.fileUrl)} style={styles.fileDownloadBtn}>
                  <Ionicons name="download-outline" size={18} color={COLORS.primary} />
                </TouchableOpacity>
              )}
              {isCreator && (
                <TouchableOpacity onPress={() => handleDeleteFile(item._id || item.id, item.name || item.filename)}>
                  <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                </TouchableOpacity>
              )}
            </View>
          )}
          ListEmptyComponent={<View style={styles.emptyCenter}><Ionicons name="folder-open-outline" size={48} color={COLORS.textMuted} /><Text style={styles.emptyText}>{fileSearch ? 'No files match search' : 'No files uploaded'}</Text></View>}
        />
      ) : (
        <FlatList
          data={filteredFiles}
          keyExtractor={(i, idx) => i._id || String(idx)}
          numColumns={2}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 80 }}
          columnWrapperStyle={{ gap: 10 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={{ flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', gap: 8 }}
              onPress={() => (item.url || item.fileUrl) && Linking.openURL(item.url || item.fileUrl)}>
              <Ionicons name={getFileIcon(item)} size={32} color={COLORS.accent} />
              <Text style={[styles.fileName, { textAlign: 'center', fontSize: 12 }]} numberOfLines={2}>{item.name || item.filename}</Text>
              <Text style={styles.fileMeta}>{item.size ? `${(item.size / 1024).toFixed(1)} KB` : ''}</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(item.url || item.fileUrl) && (
                  <TouchableOpacity onPress={() => Linking.openURL(item.url || item.fileUrl)}>
                    <Ionicons name="download-outline" size={16} color={COLORS.primary} />
                  </TouchableOpacity>
                )}
                {isCreator && (
                  <TouchableOpacity onPress={() => handleDeleteFile(item._id || item.id, item.name || item.filename)}>
                    <Ionicons name="trash-outline" size={14} color={COLORS.danger} />
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<View style={styles.emptyCenter}><Ionicons name="folder-open-outline" size={48} color={COLORS.textMuted} /><Text style={styles.emptyText}>{fileSearch ? 'No files match search' : 'No files uploaded'}</Text></View>}
        />
      )}
    </View>
  );
  };

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

  // ═══════════════════ RENDER: Issues Tab ═══════════════════
  const renderIssues = () => {
    const STATUS_COLORS: Record<string, string> = { open: COLORS.success, 'in-progress': COLORS.warning, resolved: COLORS.textMuted };
    const STATUSES = ['open', 'in-progress', 'resolved'];

    const handleCreateIssue = async () => {
      if (!newIssue.title.trim()) return;
      try {
        await createIssue(projectId, { title: newIssue.title.trim(), description: newIssue.description.trim() });
        setNewIssue({ title: '', description: '' });
        setShowAddIssue(false);
        loadIssues();
      } catch (e: any) { Alert.alert('Error', e.message || 'Failed to create issue'); }
    };

    const handleStatusChange = async (issueId: string, newStatus: string) => {
      try {
        await updateIssueStatus(projectId, issueId, newStatus);
        loadIssues();
      } catch (e: any) { Alert.alert('Error', e.message || 'Failed to update'); }
    };

    return (
      <View style={{ flex: 1 }}>
        <FlatList
          data={issues}
          keyExtractor={(item: any) => item._id || item.id}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}
          renderItem={({ item }: { item: any }) => (
            <View style={[styles.taskCard, { borderLeftWidth: 3, borderLeftColor: STATUS_COLORS[item.status] || COLORS.textMuted }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Ionicons name="alert-circle" size={16} color={STATUS_COLORS[item.status] || COLORS.textMuted} />
                <Text style={styles.taskTitle} numberOfLines={2}>{item.title}</Text>
              </View>
              {item.description ? <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 8 }} numberOfLines={2}>{item.description}</Text> : null}
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {STATUSES.map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, item.status === s && { backgroundColor: STATUS_COLORS[s] }]}
                    onPress={() => handleStatusChange(item._id || item.id, s)}
                  >
                    <Text style={[styles.chipText, item.status === s && { color: '#fff' }]}>{s.replace('-', ' ')}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {item.createdAt && <Text style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 6 }}>{new Date(item.createdAt).toLocaleDateString()}</Text>}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="alert-circle-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No issues yet</Text>
              <Text style={styles.emptySubtext}>Create an issue to track bugs or tasks</Text>
            </View>
          }
        />

        {/* Create Issue FAB */}
        <TouchableOpacity style={styles.fab} onPress={() => setShowAddIssue(true)}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>

        {/* Add Issue Modal */}
        <Modal visible={showAddIssue} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Create Issue</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Issue title *"
                placeholderTextColor={COLORS.textMuted}
                value={newIssue.title}
                onChangeText={t => setNewIssue(prev => ({ ...prev, title: t }))}
              />
              <TextInput
                style={[styles.modalInput, { height: 100, textAlignVertical: 'top' }]}
                placeholder="Description (optional)"
                placeholderTextColor={COLORS.textMuted}
                value={newIssue.description}
                onChangeText={t => setNewIssue(prev => ({ ...prev, description: t }))}
                multiline
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddIssue(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, !newIssue.title.trim() && { opacity: 0.4 }]} onPress={handleCreateIssue} disabled={!newIssue.title.trim()}>
                  <Text style={styles.saveBtnText}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  // ═══════════════════ RENDER: Analytics Tab ═══════════════════
  const renderAnalytics = () => {
    // Use API data if available, fallback to local calculation
    const a = analyticsData;
    const totalTasks = a?.totalTasks ?? tasks.length;
    const doneTasks = a?.completedTasks ?? tasks.filter(t => t.status === 'Done').length;
    const inProgress = a?.inProgressTasks ?? tasks.filter(t => t.status === 'In Progress').length;
    const inReview = a?.inReviewTasks ?? tasks.filter(t => t.status === 'In Review').length;
    const overdueTasks = a?.overdueTasks ?? 0;
    const completion = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
    const timeSpent = a?.totalTimeSpent ?? 0;
    const estimatedHours = a?.totalEstimatedHours ?? 0;
    const efficiency = estimatedHours > 0 ? Math.round((timeSpent / estimatedHours) * 100) : 0;
    const sprintStats = a?.sprintStats || {};
    const teamStats = a?.teamStats || {};

    return (
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 80 }}>
        {/* View Toggle */}
        {githubConnected && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={[styles.chip, analyticsView === 'tasks' && styles.chipActive]} onPress={() => setAnalyticsView('tasks')}>
              <Text style={[styles.chipText, analyticsView === 'tasks' && { color: '#fff' }]}>Task Analytics</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.chip, analyticsView === 'github' && styles.chipActive]} onPress={() => setAnalyticsView('github')}>
              <Text style={[styles.chipText, analyticsView === 'github' && { color: '#fff' }]}>GitHub Stats</Text>
            </TouchableOpacity>
          </View>
        )}

        {analyticsView === 'tasks' ? (
          <>
            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              {[
                { label: 'Total Tasks', value: totalTasks, icon: 'list' as const, color: COLORS.primary },
                { label: 'Completed', value: doneTasks, icon: 'checkmark-circle' as const, color: COLORS.success },
                { label: 'In Progress', value: inProgress, icon: 'time' as const, color: COLORS.warning },
                { label: 'In Review', value: inReview, icon: 'eye' as const, color: '#8B5CF6' },
                { label: 'Overdue', value: overdueTasks, icon: 'alert-circle' as const, color: COLORS.danger },
                { label: 'Completion', value: `${completion}%`, icon: 'pie-chart' as const, color: COLORS.accent },
                { label: 'Members', value: members.length, icon: 'people' as const, color: '#6366F1' },
                { label: 'Efficiency', value: efficiency > 0 ? `${efficiency}%` : '—', icon: 'speedometer' as const, color: COLORS.primary },
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

            {/* Time Tracking Stats */}
            {(timeSpent > 0 || estimatedHours > 0) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Time Tracking</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={styles.statValue}>{(timeSpent / 3600000).toFixed(1)}</Text>
                    <Text style={styles.statLabel}>Hours Spent</Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={styles.statValue}>{estimatedHours}</Text>
                    <Text style={styles.statLabel}>Est. Hours</Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={[styles.statValue, { color: efficiency > 100 ? COLORS.danger : COLORS.success }]}>{efficiency || '—'}%</Text>
                    <Text style={styles.statLabel}>Efficiency</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Tasks by Column */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tasks by Status</Text>
              {COLUMNS.map(col => {
                const count = a?.tasksByColumn?.[col] ?? tasks.filter(t => t.status === col).length;
                const pct = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;
                return (
                  <View key={col} style={{ gap: 4, marginBottom: 6 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12, color: COLORS.textPrimary }}>{col}</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.textSecondary }}>{count} ({pct}%)</Text>
                    </View>
                    <View style={{ height: 4, backgroundColor: COLORS.background, borderRadius: 2, overflow: 'hidden' }}>
                      <View style={{ height: '100%', backgroundColor: COLORS.primary, borderRadius: 2, width: `${pct}%` }} />
                    </View>
                  </View>
                );
              })}
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

            {/* Sprint Stats */}
            {(sprintStats.totalSprints > 0 || sprints.length > 0) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Sprint Stats</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={styles.statValue}>{sprintStats.completedSprints ?? sprints.filter((s: any) => s.status === 'completed').length}</Text>
                    <Text style={styles.statLabel}>Completed</Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={styles.statValue}>{sprintStats.avgVelocity?.toFixed(1) ?? '—'}</Text>
                    <Text style={styles.statLabel}>Avg Velocity</Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={styles.statValue}>{sprintStats.totalSprints ?? sprints.length}</Text>
                    <Text style={styles.statLabel}>Total</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Team Stats */}
            {(teamStats?.memberStats?.length > 0 || leaderboard.length > 0) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Team Stats</Text>
                {(teamStats?.memberStats || leaderboard).map((member: any, idx: number) => (
                  <View key={member._id || member.userId || idx} style={styles.leaderRow}>
                    <Text style={styles.leaderRank}>#{idx + 1}</Text>
                    <View style={styles.leaderAvatar}><Text style={styles.memberInitial}>{getInitials(member.name || 'M')}</Text></View>
                    <Text style={styles.leaderName}>{member.name || 'Member'}</Text>
                    <Text style={styles.leaderScore}>{member.tasksCompleted || member.totalScore || member.score || 0}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : (
          <>
            {/* GitHub Stats View */}
            <View style={styles.statsGrid}>
              {[
                { label: 'Commits', value: githubCommits.length, icon: 'git-commit' as const, color: '#6B7280' },
                { label: 'Open PRs', value: githubPRs.filter((p: any) => p.state === 'open').length, icon: 'git-pull-request' as const, color: '#3B82F6' },
                { label: 'Merged PRs', value: githubPRs.filter((p: any) => p.merged).length, icon: 'git-merge' as const, color: '#8B5CF6' },
                { label: 'Branches', value: githubBranches.length, icon: 'git-branch' as const, color: COLORS.primary },
                { label: 'Contributors', value: githubContributors.length, icon: 'people' as const, color: '#6366F1' },
              ].map(s => (
                <View key={s.label} style={styles.statCard}>
                  <Ionicons name={s.icon} size={20} color={s.color} />
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* Top Contributors */}
            {githubContributors.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Top Contributors</Text>
                {githubContributors.slice(0, 5).map((c: any, idx: number) => (
                  <View key={c.login || idx} style={styles.leaderRow}>
                    <Text style={styles.leaderRank}>#{idx + 1}</Text>
                    <View style={styles.leaderAvatar}><Text style={styles.memberInitial}>{getInitials(c.login || 'U')}</Text></View>
                    <Text style={styles.leaderName}>{c.login}</Text>
                    <Text style={styles.leaderScore}>{c.contributions} commits</Text>
                  </View>
                ))}
              </View>
            )}
          </>
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
          {activeTab === 'issues' && renderIssues()}
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
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}>
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
            <Text style={styles.modalLabel}>Assignees</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {members.map(m => (
                <TouchableOpacity key={m.userId} style={[styles.chip, newTask.assignees.includes(m.userId) && styles.chipActive]}
                  onPress={() => setNewTask(p => ({ ...p, assignees: p.assignees.includes(m.userId) ? p.assignees.filter(a => a !== m.userId) : [...p.assignees, m.userId] }))}>
                  <Text style={[styles.chipText, newTask.assignees.includes(m.userId) && { color: '#fff' }]}>{m.name || 'Member'}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.modalLabel}>Labels</Text>
            <View style={styles.chipRow}>
              {LABEL_OPTIONS.map(l => (
                <TouchableOpacity key={l} style={[styles.chip, newTask.labels.includes(l) && { backgroundColor: COLORS.accent }]}
                  onPress={() => setNewTask(p => ({ ...p, labels: p.labels.includes(l) ? p.labels.filter(x => x !== l) : [...p.labels, l] }))}>
                  <Text style={[styles.chipText, newTask.labels.includes(l) && { color: '#fff' }]}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.modalLabel}>Due Date</Text>
            <TextInput style={styles.modalInput} value={newTask.dueDate} onChangeText={v => setNewTask(p => ({ ...p, dueDate: v }))}
              placeholder="YYYY-MM-DD" placeholderTextColor={COLORS.textMuted} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalLabel}>Est. Hours</Text>
                <TextInput style={styles.modalInput} value={newTask.estimatedHours} onChangeText={v => setNewTask(p => ({ ...p, estimatedHours: v }))}
                  placeholder="0" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalLabel}>Story Points</Text>
                <TextInput style={styles.modalInput} value={newTask.storyPoints} onChangeText={v => setNewTask(p => ({ ...p, storyPoints: v }))}
                  placeholder="0" placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />
              </View>
            </View>
            <TouchableOpacity style={styles.modalBtn} onPress={handleAddTask}><Text style={styles.modalBtnText}>Create Task</Text></TouchableOpacity>
          </View>
          </ScrollView>
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

      {/* ══════════ Edit Sprint Modal ══════════ */}
      <Modal visible={!!editingSprint} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Sprint</Text>
              <TouchableOpacity onPress={() => setEditingSprint(null)}><Ionicons name="close" size={24} color={COLORS.textPrimary} /></TouchableOpacity>
            </View>
            <TextInput style={styles.modalInput} value={editingSprint?.name || ''} onChangeText={v => setEditingSprint((p: any) => ({ ...p, name: v }))}
              placeholder="Sprint name..." placeholderTextColor={COLORS.textMuted} />
            <TextInput style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]} value={editingSprint?.goal || ''}
              onChangeText={v => setEditingSprint((p: any) => ({ ...p, goal: v }))} placeholder="Sprint goal..." placeholderTextColor={COLORS.textMuted} multiline />
            <Text style={styles.modalLabel}>Start Date</Text>
            <TextInput style={styles.modalInput} value={editingSprint?.startDate ? new Date(editingSprint.startDate).toISOString().split('T')[0] : ''}
              onChangeText={v => setEditingSprint((p: any) => ({ ...p, startDate: v }))} placeholder="YYYY-MM-DD" placeholderTextColor={COLORS.textMuted} />
            <Text style={styles.modalLabel}>End Date</Text>
            <TextInput style={styles.modalInput} value={editingSprint?.endDate ? new Date(editingSprint.endDate).toISOString().split('T')[0] : ''}
              onChangeText={v => setEditingSprint((p: any) => ({ ...p, endDate: v }))} placeholder="YYYY-MM-DD" placeholderTextColor={COLORS.textMuted} />
            <TouchableOpacity style={styles.modalBtn} onPress={handleEditSprint}><Text style={styles.modalBtnText}>Save Changes</Text></TouchableOpacity>
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
  boardSearchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.border },
  boardSearchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary, padding: 0 },
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
  sprintSummary: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'space-around' },
  sprintSummaryItem: { alignItems: 'center', gap: 4 },
  sprintSummaryValue: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  sprintSummaryLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600' },
  sprintProgressBar: { height: 6, backgroundColor: COLORS.background, borderRadius: 3, overflow: 'hidden' },
  sprintProgressFill: { height: '100%', backgroundColor: COLORS.success, borderRadius: 3 },
  sprintCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 8 },
  sprintHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sprintName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  statusChipText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  sprintGoal: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  sprintStats: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sprintStatText: { fontSize: 11, color: COLORS.textMuted },
  sprintDate: { fontSize: 11, color: COLORS.textMuted },
  sprintActionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, marginTop: 4 },
  sprintActionText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // ── GitHub
  connectGithubBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#24292e', paddingHorizontal: 20, paddingVertical: 12, borderRadius: RADIUS.md, marginTop: 16 },
  connectGithubText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  githubFeaturesList: { marginTop: 20, gap: 10, alignSelf: 'stretch', paddingHorizontal: 40 },
  githubFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  githubFeatureText: { fontSize: 13, color: COLORS.textSecondary },
  githubRepoCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  githubRepoName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  githubRepoLink: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  connectedDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.success },
  disconnectGithubBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, backgroundColor: COLORS.danger + '15', borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.danger + '30' },
  disconnectGithubText: { fontSize: 13, fontWeight: '600', color: COLORS.danger },
  githubItemCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: 12, borderWidth: 1, borderColor: COLORS.border },
  githubItemTitle: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  githubItemMeta: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  githubSha: { fontSize: 11, fontWeight: '600', color: COLORS.primary, fontFamily: 'monospace' },

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
  inviteMemberBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: RADIUS.lg },
  inviteMemberText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // ── Chat
  editBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: COLORS.primary + '15', borderTopWidth: 1, borderTopColor: COLORS.primary + '30' },
  editBannerText: { flex: 1, fontSize: 12, fontWeight: '600', color: COLORS.primary },
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
  fileDownloadBtn: { padding: 6, marginRight: 4 },

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
