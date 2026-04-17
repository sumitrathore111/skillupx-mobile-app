import { COLORS, RADIUS, SHADOWS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import api from '@services/api';
import {
    addSubtask,
    addTaskComment,
    approveTask,
    deleteBoardTask,
    getProjectMembers,
    requestChanges,
    startTimeTracking,
    stopTimeTracking,
    submitForReview,
    toggleSubtask,
    updateBoardTask,
} from '@services/projectsService';
import { useAuthStore } from '@store/authStore';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PRIMARY = COLORS.primary;
const GLASS = 'rgba(255,255,255,0.05)';
const GLASS_BORDER = 'rgba(255,255,255,0.08)';

const PRIORITY_COLORS: Record<string, string> = {
  low: '#4CAF50', medium: '#FF9800', high: '#FF5722', critical: '#F44336',
};
const COLUMNS = ['To Do', 'In Progress', 'In Review', 'Done'];
const LABEL_OPTIONS = ['bug', 'feature', 'enhancement', 'documentation', 'design', 'testing', 'refactor', 'urgent'];
const REVIEW_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  not_submitted: { bg: COLORS.textMuted + '15', text: COLORS.textMuted, label: 'Not Submitted' },
  pending: { bg: COLORS.warning + '15', text: COLORS.warning, label: 'Pending Review' },
  approved: { bg: COLORS.success + '15', text: COLORS.success, label: 'Approved' },
  changes_requested: { bg: COLORS.danger + '15', text: COLORS.danger, label: 'Changes Requested' },
};

type DetailTab = 'overview' | 'subtasks' | 'comments' | 'time';

