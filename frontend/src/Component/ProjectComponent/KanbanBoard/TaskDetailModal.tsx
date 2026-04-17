import {
    AlertCircle,
    Calendar,
    Check,
    CheckCircle,
    CheckCircle2,
    Clock,
    MessageSquare,
    Paperclip,
    Pause,
    Play,
    Plus,
    Send,
    Trash2,
    Users,
    X,
    XCircle
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { BoardColumn, BoardLabel, KanbanTask, ProjectMember } from './kanban.types';

interface TaskDetailModalProps {
  task: KanbanTask;
  labels: BoardLabel[];
  columns: BoardColumn[];
  members: ProjectMember[];
  currentUserId: string;
  currentUserName: string;
  isProjectOwner: boolean; // NEW: Only owner can review
  onClose: () => void;
  onUpdate: (taskId: string, updates: Partial<KanbanTask>) => void;
  onDelete: (taskId: string) => void;
  onAddComment: (taskId: string, content: string, mentions: string[]) => void;
  onAddSubtask: (taskId: string, text: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string, completed: boolean) => void;
  onStartTimer: (taskId: string, description?: string) => void;
  onStopTimer: (taskId: string, timeEntryId: string) => void;
  onSubmitForReview?: (taskId: string) => void;
  onApprove?: (taskId: string, comment?: string) => void;
  onRequestChanges?: (taskId: string, comment: string) => void;
}

export default function TaskDetailModal({
  task,
  labels,
  columns,
  members,
  currentUserId,
  isProjectOwner,
  onClose,
  onUpdate,
  onDelete,
  onAddComment,
  onAddSubtask,
  onToggleSubtask,
  onStartTimer,
  onStopTimer,
  onSubmitForReview,
  onApprove,
  onRequestChanges
}: TaskDetailModalProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [editingDescription, setEditingDescription] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [newSubtask, setNewSubtask] = useState('');
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewAction, setReviewAction] = useState<'approve' | 'changes'>('approve');

  // Debug: Log review button visibility conditions
  const currentColumn = columns.find(c => c.id === task.columnId);
  const isReviewColumn = currentColumn?.title.toLowerCase() === 'review';
  const shouldShowReviewButtons = isProjectOwner && (task.reviewStatus === 'pending' || (task.reviewStatus !== 'approved' && isReviewColumn));

  console.log('🎯 TaskDetailModal Review Debug:', {
    isProjectOwner,
    taskReviewStatus: task.reviewStatus,
    taskColumnId: task.columnId,
    currentColumnTitle: currentColumn?.title,
    isReviewColumn,
    shouldShowReviewButtons
  });

  // Active timer check
  const activeTimer = useMemo(() => {
    return task.timeEntries.find(t => t.userId === currentUserId && !t.endTime);
  }, [task.timeEntries, currentUserId]);

  // Check if current user can edit the task (assignee or project owner)
  const canEdit = useMemo(() => {
    if (isProjectOwner) return true;
    return task.assignees?.some((assignee: any) => {
      const id = typeof assignee === 'string' ? assignee : assignee?._id || assignee?.userId;
      return id === currentUserId;
    });
  }, [task.assignees, currentUserId, isProjectOwner]);

  // Subtask progress
  const subtaskProgress = useMemo(() => {
    if (task.subtasks.length === 0) return null;
    const completed = task.subtasks.filter(s => s.completed).length;
    return {
      completed,
      total: task.subtasks.length,
      percentage: Math.round((completed / task.subtasks.length) * 100)
    };
  }, [task.subtasks]);

  // Format time
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  // Handle title save
  const handleTitleSave = () => {
    if (title.trim() && title !== task.title) {
      onUpdate(task._id, { title: title.trim() });
    }
    setEditingTitle(false);
  };

  // Handle description save
  const handleDescriptionSave = () => {
    if (description !== task.description) {
      onUpdate(task._id, { description });
    }
    setEditingDescription(false);
  };

  // Handle label toggle
  const handleLabelToggle = (labelId: string) => {
    const newLabels = task.labels.includes(labelId)
      ? task.labels.filter(l => l !== labelId)
      : [...task.labels, labelId];
    onUpdate(task._id, { labels: newLabels });
  };

  // Handle assignee toggle
  const handleAssigneeToggle = (memberId: string) => {
    const currentAssigneeIds = task.assignees.map(a => a._id);
    const newAssignees = currentAssigneeIds.includes(memberId)
      ? task.assignees.filter(a => a._id !== memberId)
      : [...task.assignees, members.find(m => m.userId === memberId) as any].filter(Boolean);
    onUpdate(task._id, { assignees: newAssignees });
  };

  // Handle column change
  const handleColumnChange = (columnId: string) => {
    if (columnId !== task.columnId) {
      onUpdate(task._id, { columnId });
    }
    setShowColumnPicker(false);
  };

  // Handle priority change
  const handlePriorityChange = (priority: 'low' | 'medium' | 'high' | 'critical') => {
    onUpdate(task._id, { priority });
  };

  // Handle due date change
  const handleDueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(task._id, { dueDate: e.target.value || undefined });
  };

  // Handle comment submit
  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    // Extract @mentions
    const mentions = newComment.match(/@(\w+)/g)?.map(m => m.slice(1)) || [];
    onAddComment(task._id, newComment.trim(), mentions);
    setNewComment('');
  };

  // Handle subtask submit
  const handleSubtaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtask.trim()) return;
    onAddSubtask(task._id, newSubtask.trim());
    setNewSubtask('');
  };

  const priorityColors = {
    low: 'bg-green-100 text-green-700 border-green-300',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    high: 'bg-orange-100 text-orange-700 border-orange-300',
    critical: 'bg-red-100 text-red-700 border-red-300'
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto py-8">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-3xl mx-4 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          {/* Labels */}
          <div className="flex flex-wrap gap-1 mb-3">
            {task.labels.map(labelId => {
              const label = labels.find(l => l.id === labelId);
              if (!label) return null;
              return (
                <span
                  key={label.id}
                  className="px-2 py-1 text-xs rounded-full text-white"
                  style={{ backgroundColor: label.color }}
                >
                  {label.name}
                </span>
              );
            })}
            {canEdit && (
              <button
                onClick={() => setShowLabelPicker(!showLabelPicker)}
                className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-900 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <Plus className="w-3 h-3 inline" /> Label
              </button>
            )}
          </div>

          {/* Label Picker */}
          {showLabelPicker && (
            <div className="absolute left-6 mt-1 w-48 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10 py-1">
              {labels.map(label => (
                <button
                  key={label.id}
                  onClick={() => handleLabelToggle(label.id)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: label.color }} />
                  <span>{label.name}</span>
                  {task.labels.includes(label.id) && <Check className="w-4 h-4 ml-auto text-green-500" />}
                </button>
              ))}
            </div>
          )}

          {/* Title */}
          {editingTitle && canEdit ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
              className="w-full text-xl font-bold bg-transparent border-b-2 border-[#00ADB5] outline-none dark:text-white"
              autoFocus
            />
          ) : (
            <h2
              onClick={() => canEdit && setEditingTitle(true)}
              className={`text-xl font-bold text-gray-900 dark:text-white pr-8 ${canEdit ? 'cursor-pointer hover:text-[#00ADB5]' : ''}`}
            >
              {task.title}
            </h2>
          )}

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-3 mt-3 text-sm">
            {/* Status/Column */}
            <div className="relative">
              <button
                onClick={() => setShowColumnPicker(!showColumnPicker)}
                className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-900 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: columns.find(c => c.id === task.columnId)?.color }}
                />
                {columns.find(c => c.id === task.columnId)?.title}
              </button>
              {showColumnPicker && (
                <div className="absolute top-full left-0 mt-1 w-40 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10 py-1">
                  {columns.map(col => (
                    <button
                      key={col.id}
                      onClick={() => handleColumnChange(col.id)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                      {col.title}
                      {col.id === task.columnId && <Check className="w-4 h-4 ml-auto text-green-500" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Priority */}
            {canEdit ? (
              <select
                value={task.priority}
                onChange={(e) => handlePriorityChange(e.target.value as any)}
                className={`px-2 py-1 rounded-lg border text-sm ${priorityColors[task.priority]}`}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            ) : (
              <span className={`px-2 py-1 rounded-lg border text-sm ${priorityColors[task.priority]}`}>
                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
              </span>
            )}

            {/* Due date */}
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4 text-gray-400" />
              {canEdit ? (
                <input
                  type="date"
                  value={task.dueDate ? task.dueDate.split('T')[0] : ''}
                  onChange={handleDueDateChange}
                  className="bg-transparent border-none text-sm text-gray-600 dark:text-gray-400"
                />
              ) : (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                </span>
              )}
            </div>

            {/* Story points */}
            <div className="flex items-center gap-1">
              <span className="text-gray-400">Points:</span>
              {canEdit ? (
                <input
                  type="number"
                  value={task.storyPoints || ''}
                  onChange={(e) => onUpdate(task._id, { storyPoints: parseInt(e.target.value) || undefined })}
                  className="w-12 bg-gray-100 dark:bg-gray-900 rounded px-2 py-1 text-sm"
                  placeholder="0"
                  min="0"
                />
              ) : (
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {task.storyPoints || 0}
                </span>
              )}
            </div>
          </div>

          {/* Review Status Badge */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {/* Review Status */}
            {task.reviewStatus && task.reviewStatus !== 'not_submitted' && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                task.reviewStatus === 'approved'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : task.reviewStatus === 'pending'
                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {task.reviewStatus === 'approved' && <CheckCircle className="w-4 h-4" />}
                {task.reviewStatus === 'pending' && <Clock className="w-4 h-4" />}
                {task.reviewStatus === 'changes_requested' && <AlertCircle className="w-4 h-4" />}
                <span className="capitalize">{task.reviewStatus.replace('_', ' ')}</span>
              </div>
            )}

            {/* Reviewed By */}
            {task.reviewedBy && (
              <div className="text-xs text-gray-500">
                Reviewed by {task.reviewedBy.name} on {new Date(task.reviewedAt!).toLocaleDateString()}
              </div>
            )}
          </div>

          {/* Review Comment */}
          {task.reviewComment && task.reviewStatus === 'changes_requested' && (
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-400">
                <strong>Changes Requested:</strong> {task.reviewComment}
              </p>
            </div>
          )}

          {/* Review Actions */}
          <div className="mt-4 flex flex-wrap gap-2">
            {/* Submit for Review - Only for assignees when task is not yet submitted */}
            {canEdit && !isProjectOwner && task.reviewStatus === 'not_submitted' && onSubmitForReview && (
              <button
                onClick={() => onSubmitForReview(task._id)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#00ADB5] to-cyan-600 text-white rounded-lg text-sm hover:shadow-lg transition-all"
              >
                <Send className="w-4 h-4" />
                Submit for Review
              </button>
            )}

            {/* Re-submit after changes requested - Only for assignees */}
            {canEdit && !isProjectOwner && task.reviewStatus === 'changes_requested' && onSubmitForReview && (
              <button
                onClick={() => onSubmitForReview(task._id)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#00ADB5] to-cyan-600 text-white rounded-lg text-sm hover:shadow-lg transition-all"
              >
                <Send className="w-4 h-4" />
                Re-submit for Review
              </button>
            )}

            {/* Approve & Request Changes - Only for project owner when task is pending review or in Review column */}
            {shouldShowReviewButtons && (
              <>
                <button
                  onClick={() => {
                    setReviewAction('approve');
                    setShowReviewModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve
                </button>
                <button
                  onClick={() => {
                    setReviewAction('changes');
                    setShowReviewModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
                >
                  <XCircle className="w-4 h-4" />
                  Request Changes
                </button>
              </>
            )}
          </div>
        </div>

        {/* Review Modal */}
        {showReviewModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {reviewAction === 'approve' ? '✅ Approve Task' : '❌ Request Changes'}
              </h3>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder={reviewAction === 'approve' ? 'Add approval comment (optional)...' : 'Describe the changes needed (required)...'}
                className="w-full h-32 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 resize-none mb-4"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (reviewAction === 'approve') {
                      onApprove?.(task._id, reviewComment);
                    } else if (reviewComment.trim()) {
                      onRequestChanges?.(task._id, reviewComment);
                    }
                    setShowReviewModal(false);
                    setReviewComment('');
                  }}
                  disabled={reviewAction === 'changes' && !reviewComment.trim()}
                  className={`flex-1 py-2 rounded-lg text-white text-sm ${
                    reviewAction === 'approve'
                      ? 'bg-green-500 hover:bg-green-600'
                      : 'bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  {reviewAction === 'approve' ? 'Approve' : 'Request Changes'}
                </button>
                <button
                  onClick={() => {
                    setShowReviewModal(false);
                    setReviewComment('');
                  }}
                  className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="grid grid-cols-3 gap-6 p-6">
          {/* Left column - Main content */}
          <div className="col-span-2 space-y-6">
            {/* Description */}
            <div>
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Description
              </h3>
              {editingDescription && canEdit ? (
                <div>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full h-32 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 resize-none"
                    placeholder="Add a description..."
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleDescriptionSave}
                      className="px-3 py-1 bg-gradient-to-r from-[#00ADB5] to-cyan-600 text-white rounded-lg text-sm hover:shadow-lg transition-all"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setDescription(task.description || '');
                        setEditingDescription(false);
                      }}
                      className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => canEdit && setEditingDescription(true)}
                  className={`p-3 bg-gray-50 dark:bg-gray-900 rounded-lg min-h-[80px] ${canEdit ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700' : ''}`}
                >
                  {task.description || <span className="text-gray-400">{canEdit ? 'Click to add description...' : 'No description'}</span>}
                </div>
              )}
            </div>

            {/* Subtasks */}
            <div>
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Subtasks
                {subtaskProgress && (
                  <span className="text-sm font-normal text-gray-500">
                    ({subtaskProgress.completed}/{subtaskProgress.total})
                  </span>
                )}
              </h3>

              {/* Progress bar */}
              {subtaskProgress && (
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-300"
                    style={{ width: `${subtaskProgress.percentage}%` }}
                  />
                </div>
              )}

              {/* Subtask list */}
              <div className="space-y-2">
                {task.subtasks.map((subtask) => (
                  <div
                    key={subtask.id}
                    className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg"
                  >
                    <button
                      onClick={() => canEdit && onToggleSubtask(task._id, subtask.id, !subtask.completed)}
                      disabled={!canEdit}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${!canEdit ? 'cursor-not-allowed opacity-60' : ''} ${
                        subtask.completed
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
                      }`}
                    >
                      {subtask.completed && <Check className="w-3 h-3" />}
                    </button>
                    <span className={subtask.completed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}>
                      {subtask.text}
                    </span>
                  </div>
                ))}
              </div>

              {/* Add subtask form - only for editors */}
              {canEdit && (
                <form onSubmit={handleSubtaskSubmit} className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    placeholder="Add a subtask..."
                    className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={!newSubtask.trim()}
                    className="px-3 py-2 bg-gradient-to-r from-[#00ADB5] to-cyan-600 text-white rounded-lg text-sm hover:shadow-lg disabled:opacity-50 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>

            {/* Comments */}
            <div>
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Comments ({task.comments.length})
              </h3>

              <div className="space-y-3 max-h-64 overflow-y-auto">
                {task.comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#00ADB5] to-cyan-500 flex items-center justify-center text-white text-sm">
                      {comment.authorName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-900 dark:text-white">
                          {comment.authorName}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(comment.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add comment form - only for editors */}
              {canEdit && (
                <form onSubmit={handleCommentSubmit} className="mt-3">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment... Use @username to mention someone"
                    className="w-full p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 resize-none text-sm"
                    rows={2}
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim()}
                    className="mt-2 px-4 py-2 bg-gradient-to-r from-[#00ADB5] to-cyan-600 text-white rounded-lg text-sm hover:shadow-lg disabled:opacity-50 transition-all"
                  >
                    Post Comment
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Right column - Sidebar */}
          <div className="space-y-4">
            {/* Assignees */}
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-1">
                <Users className="w-4 h-4" />
                Assignees
              </h4>
              <div className="space-y-2">
                {task.assignees.map((assignee, index) => (
                  <div key={typeof assignee._id === 'string' ? assignee._id : String(assignee._id) || `assignee-${index}`} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-[#00ADB5] to-cyan-500 flex items-center justify-center text-white text-xs">
                      {(assignee.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{assignee.name || 'Unknown'}</span>
                  </div>
                ))}
                {/* Only project owner can add/change assignees */}
                {isProjectOwner && (
                  <>
                    <button
                      onClick={() => setShowAssigneePicker(!showAssigneePicker)}
                      className="flex items-center gap-1 text-sm text-[#00ADB5] hover:text-cyan-600"
                    >
                      <Plus className="w-4 h-4" />
                      Add assignee
                    </button>
                    {showAssigneePicker && (
                      <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                        {members.map((member) => (
                          <button
                            key={member.userId}
                            onClick={() => handleAssigneeToggle(member.userId)}
                            className="w-full flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm"
                          >
                            <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs">
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                            <span>{member.name}</span>
                            {task.assignees.some(a => a._id === member.userId) && (
                              <Check className="w-4 h-4 ml-auto text-green-500" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Time Tracking */}
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Time Tracking
              </h4>
              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {formatDuration(task.totalTimeSpent)}
                </div>
                {task.estimatedHours && (
                  <div className="text-sm text-gray-500 mb-2">
                    Estimated: {task.estimatedHours}h
                  </div>
                )}
                {/* Only assignees and owner can use timer */}
                {canEdit && (
                  activeTimer ? (
                    <button
                      onClick={() => onStopTimer(task._id, activeTimer.id)}
                      className="w-full flex items-center justify-center gap-2 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                    >
                      <Pause className="w-4 h-4" />
                      Stop Timer
                    </button>
                  ) : (
                    <button
                      onClick={() => onStartTimer(task._id)}
                      className="w-full flex items-center justify-center gap-2 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                    >
                      <Play className="w-4 h-4" />
                      Start Timer
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Attachments */}
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-1">
                <Paperclip className="w-4 h-4" />
                Attachments ({task.attachments.length})
              </h4>
              <div className="space-y-2">
                {task.attachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                  >
                    <Paperclip className="w-4 h-4 text-gray-400" />
                    <span className="truncate">{attachment.name}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Delete - Only for assignees and owner */}
            {canEdit && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                {showDeleteConfirm ? (
                  <div className="space-y-2">
                    <p className="text-sm text-red-600">Are you sure you want to delete this task?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onDelete(task._id)}
                        className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full flex items-center justify-center gap-2 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Task
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
