import mongoose, { Document, Schema } from 'mongoose';

export interface IProjectMember {
  userId: mongoose.Types.ObjectId;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: Date;
}

export interface IProjectFile {
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedBy: mongoose.Types.ObjectId;
  uploadedAt: Date;
}

export interface IProjectIssue {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo?: string;  // Store as string (username) like Firebase
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  // Completion/Verification fields
  completedBy?: string;
  completedByName?: string;
  completedAt?: Date;
  pendingVerification?: boolean;
  verified?: boolean;
  verifiedBy?: string;
  verifiedByName?: string;
  verifiedAt?: Date;
  verificationFeedback?: string;
}

// Board column configuration
export interface IBoardColumn {
  id: string;
  name: string;
  color: string;
  order: number;
  limit?: number; // WIP limit
}

// Project settings
export interface IProjectSettings {
  defaultView: 'kanban' | 'list' | 'calendar' | 'gantt' | 'timeline';
  enableTimeTracking: boolean;
  enableStoryPoints: boolean;
  enableSubtasks: boolean;
  enableSprints: boolean;
  workingDays: number[]; // 0-6 (Sunday-Saturday)
  workingHoursStart: number; // 0-23
  workingHoursEnd: number;
  defaultTaskPriority: 'low' | 'medium' | 'high';
  autoAssignCreator: boolean;
}

// Project labels for consistent tagging
export interface IProjectLabel {
  id: string;
  name: string;
  color: string;
  description?: string;
}

export interface IProject extends Document {
  title: string;
  description: string;
  category: string;
  status: 'planning' | 'active' | 'paused' | 'completed' | 'archived';
  visibility: 'public' | 'private';
  owner: mongoose.Types.ObjectId;
  members: IProjectMember[];
  techStack: string[];
  tags: string[];
  repositoryUrl?: string;
  liveUrl?: string;
  files: IProjectFile[];
  issues: IProjectIssue[];
  ideaId?: mongoose.Types.ObjectId;
  maxMembers: number;
  startDate?: Date;
  expectedEndDate?: Date;
  actualEndDate?: Date;

  // Board configuration
  boardColumns: IBoardColumn[];

  // Project settings
  settings: IProjectSettings;

  // Project-wide labels
  labels: IProjectLabel[];

  // Analytics
  totalTasks: number;
  completedTasks: number;
  totalTimeSpent: number; // in minutes

  createdAt: Date;
  updatedAt: Date;
}

const ProjectMemberSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  role: { type: String, enum: ['owner', 'admin', 'member'], default: 'member' },
  joinedAt: { type: Date, default: Date.now }
});

const ProjectFileSchema = new Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },
  type: { type: String, required: true },
  size: { type: Number, required: true },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  uploadedAt: { type: Date, default: Date.now }
});

const ProjectIssueSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String },
  status: { type: String, enum: ['open', 'in-progress', 'resolved', 'closed'], default: 'open' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  assignedTo: { type: String },  // Store as string (username) like Firebase
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  // Completion/Verification fields
  completedBy: { type: String },
  completedByName: { type: String },
  completedAt: { type: Date },
  pendingVerification: { type: Boolean, default: false },
  verified: { type: Boolean, default: false },
  verifiedBy: { type: String },
  verifiedByName: { type: String },
  verifiedAt: { type: Date },
  verificationFeedback: { type: String }
});

// Board column schema
const BoardColumnSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  color: { type: String, default: '#6b7280' },
  order: { type: Number, required: true },
  limit: { type: Number } // WIP limit
}, { _id: false });

// Project settings schema
const ProjectSettingsSchema = new Schema({
  defaultView: {
    type: String,
    enum: ['kanban', 'list', 'calendar', 'gantt', 'timeline'],
    default: 'kanban'
  },
  enableTimeTracking: { type: Boolean, default: true },
  enableStoryPoints: { type: Boolean, default: true },
  enableSubtasks: { type: Boolean, default: true },
  enableSprints: { type: Boolean, default: false },
  workingDays: { type: [Number], default: [1, 2, 3, 4, 5] }, // Mon-Fri
  workingHoursStart: { type: Number, default: 9 },
  workingHoursEnd: { type: Number, default: 17 },
  defaultTaskPriority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  autoAssignCreator: { type: Boolean, default: false }
}, { _id: false });

// Project label schema
const ProjectLabelSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  color: { type: String, required: true },
  description: { type: String }
}, { _id: false });

const ProjectSchema: Schema = new Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  status: {
    type: String,
    enum: ['planning', 'active', 'paused', 'completed', 'archived'],
    default: 'planning'
  },
  visibility: { type: String, enum: ['public', 'private'], default: 'public' },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  members: [ProjectMemberSchema],
  techStack: [{ type: String }],
  tags: [{ type: String }],
  repositoryUrl: { type: String },
  liveUrl: { type: String },
  files: [ProjectFileSchema],
  issues: [ProjectIssueSchema],
  ideaId: { type: Schema.Types.ObjectId, ref: 'Idea' },
  maxMembers: { type: Number, default: 5 },
  startDate: { type: Date },
  expectedEndDate: { type: Date },
  actualEndDate: { type: Date },

  // Board configuration
  boardColumns: {
    type: [BoardColumnSchema],
    default: [
      { id: 'backlog', name: 'Backlog', color: '#6b7280', order: 0 },
      { id: 'todo', name: 'To Do', color: '#3b82f6', order: 1 },
      { id: 'in-progress', name: 'In Progress', color: '#f59e0b', order: 2 },
      { id: 'review', name: 'Review', color: '#8b5cf6', order: 3 },
      { id: 'done', name: 'Done', color: '#10b981', order: 4 }
    ]
  },

  // Project settings
  settings: {
    type: ProjectSettingsSchema,
    default: () => ({})
  },

  // Project-wide labels
  labels: {
    type: [ProjectLabelSchema],
    default: [
      { id: 'bug', name: 'Bug', color: '#ef4444', description: 'Something is broken' },
      { id: 'feature', name: 'Feature', color: '#10b981', description: 'New feature request' },
      { id: 'enhancement', name: 'Enhancement', color: '#3b82f6', description: 'Improvement to existing feature' },
      { id: 'documentation', name: 'Documentation', color: '#8b5cf6', description: 'Documentation updates' },
      { id: 'urgent', name: 'Urgent', color: '#f59e0b', description: 'Needs immediate attention' }
    ]
  },

  // Analytics
  totalTasks: { type: Number, default: 0 },
  completedTasks: { type: Number, default: 0 },
  totalTimeSpent: { type: Number, default: 0 } // in minutes
}, {
  timestamps: true
});

// Virtual for completion percentage
ProjectSchema.virtual('completionPercentage').get(function(this: IProject) {
  if (this.totalTasks === 0) return 0;
  return Math.round((this.completedTasks / this.totalTasks) * 100);
});

// Indexes
ProjectSchema.index({ owner: 1, status: 1 });
ProjectSchema.index({ 'members.userId': 1 });
ProjectSchema.index({ visibility: 1, status: 1 });
ProjectSchema.index({ category: 1 });
ProjectSchema.index({ 'labels.id': 1 });
ProjectSchema.index({ createdAt: -1 });

export default mongoose.model<IProject>('Project', ProjectSchema);
