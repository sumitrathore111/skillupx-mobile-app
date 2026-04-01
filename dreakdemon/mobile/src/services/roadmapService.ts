import type { LearningDashboard, Roadmap, RoadmapDetail } from '@apptypes/index';
import { apiRequest } from './api';

export async function fetchAllRoadmaps(params?: {
  search?: string;
  category?: string;
  difficulty?: string;
}): Promise<Roadmap[]> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.category && params.category !== 'all') query.set('category', params.category);
  if (params?.difficulty && params.difficulty !== 'all') query.set('difficulty', params.difficulty);
  return apiRequest<Roadmap[]>('GET', `/roadmaps?${query.toString()}`);
}

export async function fetchRoadmapBySlug(slug: string): Promise<RoadmapDetail> {
  return apiRequest<RoadmapDetail>('GET', `/roadmaps/${slug}`);
}

export async function enrollInRoadmap(roadmapId: string): Promise<void> {
  return apiRequest<void>('POST', `/roadmaps/${roadmapId}/enroll`, {});
}

export async function markTopicComplete(roadmapId: string, topicId: string): Promise<void> {
  return apiRequest<void>('PATCH', `/roadmaps/${roadmapId}/topics/${topicId}/complete`, {});
}

export async function markTopicIncomplete(roadmapId: string, topicId: string): Promise<void> {
  return apiRequest<void>('PATCH', `/roadmaps/${roadmapId}/topics/${topicId}/incomplete`, {});
}

export async function fetchLearningDashboard(): Promise<LearningDashboard> {
  return apiRequest<LearningDashboard>('GET', '/roadmaps/dashboard');
}

export async function fetchCareerInfo(roadmapId: string): Promise<any> {
  return apiRequest<any>('GET', `/roadmaps/${roadmapId}/career-info`);
}

export async function fetchInterviewQuestions(roadmapId: string, filters?: {
  difficulty?: string;
  category?: string;
  company?: string;
  page?: number;
  limit?: number;
}): Promise<{ questions: any[]; total: number }> {
  const query = new URLSearchParams();
  if (filters?.difficulty && filters.difficulty !== 'all') query.set('difficulty', filters.difficulty);
  if (filters?.category && filters.category !== 'all') query.set('category', filters.category);
  if (filters?.company && filters.company !== 'all') query.set('company', filters.company);
  if (filters?.page) query.set('page', String(filters.page));
  if (filters?.limit) query.set('limit', String(filters.limit || 20));
  return apiRequest<{ questions: any[]; total: number }>('GET', `/roadmaps/${roadmapId}/interview-questions?${query.toString()}`);
}

export const CATEGORY_LABELS: Record<string, string> = {
  frontend: 'Frontend',
  backend: 'Backend',
  mobile: 'Mobile',
  devops: 'DevOps',
  data_science: 'Data Science',
  system_design: 'System Design',
  dsa: 'DSA / Algorithms',
  cloud: 'Cloud',
  security: 'Security',
};

export const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export const PHASE_LABELS: Record<string, string> = {
  beginner: '🟢 Beginner',
  intermediate: '🟡 Intermediate',
  advanced: '🔴 Advanced',
  expert: '🟣 Expert',
};
