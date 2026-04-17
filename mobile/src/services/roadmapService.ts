import type {
    CareerInfo,
    DashboardData,
    InterviewQuestion,
    Roadmap,
    RoadmapDetail,
    TopicDetail,
} from '@apptypes/index';
import { apiRequest } from './api';

// ==================== API FUNCTIONS ====================

// Get all roadmaps (matches frontend getAllRoadmaps)
export async function getAllRoadmaps(filters?: {
  category?: string;
  difficulty?: string;
  featured?: boolean;
  search?: string;
}): Promise<Roadmap[]> {
  const params = new URLSearchParams();
  if (filters?.category && filters.category !== 'all') params.append('category', filters.category);
  if (filters?.difficulty && filters.difficulty !== 'all') params.append('difficulty', filters.difficulty);
  if (filters?.featured) params.append('featured', 'true');
  if (filters?.search) params.append('search', filters.search);
  return apiRequest<Roadmap[]>('GET', `/roadmaps?${params.toString()}`);
}

// Get single roadmap with details
export async function getRoadmapBySlug(slug: string): Promise<RoadmapDetail> {
  return apiRequest<RoadmapDetail>('GET', `/roadmaps/${slug}`);
}

// Get topic detail
export async function getTopicDetail(topicId: string): Promise<TopicDetail> {
  return apiRequest<TopicDetail>('GET', `/roadmaps/topic/${topicId}`);
}

// Enroll in roadmap
export async function enrollInRoadmap(roadmapId: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('POST', `/roadmaps/${roadmapId}/enroll`, {});
}

// Mark topic as complete
export async function markTopicComplete(
  topicId: string,
  timeSpent?: number
): Promise<{ message: string; progress: any }> {
  return apiRequest<{ message: string; progress: any }>('POST', `/roadmaps/topic/${topicId}/complete`, { timeSpent });
}

// Mark topic as incomplete
export async function markTopicIncomplete(topicId: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('POST', `/roadmaps/topic/${topicId}/uncomplete`, {});
}

// Get user dashboard
export async function getLearningDashboard(): Promise<DashboardData> {
  return apiRequest<DashboardData>('GET', '/roadmaps/user/dashboard');
}

// Get interview questions
export async function getInterviewQuestions(
  roadmapId: string,
  filters?: {
    difficulty?: string;
    company?: string;
    category?: string;
    page?: number;
    limit?: number;
  }
): Promise<{
  questions: InterviewQuestion[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  filters: { categories: string[]; companies: string[] };
}> {
  const params = new URLSearchParams();
  if (filters?.difficulty && filters.difficulty !== 'all') params.append('difficulty', filters.difficulty);
  if (filters?.company && filters.company !== 'all') params.append('company', filters.company);
  if (filters?.category && filters.category !== 'all') params.append('category', filters.category);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());
  return apiRequest('GET', `/roadmaps/${roadmapId}/questions?${params.toString()}`);
}

// Get career info
export async function getCareerInfo(roadmapId: string): Promise<CareerInfo[]> {
  return apiRequest<CareerInfo[]>('GET', `/roadmaps/${roadmapId}/careers`);
}

// ==================== LABEL CONSTANTS ====================

export const CATEGORY_LABELS: Record<string, string> = {
  'web': 'Web Development',
  'data': 'Data Science',
  'mobile': 'Mobile Development',
  'devops': 'DevOps',
  'cloud': 'Cloud Computing',
  'ai-ml': 'AI & Machine Learning',
  'database': 'Databases',
  'security': 'Security',
  'other': 'Other',
};

export const DIFFICULTY_LABELS: Record<string, string> = {
  'beginner': 'Beginner',
  'intermediate': 'Intermediate',
  'advanced': 'Advanced',
  'all-levels': 'All Levels',
};

export const PHASE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  'foundation': { label: 'Foundation', color: '#3B82F6', icon: '🏗️' },
  'beginner': { label: 'Beginner', color: '#10B981', icon: '🌱' },
  'intermediate': { label: 'Intermediate', color: '#F59E0B', icon: '📈' },
  'advanced': { label: 'Advanced', color: '#EF4444', icon: '🚀' },
  'interview': { label: 'Interview Prep', color: '#8B5CF6', icon: '💼' },
};

export const DEMAND_LABELS: Record<string, { label: string; color: string }> = {
  'low': { label: 'Low Demand', color: '#6B7280' },
  'medium': { label: 'Medium Demand', color: '#F59E0B' },
  'high': { label: 'High Demand', color: '#10B981' },
  'very-high': { label: 'Very High Demand', color: '#EF4444' },
};
