// ==================== AUTH TYPES ====================
export interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  avatar?: string;
  profilePic?: string;
  bio?: string;
  skills?: string[];
  rating?: number;
  role?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// ==================== DEVELOPER CONNECT TYPES ====================
export interface DeveloperProfile {
  id: string;
  _id?: string;
  userId?: string;
  name: string;
  username: string;
  avatar: string;
  bio: string;
  skills: string[];
  lookingFor: string;
  rating: number;
  isOnline?: boolean;
  codeArenaScore?: number;
  roadmapScore?: number;
  creatorScore?: number;
  rank?: number;
  interests?: string[];
  github?: string;
  linkedin?: string;
  portfolio?: string;
  stats?: {
    problemsSolved?: number;
    battlesWon?: number;
    roadmapsCompleted?: number;
    currentStreak?: number;
  };
  // Full profile fields from backend
  location?: string;
  institute?: string;
  phone?: string;
  yearOfStudy?: number;
  languages?: string[];
  resume_objective?: string;
  githubUsername?: string;
  profileCompletion?: number;
  education?: { degree: string; school: string; year: string }[];
  experience?: { title: string; company: string; year: string; desc: string }[];
  links?: { platform: string; url: string }[];
  achievements?: string[];
  target_company?: string[];
  badges?: { id: string; name: string; icon: string; description: string; earnedAt: string; category: string }[];
  marathon_score?: number;
  streakCount?: number;
  challenges_solved?: number;
  battlesWon?: number;
  battleRating?: number;
  joinedDate?: string;
}

