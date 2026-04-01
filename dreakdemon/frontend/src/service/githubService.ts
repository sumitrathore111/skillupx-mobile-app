// GitHub Integration Service for Frontend
import { API_URL } from './apiConfig';

const API_BASE = API_URL;

// Get auth headers
const getHeaders = () => {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

// GitHub OAuth
export const startGitHubAuth = async (): Promise<string> => {
  const response = await fetch(`${API_BASE}/github/auth`, {
    headers: getHeaders()
  });

  if (!response.ok) {
    throw new Error('Failed to start GitHub authentication');
  }

  const data = await response.json();
  return data.authUrl;
};

// Get GitHub connection status
export const getGitHubStatus = async (): Promise<{
  connected: boolean;
  githubUsername?: string;
  avatarUrl?: string;
  connectedAt?: string;
  scopes?: string[];
}> => {
  const response = await fetch(`${API_BASE}/github/status`, {
    headers: getHeaders()
  });

  if (!response.ok) {
    throw new Error('Failed to get GitHub status');
  }

  return response.json();
};

// Disconnect GitHub account
export const disconnectGitHub = async (): Promise<void> => {
  const response = await fetch(`${API_BASE}/github/disconnect`, {
    method: 'DELETE',
    headers: getHeaders()
  });

  if (!response.ok) {
    throw new Error('Failed to disconnect GitHub');
  }
};

// Get user repositories
export const getUserRepositories = async (page = 1, perPage = 30): Promise<{
  repos: Array<{
    id: number;
    name: string;
    fullName: string;
    description: string;
    private: boolean;
    url: string;
    defaultBranch: string;
    language: string;
    starCount: number;
    forkCount: number;
    updatedAt: string;
  }>;
}> => {
  const response = await fetch(`${API_BASE}/github/repos?page=${page}&perPage=${perPage}`, {
    headers: getHeaders()
  });

  if (!response.ok) {
    throw new Error('Failed to get repositories');
  }

  return response.json();
};

// Get repository commits
export const getRepositoryCommits = async (
  owner: string,
  repo: string,
  options: { sha?: string; since?: string; until?: string; page?: number; perPage?: number } = {}
): Promise<{
  commits: Array<{
    sha: string;
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
      login?: string;
      avatarUrl?: string;
    };
    url: string;
  }>;
}> => {
  const params = new URLSearchParams();
  if (options.sha) params.append('sha', options.sha);
  if (options.since) params.append('since', options.since);
  if (options.until) params.append('until', options.until);
  if (options.page) params.append('page', String(options.page));
  if (options.perPage) params.append('perPage', String(options.perPage));

  const response = await fetch(`${API_BASE}/github/repos/${owner}/${repo}/commits?${params.toString()}`, {
    headers: getHeaders()
  });

  if (!response.ok) {
    throw new Error('Failed to get commits');
  }

  return response.json();
};

// Get repository pull requests
export const getRepositoryPullRequests = async (
  owner: string,
  repo: string,
  state: 'open' | 'closed' | 'all' = 'all'
): Promise<{
  pullRequests: Array<{
    number: number;
    title: string;
    state: string;
    merged: boolean;
    url: string;
    user: { login: string; avatarUrl: string };
    branch: string;
    baseBranch: string;
    createdAt: string;
    updatedAt: string;
    mergedAt?: string;
  }>;
}> => {
  const response = await fetch(`${API_BASE}/github/repos/${owner}/${repo}/pulls?state=${state}`, {
    headers: getHeaders()
  });

  if (!response.ok) {
    throw new Error('Failed to get pull requests');
  }

  return response.json();
};

