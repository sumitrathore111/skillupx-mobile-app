import { apiRequest } from './api';

// ============================================
// Members cache for fast loading
// ============================================
const membersCache = new Map<string, { data: ProjectMember[]; timestamp: number }>();
const MEMBERS_CACHE_TTL = 60 * 1000; // 60 seconds

function getCachedMembers(projectId: string): ProjectMember[] | null {
  const entry = membersCache.get(projectId);
  if (entry && Date.now() - entry.timestamp < MEMBERS_CACHE_TTL) {
    return entry.data;
  }
  membersCache.delete(projectId);
  return null;
}

function setCachedMembers(projectId: string, members: ProjectMember[]): void {
  membersCache.set(projectId, { data: members, timestamp: Date.now() });
}

export function invalidateMembersCache(projectId?: string): void {
  if (projectId) {
    membersCache.delete(projectId);
  } else {
    membersCache.clear();
  }
}

// Types
export interface Project {
  id: string;
  _id?: string;
  title: string;
  description: string;
  techStack: string[];
  githubRepo?: string;
  repositoryUrl?: string;
  creatorId: string;
  creatorName: string;
  status: string;
  category?: string;
  visibility?: string;
  createdAt: string | Date;
  members?: ProjectMember[];
  owner?: string;
}

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
  resolvedAt?: Date | null;
  createdAt: Date;
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  email?: string;
  issuesResolved: number;
  projectsContributed: number;
  messagesSent: number;
  totalScore: number;
  githubUsername?: string;
}

// Get all projects
export async function getAllProjects(filters?: {
  status?: string;
  category?: string;
  visibility?: string;
  search?: string;
}): Promise<Project[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.visibility) params.append('visibility', filters.visibility);
    if (filters?.search) params.append('search', filters.search);

    const queryString = params.toString();
    const url = `/projects${queryString ? `?${queryString}` : ''}`;

    const response = await apiRequest(url);
    return response.projects || [];
  } catch (error) {
    console.error('Error fetching projects:', error);
    return [];
  }
}

// Get project by ID
export async function getProjectById(projectId: string): Promise<Project | null> {
  try {
    const response = await apiRequest(`/projects/${projectId}`);
    return response.project || null;
  } catch (error) {
    console.error('Error fetching project:', error);
    return null;
  }
}

// Create a new project
export async function createProject(projectData: {
  title: string;
  description: string;
  category: string;
  techStack?: string[];
  visibility?: string;
  repositoryUrl?: string;
}): Promise<Project | null> {
  try {
    const response = await apiRequest('/projects', {
      method: 'POST',
      body: JSON.stringify(projectData),
    });
    return response.project || null;
  } catch (error) {
    console.error('Error creating project:', error);
    throw error;
  }
}

// Update a project
export async function updateProject(
  projectId: string,
  updates: Partial<Project>
): Promise<Project | null> {
  try {
    const response = await apiRequest(`/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return response.project || null;
  } catch (error) {
    console.error('Error updating project:', error);
    throw error;
  }
}

// Delete a project
export async function deleteProject(projectId: string): Promise<boolean> {
  try {
    await apiRequest(`/projects/${projectId}`, {
      method: 'DELETE',
    });
    return true;
  } catch (error) {
    console.error('Error deleting project:', error);
    return false;
  }
}

// Join a project
export async function joinProject(projectId: string): Promise<boolean> {
  try {
    await apiRequest(`/projects/${projectId}/join`, {
      method: 'POST',
    });
    return true;
  } catch (error) {
    console.error('Error joining project:', error);
    throw error;
  }
}

// Leave a project
export async function leaveProject(projectId: string): Promise<boolean> {
  try {
    await apiRequest(`/projects/${projectId}/leave`, {
      method: 'POST',
    });
    return true;
  } catch (error) {
    console.error('Error leaving project:', error);
    throw error;
  }
}

// Get project issues
export async function getProjectIssues(projectId: string): Promise<ProjectIssue[]> {
  try {
    const response = await apiRequest(`/projects/${projectId}/issues`);
    return response.issues || [];
  } catch (error) {
    console.error('Error fetching issues:', error);
    return [];
  }
}

// Create an issue
export async function createIssue(
  projectId: string,
  issueData: { title: string; description: string }
): Promise<ProjectIssue | null> {
  try {
    const response = await apiRequest(`/projects/${projectId}/issues`, {
      method: 'POST',
      body: JSON.stringify(issueData),
    });
    return response.issue || null;
  } catch (error) {
    console.error('Error creating issue:', error);
    throw error;
  }
}

// Update issue status
export async function updateIssueStatus(
  projectId: string,
  issueId: string,
  status: 'Open' | 'Resolved' | 'In Progress'
): Promise<boolean> {
  try {
    await apiRequest(`/projects/${projectId}/issues/${issueId}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    return true;
  } catch (error) {
    console.error('Error updating issue:', error);
    return false;
  }
}

// Get project members (with caching)
export async function getProjectMembers(projectId: string): Promise<ProjectMember[]> {
  // Check cache first
  const cached = getCachedMembers(projectId);
  if (cached !== null) {
    return cached;
  }

  try {
    const response = await apiRequest(`/projects/${projectId}/members`);
    const members = response.members || [];
    setCachedMembers(projectId, members);
    return members;
  } catch (error) {
    console.error('Error fetching members:', error);
    return [];
  }
}

// Remove a member from project (creator only)
export async function removeMemberFromProject(projectId: string, memberId: string): Promise<boolean> {
  try {
    await apiRequest(`/projects/${projectId}/members/${memberId}`, {
      method: 'DELETE',
    });
    return true;
  } catch (error) {
    console.error('Error removing member:', error);
    throw error;
  }
}

// Get leaderboard
export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const response = await apiRequest('/leaderboard');
    return response.leaderboard || [];
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }
}

// Delete corrupted projects (admin function)
export async function deleteCorruptedProjects(): Promise<number> {
  try {
    const response = await apiRequest('/projects/cleanup', {
      method: 'DELETE',
    });
    return response.deleted || 0;
  } catch (error) {
    console.error('Error deleting corrupted projects:', error);
    return 0;
  }
}
