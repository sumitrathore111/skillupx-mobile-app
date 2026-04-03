import type { Idea, JoinRequest, Project } from '@apptypes/index';
import { apiRequest } from './api';

// ── Projects ──────────────────────────────────────────────
export async function fetchProjects(params?: {
  search?: string;
  category?: string;
  status?: string;
  sort?: string;
}): Promise<Project[]> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.category) query.set('category', params.category);
  if (params?.status) query.set('status', params.status);
  if (params?.sort) query.set('sort', params.sort);
  const data = await apiRequest<{ projects: Project[] } | Project[]>('GET', `/projects?${query.toString()}`);
  if (Array.isArray(data)) return data;
  return (data as any)?.projects || [];
}

export async function fetchProjectById(id: string): Promise<Project> {
  const data = await apiRequest<any>('GET', `/projects/${id}`);
  return data?.project || data;
}

export async function fetchMyProjects(): Promise<Project[]> {
  const data = await apiRequest<{ projects: Project[] } | Project[]>('GET', '/projects/my/projects');
  if (Array.isArray(data)) return data;
  return (data as any)?.projects || [];
}

export async function fetchMyProjectsList(): Promise<Project[]> {
  return fetchMyProjects();
}

// ── Ideas ─────────────────────────────────────────────────
export async function fetchAllIdeas(): Promise<any[]> {
  const data = await apiRequest<any>('GET', '/ideas');
  if (Array.isArray(data)) return data;
  return (data as any)?.ideas || [];
}

export async function fetchIdeas(params?: { search?: string }): Promise<Idea[]> {
  const query = params?.search ? `?search=${encodeURIComponent(params.search)}` : '';
  const data = await apiRequest<any>('GET', `/ideas${query}`);
  if (Array.isArray(data)) return data;
  return (data as any)?.ideas || [];
}

export async function fetchMyIdeas(): Promise<any[]> {
  return apiRequest<any[]>('GET', '/ideas/my/ideas');
}

export async function submitIdea(data: {
  title: string;
  description: string;
  tags?: string[];
  category?: string;
  expectedTimeline?: string;
}): Promise<Idea> {
  return apiRequest<Idea>('POST', '/ideas', data);
}

export async function updateIdea(
  ideaId: string,
  data: { title: string; description: string; category?: string; tags?: string[]; expectedTimeline?: string },
): Promise<any> {
  return apiRequest<any>('PUT', `/ideas/${ideaId}`, data);
}

export async function deleteIdea(ideaId: string): Promise<void> {
  return apiRequest<void>('DELETE', `/ideas/${ideaId}`);
}

export async function likeIdea(ideaId: string): Promise<void> {
  return apiRequest<void>('POST', `/ideas/${ideaId}/like`, {});
}

// ── Join Requests ─────────────────────────────────────────
export async function sendJoinRequest(projectId: string, role?: string, message?: string): Promise<void> {
  return apiRequest<void>('POST', '/join-requests', { projectId, role, message });
}

export async function fetchMyJoinRequests(): Promise<JoinRequest[]> {
  return apiRequest<JoinRequest[]>('GET', '/join-requests/my');
}

export async function fetchAllJoinRequests(): Promise<JoinRequest[]> {
  const data = await apiRequest<any>('GET', '/join-requests');
  if (Array.isArray(data)) return data;
  return (data as any)?.requests || [];
}

export async function fetchUserJoinRequests(userId: string): Promise<JoinRequest[]> {
  const data = await apiRequest<{ requests: JoinRequest[] } | JoinRequest[]>(
    'GET',
    `/join-requests/user/${userId}`,
  );
  if (Array.isArray(data)) return data;
  return (data as any)?.requests || [];
}

export async function fetchProjectJoinRequests(projectId: string): Promise<JoinRequest[]> {
  const data = await apiRequest<any>('GET', `/join-requests/project/${projectId}`);
  if (Array.isArray(data)) return data;
  return (data as any)?.requests || [];
}

export async function respondToJoinRequest(
  requestId: string,
  response: 'approved' | 'rejected',
): Promise<void> {
  return apiRequest<void>('PUT', `/join-requests/${requestId}/respond`, { status: response });
}

// ── Completed Tasks ───────────────────────────────────────
export async function fetchMyCompletedTasks(
  userId: string,
): Promise<{ count: number; completedTasks: any[] }> {
  try {
    const data = await apiRequest<any>('GET', `/users/${userId}/completed-tasks`);
    return { count: data?.count || 0, completedTasks: data?.completedTasks || [] };
  } catch {
    return { count: 0, completedTasks: [] };
  }
}

// ── Members ───────────────────────────────────────────────
export async function fetchProjectMembers(projectId: string): Promise<any[]> {
  const data = await apiRequest<any>('GET', `/projects/${projectId}/members`);
  if (Array.isArray(data)) return data;
  return (data as any)?.members || [];
}
