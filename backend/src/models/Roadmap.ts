import mongoose, { Document, Schema } from 'mongoose';

// Interface for Resource
export interface IResource {
  title: string;
  url: string;
  type: 'video' | 'article' | 'course' | 'documentation' | 'tutorial';
  platform: string;
  duration?: string;
  isFree: boolean;
}

// Interface for Topic
export interface ITopic extends Document {
  roadmapId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  phase: 'beginner' | 'intermediate' | 'advanced' | 'interview';
  order: number;
  estimatedHours: number;
  resources: IResource[];
  relatedProjects: string[];
  prerequisites: mongoose.Types.ObjectId[];
  keyPoints: string[];
  icon: string;
  createdAt: Date;
  updatedAt: Date;
}

// Interface for Interview Question
export interface IInterviewQuestion extends Document {
  roadmapId: mongoose.Types.ObjectId;
  topicId?: mongoose.Types.ObjectId;
  question: string;
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  company?: string;
  category: string;
  tags: string[];
  createdAt: Date;
}

// Interface for Career Info
export interface ICareerInfo extends Document {
  roadmapId: mongoose.Types.ObjectId;
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
  createdAt: Date;
}

// Interface for User Learning Progress
export interface ILearningProgress extends Document {
  userId: mongoose.Types.ObjectId;
  roadmapId: mongoose.Types.ObjectId;
  completedTopics: Array<{
    topicId: mongoose.Types.ObjectId;
    completedAt: Date;
    timeSpent?: number;
  }>;
  completedQuestions: Array<{
    questionId: mongoose.Types.ObjectId;
    answeredAt: Date;
    isCorrect?: boolean;
  }>;
  startedAt: Date;
  lastAccessedAt: Date;
  totalTimeSpent: number;
  currentStreak: number;
  longestStreak: number;
  badges: Array<{
    id: string;
    name: string;
    earnedAt: Date;
  }>;
}

// Interface for Roadmap
export interface IRoadmap extends Document {
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
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Roadmap Schema
const RoadmapSchema: Schema = new Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  description: { type: String, required: true },
  longDescription: { type: String, default: '' },
  icon: { type: String, default: '📚' },
  color: { type: String, default: '#00ADB5' },
  category: {
    type: String,
    enum: ['web', 'data', 'mobile', 'devops', 'cloud', 'ai-ml', 'database', 'security', 'other'],
    default: 'other'
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'all-levels'],
    default: 'all-levels'
  },
  estimatedWeeks: { type: Number, default: 8 },
  totalTopics: { type: Number, default: 0 },
  totalResources: { type: Number, default: 0 },
  totalProjects: { type: Number, default: 0 },
  totalQuestions: { type: Number, default: 0 },
  isPublished: { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false },
  prerequisites: [{ type: String }],
  outcomes: [{ type: String }],
  tags: [{ type: String }],
  enrolledCount: { type: Number, default: 0 },
  completedCount: { type: Number, default: 0 },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0 },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Topic Schema
const TopicSchema: Schema = new Schema({
  roadmapId: { type: Schema.Types.ObjectId, ref: 'Roadmap', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  phase: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'interview'],
    required: true
  },
  order: { type: Number, default: 0 },
  estimatedHours: { type: Number, default: 2 },
  resources: [{
    title: { type: String, required: true },
    url: { type: String, required: true },
    type: {
      type: String,
      enum: ['video', 'article', 'course', 'documentation', 'tutorial'],
      default: 'article'
    },
    platform: { type: String, default: '' },
    duration: { type: String },
    isFree: { type: Boolean, default: true }
  }],
  relatedProjects: [{ type: String }],
  prerequisites: [{ type: Schema.Types.ObjectId, ref: 'Topic' }],
  keyPoints: [{ type: String }],
  icon: { type: String, default: '📖' },
}, { timestamps: true });

// Interview Question Schema
const InterviewQuestionSchema: Schema = new Schema({
  roadmapId: { type: Schema.Types.ObjectId, ref: 'Roadmap', required: true },
  topicId: { type: Schema.Types.ObjectId, ref: 'Topic' },
  question: { type: String, required: true },
  answer: { type: String, required: true },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  company: { type: String },
  category: { type: String, default: 'general' },
  tags: [{ type: String }],
}, { timestamps: true });

// Career Info Schema
const CareerInfoSchema: Schema = new Schema({
  roadmapId: { type: Schema.Types.ObjectId, ref: 'Roadmap', required: true },
  jobTitle: { type: String, required: true },
  description: { type: String, required: true },
  salaryRange: {
    min: { type: Number, required: true },
    max: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    period: { type: String, default: 'year' }
  },
  demandLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'very-high'],
    default: 'medium'
  },
  requiredSkills: [{ type: String }],
  preferredSkills: [{ type: String }],
  experienceLevel: {
    type: String,
    enum: ['fresher', 'junior', 'mid', 'senior', 'lead'],
    default: 'fresher'
  },
  growthPath: [{ type: String }],
  companies: [{ type: String }],
}, { timestamps: true });

// Learning Progress Schema
const LearningProgressSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  roadmapId: { type: Schema.Types.ObjectId, ref: 'Roadmap', required: true },
  completedTopics: [{
    topicId: { type: Schema.Types.ObjectId, ref: 'Topic' },
    completedAt: { type: Date, default: Date.now },
    timeSpent: { type: Number, default: 0 }
  }],
  completedQuestions: [{
    questionId: { type: Schema.Types.ObjectId, ref: 'InterviewQuestion' },
    answeredAt: { type: Date, default: Date.now },
    isCorrect: { type: Boolean }
  }],
  startedAt: { type: Date, default: Date.now },
  lastAccessedAt: { type: Date, default: Date.now },
  totalTimeSpent: { type: Number, default: 0 },
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  badges: [{
    id: { type: String },
    name: { type: String },
    earnedAt: { type: Date, default: Date.now }
  }]
});

// Indexes
// `slug` already has `unique: true` in schema field definition
RoadmapSchema.index({ category: 1, isPublished: 1 });
RoadmapSchema.index({ isFeatured: 1, isPublished: 1 });
TopicSchema.index({ roadmapId: 1, phase: 1, order: 1 });
InterviewQuestionSchema.index({ roadmapId: 1, difficulty: 1 });
LearningProgressSchema.index({ userId: 1, roadmapId: 1 }, { unique: true });

export const Roadmap = mongoose.model<IRoadmap>('Roadmap', RoadmapSchema);
export const Topic = mongoose.model<ITopic>('Topic', TopicSchema);
export const InterviewQuestion = mongoose.model<IInterviewQuestion>('InterviewQuestion', InterviewQuestionSchema);
export const CareerInfo = mongoose.model<ICareerInfo>('CareerInfo', CareerInfoSchema);
export const LearningProgress = mongoose.model<ILearningProgress>('LearningProgress', LearningProgressSchema);
