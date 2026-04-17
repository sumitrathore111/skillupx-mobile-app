import type { KanbanTask, LeaderboardEntry, ProjectIssue, ProjectMember, Sprint } from '@apptypes/index';
import api from './api';

// ── Members Cache (60s TTL, same as frontend) ─────────────
const membersCache = new Map<string, { data: ProjectMember[]; timestamp: number }>();
const CACHE_TTL = 60_000;

function getCachedMembers(projectId: string): ProjectMember[] | null {
  const item = membersCache.get(projectId);
  if (!item) return null;
  if (Date.now() - item.timestamp > CACHE_TTL) { membersCache.delete(projectId); return null; }
  return item.data;
}

function setCachedMembers(projectId: string, data: ProjectMember[]) {
  membersCache.set(projectId, { data, timestamp: Date.now() });
}

export function invalidateMembersCache(projectId?: string) {
  if (projectId) membersCache.delete(projectId);
  else membersCache.clear();
}

// ── Projects CRUD ─────────────────────────────────────────
export const getAllProjects = async (filters?: { status?: string; category?: string; search?: string }) => {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
  const { data } = await api.get(`/projects?${params.toString()}`);
  return data?.projects || data || [];
};

export const getProjectById = async (projectId: string) => {
  const { data } = await api.get(`/projects/${projectId}`);
  return data?.project || data;
};

export const createProject = async (projectData: {
  title: string;
  description: string;
  category: string;
  techStack?: string[];
  visibility?: string;
  repositoryUrl?: string;
}) => {
  const { data } = await api.post('/projects', projectData);
  return data;
};

export const updateProject = async (projectId: string, updates: any) => {
  const { data } = await api.put(`/projects/${projectId}`, updates);
  return data;
};

export const deleteProject = async (projectId: string) => {
  await api.delete(`/projects/${projectId}`);
};

// ── Members ───────────────────────────────────────────────
export const joinProject = async (projectId: string) => {
  const { data } = await api.post(`/projects/${projectId}/join`);
  invalidateMembersCache(projectId);
  return data;
};

export const leaveProject = async (projectId: string) => {
  const { data } = await api.post(`/projects/${projectId}/leave`);
  invalidateMembersCache(projectId);
  return data;
};

export const getProjectMembers = async (projectId: string): Promise<ProjectMember[]> => {
  const cached = getCachedMembers(projectId);
  if (cached) return cached;
  const { data } = await api.get(`/projects/${projectId}/members`);
  const members = data?.members || data || [];
  setCachedMembers(projectId, members);
  return members;
};

export const removeMember = async (projectId: string, memberId: string) => {
  await api.delete(`/projects/${projectId}/members/${memberId}`);
  invalidateMembersCache(projectId);
};

// ── Issues ────────────────────────────────────────────────
export const getProjectIssues = async (projectId: string): Promise<ProjectIssue[]> => {
  const { data } = await api.get(`/projects/${projectId}/issues`);
  return data?.issues || data || [];
};

export const createIssue = async (projectId: string, issueData: { title: string; description: string }) => {
  const { data } = await api.post(`/projects/${projectId}/issues`, issueData);
  return data;
};

export const updateIssueStatus = async (projectId: string, issueId: string, status: string) => {
  const { data } = await api.put(`/projects/${projectId}/issues/${issueId}`, { status });
  return data;
};

// ── Kanban Board ──────────────────────────────────────────
// Cache board object (id + columns) per project
interface BoardCache {
  boardId: string;
  columns: { id: string; title: string; position: number }[];
}
let _boardCache: Record<string, BoardCache> = {};

