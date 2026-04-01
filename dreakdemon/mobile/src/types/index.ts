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
  members: number | { userId: string; name: string; avatar?: string; role: string; joinedAt: string }[];
  creatorId: string;
  creatorName: string;
  createdAt: string;
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
  projectId?: string;
  title: string;
  description: string;
  category: string;
  creator: string;
  creatorId: string;
  members: number;
  status: string;
  progress: number;
  tags: string[];
  createdAt: string;
  isCompleted?: boolean;
}

export interface Idea {
  id: string;
  title: string;
  description: string;
  tags: string[];
  authorId: string;
  authorName: string;
  authorAvatar: string;
  likes: number;
  isLiked?: boolean;
  createdAt: string;
}

export interface JoinRequest {
  id: string;
  projectId: string;
  projectTitle: string;
  userId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

// ==================== ROADMAP TYPES ====================
export interface Roadmap {
  _id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  difficulty: string;
  estimatedHours: number;
  enrolledCount: number;
  rating: number;
  totalTopics: number;
  completedTopics?: number;
  isEnrolled?: boolean;
  createdAt: string;
}

export interface Topic {
  _id: string;
  title: string;
  description: string;
  phase: string;
  estimatedMinutes: number;
  resources: Resource[];
  isCompleted?: boolean;
}

export interface Resource {
  type: 'video' | 'article' | 'documentation' | 'practice';
  title: string;
  url: string;
}

export interface RoadmapDetail {
  roadmap: Roadmap;
  topicsByPhase: Record<string, Topic[]>;
  userProgress?: {
    completedTopicIds: string[];
    enrolledAt: string;
    lastActivity: string;
  };
}

export interface LearningDashboard {
  totalCompleted: number;
  activeRoadmaps: number;
  currentStreak: number;
  totalXP: number;
  enrolledRoadmaps: Roadmap[];
  recentlyCompleted: Topic[];
  badges: Badge[];
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  unlockedAt?: string;
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
