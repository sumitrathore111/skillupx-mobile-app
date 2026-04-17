import {
    AlertCircle,
    Calendar,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Clock,
    GitBranch,
    GitCommit,
    GitMerge,
    GitPullRequest,
    MessageSquare,
    Paperclip
} from 'lucide-react';
import { useMemo } from 'react';

// Local type definitions to avoid Vite module resolution issues
interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
}

interface TaskComment {
  id: string;
  content: string;
  author: string;
  authorName: string;
  authorAvatar?: string;
  mentions: string[];
  createdAt: string;
  updatedAt?: string;
  isEdited: boolean;
}

interface TimeEntry {
  id: string;
  userId: string;
  userName: string;
  startTime: string;
  endTime?: string;
  duration: number;
  description?: string;
}

interface TaskAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
}

interface Assignee {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
}

// GitHub integration types for task cards
interface GitHubPRInfo {
  number: number;
  title: string;
  state: 'open' | 'closed' | 'merged';
  url: string;
  author: string;
  reviewStatus?: 'pending' | 'approved' | 'changes_requested';
  checksStatus?: 'pending' | 'success' | 'failure';
}

interface GitHubCommitInfo {
  sha: string;
  message: string;
  author: string;
  url: string;
}

interface TaskGitHubData {
  linkedPRs?: GitHubPRInfo[];
  linkedCommits?: GitHubCommitInfo[];
  linkedIssueNumber?: number;
}

interface KanbanTask {
  _id: string;
  boardId: string;
  columnId: string;
  projectId: string;
  title: string;
  description?: string;
  position: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  labels: string[];
  assignees: Assignee[];
  reporter: Assignee;
  dueDate?: string;
  startDate?: string;
  estimatedHours?: number;
  subtasks: ChecklistItem[];
  checklists: { id: string; title: string; items: ChecklistItem[] }[];
  comments: TaskComment[];
  timeEntries: TimeEntry[];
  totalTimeSpent: number;
  attachments: TaskAttachment[];
  watchers: string[];
  sprintId?: string;
  storyPoints?: number;
  epicId?: string;
  completedAt?: string;
  completedBy?: string;
  // Review fields
  reviewStatus?: 'pending' | 'approved' | 'changes_requested' | 'not_submitted';
  reviewedBy?: Assignee;
  reviewedAt?: string;
  reviewComment?: string;
  createdAt: string;
  updatedAt: string;
  // GitHub integration
  github?: TaskGitHubData;
}

interface BoardLabel {
  id: string;
  name: string;
  color: string;
}

interface TaskCardProps {
  task: KanbanTask;
  labels: BoardLabel[];
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  isDragging?: boolean;
  currentUserId?: string;
  isProjectOwner?: boolean;
  columnTitle?: string;
}

