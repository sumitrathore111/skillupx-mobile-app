import { apiRequest } from './api';

// ==================== CLIENT-SIDE CACHE ====================
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const clientCache = new Map<string, CacheEntry<any>>();
const STALE_TIME = 60 * 1000;   // 1 minute - data is fresh
const CACHE_TIME = 5 * 60 * 1000; // 5 minutes - keep in cache

async function cachedRequest<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = clientCache.get(key);
  const now = Date.now();

  // Return cached data immediately if fresh
  if (cached && (now - cached.timestamp) < STALE_TIME) {
    return cached.data;
  }

  // If stale but still in cache, return stale and revalidate in background
  if (cached && (now - cached.timestamp) < CACHE_TIME) {
    // Revalidate in background
    fetcher().then(data => {
      clientCache.set(key, { data, timestamp: Date.now() });
    }).catch(() => {});
    return cached.data;
  }

  // Fetch fresh data
  const data = await fetcher();
  clientCache.set(key, { data, timestamp: now });
  return data;
}

// Prefetch function - call on hover or route preload
export function prefetchRoadmaps(): void {
  cachedRequest('roadmaps:all', () => apiRequest('/roadmaps?')).catch(() => {});
}

export function prefetchRoadmap(slug: string): void {
  cachedRequest(`roadmap:${slug}`, () => apiRequest(`/roadmaps/${slug}`)).catch(() => {});
}

// Invalidate all roadmap-related caches (call after mutations)
function invalidateRoadmapCache(): void {
  for (const key of clientCache.keys()) {
    if (key.startsWith('roadmap')) {
      clientCache.delete(key);
    }
  }
}

// Types
export interface Resource {
  title: string;
  url: string;
  type: 'video' | 'article' | 'course' | 'documentation' | 'tutorial';
  platform: string;
  duration?: string;
  isFree: boolean;
}

export interface Topic {
  _id: string;
  roadmapId: string;
  title: string;
  description: string;
  phase: 'foundation' | 'beginner' | 'intermediate' | 'advanced' | 'interview';
  order: number;
  estimatedHours: number;
  resources: Resource[];
  relatedProjects: string[];
  prerequisites: string[];
  keyPoints: string[];
  icon: string;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewQuestion {
  _id: string;
  roadmapId: string;
  topicId?: string;
  question: string;
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  company?: string;
  category: string;
  tags: string[];
  createdAt: string;
}

export interface CareerInfo {
  _id: string;
  roadmapId: string;
  jobTitle: string;
  description: string;
  salaryRange: {
    min: number;
    max: number;
    currency: string;
    period: string;
  };
  demandLevel: 'low' | 'medium' | 'high' | 'very-high';
  requiredSkills: string[];
  preferredSkills: string[];
  experienceLevel: 'fresher' | 'junior' | 'mid' | 'senior' | 'lead';
  growthPath: string[];
  companies: string[];
  createdAt: string;
}

export interface UserProgress {
  isEnrolled: boolean;
  completedTopics: number;
  completedTopicIds?: string[];
  progressPercent: number;
  lastAccessedAt?: string;
  startedAt?: string;
  currentStreak?: number;
  badges?: Array<{ id: string; name: string; earnedAt: string }>;
}

export interface Roadmap {
  _id: string;
  title: string;
  slug: string;
  description: string;
  longDescription: string;
  icon: string;
  color: string;
  category: 'web' | 'data' | 'mobile' | 'devops' | 'cloud' | 'ai-ml' | 'database' | 'security' | 'other';
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'all-levels';
  estimatedWeeks: number;
  totalTopics: number;
  totalResources: number;
  totalProjects: number;
  totalQuestions: number;
  isPublished: boolean;
  isFeatured: boolean;
  prerequisites: string[];
  outcomes: string[];
  tags: string[];
  enrolledCount: number;
  completedCount: number;
  rating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
  userProgress?: UserProgress;
}

export interface RoadmapDetail {
  roadmap: Roadmap;
  topicsByPhase: {
    beginner: Topic[];
    intermediate: Topic[];
    advanced: Topic[];
    interview: Topic[];
  };
  careerInfo: CareerInfo[];
  questionStats: Array<{ _id: string; count: number }>;
  userProgress: UserProgress | null;
}

export interface TopicDetail {
  topic: Topic & { roadmapId: { title: string; slug: string } };
  questions: InterviewQuestion[];
  navigation: {
    prevTopic: { _id: string; title: string } | null;
    nextTopic: { _id: string; title: string } | null;
  };
  isCompleted: boolean;
}

export interface DashboardData {
  stats: {
    totalRoadmaps: number;
    totalCompleted: number;
    totalTopics: number;
    overallProgress: number;
    totalTimeSpent: number;
    currentStreak: number;
    longestStreak: number;
    badgeCount: number;
  };
  roadmapProgress: Array<{
    roadmap: Roadmap;
    completedTopics: number;
    totalTopics: number;
    progressPercent: number;
    lastAccessedAt: string;
    startedAt: string;
  }>;
  recentActivity: Array<{
    roadmapId: string;
    roadmapTitle: string;
    topicId: string;
    topicTitle: string;
    phase: string;
    completedAt: string;
  }>;
  badges: Array<{ id: string; name: string; earnedAt: string }>;
}

// API Functions

// Get all roadmaps - with client-side caching
export const getAllRoadmaps = async (filters?: {
  category?: string;
  difficulty?: string;
  featured?: boolean;
  search?: string;
}): Promise<Roadmap[]> => {
  const params = new URLSearchParams();
  if (filters?.category) params.append('category', filters.category);
  if (filters?.difficulty) params.append('difficulty', filters.difficulty);
  if (filters?.featured) params.append('featured', 'true');
  if (filters?.search) params.append('search', filters.search);

  const cacheKey = `roadmaps:${params.toString() || 'all'}`;
  return cachedRequest(cacheKey, () => apiRequest(`/roadmaps?${params.toString()}`));
};

// Get single roadmap with details - with client-side caching
export const getRoadmapBySlug = async (slug: string): Promise<RoadmapDetail> => {
  const cacheKey = `roadmap:${slug}`;
  return cachedRequest(cacheKey, () => apiRequest(`/roadmaps/${slug}`));
};

// Get topic detail
export const getTopicDetail = async (topicId: string): Promise<TopicDetail> => {
  return apiRequest(`/roadmaps/topic/${topicId}`);
};

// Enroll in roadmap
export const enrollInRoadmap = async (roadmapId: string): Promise<{ message: string }> => {
  const result = await apiRequest(`/roadmaps/${roadmapId}/enroll`, { method: 'POST' });
  invalidateRoadmapCache();
  return result;
};

// Mark topic as complete
export const markTopicComplete = async (
  topicId: string,
  timeSpent?: number
): Promise<{ message: string; progress: any }> => {
  const result = await apiRequest(`/roadmaps/topic/${topicId}/complete`, {
    method: 'POST',
    body: JSON.stringify({ timeSpent })
  });
  invalidateRoadmapCache();
  return result;
};

// Mark topic as incomplete
export const markTopicIncomplete = async (topicId: string): Promise<{ message: string }> => {
  const result = await apiRequest(`/roadmaps/topic/${topicId}/uncomplete`, { method: 'POST' });
  invalidateRoadmapCache();
  return result;
};

// Get user dashboard
export const getLearningDashboard = async (): Promise<DashboardData> => {
  return apiRequest('/roadmaps/user/dashboard');
};

// Get interview questions
export const getInterviewQuestions = async (
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
}> => {
  const params = new URLSearchParams();
  if (filters?.difficulty) params.append('difficulty', filters.difficulty);
  if (filters?.company) params.append('company', filters.company);
  if (filters?.category) params.append('category', filters.category);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());