export default function TaskDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { taskId, projectId, isCreator: isCreatorParam } = route.params || {};
  const { user } = useAuthStore();
  const isCreator = !!isCreatorParam;

  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');

  // Subtask state
  const [newSubtask, setNewSubtask] = useState('');
  const [addingSubtask, setAddingSubtask] = useState(false);

  // Comment state
  const [newComment, setNewComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);

  // Time tracking state
  const [timeDescription, setTimeDescription] = useState('');
  const [tracking, setTracking] = useState(false);

  // Review state
  const [reviewComment, setReviewComment] = useState('');
  const [reviewing, setReviewing] = useState(false);

  // Inline edit state
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState('');
  const [saving, setSaving] = useState(false);

  // Extended edit state
  const [members, setMembers] = useState<any[]>([]);
  const [editLabels, setEditLabels] = useState<string[]>([]);
  const [editDueDate, setEditDueDate] = useState('');
  const [editStoryPoints, setEditStoryPoints] = useState('');
  const [editEstimatedHours, setEditEstimatedHours] = useState('');
  const [assigneePickerOpen, setAssigneePickerOpen] = useState(false);

  const loadTask = useCallback(async () => {
    try {
      const { data } = await api.get(`/boards/tasks/${taskId}`);
      setTask(data?.task || data);
    } catch (e) {
      console.error('loadTask', e);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => { loadTask(); }, [loadTask]);

  useEffect(() => {
    if (projectId) {
      getProjectMembers(projectId).then(setMembers).catch(() => {});
    }
  }, [projectId]);

  const getInitials = (name: string) =>
    name?.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || '?';

  // Handlers
  const handleAddSubtask = async () => {
    if (!newSubtask.trim()) return;
    setAddingSubtask(true);
    try {
      await addSubtask(taskId, newSubtask.trim());
      setNewSubtask('');
      loadTask();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setAddingSubtask(false); }
  };

  const handleToggleSubtask = async (subtaskId: string, completed: boolean) => {
    try {
      await toggleSubtask(taskId, subtaskId, !completed);
      loadTask();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setAddingComment(true);
    try {
      await addTaskComment(taskId, newComment.trim());
      setNewComment('');
      loadTask();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setAddingComment(false); }
  };

  const handleStartTime = async () => {
    setTracking(true);
    try {
      await startTimeTracking(taskId, timeDescription.trim() || undefined);
      setTimeDescription('');
      loadTask();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setTracking(false); }
  };

  const handleStopTime = async (entryId: string) => {
    try {
      await stopTimeTracking(taskId, entryId);
      loadTask();
    } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const handleSubmitForReview = async () => {
    Alert.alert('Submit for Review', 'Submit this task for review?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Submit', onPress: async () => {
          try { await submitForReview(taskId); loadTask(); } catch (e: any) { Alert.alert('Error', e.message); }
        },
      },
    ]);
  };

  const handleApprove = async () => {
    setReviewing(true);
    try {
      await approveTask(taskId, reviewComment.trim() || undefined);
      setReviewComment('');
      loadTask();
      Alert.alert('Approved!', 'Task has been approved.');
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setReviewing(false); }
  };

  const handleRequestChanges = async () => {
    if (!reviewComment.trim()) { Alert.alert('Required', 'Please provide feedback.'); return; }
    setReviewing(true);
    try {
      await requestChanges(taskId, reviewComment.trim());
      setReviewComment('');
      loadTask();
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setReviewing(false); }
  };

  const handleSaveField = async (field: string, value: string) => {
    if (!value.trim() && field !== 'description') return;
    setSaving(true);
    try {
      await updateBoardTask(projectId, taskId, { [field]: value.trim() });
      setEditingField(null);
      loadTask();
    } catch (e: any) { Alert.alert('Error', e.message || 'Failed to update'); }
    finally { setSaving(false); }
  };

  const handleSavePriority = async (newPriority: string) => {
    setSaving(true);
    try {
      await updateBoardTask(projectId, taskId, { priority: newPriority as any });
      setEditingField(null);
      setEditPriority('');
      loadTask();
    } catch (e: any) { Alert.alert('Error', e.message || 'Failed to update'); }
    finally { setSaving(false); }
  };

  const handleChangeStatus = async (newStatus: string) => {
    setSaving(true);
    try {
      await updateBoardTask(projectId, taskId, { status: newStatus } as any);
      setEditingField(null);
      loadTask();
    } catch (e: any) { Alert.alert('Error', e.message || 'Failed to update'); }
    finally { setSaving(false); }
  };

  const handleChangeAssignee = async (memberId: string, memberName: string) => {
    setSaving(true);
    try {
      await updateBoardTask(projectId, taskId, { assignee: memberId, assigneeName: memberName } as any);
      setAssigneePickerOpen(false);
      loadTask();
    } catch (e: any) { Alert.alert('Error', e.message || 'Failed to update'); }
    finally { setSaving(false); }
  };

  const handleSaveLabels = async (labels: string[]) => {
    setSaving(true);
    try {
      await updateBoardTask(projectId, taskId, { labels } as any);
      setEditingField(null);
      loadTask();
    } catch (e: any) { Alert.alert('Error', e.message || 'Failed to update'); }
    finally { setSaving(false); }
  };

  const handleSaveDueDate = async () => {
    setSaving(true);
    try {
      await updateBoardTask(projectId, taskId, { dueDate: editDueDate || null } as any);
      setEditingField(null);
      loadTask();
    } catch (e: any) { Alert.alert('Error', e.message || 'Failed to update'); }
    finally { setSaving(false); }
  };

  const handleSaveStoryPoints = async () => {
    setSaving(true);
    try {
      await updateBoardTask(projectId, taskId, { storyPoints: editStoryPoints ? Number(editStoryPoints) : 0 } as any);
      setEditingField(null);
      loadTask();
    } catch (e: any) { Alert.alert('Error', e.message || 'Failed to update'); }
    finally { setSaving(false); }
  };

  const handleSaveEstimatedHours = async () => {
    setSaving(true);
    try {
      await updateBoardTask(projectId, taskId, { estimatedHours: editEstimatedHours ? Number(editEstimatedHours) : 0 } as any);
      setEditingField(null);
      loadTask();
    } catch (e: any) { Alert.alert('Error', e.message || 'Failed to update'); }
    finally { setSaving(false); }
  };

  const handleDeleteTask = () => {
    Alert.alert('Delete Task', 'Are you sure you want to delete this task? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deleteBoardTask(projectId, taskId);
            navigation.goBack();
          } catch (e: any) { Alert.alert('Error', e.message || 'Failed to delete'); }
        },
      },
    ]);
  };

  const handleDeleteComment = (commentId: string) => {
    Alert.alert('Delete Comment', 'Delete this comment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/boards/tasks/${taskId}/comments/${commentId}`);
            loadTask();
          } catch (e: any) { Alert.alert('Error', e.message || 'Failed to delete comment'); }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={S.root}>
        <View style={S.centered}><ActivityIndicator size="large" color={PRIMARY} /></View>
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={S.root}>
        <View style={S.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.danger} />
          <Text style={S.emptyTitle}>Task not found</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={S.backNavBtn}>
            <Text style={S.backNavText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const priority = task.priority || 'medium';
  const reviewStatus = task.reviewStatus || 'not_submitted';
  const review = REVIEW_COLORS[reviewStatus] || REVIEW_COLORS.not_submitted;
  const completedSubtasks = (task.checklist || []).filter((s: any) => s.completed).length;
  const totalSubtasks = (task.checklist || []).length;
  const subtaskProgress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  // ── Overview Tab ──
  const renderOverview = () => (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 80 }}>
      {/* Status & Priority */}
      <View style={S.row}>
        {editingField === 'status' ? (
          <View style={S.priorityEditRow}>
            {COLUMNS.map(col => (
              <TouchableOpacity
                key={col}
                style={[S.priorityOption, { backgroundColor: col === task.status ? PRIMARY : PRIMARY + '20' }]}
                onPress={() => handleChangeStatus(col)}
              >
                <Text style={[S.priorityOptionText, col === task.status && { color: '#fff' }]}>{col}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setEditingField(null)}>
              <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setEditingField('status')}>
            <View style={[S.statusBadge, { backgroundColor: task.status === 'Done' ? COLORS.success + '20' : PRIMARY + '20' }]}>
              <Text style={[S.statusText, { color: task.status === 'Done' ? COLORS.success : PRIMARY }]}>{task.status}</Text>
            </View>
          </TouchableOpacity>
        )}
        {editingField === 'priority' ? (
          <View style={S.priorityEditRow}>
            {['low', 'medium', 'high', 'critical'].map(p => (
              <TouchableOpacity
                key={p}
                style={[S.priorityOption, { backgroundColor: PRIORITY_COLORS[p] + (editPriority === p ? '' : '20') }]}
                onPress={() => { setEditPriority(p); handleSavePriority(p); }}
              >
                <Text style={[S.priorityOptionText, editPriority === p && { color: '#fff' }]}>{p}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setEditingField(null)}>
              <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => { setEditPriority(priority); setEditingField('priority'); }}>
            <View style={[S.priorityBadge, { backgroundColor: PRIORITY_COLORS[priority] + '20' }]}>
              <View style={[S.priorityDot, { backgroundColor: PRIORITY_COLORS[priority] }]} />
              <Text style={[S.priorityText, { color: PRIORITY_COLORS[priority] }]}>{priority}</Text>
              <Ionicons name="create-outline" size={10} color={PRIORITY_COLORS[priority]} />
            </View>
          </TouchableOpacity>
        )}
        <View style={[S.reviewBadge, { backgroundColor: review.bg }]}>
          <Text style={[S.reviewText, { color: review.text }]}>{review.label}</Text>
        </View>
      </View>

      {/* Description */}
      {editingField === 'description' ? (
        <View style={S.section}>
          <Text style={S.sectionLabel}>Description</Text>
          <TextInput
            style={S.editDescInput}
            value={editDescription}
            onChangeText={setEditDescription}
            multiline
            autoFocus
          />
          <View style={S.editDescActions}>
            <TouchableOpacity style={S.editSaveBtn} onPress={() => handleSaveField('description', editDescription)} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={S.editSaveBtnText}>Save</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEditingField(null)}>
              <Text style={S.editCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity onPress={() => { setEditDescription(task.description || ''); setEditingField('description'); }} activeOpacity={0.7}>
          <View style={S.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={S.sectionLabel}>Description</Text>
              <Ionicons name="create-outline" size={14} color={COLORS.textMuted} />
            </View>
            <Text style={S.descText}>{task.description || 'Tap to add description...'}</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Assignee */}
      <TouchableOpacity onPress={() => setAssigneePickerOpen(true)} style={S.infoRow}>
        <Ionicons name="person" size={16} color={COLORS.textMuted} />
        {task.assigneeName ? (
          <>
            <View style={S.assigneeAvatar}>
              <Text style={S.assigneeInitial}>{getInitials(task.assigneeName)}</Text>
            </View>
            <Text style={S.infoText}>{task.assigneeName}</Text>
          </>
        ) : (
          <Text style={[S.infoText, { color: COLORS.textMuted }]}>Assign member...</Text>
        )}
        <Ionicons name="create-outline" size={12} color={COLORS.textMuted} style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>

      {/* Due Date */}
      {editingField === 'dueDate' ? (
        <View style={S.section}>
          <Text style={S.sectionLabel}>Due Date</Text>
          <TextInput
            style={S.editDescInput}
            value={editDueDate}
            onChangeText={setEditDueDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={COLORS.textMuted}
            autoFocus
          />
          <View style={S.editDescActions}>
            <TouchableOpacity style={S.editSaveBtn} onPress={handleSaveDueDate} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={S.editSaveBtnText}>Save</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEditingField(null)}>
              <Text style={S.editCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity onPress={() => { setEditDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''); setEditingField('dueDate'); }} style={S.infoRow}>
          <Ionicons name="calendar" size={16} color={COLORS.textMuted} />
          <Text style={S.infoText}>{task.dueDate ? `Due: ${new Date(task.dueDate).toLocaleDateString()}` : 'Set due date...'}</Text>
          <Ionicons name="create-outline" size={12} color={COLORS.textMuted} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
      )}

      {/* Labels */}
      {editingField === 'labels' ? (
        <View style={S.section}>
          <Text style={S.sectionLabel}>Labels</Text>
          <View style={S.labelsRow}>
            {LABEL_OPTIONS.map(l => {
              const sel = editLabels.includes(l);
              return (
                <TouchableOpacity key={l} style={[S.labelChip, sel && { backgroundColor: PRIMARY }]} onPress={() => setEditLabels(prev => sel ? prev.filter(x => x !== l) : [...prev, l])}>
                  <Text style={[S.labelText, sel && { color: '#fff' }]}>{l}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={S.editDescActions}>
            <TouchableOpacity style={S.editSaveBtn} onPress={() => handleSaveLabels(editLabels)} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={S.editSaveBtnText}>Save</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEditingField(null)}>
              <Text style={S.editCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity onPress={() => { setEditLabels(task.labels || []); setEditingField('labels'); }}>
          <View style={S.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={S.sectionLabel}>Labels</Text>
              <Ionicons name="create-outline" size={14} color={COLORS.textMuted} />
            </View>
            {task.labels?.length > 0 ? (
              <View style={S.labelsRow}>
                {task.labels.map((l: string) => (
                  <View key={l} style={S.labelChip}><Text style={S.labelText}>{l}</Text></View>
                ))}
              </View>
            ) : (
              <Text style={{ fontSize: 12, color: COLORS.textMuted }}>Tap to add labels...</Text>
            )}
          </View>
        </TouchableOpacity>
      )}

      {/* Story Points & Estimated Hours */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {editingField === 'storyPoints' ? (
          <View style={[S.section, { flex: 1 }]}>  
            <Text style={S.sectionLabel}>Story Points</Text>
            <TextInput style={S.editDescInput} value={editStoryPoints} onChangeText={setEditStoryPoints} keyboardType="numeric" autoFocus />
            <View style={S.editDescActions}>
              <TouchableOpacity style={S.editSaveBtn} onPress={handleSaveStoryPoints} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={S.editSaveBtnText}>Save</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditingField(null)}><Text style={S.editCancelText}>Cancel</Text></TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={{ flex: 1 }} onPress={() => { setEditStoryPoints(String(task.storyPoints || '')); setEditingField('storyPoints'); }}>
            <View style={[S.infoRow, { padding: 10, backgroundColor: GLASS, borderRadius: 8, borderWidth: 1, borderColor: GLASS_BORDER }]}>
              <Ionicons name="star" size={16} color={COLORS.textMuted} />
              <Text style={S.infoText}>{task.storyPoints ? `${task.storyPoints} pts` : 'Story pts'}</Text>
              <Ionicons name="create-outline" size={10} color={COLORS.textMuted} style={{ marginLeft: 'auto' }} />
            </View>
          </TouchableOpacity>
        )}
        {editingField === 'estimatedHours' ? (
          <View style={[S.section, { flex: 1 }]}>
            <Text style={S.sectionLabel}>Est. Hours</Text>
            <TextInput style={S.editDescInput} value={editEstimatedHours} onChangeText={setEditEstimatedHours} keyboardType="numeric" autoFocus />
            <View style={S.editDescActions}>
              <TouchableOpacity style={S.editSaveBtn} onPress={handleSaveEstimatedHours} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={S.editSaveBtnText}>Save</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditingField(null)}><Text style={S.editCancelText}>Cancel</Text></TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={{ flex: 1 }} onPress={() => { setEditEstimatedHours(String(task.estimatedHours || '')); setEditingField('estimatedHours'); }}>
            <View style={[S.infoRow, { padding: 10, backgroundColor: GLASS, borderRadius: 8, borderWidth: 1, borderColor: GLASS_BORDER }]}>
              <Ionicons name="hourglass" size={16} color={COLORS.textMuted} />
              <Text style={S.infoText}>{task.estimatedHours ? `${task.estimatedHours}h est` : 'Est. hours'}</Text>
              <Ionicons name="create-outline" size={10} color={COLORS.textMuted} style={{ marginLeft: 'auto' }} />
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Subtask Progress */}
      {totalSubtasks > 0 && (
        <View style={S.progressSection}>
          <View style={S.progressHeader}>
            <Text style={S.sectionLabel}>Subtasks</Text>
            <Text style={S.progressCount}>{completedSubtasks}/{totalSubtasks}</Text>
          </View>
          <View style={S.progressBg}>
            <View style={[S.progressFill, { width: `${subtaskProgress}%` }]} />
          </View>
        </View>
      )}

      {/* Review Actions */}
      {reviewStatus !== 'approved' && (
        <View style={S.reviewSection}>
          <Text style={S.sectionLabel}>Code Review</Text>
          {reviewStatus === 'not_submitted' && !isCreator && (
            <TouchableOpacity style={S.submitReviewBtn} onPress={handleSubmitForReview}>
              <LinearGradient colors={[PRIMARY, COLORS.primaryDark]} style={S.submitReviewGradient}>
                <Ionicons name="paper-plane" size={16} color="#fff" />
                <Text style={S.submitReviewText}>Submit for Review</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
          {reviewStatus === 'pending' && isCreator && (
            <>
              <TextInput
                style={S.reviewInput}
                value={reviewComment}
                onChangeText={setReviewComment}
                placeholder="Review feedback..."
                placeholderTextColor={COLORS.textMuted}
                multiline
              />
              <View style={S.reviewActions}>
                <TouchableOpacity style={S.changesBtn} onPress={handleRequestChanges} disabled={reviewing}>
                  <Ionicons name="refresh" size={14} color={COLORS.danger} />
                  <Text style={S.changesBtnText}>Request Changes</Text>
                </TouchableOpacity>
                <TouchableOpacity style={S.approveBtn} onPress={handleApprove} disabled={reviewing}>
                  {reviewing ? <ActivityIndicator size="small" color="#fff" /> : (
                    <>
                      <Ionicons name="checkmark-circle" size={14} color="#fff" />
                      <Text style={S.approveBtnText}>Approve</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
          {reviewStatus === 'changes_requested' && (
            <View style={S.feedbackBox}>
              <Ionicons name="alert-circle" size={14} color={COLORS.danger} />
              <Text style={S.feedbackText}>{task.reviewComment || 'Changes requested by reviewer.'}</Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );

  // ── Subtasks Tab ──
  const renderSubtasks = () => (
    <View style={{ flex: 1 }}>
      <FlatList
        data={task.checklist || []}
        keyExtractor={(item: any, idx: number) => item._id || item.id || String(idx)}
        contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 80 }}
        renderItem={({ item }: { item: any }) => (
          <TouchableOpacity
            style={S.subtaskRow}
            onPress={() => handleToggleSubtask(item._id || item.id, item.completed)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={item.completed ? 'checkmark-circle' : 'ellipse-outline'}
              size={22}
              color={item.completed ? COLORS.success : COLORS.textMuted}
            />
            <Text style={[S.subtaskText, item.completed && S.subtaskDone]}>{item.text}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={[S.centered, { paddingTop: 40 }]}>
            <Ionicons name="list-outline" size={48} color={COLORS.textMuted} />
            <Text style={S.emptyTitle}>No subtasks yet</Text>
          </View>
        }
      />
      {/* Add Subtask */}
      <View style={S.addBar}>
        <TextInput
          style={S.addInput}
          value={newSubtask}
          onChangeText={setNewSubtask}
          placeholder="Add a subtask..."
          placeholderTextColor={COLORS.textMuted}
        />
        <TouchableOpacity
          style={[S.addBtn, (!newSubtask.trim() || addingSubtask) && { opacity: 0.4 }]}
          onPress={handleAddSubtask}
          disabled={!newSubtask.trim() || addingSubtask}
        >
          {addingSubtask ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="add" size={20} color="#fff" />}
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Comments Tab ──
  const renderComments = () => (
    <View style={{ flex: 1 }}>
      <FlatList
        data={task.comments || []}
        keyExtractor={(item: any, idx: number) => item._id || String(idx)}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 80 }}
        renderItem={({ item }: { item: any }) => (
          <TouchableOpacity
            style={S.commentCard}
            activeOpacity={0.8}
            onLongPress={() => {
              const isOwner = item.author === user?._id || item.userId === user?._id;
              if (isOwner || isCreator) handleDeleteComment(item._id || item.id);
            }}
          >
            <View style={S.commentHeader}>
              <View style={S.commentAvatar}>
                <Text style={S.commentAvatarText}>{getInitials(item.userName || 'U')}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={S.commentName}>{item.userName || 'Anonymous'}</Text>
                <Text style={S.commentTime}>{new Date(item.createdAt).toLocaleString()}</Text>
              </View>
            </View>
            <Text style={S.commentContent}>{item.content}</Text>
            {item.mentions?.length > 0 && (
              <View style={S.mentionsRow}>
                {item.mentions.map((m: string, i: number) => (
                  <Text key={i} style={S.mentionTag}>@{m}</Text>
                ))}
              </View>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={[S.centered, { paddingTop: 40 }]}>
            <Ionicons name="chatbubbles-outline" size={48} color={COLORS.textMuted} />
            <Text style={S.emptyTitle}>No comments yet</Text>
          </View>
        }
      />
      <View style={S.addBar}>
        <TextInput
          style={S.addInput}
          value={newComment}
          onChangeText={setNewComment}
          placeholder="Add a comment..."
          placeholderTextColor={COLORS.textMuted}
          multiline
        />
        <TouchableOpacity
          style={[S.addBtn, (!newComment.trim() || addingComment) && { opacity: 0.4 }]}
          onPress={handleAddComment}
          disabled={!newComment.trim() || addingComment}
        >
          {addingComment ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={16} color="#fff" />}
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Time Tracking Tab ──
  const renderTimeTracking = () => {
    const entries = task.timeEntries || [];
    const activeEntry = entries.find((e: any) => !e.endTime);
    const totalMs = entries.reduce((acc: number, e: any) => {
      if (e.endTime) return acc + (new Date(e.endTime).getTime() - new Date(e.startTime).getTime());
      return acc;
    }, 0);
    const totalHours = (totalMs / (1000 * 60 * 60)).toFixed(1);

    return (
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 80 }}>
        {/* Total Time Card */}
        <View style={S.timeCard}>
          <LinearGradient colors={[PRIMARY + '20', 'transparent']} style={S.timeCardGradient} />
          <Ionicons name="time" size={28} color={PRIMARY} />
          <View>
            <Text style={S.timeTotalLabel}>Total Time Logged</Text>
            <Text style={S.timeTotalValue}>{totalHours} hours</Text>
          </View>
        </View>

        {/* Active Timer / Start */}
        {activeEntry ? (
          <View style={S.activeTimerCard}>
            <View style={S.timerPulse} />
            <View style={{ flex: 1 }}>
              <Text style={S.activeLabel}>Timer Running</Text>
              {activeEntry.description && <Text style={S.activeDesc}>{activeEntry.description}</Text>}
              <Text style={S.activeTime}>Started {new Date(activeEntry.startTime).toLocaleTimeString()}</Text>
            </View>
            <TouchableOpacity style={S.stopBtn} onPress={() => handleStopTime(activeEntry._id || activeEntry.id)}>
              <Ionicons name="stop" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={S.startTimerSection}>
            <TextInput
              style={S.timeDescInput}
              value={timeDescription}
              onChangeText={setTimeDescription}
              placeholder="What are you working on?"
              placeholderTextColor={COLORS.textMuted}
            />
            <TouchableOpacity style={[S.startBtn, tracking && { opacity: 0.5 }]} onPress={handleStartTime} disabled={tracking}>
              <LinearGradient colors={[PRIMARY, COLORS.primaryDark]} style={S.startBtnGradient}>
                {tracking ? <ActivityIndicator size="small" color="#fff" /> : (
                  <>
                    <Ionicons name="play" size={16} color="#fff" />
                    <Text style={S.startBtnText}>Start Timer</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Time Entries */}
        {entries.filter((e: any) => e.endTime).length > 0 && (
          <View style={S.section}>
            <Text style={S.sectionLabel}>History</Text>
            {entries.filter((e: any) => e.endTime).map((entry: any, idx: number) => {
              const dur = ((new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime()) / (1000 * 60)).toFixed(0);
              return (
                <View key={entry._id || idx} style={S.timeEntryRow}>
                  <Ionicons name="time-outline" size={14} color={COLORS.textMuted} />
                  <View style={{ flex: 1 }}>
                    <Text style={S.timeEntryDesc}>{entry.description || 'Work session'}</Text>
                    <Text style={S.timeEntryDate}>{new Date(entry.startTime).toLocaleDateString()}</Text>
                  </View>
                  <Text style={S.timeEntryDur}>{dur}m</Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    );
  };

  const TABS: { key: DetailTab; label: string; icon: keyof typeof Ionicons.glyphMap; badge?: number }[] = [
    { key: 'overview', label: 'Overview', icon: 'information-circle' },
    { key: 'subtasks', label: 'Subtasks', icon: 'list', badge: totalSubtasks },
    { key: 'comments', label: 'Comments', icon: 'chatbubbles', badge: (task.comments || []).length },
    { key: 'time', label: 'Time', icon: 'time' },
  ];

  return (
    <SafeAreaView style={S.root} edges={['top']}>
      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          {editingField === 'title' ? (
            <View style={S.editFieldRow}>
              <TextInput
                style={S.editTitleInput}
                value={editTitle}
                onChangeText={setEditTitle}
                autoFocus
                multiline
              />
              <TouchableOpacity onPress={() => handleSaveField('title', editTitle)} disabled={saving}>
                <Ionicons name="checkmark-circle" size={22} color={COLORS.success} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditingField(null)}>
                <Ionicons name="close-circle" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => { setEditTitle(task.title || ''); setEditingField('title'); }} activeOpacity={0.7}>
              <Text style={S.headerTitle} numberOfLines={2}>{task.title}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <View style={[S.priorityDotSm, { backgroundColor: PRIORITY_COLORS[priority] }]} />
                <Text style={S.headerMeta}>{priority} priority</Text>
                <Ionicons name="create-outline" size={12} color={COLORS.textMuted} style={{ marginLeft: 4 }} />
              </View>
            </TouchableOpacity>
          )}
        </View>
        {isCreator && (
          <TouchableOpacity onPress={handleDeleteTask} style={[S.backBtn, { backgroundColor: COLORS.danger + '15' }]}>
            <Ionicons name="trash" size={18} color={COLORS.danger} />
          </TouchableOpacity>
        )}
      </View>

      {/* Assignee Picker Modal */}
      <Modal visible={assigneePickerOpen} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: COLORS.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '60%', paddingBottom: 40 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: GLASS_BORDER }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: COLORS.textPrimary }}>Assign Member</Text>
              <TouchableOpacity onPress={() => setAssigneePickerOpen(false)}>
                <Ionicons name="close" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={members}
              keyExtractor={(item: any) => item._id || item.userId || item.id}
              contentContainerStyle={{ padding: 16, gap: 8 }}
              renderItem={({ item }: { item: any }) => (
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: GLASS, borderRadius: 10, borderWidth: 1, borderColor: GLASS_BORDER }}
                  onPress={() => handleChangeAssignee(item._id || item.userId || item.id, item.name)}
                >
                  <View style={S.assigneeAvatar}><Text style={S.assigneeInitial}>{getInitials(item.name || 'M')}</Text></View>
                  <Text style={{ flex: 1, fontSize: 14, color: COLORS.textPrimary, fontWeight: '600' }}>{item.name}</Text>
                  {(task.assignee === item._id || task.assignee === item.userId || task.assigneeName === item.name) && (
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={{ textAlign: 'center', color: COLORS.textMuted, padding: 20 }}>No members found</Text>}
            />
          </View>
        </View>
      </Modal>

      {/* Tabs */}
      <View style={S.tabRow}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[S.tab, activeTab === tab.key && S.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons name={tab.icon} size={12} color={activeTab === tab.key ? '#fff' : COLORS.textMuted} />
            <Text style={[S.tabText, activeTab === tab.key && S.tabTextActive]}>{tab.label}</Text>
            {tab.badge && tab.badge > 0 ? (
              <View style={S.tabBadge}><Text style={S.tabBadgeText}>{tab.badge}</Text></View>
            ) : null}
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'subtasks' && renderSubtasks()}
      {activeTab === 'comments' && renderComments()}
      {activeTab === 'time' && renderTimeTracking()}
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: GLASS_BORDER, gap: 12,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: GLASS, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary, lineHeight: 22 },
  headerMeta: { fontSize: 12, color: COLORS.textMuted },
  priorityDotSm: { width: 8, height: 8, borderRadius: 4 },

  tabRow: {
    flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 6,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    height: 32, borderRadius: RADIUS.md, backgroundColor: GLASS,
    borderWidth: 1, borderColor: GLASS_BORDER,
  },
  tabActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  tabText: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  tabTextActive: { color: '#fff' },
  tabBadge: { minWidth: 14, height: 14, borderRadius: 7, backgroundColor: COLORS.danger, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  tabBadgeText: { fontSize: 8, fontWeight: '900', color: '#fff' },

  // Overview
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full },
  statusText: { fontSize: 11, fontWeight: '700' },
  priorityBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  priorityText: { fontSize: 11, fontWeight: '700' },
  reviewBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full },
  reviewText: { fontSize: 11, fontWeight: '700' },

  section: { gap: 10 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  descText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 21 },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  assigneeAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: PRIMARY + '25', justifyContent: 'center', alignItems: 'center' },
  assigneeInitial: { fontSize: 10, fontWeight: '800', color: PRIMARY },
  infoText: { fontSize: 13, color: COLORS.textPrimary },

  labelsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  labelChip: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: PRIMARY + '15', borderRadius: RADIUS.full },
  labelText: { fontSize: 10, fontWeight: '600', color: PRIMARY },

  progressSection: { gap: 8 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressCount: { fontSize: 12, fontWeight: '700', color: PRIMARY },
  progressBg: { height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: PRIMARY, borderRadius: 3 },

  // Review
  reviewSection: { gap: 12, padding: 16, backgroundColor: GLASS, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: GLASS_BORDER },
  submitReviewBtn: { borderRadius: RADIUS.lg, overflow: 'hidden' },
  submitReviewGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  submitReviewText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  reviewInput: { backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: 12, color: COLORS.textPrimary, fontSize: 13, minHeight: 60, borderWidth: 1, borderColor: COLORS.border },
  reviewActions: { flexDirection: 'row', gap: 10 },
  changesBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.danger + '40' },
  changesBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.danger },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: RADIUS.md, backgroundColor: COLORS.success },
  approveBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  feedbackBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, backgroundColor: COLORS.danger + '10', borderRadius: RADIUS.md, borderLeftWidth: 3, borderLeftColor: COLORS.danger },
  feedbackText: { flex: 1, fontSize: 12, color: COLORS.danger, lineHeight: 17 },

  // Subtasks
  subtaskRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
    backgroundColor: GLASS, borderRadius: RADIUS.md, borderWidth: 1, borderColor: GLASS_BORDER,
  },
  subtaskText: { flex: 1, fontSize: 14, color: COLORS.textPrimary },
  subtaskDone: { textDecorationLine: 'line-through', color: COLORS.textMuted },

  // Comments
  commentCard: { backgroundColor: GLASS, borderRadius: RADIUS.lg, padding: 14, borderWidth: 1, borderColor: GLASS_BORDER, gap: 10 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  commentAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: PRIMARY + '25', justifyContent: 'center', alignItems: 'center' },
  commentAvatarText: { fontSize: 11, fontWeight: '800', color: PRIMARY },
  commentName: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  commentTime: { fontSize: 10, color: COLORS.textMuted },
  commentContent: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },
  mentionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  mentionTag: { fontSize: 11, color: PRIMARY, fontWeight: '600' },

  // Time Tracking
  timeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20,
    backgroundColor: GLASS, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: GLASS_BORDER, overflow: 'hidden',
    ...SHADOWS.sm,
  },
  timeCardGradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  timeTotalLabel: { fontSize: 12, color: COLORS.textMuted },
  timeTotalValue: { fontSize: 22, fontWeight: '900', color: COLORS.textPrimary, marginTop: 2 },
  activeTimerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16,
    backgroundColor: COLORS.success + '10', borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.success + '30',
  },
  timerPulse: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.success },
  activeLabel: { fontSize: 13, fontWeight: '700', color: COLORS.success },
  activeDesc: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  activeTime: { fontSize: 11, color: COLORS.textMuted, marginTop: 3 },
  stopBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.danger, justifyContent: 'center', alignItems: 'center' },
  startTimerSection: { gap: 10 },
  timeDescInput: { backgroundColor: GLASS, borderRadius: RADIUS.md, padding: 14, color: COLORS.textPrimary, fontSize: 14, borderWidth: 1, borderColor: GLASS_BORDER },
  startBtn: { borderRadius: RADIUS.lg, overflow: 'hidden' },
  startBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  startBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  timeEntryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: GLASS_BORDER },
  timeEntryDesc: { fontSize: 13, color: COLORS.textPrimary },
  timeEntryDate: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  timeEntryDur: { fontSize: 14, fontWeight: '800', color: PRIMARY },

  // Bottom bar
  addBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: GLASS_BORDER, backgroundColor: COLORS.background,
  },
  addInput: { flex: 1, backgroundColor: GLASS, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 10, color: COLORS.textPrimary, fontSize: 14, borderWidth: 1, borderColor: GLASS_BORDER },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: PRIMARY, justifyContent: 'center', alignItems: 'center' },

  emptyTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginTop: 12 },
  backNavBtn: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: PRIMARY, borderRadius: RADIUS.md },
  backNavText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // Inline editing
  editFieldRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editTitleInput: { flex: 1, fontSize: 17, fontWeight: '800', color: COLORS.textPrimary, backgroundColor: GLASS, borderRadius: RADIUS.md, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: PRIMARY + '40' },
  editDescInput: { backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: 12, color: COLORS.textPrimary, fontSize: 14, minHeight: 80, borderWidth: 1, borderColor: PRIMARY + '40', textAlignVertical: 'top' },
  editDescActions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  editSaveBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: PRIMARY, borderRadius: RADIUS.md },
  editSaveBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  editCancelText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  priorityEditRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  priorityOption: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full },
  priorityOptionText: { fontSize: 11, fontWeight: '700', color: COLORS.textPrimary },
});