// Get repository issues
export const getRepositoryIssues = async (
  owner: string,
  repo: string,
  state: 'open' | 'closed' | 'all' = 'all'
): Promise<{
  issues: Array<{
    number: number;
    title: string;
    state: string;
    url: string;
    body?: string;
    user: { login: string; avatarUrl: string };
    labels: Array<{ name: string; color: string }>;
    createdAt: string;
    updatedAt: string;
    closedAt?: string;
  }>;
}> => {
  const response = await fetch(`${API_BASE}/github/repos/${owner}/${repo}/issues?state=${state}`, {
    headers: getHeaders()
  });

  if (!response.ok) {
    throw new Error('Failed to get issues');
  }

  return response.json();
};

// Get repository branches
export const getRepositoryBranches = async (
  owner: string,
  repo: string
): Promise<{
  branches: Array<{ name: string; protected: boolean }>;
}> => {
  const response = await fetch(`${API_BASE}/github/repos/${owner}/${repo}/branches`, {
    headers: getHeaders()
  });

  if (!response.ok) {
    throw new Error('Failed to get branches');
  }

  return response.json();
};

// Connect GitHub repo to project
export const connectProjectToGitHub = async (
  projectId: string,
  repoOwner: string,
  repoName: string,
  syncSettings?: {
    syncIssues?: boolean;
    syncPullRequests?: boolean;
    syncCommits?: boolean;
    autoPR?: boolean;
    autoIssue?: boolean;
  }
): Promise<{
  message: string;
  connection: {
    repoFullName: string;
    repoUrl: string;
    syncSettings: any;
  };
}> => {
  const response = await fetch(`${API_BASE}/github/projects/${projectId}/connect`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ repoOwner, repoName, syncSettings })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to connect repository');
  }

  return response.json();
};