export interface ConnectionRequest {
  id: string;
  _id?: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface ConnectionStatus {
  status: 'none' | 'pending' | 'accepted' | 'rejected';
  requestId?: string;
  isSender?: boolean;
}

export interface Message {
  id: string;
  _id?: string;
  senderId: string;
  receiverId: string;
  content: string;
  message?: string;  // backend field alias
  text?: string;     // backend text alias
  createdAt: string;
  timestamp?: string;
  status?: 'sent' | 'delivered' | 'read';
  isEdited?: boolean;
  isRead?: boolean;
  senderName?: string;
  senderAvatar?: string;
  sender?: { _id?: string; id?: string; name?: string };
}

export interface Conversation {
  id: string;
  _id?: string;
  chatId?: string;
  participant?: DeveloperProfile;
  participantId?: string;
  participantName?: string;
  participantAvatar?: string;
  lastMessage?: Message | string;
  lastMessageAt?: string;
  unreadCount: number;
  updatedAt?: string;
}

export interface StudyGroup {
  id: string;
  _id?: string;
  name: string;
  description: string;
  topic: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  maxMembers: number;
  members: number | { userId: string; userName: string; userAvatar?: string; role: string; joinedAt: string }[];
  joinRequests?: { userId: string; userName: string; userAvatar?: string; status: string; requestedAt: string }[];
  creatorId: string;
  creatorName: string;
  createdAt: string;
  isPrivate: boolean;
  category?: string;
}

export interface TechReview {
  id: string;
  website: string;
  url: string;
  category: string;
  rating: number;
  title: string;
  content: string;
  pros: string;
  cons: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  createdAt: string;
}

export interface HelpRequest {
  id: string;
  title: string;
  description: string;
  tags: string[];
  authorId: string;
  authorName: string;
  authorAvatar: string;
  replies: HelpReply[];
  createdAt: string;
}

export interface HelpReply {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

// ==================== CREATOR CORNER TYPES ====================
export interface Project {
  id: string;
  _id?: string;
  projectId?: string;
  title: string;
  description: string;
  category: string;
  creator: string;
  creatorId: string;
  creatorName?: string;
  ownerName?: string;
  owner?: string;
  members: number | ProjectMember[];
  memberCount?: number;
  status: string;
  progress: number;
  tags: string[];
  techStack: string[];
  rolesNeeded?: string[];
  githubRepo?: string;
  repositoryUrl?: string;
  visibility?: string;
  createdAt: string;
  isCompleted?: boolean;
}

export interface ProjectMember {
  userId: string;
  name: string;
  email?: string;
  role: string;
  joinedAt: string;
  status?: string;
  avatar?: string;
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
  resolvedAt?: string | null;
  createdAt: string;
}

export interface KanbanTask {
  id: string;
  _id?: string;
  title: string;
  description?: string;
  status: 'To Do' | 'In Progress' | 'In Review' | 'Done';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee?: string;
  assigneeName?: string;
  assignedTo?: string;
  dueDate?: string;
  labels?: string[];
  checklist?: { text: string; completed: boolean }[];
  comments?: any[];
  sprintId?: string;
  completedAt?: string;
  completedBy?: string;
  completedByName?: string;
  pendingVerification?: boolean;
  verified?: boolean;
  verificationFeedback?: string;
  verifiedBy?: string;
  verifiedByName?: string;
  verifiedAt?: string;
  reviewStatus?: 'pending' | 'approved' | 'changes_requested' | 'not_submitted';
  reviewComment?: string;
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

export interface LeaderboardEntry {
  userId: string;
  name: string;
  email?: string;
  issuesResolved: number;
  projectsContributed: number;
  messagesSent: number;
  totalScore: number;
  githubUsername?: string;
  avatar?: string;
}

export interface Idea {
  id: string;
  _id?: string;
  title: string;
  description: string;
  tags: string[];
  category?: string;
  expectedTimeline?: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  likes: number;
  isLiked?: boolean;
  status?: 'pending' | 'approved' | 'rejected';
  submittedAt?: string;
  createdAt: string;
}

export interface JoinRequest {
  id: string;
  _id?: string;
  projectId: string | { _id: string };
  projectTitle: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  role?: string;
  message?: string;
  skills?: string;
  experience?: string;
  motivation?: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt?: string;
  createdAt: string;
}

// ==================== ROADMAP TYPES ====================
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
  phase: 'beginner' | 'intermediate' | 'advanced' | 'interview';
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

export interface Badge {
  id: string;
  name: string;
  icon: string;
  earnedAt?: string;
}

// ==================== CODE ARENA TYPES ====================
export interface Challenge {
  id: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  acceptance: number;
  frequency?: number;
  tags: string[];
  companies?: string[];
  isSolved?: boolean;
  isAttempted?: boolean;
  isBookmarked?: boolean;
}

export interface ChallengeDetail extends Challenge {
  description: string;
  examples: Example[];
  constraints: string[];
  testCases: TestCase[];
  hints?: string[];
  coinReward: number;
}

export interface Example {
  input: string;
  output: string;
  explanation?: string;
}

export interface TestCase {
  input: string;
  expectedOutput: string;
}

export interface SubmissionResult {
  success: boolean;
  passed?: boolean;
  status: string;
  output?: string;
  error?: string;
  passedCount?: number;
  totalCount?: number;
  time?: string;
  memory?: string;
  executionTime?: number;
}

export interface Battle {
  id: string;
  status: 'waiting' | 'countdown' | 'active' | 'completed' | 'forfeited';
  participants: BattleParticipant[];
  challenge: {
    id: string;
    title: string;
    difficulty: string;
    category: string;
    coinReward: number;
    description?: string;
    testCases?: TestCase[];
  };
  difficulty: string;
  entryFee: number;
  prize: number;
  timeLimit: number;
  startTime?: string;
  endTime?: string;
  winnerId?: string;
  winReason?: string;
}

export interface BattleParticipant {
  odId: string;
  odName: string;
  odProfilePic: string;
  rating: number;
  hasSubmitted: boolean;
}

export interface WaitingBattle {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorProfilePic?: string;
  creatorRating?: number;
  difficulty: 'easy' | 'medium' | 'hard';
  entryFee: number;
  prize: number;
  timeLimit: number;
  status: 'waiting' | 'matched' | 'active';
}

export interface LeaderboardEntry {
  odId: string;
  odName: string;
  odProfilePic: string;
  coins: number;
  battlesWon: number;
  rating: number;
  rank: number;
}

export interface Wallet {
  coins: number;
  rating: number;
  achievements: {
    problemsSolved: number;
    battlesWon: number;
    currentStreak: number;
  };
  transactions: Transaction[];
}

export interface Transaction {
  id: string;
  type: 'battle_win' | 'battle_loss' | 'problem_solved' | 'daily_bonus' | 'purchase';
  amount: number;
  description: string;
  createdAt: string;
}

// ==================== DASHBOARD TYPES ====================
export interface DashboardStats {
  problemsSolved: number;
  battlesWon: number;
  currentStreak: number;
  globalRank: number | string;
  coins: number;
  activeProjects: number;
  completedRoadmaps: number;
}

export interface EarnedBadge {
  id: string;
  name: string;
  icon: string;
  description: string;
  earnedAt: string;
}
