import mongoose, { Document, Schema } from 'mongoose';

// Checklist item interface
export interface IChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  completedAt?: Date;
  completedBy?: mongoose.Types.ObjectId;
}

// Comment interface
export interface ITaskComment {
  id: string;
  content: string;
  author: mongoose.Types.ObjectId;
  authorName: string;
  authorAvatar?: string;
  mentions: string[]; // Array of userIds mentioned with @
  createdAt: Date;
  updatedAt?: Date;
  isEdited: boolean;
}

// Time entry interface for time tracking
export interface ITimeEntry {
  id: string;
  userId: mongoose.Types.ObjectId;
  userName: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // in minutes
  description?: string;
}

// Attachment interface
export interface ITaskAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedBy: mongoose.Types.ObjectId;
  uploadedAt: Date;
}

// Enhanced Task interface for Kanban
export interface IBoardTask extends Document {
  boardId: mongoose.Types.ObjectId;
  columnId: string;
  projectId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  position: number; // Order within column
  priority: 'low' | 'medium' | 'high' | 'critical';
  labels: string[];
  assignees: mongoose.Types.ObjectId[];
  reporter: mongoose.Types.ObjectId;
  dueDate?: Date;
  startDate?: Date;
  estimatedHours?: number;

  // Subtasks
  subtasks: IChecklistItem[];

  // Checklists (multiple checklists per task)
  checklists: {
    id: string;
    title: string;
    items: IChecklistItem[];
  }[];

  // Comments
  comments: ITaskComment[];

  // Time tracking
  timeEntries: ITimeEntry[];
  totalTimeSpent: number; // in minutes

  // Attachments
  attachments: ITaskAttachment[];

  // Activity tracking
  watchers: mongoose.Types.ObjectId[];

  // Sprint/Agile fields
  sprintId?: mongoose.Types.ObjectId;
  storyPoints?: number;
  epicId?: string;

  // Status tracking
  completedAt?: Date;
  completedBy?: mongoose.Types.ObjectId;

  // Review system - Only project creator can review
  reviewStatus: 'pending' | 'approved' | 'changes_requested' | 'not_submitted';
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  reviewComment?: string;

  createdAt: Date;
  updatedAt: Date;
}

// Column interface
export interface IBoardColumn {
  id: string;
  title: string;
  position: number;
  color: string;
  taskLimit?: number; // WIP limit
  isCollapsed: boolean;
}

// Board interface
export interface IBoard extends Document {
  projectId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  columns: IBoardColumn[];
  labels: {
    id: string;
    name: string;
    color: string;
  }[];
  settings: {
    defaultView: 'kanban' | 'list' | 'calendar' | 'gantt';
    showTaskIds: boolean;
    enableTimeTracking: boolean;
    enableStoryPoints: boolean;
  };
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Schemas
const ChecklistItemSchema = new Schema({
  id: { type: String, required: true },
  text: { type: String, required: true },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date },
  completedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { _id: false });

const TaskCommentSchema = new Schema({
  id: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  authorName: { type: String, required: true },
  authorAvatar: { type: String },
  mentions: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
  isEdited: { type: Boolean, default: false }
}, { _id: false });

const TimeEntrySchema = new Schema({
  id: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  duration: { type: Number, default: 0 },
  description: { type: String }
}, { _id: false });

const TaskAttachmentSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  url: { type: String, required: true },
  type: { type: String, required: true },
  size: { type: Number, required: true },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: false });

const BoardTaskSchema: Schema = new Schema({
  boardId: { type: Schema.Types.ObjectId, ref: 'Board', required: true },
  columnId: { type: String, required: true },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String },
  position: { type: Number, required: true },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  labels: [{ type: String }],
  assignees: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  dueDate: { type: Date },
  startDate: { type: Date },
  estimatedHours: { type: Number },

  subtasks: [ChecklistItemSchema],

  checklists: [{
    id: { type: String, required: true },
    title: { type: String, required: true },
    items: [ChecklistItemSchema]
  }],

  comments: [TaskCommentSchema],

  timeEntries: [TimeEntrySchema],
  totalTimeSpent: { type: Number, default: 0 },

  attachments: [TaskAttachmentSchema],

  watchers: [{ type: Schema.Types.ObjectId, ref: 'User' }],

  sprintId: { type: Schema.Types.ObjectId, ref: 'Sprint' },
  storyPoints: { type: Number },
  epicId: { type: String },

  completedAt: { type: Date },
  completedBy: { type: Schema.Types.ObjectId, ref: 'User' },

  // Review system
  reviewStatus: {
    type: String,
    enum: ['pending', 'approved', 'changes_requested', 'not_submitted'],
    default: 'not_submitted'
  },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  reviewComment: { type: String },

  // GitHub integration metadata
  metadata: {
    githubIssueNumber: { type: Number },
    githubIssueUrl: { type: String },
    githubRef: { type: String },
    githubPRNumber: { type: Number },
    githubPRUrl: { type: String }
  }
}, {
  timestamps: true
});

const BoardColumnSchema = new Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  position: { type: Number, required: true },
  color: { type: String, default: '#6B7280' },
  taskLimit: { type: Number },
  isCollapsed: { type: Boolean, default: false }
}, { _id: false });

const BoardSchema: Schema = new Schema({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String },
  columns: [BoardColumnSchema],
  labels: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    color: { type: String, required: true }
  }],
  settings: {
    defaultView: { type: String, enum: ['kanban', 'list', 'calendar', 'gantt'], default: 'kanban' },
    showTaskIds: { type: Boolean, default: true },
    enableTimeTracking: { type: Boolean, default: true },
    enableStoryPoints: { type: Boolean, default: false }
  },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, {
  timestamps: true
});

// Indexes
BoardTaskSchema.index({ boardId: 1, columnId: 1, position: 1 });
BoardTaskSchema.index({ projectId: 1 });
BoardTaskSchema.index({ assignees: 1 });
BoardTaskSchema.index({ dueDate: 1 });
BoardTaskSchema.index({ sprintId: 1 });

BoardSchema.index({ projectId: 1 });

export const Board = mongoose.model<IBoard>('Board', BoardSchema);
export const BoardTask = mongoose.model<IBoardTask>('BoardTask', BoardTaskSchema);