  return apiRequest(`/roadmaps/${roadmapId}/questions?${params.toString()}`);
};

// Get career info
export const getCareerInfo = async (roadmapId: string): Promise<CareerInfo[]> => {
  return apiRequest(`/roadmaps/${roadmapId}/careers`);
};

// Admin: Seed sample data
export const seedRoadmapData = async (): Promise<{ message: string; created: any }> => {
  return apiRequest('/roadmaps/seed', { method: 'POST' });
};

// Category labels
export const CATEGORY_LABELS: Record<string, string> = {
  'web': 'Web Development',
  'data': 'Data Science',
  'mobile': 'Mobile Development',
  'devops': 'DevOps',
  'cloud': 'Cloud Computing',
  'ai-ml': 'AI & Machine Learning',
  'database': 'Databases',
  'security': 'Security',
  'other': 'Other'
};

// Difficulty labels
export const DIFFICULTY_LABELS: Record<string, string> = {
  'beginner': 'Beginner',
  'intermediate': 'Intermediate',
  'advanced': 'Advanced',
  'all-levels': 'All Levels'
};

// Phase labels
export const PHASE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  'foundation': { label: 'Foundation', color: '#3B82F6', icon: '🏗️' },
  'beginner': { label: 'Beginner', color: '#10B981', icon: '🌱' },
  'intermediate': { label: 'Intermediate', color: '#F59E0B', icon: '📈' },
  'advanced': { label: 'Advanced', color: '#EF4444', icon: '🚀' },
  'interview': { label: 'Interview Prep', color: '#8B5CF6', icon: '💼' }
};

// Demand level labels
export const DEMAND_LABELS: Record<string, { label: string; color: string }> = {
  'low': { label: 'Low Demand', color: '#6B7280' },
  'medium': { label: 'Medium Demand', color: '#F59E0B' },
  'high': { label: 'High Demand', color: '#10B981' },
  'very-high': { label: 'Very High Demand', color: '#EF4444' }
};
