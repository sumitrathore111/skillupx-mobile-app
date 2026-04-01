import { COLORS, RADIUS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import {
    createBoardTask,
    createSprint,
    deleteBoardTask,
    getBoardTasks,
    getLeaderboard,
    getProjectFiles,
    getProjectMessages,
    getSprints,
    sendProjectMessage,
    updateBoardTask,
} from '@services/projectsService';
import { useAuthStore } from '@store/authStore';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, FlatList, Modal,
    ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Tab = 'board' | 'sprints' | 'chat' | 'files' | 'analytics';
const TABS: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'board', label: 'Board', icon: 'grid' },
  { key: 'sprints', label: 'Sprints', icon: 'layers' },
  { key: 'chat', label: 'Chat', icon: 'chatbubbles' },
  { key: 'files', label: 'Files', icon: 'folder' },
  { key: 'analytics', label: 'Stats', icon: 'bar-chart' },
];

const COLUMNS = ['To Do', 'In Progress', 'In Review', 'Done'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const PRIORITY_COLORS: Record<string, string> = { low: '#4CAF50', medium: '#FF9800', high: '#FF5722', critical: '#F44336' };

export default function ProjectWorkspaceScreen() {
  const route = useRoute<any>();
  const { projectId, projectTitle } = route.params || {};
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('board');
  const [loading, setLoading] = useState(true);

  // Board state
  const [tasks, setTasks] = useState<any[]>([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', status: 'To Do', priority: 'medium', assignee: '' });

  // Sprint state
  const [sprints, setSprints] = useState<any[]>([]);
  const [showAddSprint, setShowAddSprint] = useState(false);
  const [newSprint, setNewSprint] = useState({ name: '', goal: '', startDate: '', endDate: '' });

  // Chat state
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');

  // Files state
  const [files, setFiles] = useState<any[]>([]);

  // Analytics state
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

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
  }, [projectId]);

  useEffect(() => {
    setLoading(true);
    switch (activeTab) {
      case 'board': loadBoard(); break;
      case 'sprints': loadSprints(); break;
      case 'chat': loadChat(); break;
      case 'files': loadFiles(); break;
      case 'analytics': loadAnalytics(); break;
    }
  }, [activeTab, loadBoard, loadSprints, loadChat, loadFiles, loadAnalytics]);

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
    try {
      await updateBoardTask(projectId, taskId, { status: newStatus } as any);
      loadBoard();
    } catch (e) { console.error(e); }
  };

  const handleDeleteTask = (taskId: string) => {
    Alert.alert('Delete Task', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { try { await deleteBoardTask(projectId, taskId); loadBoard(); } catch (e) { console.error(e); } } },
    ]);
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !user) return;
    try {
      await sendProjectMessage(projectId, chatInput.trim());
      setChatInput('');
      loadChat();
    } catch (e) { console.error(e); }
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

  // ——— Board Tab ———
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
                {task.description && <Text style={styles.taskDesc} numberOfLines={2}>{task.description}</Text>}
                <View style={styles.taskActions}>
                  {COLUMNS.filter(c => c !== col).map(c => (
                    <TouchableOpacity key={c} onPress={() => handleMoveTask(task._id || task.id, c)}
                      style={styles.moveBtn}>
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

  // ——— Sprints Tab ———
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
          {sprint.goal && <Text style={styles.sprintGoal}>{sprint.goal}</Text>}
          {sprint.startDate && <Text style={styles.sprintDate}>{new Date(sprint.startDate).toLocaleDateString()} — {sprint.endDate ? new Date(sprint.endDate).toLocaleDateString() : 'Ongoing'}</Text>}
        </View>
      ))}
    </ScrollView>
  );

  // ——— Chat Tab ———
  const renderChat = () => (
    <View style={{ flex: 1 }}>
      <FlatList data={messages} keyExtractor={(i, idx) => i._id || String(idx)} contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 8 }}
        renderItem={({ item }) => {
          const isMe = item.senderId === user?.id;
          return (
            <View style={[styles.chatBubbleRow, isMe && { alignSelf: 'flex-end' }]}>
              <View style={[styles.chatBubble, isMe ? { backgroundColor: COLORS.primary } : { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border }]}>
                {!isMe && <Text style={styles.chatSender}>{item.senderName}</Text>}
                <Text style={[styles.chatMsg, isMe && { color: '#fff' }]}>{item.content || item.message}</Text>
                <Text style={styles.chatTime}>{new Date(item.createdAt || item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<View style={styles.emptyCenter}><Ionicons name="chatbubbles-outline" size={48} color={COLORS.textMuted} /><Text style={styles.emptyText}>No messages yet</Text></View>}
      />
      <View style={styles.chatInputRow}>
        <TextInput style={styles.chatInput} value={chatInput} onChangeText={setChatInput}
          placeholder="Type a message..." placeholderTextColor={COLORS.textMuted} multiline />
        <TouchableOpacity style={[styles.chatSendBtn, !chatInput.trim() && { opacity: 0.4 }]} onPress={handleSendMessage} disabled={!chatInput.trim()}>
          <Ionicons name="send" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // ——— Files Tab ———
  const renderFiles = () => (
    <FlatList data={files} keyExtractor={(i, idx) => i._id || String(idx)} contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 80 }}
      renderItem={({ item }) => (
        <View style={styles.fileCard}>
          <Ionicons name="document-outline" size={20} color={COLORS.accent} />
          <View style={{ flex: 1 }}>
            <Text style={styles.fileName}>{item.name || item.filename}</Text>
            <Text style={styles.fileMeta}>{item.size ? `${(item.size / 1024).toFixed(1)} KB` : ''} · {new Date(item.uploadedAt || item.createdAt).toLocaleDateString()}</Text>
          </View>
        </View>
      )}
      ListEmptyComponent={<View style={styles.emptyCenter}><Ionicons name="folder-open-outline" size={48} color={COLORS.textMuted} /><Text style={styles.emptyText}>No files uploaded</Text></View>}
    />
  );

  // ——— Analytics Tab ———
  const renderAnalytics = () => {
    const totalTasks = tasks.length;
    const doneTasks = tasks.filter(t => t.status === 'Done').length;
    const inProgress = tasks.filter(t => t.status === 'In Progress').length;
    const completion = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    return (
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 80 }}>
        {/* Stats */}
        <View style={styles.statsGrid}>
          {[
            { label: 'Total Tasks', value: totalTasks, icon: 'list' as const, color: COLORS.primary },
            { label: 'Completed', value: doneTasks, icon: 'checkmark-circle' as const, color: COLORS.success },
            { label: 'In Progress', value: inProgress, icon: 'time' as const, color: COLORS.warning },
            { label: 'Completion', value: `${completion}%`, icon: 'pie-chart' as const, color: COLORS.accent },
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

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Team Leaderboard</Text>
            {leaderboard.map((member, idx) => (
              <View key={member._id || idx} style={styles.leaderRow}>
                <Text style={styles.leaderRank}>#{idx + 1}</Text>
                <View style={styles.leaderAvatar}><Text>{member.avatar || '🧑‍💻'}</Text></View>
                <Text style={styles.leaderName}>{member.name || 'Member'}</Text>
                <Text style={styles.leaderScore}>{member.tasksCompleted || member.score || 0} tasks</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle} numberOfLines={1}>{projectTitle || 'Project Workspace'}</Text>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
        {TABS.map(tab => (
          <TouchableOpacity key={tab.key} style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}>
            <Ionicons name={tab.icon} size={16} color={activeTab === tab.key ? COLORS.primary : COLORS.textMuted} />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <>
          {activeTab === 'board' && renderBoard()}
          {activeTab === 'sprints' && renderSprints()}
          {activeTab === 'chat' && renderChat()}
          {activeTab === 'files' && renderFiles()}
          {activeTab === 'analytics' && renderAnalytics()}
        </>
      )}

      {/* FABs */}
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

      {/* Add Task Modal */}
      <Modal visible={showAddTask} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Task</Text>
              <TouchableOpacity onPress={() => setShowAddTask(false)}><Ionicons name="close" size={24} color={COLORS.textPrimary} /></TouchableOpacity>
            </View>
            <TextInput style={styles.modalInput} value={newTask.title} onChangeText={v => setNewTask(p => ({ ...p, title: v }))}
              placeholder="Task title..." placeholderTextColor={COLORS.textMuted} />
            <TextInput style={[styles.modalInput, { height: 60, textAlignVertical: 'top' }]} value={newTask.description}
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
            <TouchableOpacity style={styles.modalBtn} onPress={handleAddTask}><Text style={styles.modalBtnText}>Create Task</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Sprint Modal */}
      <Modal visible={showAddSprint} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Sprint</Text>
              <TouchableOpacity onPress={() => setShowAddSprint(false)}><Ionicons name="close" size={24} color={COLORS.textPrimary} /></TouchableOpacity>
            </View>
            <TextInput style={styles.modalInput} value={newSprint.name} onChangeText={v => setNewSprint(p => ({ ...p, name: v }))}
              placeholder="Sprint name..." placeholderTextColor={COLORS.textMuted} />
            <TextInput style={[styles.modalInput, { height: 60, textAlignVertical: 'top' }]} value={newSprint.goal}
              onChangeText={v => setNewSprint(p => ({ ...p, goal: v }))} placeholder="Sprint goal..." placeholderTextColor={COLORS.textMuted} multiline />
            <TouchableOpacity style={styles.modalBtn} onPress={handleAddSprint}><Text style={styles.modalBtnText}>Create Sprint</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyCenter: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { fontSize: 13, color: COLORS.textMuted, marginTop: 8 },
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  tabsRow: { flexDirection: 'row', gap: 4, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.full, backgroundColor: COLORS.surface },
  tabActive: { backgroundColor: COLORS.primary + '20' },
  tabText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  tabTextActive: { color: COLORS.primary },

  // Board
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
  taskActions: { flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' },
  moveBtn: { paddingHorizontal: 6, paddingVertical: 3, backgroundColor: COLORS.primary + '15', borderRadius: RADIUS.sm },
  moveBtnText: { fontSize: 9, color: COLORS.primary, fontWeight: '600' },

  // Sprints
  sprintCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 8 },
  sprintHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sprintName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  statusChipText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  sprintGoal: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  sprintDate: { fontSize: 11, color: COLORS.textMuted },

  // Chat
  chatBubbleRow: { maxWidth: '80%', alignSelf: 'flex-start' },
  chatBubble: { padding: 10, borderRadius: RADIUS.lg },
  chatSender: { fontSize: 11, fontWeight: '700', color: COLORS.accent, marginBottom: 2 },
  chatMsg: { fontSize: 14, color: COLORS.textPrimary, lineHeight: 20 },
  chatTime: { fontSize: 10, color: COLORS.textMuted, marginTop: 4, alignSelf: 'flex-end' },
  chatInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.surface },
  chatInput: { flex: 1, backgroundColor: COLORS.background, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 10, color: COLORS.textPrimary, fontSize: 14, maxHeight: 80, borderWidth: 1, borderColor: COLORS.border },
  chatSendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },

  // Files
  fileCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  fileName: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  fileMeta: { fontSize: 11, color: COLORS.textMuted },

  // Analytics
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 14, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: COLORS.border },
  statValue: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  statLabel: { fontSize: 11, color: COLORS.textMuted },
  progressSection: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: COLORS.border, gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  progressBar: { height: 8, backgroundColor: COLORS.background, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.success, borderRadius: 4 },
  progressText: { fontSize: 12, color: COLORS.textMuted },
  section: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: COLORS.border, gap: 10 },
  leaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  leaderRank: { fontSize: 14, fontWeight: '800', color: COLORS.primary, width: 30 },
  leaderAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  leaderName: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  leaderScore: { fontSize: 12, fontWeight: '600', color: COLORS.accent },

  // FAB
  fab: { position: 'absolute', bottom: 20, right: 20, width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', elevation: 5 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 12, maxHeight: '80%' },
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