export default function TaskCard({
  task,
  labels,
  onClick,
  onDragStart,
  onDragEnd,
  isDragging,
  currentUserId,
  isProjectOwner = false,
  columnTitle
}: TaskCardProps) {
  // Debug: Log full task data
  console.log('🎯 TaskCard FULL DATA for:', task.title);
  console.log('   - assignees:', task.assignees);
  console.log('   - assignees length:', task.assignees?.length);
  console.log('   - full task:', JSON.stringify(task, null, 2));

  // Check if task is in Done column - completed tasks cannot be moved
  const isInDoneColumn = columnTitle?.toLowerCase() === 'done';

  // Check if current user can drag this task (assignee or project owner, but NOT from Done column)
  const canDrag = !isInDoneColumn && (isProjectOwner || task.assignees?.some(a =>
    a._id === currentUserId || (a as any).id === currentUserId || String(a._id) === currentUserId
  ));
  const priorityColors = {
    low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  };

  const priorityIcons = {
    low: <ChevronDown className="w-3 h-3" />,
    medium: <ChevronRight className="w-3 h-3" />,
    high: <AlertCircle className="w-3 h-3" />,
    critical: <AlertCircle className="w-3 h-3" />
  };

  // Calculate progress
  const subtaskProgress = useMemo(() => {
    if (task.subtasks.length === 0) return null;
    const completed = task.subtasks.filter(s => s.completed).length;
    return {
      completed,
      total: task.subtasks.length,
      percentage: Math.round((completed / task.subtasks.length) * 100)
    };
  }, [task.subtasks]);

  // Get labels with colors - handle both label IDs (strings) and label objects
  const taskLabels = useMemo(() => {
    if (!Array.isArray(task.labels)) return [];
    return task.labels
      .map(labelId => {
        // If labelId is already a label object with id, use it directly
        if (typeof labelId === 'object' && labelId !== null && 'id' in labelId) {
          return labelId as BoardLabel;
        }
        // If it's a string ID, find the matching label
        if (typeof labelId === 'string') {
          return labels.find(l => l.id === labelId);
        }
        return undefined;
      })
      .filter((label): label is BoardLabel => label !== undefined && label !== null && typeof label.id === 'string');
  }, [task.labels, labels]);

  // Check if overdue
  const isOverdue = useMemo(() => {
    if (!task.dueDate || task.completedAt) return false;
    return new Date(task.dueDate) < new Date();
  }, [task.dueDate, task.completedAt]);

  // Format due date
  const formattedDueDate = useMemo(() => {
    if (!task.dueDate) return null;
    const date = new Date(task.dueDate);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
    if (diffDays < 7) return `${diffDays} days`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, [task.dueDate]);

  // Format time spent
  const formattedTimeSpent = useMemo(() => {
    if (!task.totalTimeSpent) return null;
    const hours = Math.floor(task.totalTimeSpent / 60);
    const minutes = task.totalTimeSpent % 60;
    if (hours === 0) return `${minutes}m`;
    return `${hours}h ${minutes}m`;
  }, [task.totalTimeSpent]);

  // GitHub PR status helpers
  const linkedPRs = task.github?.linkedPRs || [];
  const linkedCommits = task.github?.linkedCommits || [];
  const hasGitHubData = linkedPRs.length > 0 || linkedCommits.length > 0 || task.github?.linkedIssueNumber;

  const prStatusColor = (pr: GitHubPRInfo) => {
    if (pr.state === 'merged') return 'text-purple-500 bg-purple-100 dark:bg-purple-900/30';
    if (pr.state === 'closed') return 'text-red-500 bg-red-100 dark:bg-red-900/30';
    if (pr.reviewStatus === 'approved') return 'text-green-500 bg-green-100 dark:bg-green-900/30';
    if (pr.reviewStatus === 'changes_requested') return 'text-orange-500 bg-orange-100 dark:bg-orange-900/30';
    return 'text-blue-500 bg-blue-100 dark:bg-blue-900/30';
  };

  const prStatusIcon = (pr: GitHubPRInfo) => {
    if (pr.state === 'merged') return <GitMerge className="w-3 h-3" />;
    if (pr.checksStatus === 'success') return <CheckCircle2 className="w-3 h-3" />;
    if (pr.checksStatus === 'failure') return <AlertCircle className="w-3 h-3" />;
    return <GitPullRequest className="w-3 h-3" />;
  };

  return (
    <div
      draggable={canDrag}
      onDragStart={canDrag ? onDragStart : undefined}
      onDragEnd={canDrag ? onDragEnd : undefined}
      onClick={onClick}
      className={`
        bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700
        p-3 cursor-pointer transition-all duration-200
        hover:shadow-md hover:border-purple-300 dark:hover:border-purple-600
        ${isDragging ? 'opacity-50 rotate-3 scale-105' : ''}
        ${!canDrag ? 'cursor-default' : ''}
      `}
      title={isInDoneColumn ? 'Completed tasks cannot be moved' : !canDrag ? 'Only assignees can move this task' : undefined}
    >
      {/* Labels */}
      {taskLabels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {taskLabels.map((label) => (
            <span
              key={label.id}
              className="px-2 py-0.5 text-xs rounded-full text-white"
              style={{ backgroundColor: label.color }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-2 line-clamp-2">
        {task.title}
      </h4>

      {/* Assignee Info - Show on draggable card */}
      <div className="flex items-center gap-2 mb-2 p-1.5 bg-gray-50 dark:bg-gray-700/50 rounded-md">
        {task.assignees && task.assignees.length > 0 ? (
          <>
            <div className="flex -space-x-1">
              {task.assignees.map((assignee, index) => {
                // Handle both object and string assignee formats
                const assigneeObj: Assignee = typeof assignee === 'string'
                  ? { _id: assignee, name: assignee, email: '' }
                  : assignee;
                const name = assigneeObj?.name || assigneeObj?.email || 'User';
                return (
                  <div
                    key={assigneeObj?._id || `assignee-${index}`}
                    className="w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center text-white text-[10px] font-medium border border-white dark:border-gray-800"
                    title={name}
                  >
                    {assigneeObj?.avatar ? (
                      <img src={assigneeObj.avatar} alt={name} className="w-full h-full rounded-full" />
                    ) : (
                      name.charAt(0).toUpperCase()
                    )}
                  </div>
                );
              })}
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-300 font-medium truncate">
              {task.assignees.map((assignee, index) => {
                const name = typeof assignee === 'string'
                  ? assignee
                  : (assignee?.name || assignee?.email || 'User');
                return index === 0 ? name : `, ${name}`;
              }).join('')}
            </span>
          </>
        ) : (
          <span className="text-xs text-gray-400 italic">Unassigned</span>
        )}
      </div>

      {/* Description preview */}
      {task.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Subtask progress */}
      {subtaskProgress && (
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {subtaskProgress.completed}/{subtaskProgress.total}
            </span>
            <span>{subtaskProgress.percentage}%</span>
          </div>
          <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full transition-all duration-300"
              style={{ width: `${subtaskProgress.percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* GitHub Integration Indicators */}
      {hasGitHubData && (
        <div className="mb-2 space-y-1">
          {/* Linked PRs */}
          {linkedPRs.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {linkedPRs.slice(0, 2).map((pr) => (
                <a
                  key={pr.number}
                  href={pr.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${prStatusColor(pr)} hover:opacity-80 transition-opacity`}
                  title={`PR #${pr.number}: ${pr.title}`}
                >
                  {prStatusIcon(pr)}
                  <span>#{pr.number}</span>
                </a>
              ))}
              {linkedPRs.length > 2 && (
                <span className="text-xs text-gray-400">+{linkedPRs.length - 2}</span>
              )}
            </div>
          )}
          {/* Linked Commits */}
          {linkedCommits.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <GitCommit className="w-3 h-3" />
              <span>{linkedCommits.length} commit{linkedCommits.length > 1 ? 's' : ''}</span>
            </div>
          )}
          {/* Linked Issue */}
          {task.github?.linkedIssueNumber && (
            <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <GitBranch className="w-3 h-3" />
              <span>Issue #{task.github.linkedIssueNumber}</span>
            </div>
          )}
        </div>
      )}

      {/* Meta info row */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {/* Priority */}
          <span className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded ${priorityColors[task.priority]}`}>
            {priorityIcons[task.priority]}
            <span className="capitalize">{task.priority}</span>
          </span>

          {/* Story points */}
          {task.storyPoints && (
            <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-1.5 py-0.5 rounded">
              {task.storyPoints} pts
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-gray-400">
          {/* Comments count */}
          {task.comments.length > 0 && (
            <span className="flex items-center gap-0.5">
              <MessageSquare className="w-3 h-3" />
              {task.comments.length}
            </span>
          )}

          {/* Attachments count */}
          {task.attachments.length > 0 && (
            <span className="flex items-center gap-0.5">
              <Paperclip className="w-3 h-3" />
              {task.attachments.length}
            </span>
          )}
        </div>
      </div>

      {/* Bottom row: Due date and time only */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 text-xs">
          {/* Due date */}
          {formattedDueDate && (
            <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
              <Calendar className="w-3 h-3" />
              {formattedDueDate}
            </span>
          )}

          {/* Time spent */}
          {formattedTimeSpent && (
            <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
              <Clock className="w-3 h-3" />
              {formattedTimeSpent}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
