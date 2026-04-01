import api from './api';

export interface ProjectMember {
  userId: string;
  name: string;
  email?: string;
  role: string;
  joinedAt: Date;
  status?: string;
}

export interface ProjectIssue {
  id: string;
  _id?: string;
  title: string;
  description: string;
  status: 'Open' | 'Resolved' | 'In Progress';
  createdBy: string;
  creatorName: string;
  resolvedBy?: string | null;
  createdAt: Date;
}

export interface KanbanTask {
  id: string;
  _id?: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee?: string;
  assigneeName?: string;
  dueDate?: string;
  labels?: string[];
  checklist?: { text: string; completed: boolean }[];
  comments?: any[];
  createdAt?: string;
}

export interface Sprint {
  id: string;
  _id?: string;
  name: string;
  goal?: string;
  startDate: string;
  endDate: string;
  status: 'planning' | 'active' | 'completed';
  tasks?: string[];
}

// ── Projects CRUD ──
export const getAllProjects = async (filters?: { status?: string; category?: string; search?: string }) => {
  const params = new URLSearchParams();
  if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
  const { data } = await api.get(`/projects?${params.toString()}`);
  return data;
};

export const getProjectById = async (projectId: string) => {
  const { data } = await api.get(`/projects/${projectId}`);
  return data;
};

export const createProject = async (projectData: { title: string; description: string; category: string; techStack?: string[]; visibility?: string; repositoryUrl?: string }) => {
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

// ── Members ──
export const joinProject = async (projectId: string) => {
  const { data } = await api.post(`/projects/${projectId}/join`);
  return data;
};

export const leaveProject = async (projectId: string) => {
  const { data } = await api.post(`/projects/${projectId}/leave`);
  return data;
};

export const getProjectMembers = async (projectId: string): Promise<ProjectMember[]> => {
  const { data } = await api.get(`/projects/${projectId}/members`);
  return data;
};

export const removeMember = async (projectId: string, memberId: string) => {
  await api.delete(`/projects/${projectId}/members/${memberId}`);
};

// ── Issues ──
export const getProjectIssues = async (projectId: string): Promise<ProjectIssue[]> => {
  const { data } = await api.get(`/projects/${projectId}/issues`);
  return data;
};

export const createIssue = async (projectId: string, issueData: { title: string; description: string }) => {
  const { data } = await api.post(`/projects/${projectId}/issues`, issueData);
  return data;
};

export const updateIssueStatus = async (projectId: string, issueId: string, status: string) => {
  const { data } = await api.put(`/projects/${projectId}/issues/${issueId}`, { status });
  return data;
};

// ── Kanban Board ──
export const getBoardTasks = async (projectId: string): Promise<KanbanTask[]> => {
  const { data } = await api.get(`/projects/${projectId}/board`);
  return data;
};

export const createBoardTask = async (projectId: string, task: Partial<KanbanTask>) => {
  const { data } = await api.post(`/projects/${projectId}/board`, task);
  return data;
};

export const updateBoardTask = async (projectId: string, taskId: string, updates: Partial<KanbanTask>) => {
  const { data } = await api.put(`/projects/${projectId}/board/${taskId}`, updates);
  return data;
};

export const deleteBoardTask = async (projectId: string, taskId: string) => {
  await api.delete(`/projects/${projectId}/board/${taskId}`);
};

// ── Sprints ──
export const getSprints = async (projectId: string): Promise<Sprint[]> => {
  const { data } = await api.get(`/projects/${projectId}/sprints`);
  return data;
};

export const createSprint = async (projectId: string, sprint: Partial<Sprint>) => {
  const { data } = await api.post(`/projects/${projectId}/sprints`, sprint);
  return data;
};

export const updateSprint = async (projectId: string, sprintId: string, updates: Partial<Sprint>) => {
  const { data } = await api.put(`/projects/${projectId}/sprints/${sprintId}`, updates);
  return data;
};

// ── Messages ──
export const getProjectMessages = async (projectId: string) => {
  const { data } = await api.get(`/projects/${projectId}/messages`);
  return data;
};

export const sendProjectMessage = async (projectId: string, message: string) => {
  const { data } = await api.post(`/projects/${projectId}/messages`, { message });
  return data;
};

// ── Files ──
export const getProjectFiles = async (projectId: string) => {
  const { data } = await api.get(`/projects/${projectId}/files`);
  return data;
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

// ── Leaderboard ──
export const getLeaderboard = async () => {
  const { data } = await api.get('/leaderboard');
  return data;
};
