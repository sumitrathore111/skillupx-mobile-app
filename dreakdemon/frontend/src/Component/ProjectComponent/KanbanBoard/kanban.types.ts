// Kanban Board Types

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
}

export interface TaskComment {
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

export interface TimeEntry {
  id: string;
  userId: string;
  userName: string;
  startTime: string;
  endTime?: string;
  duration: number; // in minutes
  description?: string;
}

export interface TaskAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
}

export interface Assignee {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface KanbanTask {
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
  checklists: {
    id: string;
    title: string;
    items: ChecklistItem[];
  }[];
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
  // Review system
  reviewStatus: 'pending' | 'approved' | 'changes_requested' | 'not_submitted';
  reviewedBy?: Assignee;
  reviewedAt?: string;
  reviewComment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BoardColumn {
  id: string;
  title: string;
  position: number;
  color: string;
  taskLimit?: number;
  isCollapsed: boolean;
}

export interface BoardLabel {
  id: string;
  name: string;
  color: string;
}

export interface BoardSettings {
  defaultView: 'kanban' | 'list' | 'calendar' | 'gantt';
  showTaskIds: boolean;
  enableTimeTracking: boolean;
  enableStoryPoints: boolean;
}

export interface Board {
  _id: string;
  projectId: string;
  title: string;
  description?: string;
  columns: BoardColumn[];
  labels: BoardLabel[];
  settings: BoardSettings;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  _id: string;
  userId: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  avatar?: string;
}

export type ViewMode = 'kanban' | 'list' | 'calendar' | 'gantt' | 'timeline';

export interface DragItem {
  type: 'task';
  taskId: string;
  columnId: string;
  position: number;
}

// GitHub Integration Types
export interface GitHubPRInfo {
  number: number;
  title: string;
  state: 'open' | 'closed' | 'merged';
  url: string;
  author: string;
  authorAvatar?: string;
  branch: string;
  baseBranch: string;
  reviewStatus?: 'pending' | 'approved' | 'changes_requested';
  checksStatus?: 'pending' | 'success' | 'failure';
  createdAt: string;
  updatedAt: string;
  mergedAt?: string;
}

export interface GitHubCommitInfo {
  sha: string;
  message: string;
  author: string;
  authorAvatar?: string;
  url: string;
  date: string;
}

export interface GitHubIssueInfo {
  number: number;
  title: string;
  state: 'open' | 'closed';
  url: string;
  labels: { name: string; color: string }[];
  createdAt: string;
}

export interface TaskGitHubData {
  linkedPRs: GitHubPRInfo[];
  linkedCommits: GitHubCommitInfo[];
  linkedIssue?: GitHubIssueInfo;
}

export interface GitHubContributor {
  login: string;
  avatarUrl: string;
  name?: string;
  commits: number;
  prsOpened: number;
  prsMerged: number;
  prsReviewed: number;
  linesAdded: number;
  linesDeleted: number;
  lastActivity: string;
}

export interface GitHubRepoStats {
  totalCommits: number;
  totalPRs: number;
  openPRs: number;
  mergedPRs: number;
  totalIssues: number;
  openIssues: number;
  contributors: GitHubContributor[];
  commitActivity: { date: string; count: number }[];
  languageBreakdown: { language: string; percentage: number; color: string }[];
}