async function getOrCreateBoard(projectId: string): Promise<BoardCache> {
  if (_boardCache[projectId]) return _boardCache[projectId];
  const { data: boards } = await api.get(`/boards/project/${projectId}`);
  let board: any;
  if (boards && boards.length > 0) {
    board = boards[0];
  } else {
    // Create default board if none exists
    const { data: newBoard } = await api.post(`/boards/project/${projectId}`, { title: 'Main Board' });
    board = newBoard;
  }
  // If columns not in list response, fetch the full board
  if (!board.columns || board.columns.length === 0) {
    const { data: fullBoard } = await api.get(`/boards/${board._id || board.id}`);
    board = fullBoard.board || fullBoard;
  }
  const cached: BoardCache = {
    boardId: board._id || board.id,
    columns: (board.columns || []).map((c: any) => ({ id: c.id || c._id, title: c.title, position: c.position })),
  };
  _boardCache[projectId] = cached;
  return cached;
}

// Map human-readable status to backend columnId
function statusToColumnId(columns: BoardCache['columns'], status: string): string {
  // Direct title match first
  const exact = columns.find(c => c.title === status);
  if (exact) return exact.id;
  // Fuzzy: 'In Review' ↔ 'Review'
  const lower = status.toLowerCase();
  const fuzzy = columns.find(c => c.title.toLowerCase().includes(lower) || lower.includes(c.title.toLowerCase()));
  if (fuzzy) return fuzzy.id;
  // Default: first column
  return columns[0]?.id;
}

// Map columnId back to title for display
function columnIdToStatus(columns: BoardCache['columns'], columnId: string): string {
  return columns.find(c => c.id === columnId)?.title || 'To Do';
}

export const getBoardTasks = async (projectId: string): Promise<KanbanTask[]> => {
  const { boardId, columns } = await getOrCreateBoard(projectId);
  const { data } = await api.get(`/boards/${boardId}`);
  // Map columnId → human-readable status for the UI
  const tasks = (data?.tasks || []).map((t: any) => ({
    ...t,
    status: columnIdToStatus(columns, t.columnId) || t.status,
  }));
  return tasks;
};

export const createBoardTask = async (projectId: string, task: Partial<KanbanTask>) => {
  const { boardId, columns } = await getOrCreateBoard(projectId);
  const columnId = statusToColumnId(columns, task.status || 'To Do');
  const payload: any = {
    title: task.title,
    description: task.description,
    priority: task.priority || 'medium',
    columnId,
    assignees: (task as any).assignees?.length ? (task as any).assignees : task.assignee ? [task.assignee] : [],
  };
  if ((task as any).labels?.length) payload.labels = (task as any).labels;
  if ((task as any).dueDate) payload.dueDate = (task as any).dueDate;
  if ((task as any).estimatedHours) payload.estimatedHours = (task as any).estimatedHours;
  if ((task as any).storyPoints) payload.storyPoints = (task as any).storyPoints;
  const { data } = await api.post(`/boards/${boardId}/tasks`, payload);
  return data;
};

export const updateBoardTask = async (_projectId: string, taskId: string, updates: Partial<KanbanTask>) => {
  const { data } = await api.patch(`/boards/tasks/${taskId}`, updates);
  return data;
};

export const moveBoardTask = async (projectId: string, taskId: string, newStatus: string) => {
  const { columns } = await getOrCreateBoard(projectId);
  const columnId = statusToColumnId(columns, newStatus);
  const { data } = await api.patch(`/boards/tasks/${taskId}/move`, { columnId, position: 0 });
  return data;
};

export const deleteBoardTask = async (_projectId: string, taskId: string) => {
  await api.delete(`/boards/tasks/${taskId}`);
};

// ── Sprints ───────────────────────────────────────────────
export const getSprints = async (projectId: string): Promise<Sprint[]> => {
  const { data } = await api.get(`/boards/project/${projectId}/sprints`);
  return data?.sprints || data || [];
};

export const createSprint = async (projectId: string, sprint: Partial<Sprint>) => {
  const boardId = await getOrCreateBoard(projectId);
  const { data } = await api.post(`/boards/project/${projectId}/sprints`, { ...sprint, boardId });
  return data;
};

export const updateSprint = async (_projectId: string, sprintId: string, updates: Partial<Sprint>) => {
  const { data } = await api.patch(`/boards/sprints/${sprintId}`, updates);
  return data;
};

// ── Messages ──────────────────────────────────────────────
export const getProjectMessages = async (projectId: string) => {
  const { data } = await api.get(`/projects/${projectId}/messages`);
  return data?.messages || data || [];
};

