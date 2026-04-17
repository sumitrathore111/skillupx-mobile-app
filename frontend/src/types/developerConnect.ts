// Developer Connect Hub Types

export interface DeveloperProfile {
  userId: string;
  odId?: string;
  odName?: string;
  odPic?: string;
  name: string;
  username?: string;
  email: string;
  avatar: string;
  bio: string;

  // Institute/College info
  college?: string;
  institute?: string;
  year?: 'First' | 'Second' | 'Third' | 'Fourth' | 'Other' | string;
  yearOfStudy?: number;
  location?: string;
  phone?: string;

  // CodeArena Stats
  codeArenaStats?: {
    problemsSolved: number;
    rating: number;
    rank: number;
    battlesWon: number;
    totalCoins: number;
  };
  challenges_solved?: number;
  marathon_score?: number;
  marathon_rank?: number;
  streakCount?: number;
  battlesWon?: number;
  battlesLost?: number;

  // Combined Ranking Stats
  roadmapTopicsCompleted?: number;
  creatorTasksCompleted?: number;
  combinedScore?: number;
  combinedRank?: number;
  isCurrentUser?: boolean;

  // Skills & Expertise
  skills: string[];
  languages?: string[];

  // Education & Experience
  education?: Array<{
    degree: string;
    school: string;
    year: string;
  }>;
  experience?: Array<{
    title: string;
    company: string;
    year: string;
    desc: string;
  }>;
  achievements?: string[];

  // Projects
  projectsCompleted?: number;
  projectsLeading?: number;
  projects?: Array<{
    project_id: string;
    role: string;
    project_status: string;
  }>;

  // Reputation
  endorsements?: SkillEndorsement[];
  averageRating?: number;
  reviewCount?: number;
  rating?: number;

  // Collaboration Status
  lookingFor?: 'Teammates' | 'Mentoring' | 'Both' | 'Not looking' | string;
  lookingForDetails?: string;
  availability?: 'Full-time' | 'Part-time' | 'Weekends only' | 'Flexible' | string;

  // Profile Status
  profileCompletion?: number;
  isProfileComplete?: boolean;
  role?: string;

  // Social & Links
  github?: string;
  githubUsername?: string;
  linkedin?: string;
  twitter?: string;
  portfolio?: string;
  resume_objective?: string;
  links?: Array<{
    platform: string;
    url: string;
  }>;
  target_company?: string[];

  // Status
  isOnline?: boolean;
  joinedDate?: Date;

  // Badges
  badges?: Array<{
    id: string;
    name: string;
    icon: string;
    description: string;
    earnedAt: Date;
    category: 'achievement' | 'reward' | 'status';
  }>;

  createdAt?: Date;
  updatedAt?: Date;
}

export interface SkillEndorsement {
  id: string;
  endorserId: string;
  endorserName: string;
  endorserAvatar: string;
  skill: string;
  message?: string;
  timestamp: Date;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  receiverId: string;
  receiverName: string;

  content: string;
  type: 'text' | 'idea' | 'request';

  // If type === 'idea' or 'request'
  metadata?: {
    projectTitle?: string;
    skillsNeeded?: string[];
    duration?: string;
  };

  read: boolean;
  timestamp: Date;
}

export interface MessageThread {
  id: string;
  participantIds: [string, string]; // [userId1, userId2]
  participantNames: [string, string];
  participantAvatars: [string, string];

  lastMessage?: DirectMessage;
  messageCount: number;
  unreadCount: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface StudyGroup {
  id: string;
  name: string;
  description: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar: string;

  topic: string; // 'DSA Interview Prep', 'Web Dev Learning', etc
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  maxMembers: number;

  members: GroupMember[];

  // Scheduling
  sessionSchedule?: {
    day: string; // 'Monday', 'Tuesday', etc
    time: string; // '10:00 AM'
    duration: number; // minutes
  };

  // Resources
  resources: Resource[];

  // Activity
  messages: GroupMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupMember {
  userId: string;
  name: string;
  avatar: string;
  joinedAt: Date;
  role: 'creator' | 'member';
}

export interface Resource {
  id: string;
  title: string;
  description?: string;
  url: string;
  type: 'link' | 'document' | 'video' | 'article';
  addedBy: string;
  addedAt: Date;
}

export interface GroupMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
}

export interface DeveloperSearch {
  keyword?: string;
  skills?: string[];
  college?: string;
  year?: string;
  lookingFor?: string;
  availability?: string;
  minRating?: number;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'message' | 'endorsement' | 'group_invite' | 'group_update';
  title: string;
  message: string;
  relatedUserId?: string;
  relatedGroupId?: string;
  read: boolean;
  timestamp: Date;
}

export interface UserConnection {
  id: string;
  userId: string;
  connectedUserId: string;
  connectedUserName: string;
  connectedUserAvatar: string;
  status: 'requested' | 'connected' | 'blocked';
  connectedAt?: Date;
  requestedAt?: Date;
}
