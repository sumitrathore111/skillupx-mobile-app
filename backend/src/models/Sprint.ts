import mongoose, { Document, Schema } from 'mongoose';

export interface ISprintGoal {
  id: string;
  description: string;
  completed: boolean;
}

export interface IDailyStandup {
  date: Date;
  odateUserId: mongoose.Types.ObjectId;
  userName: string;
  yesterday: string;
  today: string;
  blockers: string;
}

export interface IBurndownEntry {
  date: Date;
  remainingPoints: number;
  completedPoints: number;
  idealRemaining: number;
}

export interface ISprint extends Document {
  projectId: mongoose.Types.ObjectId;
  boardId?: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  goal?: string;
  goals: ISprintGoal[];
  startDate: Date;
  endDate: Date;
  status: 'planning' | 'active' | 'completed' | 'cancelled';

  // Velocity & Metrics
  plannedStoryPoints: number;
  completedStoryPoints: number;
  velocity: number;
  burndownData: IBurndownEntry[];

  // Daily standups
  standups: IDailyStandup[];

  // Sprint retrospective
  retrospective?: {
    whatWentWell: string[];
    whatToImprove: string[];
    actionItems: string[];
    completedAt?: Date;
  };

  sprintNumber: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SprintGoalSchema = new Schema({
  id: { type: String, required: true },
  description: { type: String, required: true },
  completed: { type: Boolean, default: false }
}, { _id: false });

const DailyStandupSchema = new Schema({
  date: { type: Date, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  yesterday: { type: String },
  today: { type: String },
  blockers: { type: String }
}, { _id: false });

const BurndownEntrySchema = new Schema({
  date: { type: Date, required: true },
  remainingPoints: { type: Number, default: 0 },
  completedPoints: { type: Number, default: 0 },
  idealRemaining: { type: Number, default: 0 }
}, { _id: false });

const SprintSchema: Schema = new Schema({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  boardId: { type: Schema.Types.ObjectId, ref: 'Board' },
  name: { type: String, required: true, trim: true },
  description: { type: String },
  goal: { type: String },
  goals: [SprintGoalSchema],
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: {
    type: String,
    enum: ['planning', 'active', 'completed', 'cancelled'],
    default: 'planning'
  },

  // Velocity & Metrics
  plannedStoryPoints: { type: Number, default: 0 },
  completedStoryPoints: { type: Number, default: 0 },
  velocity: { type: Number, default: 0 },
  burndownData: [BurndownEntrySchema],

  // Daily standups
  standups: [DailyStandupSchema],

  // Sprint retrospective
  retrospective: {
    whatWentWell: [{ type: String }],
    whatToImprove: [{ type: String }],
    actionItems: [{ type: String }],
    completedAt: { type: Date }
  },

  sprintNumber: { type: Number, default: 1 },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, {
  timestamps: true
});

SprintSchema.index({ projectId: 1 });
SprintSchema.index({ boardId: 1 });
SprintSchema.index({ status: 1 });
SprintSchema.index({ projectId: 1, status: 1 });
SprintSchema.index({ startDate: 1 });
SprintSchema.index({ endDate: 1 });

// Virtual for calculating days remaining
SprintSchema.virtual('daysRemaining').get(function(this: ISprint) {
  if (this.status === 'completed' || this.status === 'cancelled') return 0;
  const now = new Date();
  const end = new Date(this.endDate);
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
});

// Virtual for calculating sprint progress
SprintSchema.virtual('progress').get(function(this: ISprint) {
  const start = new Date(this.startDate).getTime();
  const end = new Date(this.endDate).getTime();
  const now = new Date().getTime();

  if (now <= start) return 0;
  if (now >= end) return 100;

  return Math.round(((now - start) / (end - start)) * 100);
});

export default mongoose.model<ISprint>('Sprint', SprintSchema);
