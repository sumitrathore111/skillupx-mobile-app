// Marketplace TypeScript Interfaces and Types

export interface MarketplaceProject {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerAvatar: string;
  title: string;
  description: string;
  category: ProjectCategory;
  techStack: string[];
  price: number;
  isFree: boolean;
  images: string[];
  links: ProjectLinks;
  licenseType: LicenseType;
  status: ProjectStatus;
  rejectionReason?: string;
  views: number;
  purchases: number;
  rating: number;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
  features?: string[];
  // Reward tracking
  lastViewMilestone?: number;
  totalCoinsRewarded?: number;
}

export interface ProjectLinks {
  github?: string;
  liveDemo?: string;
  documentation?: string;
  video?: string;
  demoVideo?: string;
  explanationVideo?: string;
}

export type ProjectCategory =
  | 'web-app'
  | 'mobile-app'
  | 'backend-api'
  | 'ui-component'
  | 'game'
  | 'ai-ml'
  | 'chrome-extension'
  | 'template'
  | 'other';

export type LicenseType =
  | 'personal'
  | 'commercial'
  | 'open-source'
  | 'mit';

export type ProjectStatus =
  | 'draft'
  | 'pending_verification'
  | 'published'
  | 'rejected'
  | 'sold-out'
  | 'archived';

export interface MarketplacePurchase {
  id: string;
  projectId: string;
  projectTitle: string;
  projectImages: string[];
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  price: number;
  purchasedAt: Date;
  status: PurchaseStatus;
  accessLinks?: ProjectLinks;
  // Video watch tracking
  videoWatched?: {
    demo: boolean;
    explanation: boolean;
  };
}

export type PurchaseStatus =
  | 'completed'
  | 'refunded'
  | 'disputed';

export interface MarketplaceReview {
  id: string;
  projectId: string;
  buyerId: string;
  buyerName: string;
  buyerAvatar: string;
  rating: number;
  comment: string;
  createdAt: Date;
  helpful: number;
  isVerifiedWatcher?: boolean; // True if buyer watched both videos before reviewing
}

export interface MarketplaceChat {
  id: string;
  participants: string[];
  participantNames: { [userId: string]: string };
  participantAvatars: { [userId: string]: string };
  projectId: string;
  projectTitle: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: { [userId: string]: number };
  status: ChatStatus;
  requesterId: string;
  sellerId: string;
}

export type ChatStatus = 'pending' | 'accepted' | 'rejected';

export interface MarketplaceMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export interface CreateProjectData {
  title: string;
  description: string;
  category: ProjectCategory;
  techStack: string[];
  price: number;
  isFree: boolean;
  images: string[];
  links: ProjectLinks;
  licenseType: LicenseType;
  status: ProjectStatus;
}

export interface FilterOptions {
  category?: ProjectCategory;
  minPrice?: number;
  maxPrice?: number;
  techStack?: string[];
  licenseType?: LicenseType;
  searchQuery?: string;
}

export interface SortOption {
  field: 'createdAt' | 'price' | 'rating' | 'purchases' | 'views';
  direction: 'asc' | 'desc';
}

export const CATEGORY_LABELS: Record<ProjectCategory, string> = {
  'web-app': 'Web Application',
  'mobile-app': 'Mobile App',
  'backend-api': 'Backend API',
  'ui-component': 'UI Component',
  'game': 'Game',
  'ai-ml': 'AI/ML',
  'chrome-extension': 'Chrome Extension',
  'template': 'Template',
  'other': 'Other'
};

export const LICENSE_LABELS: Record<LicenseType, string> = {
  'personal': 'Personal Use Only',
  'commercial': 'Commercial Use',
  'open-source': 'Open Source',
  'mit': 'MIT License'
};

export const TECH_STACK_OPTIONS = [
  'React',
  'Vue',
  'Angular',
  'Node.js',
  'Express',
  'MongoDB',
  'PostgreSQL',
  'MySQL',
  'Firebase',
  'TypeScript',
  'JavaScript',
  'Python',
  'Django',
  'Flask',
  'FastAPI',
  'Next.js',
  'Tailwind CSS',
  'Bootstrap',
  'Material-UI',
  'Redux',
  'GraphQL',
  'REST API',
  'Docker',
  'AWS',
  'React Native',
  'Flutter',
  'Swift',
  'Kotlin',
  'TensorFlow',
  'PyTorch',
  'OpenAI',
];

// Seller Achievement Badges
export interface SellerBadge {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

export interface SellerAchievements {
  sellerId: string;
  stats: {
    totalSales: number;
    totalViews: number;
    totalCoinsEarned: number;
    avgRating: number;
    totalProjects: number;
  };
  badges: SellerBadge[];
  progress: {
    topSeller: { current: number; required: number };
    highlyRated: { current: number; required: number };
    viralProject: { current: number; required: number };
    coinMaster: { current: number; required: number };
  };
}

// Tiered Reward System
export const REWARD_TIERS = {
  FIVE_STARS: { rating: 5, coins: 20, emoji: '🌟' },
  FOUR_STARS: { rating: 4, coins: 15, emoji: '⭐' },
  THREE_FIVE_STARS: { rating: 3.5, coins: 10, emoji: '✨' },
} as const;