export const sendProjectMessage = async (projectId: string, message: string) => {
  const { data } = await api.post(`/projects/${projectId}/messages`, { text: message });
  return data;
};

// ── Files ─────────────────────────────────────────────────
export const getProjectFiles = async (projectId: string) => {
  const { data } = await api.get(`/projects/${projectId}/files`);
  return data?.files || data || [];
};

export const uploadProjectFile = async (projectId: string, formData: FormData) => {
  const { data } = await api.post(`/projects/${projectId}/files`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const deleteProjectFile = async (projectId: string, fileId: string) => {
  await api.delete(`/projects/${projectId}/files/${fileId}`);
};

// ── Leaderboard ───────────────────────────────────────────
export const getLeaderboard = async (period?: 'weekly' | 'monthly'): Promise<LeaderboardEntry[]> => {
  const query = period ? `?period=${period}` : '';
  const { data } = await api.get(`/leaderboard${query}`);
  return data?.leaderboard || data || [];
};

// ── GitHub Integration ────────────────────────────────────
export const getGitHubStatus = async (projectId: string): Promise<{ connected: boolean; repoFullName?: string }> => {
  try {
    const { data } = await api.get(`/github/projects/${projectId}/status`);
    return { connected: !!data?.connected, repoFullName: data?.repoFullName };
  } catch {
    return { connected: false };
  }
};

export const getGitHubActivity = async (projectId: string, limit = 20): Promise<any[]> => {
  try {
    const { data } = await api.get(`/github/projects/${projectId}/activity?limit=${limit}`);
    return data?.activities || data || [];
  } catch {
    return [];
  }
};

// ── Sprint Actions ────────────────────────────────────────
export const startSprint = async (sprintId: string) => {
  const { data } = await api.patch(`/boards/sprints/${sprintId}/start`);
  return data;
};

export const completeSprint = async (sprintId: string) => {
  const { data } = await api.patch(`/boards/sprints/${sprintId}/complete`);
  return data;
};

// ── Task Detail: Comments ─────────────────────────────────
export const addTaskComment = async (taskId: string, content: string, mentions?: string[]) => {
  const { data } = await api.post(`/boards/tasks/${taskId}/comments`, { content, mentions: mentions || [] });
  return data;
};

// ── Task Detail: Subtasks ─────────────────────────────────
export const addSubtask = async (taskId: string, text: string) => {
  const { data } = await api.post(`/boards/tasks/${taskId}/subtasks`, { text });
  return data;
};

export const toggleSubtask = async (taskId: string, subtaskId: string, completed: boolean) => {
  const { data } = await api.patch(`/boards/tasks/${taskId}/subtasks/${subtaskId}`, { completed });
  return data;
};

// ── Task Detail: Time Tracking ────────────────────────────
export const startTimeTracking = async (taskId: string, description?: string) => {
  const { data } = await api.post(`/boards/tasks/${taskId}/time/start`, { description });
  return data;
};

export const stopTimeTracking = async (taskId: string, timeEntryId: string) => {
  const { data } = await api.patch(`/boards/tasks/${taskId}/time/${timeEntryId}/stop`);
  return data;
};

// ── Task Detail: Review Workflow ──────────────────────────
export const submitForReview = async (taskId: string) => {
  const { data } = await api.post(`/boards/tasks/${taskId}/submit-review`);
  return data;
};

export const approveTask = async (taskId: string, comment?: string) => {
  const { data } = await api.post(`/boards/tasks/${taskId}/approve`, { comment });
  return data;
};

export const requestChanges = async (taskId: string, comment: string) => {
  const { data } = await api.post(`/boards/tasks/${taskId}/request-changes`, { comment });
  return data;
};

// ── Task Detail: Get Single Task ──────────────────────────
export const getTask = async (taskId: string) => {
  const { data } = await api.get(`/boards/tasks/${taskId}`);
  return data?.task || data;
};

// ── Message Edit / Delete ─────────────────────────────────
export const editMessage = async (projectId: string, messageId: string, text: string) => {
  const { data } = await api.patch(`/projects/${projectId}/messages/${messageId}`, { text });
  return data;
};

export const deleteMessage = async (projectId: string, messageId: string) => {
  await api.delete(`/projects/${projectId}/messages/${messageId}`);
};

// ── Analytics ─────────────────────────────────────────────
export const getProjectAnalytics = async (projectId: string) => {
  const { data } = await api.get(`/boards/project/${projectId}/analytics`);
  return data;
};

// ── Activity Timeline ─────────────────────────────────────
export const getProjectActivity = async (projectId: string, limit = 30): Promise<any[]> => {
  try {
    const { data } = await api.get(`/boards/project/${projectId}/activity?limit=${limit}`);
    return data?.activities || data || [];
  } catch {
    return [];
  }
};

// ── Idea Status ───────────────────────────────────────────
export const updateIdeaStatus = async (ideaId: string, status: string): Promise<void> => {
  await api.put(`/ideas/${ideaId}/status`, { status });
};

// ── GitHub Full Flow ──────────────────────────────────────
export const startGitHubAuth = async (): Promise<{ authUrl: string }> => {
  const { data } = await api.get('/github/auth');
  return data;
};

export const getGitHubUserStatus = async (): Promise<{ connected: boolean; username?: string }> => {
  try {
    const { data } = await api.get('/github/status');
    return { connected: !!data?.connected, username: data?.username };
  } catch {
    return { connected: false };
  }
};

export const getUserGitHubRepos = async (page = 1, perPage = 30): Promise<any[]> => {
  const { data } = await api.get(`/github/repos?page=${page}&per_page=${perPage}`);
  return data?.repositories || data || [];
};

export const connectProjectToGitHub = async (
  projectId: string,
  repoOwner: string,
  repoName: string,
  syncSettings?: { syncIssues?: boolean; syncPRs?: boolean; syncCommits?: boolean },
) => {
  const { data } = await api.post(`/github/projects/${projectId}/connect`, {
    repoOwner,
    repoName,
    syncSettings: syncSettings || { syncIssues: true, syncPRs: true, syncCommits: true },
  });
  return data;
};

export const disconnectProjectFromGitHub = async (projectId: string) => {
  const { data } = await api.delete(`/github/projects/${projectId}/disconnect`);
  return data;
};

// ── GitHub Repo Details ─────────────────────────────────────
export const getRepoCommits = async (owner: string, repo: string, page = 1): Promise<any[]> => {
  try {
    const { data } = await api.get(`/github/repos/${owner}/${repo}/commits?page=${page}`);
    return data?.commits || data || [];
  } catch { return []; }
};

export const getRepoPulls = async (owner: string, repo: string, page = 1): Promise<any[]> => {
  try {
    const { data } = await api.get(`/github/repos/${owner}/${repo}/pulls?page=${page}`);
    return data?.pullRequests || data || [];
  } catch { return []; }
};

export const getRepoBranches = async (owner: string, repo: string): Promise<any[]> => {
  try {
    const { data } = await api.get(`/github/repos/${owner}/${repo}/branches`);
    return data?.branches || data || [];
  } catch { return []; }
};

export const getRepoContributors = async (owner: string, repo: string): Promise<any[]> => {
  try {
    const { data } = await api.get(`/github/repos/${owner}/${repo}/contributors`);
    return data?.contributors || data || [];
  } catch { return []; }
};

// ── GitHub Collaborators ──────────────────────────────────
export const getGitHubCollaborators = async (projectId: string): Promise<any[]> => {
  try {
    const { data } = await api.get(`/github/projects/${projectId}/collaborators`);
    return data?.collaborators || data || [];
  } catch { return []; }
};

export const inviteGitHubCollaborator = async (projectId: string, username: string) => {
  const { data } = await api.post(`/github/projects/${projectId}/collaborators`, { username });
  return data;
};

export const removeGitHubCollaborator = async (projectId: string, username: string) => {
  await api.delete(`/github/projects/${projectId}/collaborators/${username}`);
};