// Disconnect GitHub repo from project
export const disconnectProjectFromGitHub = async (projectId: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/github/projects/${projectId}/disconnect`, {
    method: 'DELETE',
    headers: getHeaders()
  });

  if (!response.ok) {
    throw new Error('Failed to disconnect repository');
  }
};

// Get project's GitHub connection status
export const getProjectGitHubStatus = async (projectId: string): Promise<{
  connected: boolean;
  repoFullName?: string;
  repoUrl?: string;
  syncSettings?: any;
  connectedAt?: string;
  lastSyncAt?: string;
}> => {
  const response = await fetch(`${API_BASE}/github/projects/${projectId}/status`, {
    headers: getHeaders()
  });

  if (!response.ok) {
    throw new Error('Failed to get project GitHub status');
  }

  return response.json();
};

// Get project's GitHub activity feed
export const getProjectGitHubActivity = async (
  projectId: string,
  limit = 50,
  offset = 0
): Promise<{
  activities: Array<{
    _id: string;
    projectId: string;
    taskId?: string;
    eventType: string;
    action?: string;
    sender: { login: string; avatarUrl?: string; id: number };
    payload: any;
    createdAt: string;
  }>;
}> => {
  const response = await fetch(`${API_BASE}/github/projects/${projectId}/activity?limit=${limit}&offset=${offset}`, {
    headers: getHeaders()
  });

  if (!response.ok) {
    throw new Error('Failed to get GitHub activity');
  }

  return response.json();
};

// Create GitHub issue from task
export const createGitHubIssueFromTask = async (taskId: string): Promise<{
  message: string;
  issueNumber: number;
  issueUrl: string;
}> => {
  const response = await fetch(`${API_BASE}/github/tasks/${taskId}/create-issue`, {
    method: 'POST',
    headers: getHeaders()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create GitHub issue');
  }

  return response.json();
};

// Close GitHub issue when task is completed
export const closeGitHubIssueFromTask = async (taskId: string): Promise<void> => {
  const response = await fetch(`${API_BASE}/github/tasks/${taskId}/close-issue`, {
    method: 'POST',
    headers: getHeaders()
  });

  if (!response.ok) {
    throw new Error('Failed to close GitHub issue');
  }
};

// Parse GitHub repo URL to get owner and name
export const parseGitHubUrl = (url: string): { owner: string; repo: string } | null => {
  // Match patterns like:
  // https://github.com/owner/repo
  // https://github.com/owner/repo.git
  // git@github.com:owner/repo.git

  const httpsPattern = /github\.com\/([^\/]+)\/([^\/\.]+)/;
  const sshPattern = /github\.com:([^\/]+)\/([^\/\.]+)/;

  let match = url.match(httpsPattern) || url.match(sshPattern);

  if (match) {
    return {
      owner: match[1],
      repo: match[2].replace('.git', '')
    };
  }

  return null;
};

// ==========================================
// COLLABORATOR MANAGEMENT
// ==========================================

// Search GitHub users by username
export const searchGitHubUsers = async (query: string): Promise<{
  users: Array<{
    id: number;
    login: string;
    avatarUrl: string;
    profileUrl: string;
  }>;
}> => {
  const response = await fetch(`${API_BASE}/github/users/search?q=${encodeURIComponent(query)}`, {
    headers: getHeaders()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to search users');
  }

  return response.json();
};

// Get collaborators for a project's connected repository
export const getProjectCollaborators = async (projectId: string): Promise<{
  collaborators: Array<{
    id: number;
    login: string;
    avatarUrl: string;
    permissions: { admin: boolean; maintain: boolean; push: boolean; triage: boolean; pull: boolean };
    roleName: string;
  }>;
}> => {
  const response = await fetch(`${API_BASE}/github/projects/${projectId}/collaborators`, {
    headers: getHeaders()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get collaborators');
  }

  return response.json();
};

// Get pending invitations for a project's connected repository
export const getProjectInvitations = async (projectId: string): Promise<{
  invitations: Array<{
    id: number;
    invitee: { login: string; avatarUrl: string };
    inviter: { login: string; avatarUrl: string };
    permissions: string;
    createdAt: string;
    url: string;
  }>;
}> => {
  const response = await fetch(`${API_BASE}/github/projects/${projectId}/invitations`, {
    headers: getHeaders()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get invitations');
  }

  return response.json();
};

// Invite a collaborator to a project's connected repository
export const inviteCollaborator = async (
  projectId: string,
  username: string,
  permission: 'pull' | 'push' | 'admin' | 'maintain' | 'triage' = 'push'
): Promise<{
  message: string;
  invitation: {
    id: number;
    invitee: { login: string; avatarUrl: string };
    permissions: string;
    url: string;
  } | null;
  alreadyHadAccess: boolean;
}> => {
  const response = await fetch(`${API_BASE}/github/projects/${projectId}/collaborators`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ username, permission })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to invite collaborator');
  }

  return response.json();
};

// Remove a collaborator from a project's connected repository
export const removeCollaborator = async (projectId: string, username: string): Promise<{ message: string }> => {
  const response = await fetch(`${API_BASE}/github/projects/${projectId}/collaborators/${encodeURIComponent(username)}`, {
    method: 'DELETE',
    headers: getHeaders()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to remove collaborator');
  }

  return response.json();
};

// Cancel a pending invitation
export const cancelInvitation = async (projectId: string, invitationId: number): Promise<{ message: string }> => {
  const response = await fetch(`${API_BASE}/github/projects/${projectId}/invitations/${invitationId}`, {
    method: 'DELETE',
    headers: getHeaders()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to cancel invitation');
  }

  return response.json();
};

export default {
  startGitHubAuth,
  getGitHubStatus,
  disconnectGitHub,
  getUserRepositories,
  getRepositoryCommits,
  getRepositoryPullRequests,
  getRepositoryIssues,
  getRepositoryBranches,
  connectProjectToGitHub,
  disconnectProjectFromGitHub,
  getProjectGitHubStatus,
  getProjectGitHubActivity,
  createGitHubIssueFromTask,
  closeGitHubIssueFromTask,
  parseGitHubUrl,
  // Collaborator management
  searchGitHubUsers,
  getProjectCollaborators,
  getProjectInvitations,
  inviteCollaborator,
  removeCollaborator,
  cancelInvitation
};
