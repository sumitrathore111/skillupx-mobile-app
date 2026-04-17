import mongoose, { Document, Schema } from 'mongoose';

// Subtask interface
export interface ISubtask {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: Date;
  completedBy?: mongoose.Types.ObjectId;
}

// Checklist item interface
export interface IChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

// Label interface
export interface ILabel {
  name: string;
  color: string; // hex color
}

// Comment interface
export interface IComment {
  id: string;
  userId: mongoose.Types.ObjectId;
  userName: string;
  userAvatar?: string;
  content: string;
  mentions: string[]; // userIds mentioned with @
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
export interface IAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedBy: mongoose.Types.ObjectId;
  uploadedAt: Date;
}

export interface ITask extends Document {
  projectId: mongoose.Types.ObjectId;
  sprintId?: mongoose.Types.ObjectId;
  parentTaskId?: mongoose.Types.ObjectId; // For subtasks hierarchy
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'review' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo?: mongoose.Types.ObjectId;
  assignees: mongoose.Types.ObjectId[]; // Multiple assignees support
  createdBy: mongoose.Types.ObjectId;
  dueDate?: Date;
  startDate?: Date;
  completedAt?: Date;
  completedBy?: mongoose.Types.ObjectId;

  // Enhanced features
  subtasks: ISubtask[];
  checklist: IChecklistItem[];
  labels: ILabel[];
  comments: IComment[];
  attachments: IAttachment[];

  // Time tracking
  estimatedHours?: number;
  timeEntries: ITimeEntry[];
  totalTimeSpent: number; // in minutes

  // Kanban board
  columnOrder: number; // Order within the column

  // Dependencies
  blockedBy: mongoose.Types.ObjectId[]; // Tasks that block this task
  blocks: mongoose.Types.ObjectId[]; // Tasks this task blocks

  // Story points for Agile
  storyPoints?: number;

  // Watchers - users who want notifications
  watchers: mongoose.Types.ObjectId[];

  tags: string[];
  isArchived: boolean;
  archivedAt?: Date;
  archivedBy?: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

// Subdocument schemas
const SubtaskSchema = new Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date },
  completedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { _id: false });

const ChecklistItemSchema = new Schema({
  id: { type: String, required: true },
  text: { type: String, required: true },
  checked: { type: Boolean, default: false }
}, { _id: false });

const LabelSchema = new Schema({
  name: { type: String, required: true },
  color: { type: String, required: true, default: '#3B82F6' }
}, { _id: false });

const CommentSchema = new Schema({
  id: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  userAvatar: { type: String },
  content: { type: String, required: true },
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

const AttachmentSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  url: { type: String, required: true },
  type: { type: String, required: true },
  size: { type: Number, required: true },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: false });

const TaskSchema: Schema = new Schema({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  sprintId: { type: Schema.Types.ObjectId, ref: 'Sprint' },
  parentTaskId: { type: Schema.Types.ObjectId, ref: 'Task' },
  title: { type: String, required: true, trim: true },
  description: { type: String },
  status: {
    type: String,
    enum: ['todo', 'in-progress', 'review', 'completed'],
    default: 'todo'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
  assignees: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  dueDate: { type: Date },
  startDate: { type: Date },
  completedAt: { type: Date },
  completedBy: { type: Schema.Types.ObjectId, ref: 'User' },

  // Enhanced features
  subtasks: [SubtaskSchema],
  checklist: [ChecklistItemSchema],
  labels: [LabelSchema],
  comments: [CommentSchema],
  attachments: [AttachmentSchema],

  // Time tracking
  estimatedHours: { type: Number },
  timeEntries: [TimeEntrySchema],
  totalTimeSpent: { type: Number, default: 0 },

  // Kanban board
  columnOrder: { type: Number, default: 0 },

  // Dependencies
  blockedBy: [{ type: Schema.Types.ObjectId, ref: 'Task' }],
  blocks: [{ type: Schema.Types.ObjectId, ref: 'Task' }],

  // Story points
  storyPoints: { type: Number },

  // Watchers
  watchers: [{ type: Schema.Types.ObjectId, ref: 'User' }],

  tags: [{ type: String }],
  isArchived: { type: Boolean, default: false },
  archivedAt: { type: Date },
  archivedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

// Indexes for efficient queries
TaskSchema.index({ projectId: 1 });
TaskSchema.index({ sprintId: 1 });
TaskSchema.index({ assignedTo: 1 });
TaskSchema.index({ assignees: 1 });
TaskSchema.index({ status: 1 });
TaskSchema.index({ completedBy: 1 });
TaskSchema.index({ dueDate: 1 });
TaskSchema.index({ columnOrder: 1 });
TaskSchema.index({ parentTaskId: 1 });
TaskSchema.index({ isArchived: 1 });
TaskSchema.index({ projectId: 1, status: 1 });
TaskSchema.index({ projectId: 1, sprintId: 1 });

// Virtual for calculating progress based on subtasks
TaskSchema.virtual('subtaskProgress').get(function(this: ITask) {
  if (!this.subtasks || this.subtasks.length === 0) return 100;
  const completed = this.subtasks.filter((s: ISubtask) => s.completed).length;
  return Math.round((completed / this.subtasks.length) * 100);
});

// Virtual for calculating checklist progress
TaskSchema.virtual('checklistProgress').get(function(this: ITask) {
  if (!this.checklist || this.checklist.length === 0) return 100;
  const checked = this.checklist.filter((c: IChecklistItem) => c.checked).length;
  return Math.round((checked / this.checklist.length) * 100);
});

export default mongoose.model<ITask>('Task', TaskSchema);
