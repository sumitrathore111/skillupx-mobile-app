import mongoose, { Document, Schema } from 'mongoose';

// Activity types for the activity feed
export type ActivityType =
  | 'task_created'
  | 'task_updated'
  | 'task_moved'
  | 'task_completed'
  | 'task_assigned'
  | 'task_commented'
  | 'task_attachment_added'
  | 'board_created'
  | 'column_added'
  | 'column_updated'
  | 'member_joined'
  | 'member_left'
  | 'member_role_changed'
  | 'sprint_started'
  | 'sprint_completed'
  | 'file_uploaded'
  | 'project_updated';

export interface IProjectActivity extends Document {
  projectId: mongoose.Types.ObjectId;
  boardId?: mongoose.Types.ObjectId;
  taskId?: mongoose.Types.ObjectId;
  sprintId?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userName: string;
  userAvatar?: string;
  type: ActivityType;
  title: string;
  description?: string;
  metadata: {
    oldValue?: any;
    newValue?: any;
    columnFrom?: string;
    columnTo?: string;
    taskTitle?: string;
    assigneeName?: string;
    fileName?: string;
    [key: string]: any;
  };
  createdAt: Date;
}

const ProjectActivitySchema: Schema = new Schema({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  boardId: { type: Schema.Types.ObjectId, ref: 'Board' },
  taskId: { type: Schema.Types.ObjectId, ref: 'BoardTask' },
  sprintId: { type: Schema.Types.ObjectId, ref: 'Sprint' },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  userAvatar: { type: String },
  type: {
    type: String,
    enum: [
      'task_created', 'task_updated', 'task_moved', 'task_completed',
      'task_assigned', 'task_commented', 'task_attachment_added',
      'board_created', 'column_added', 'column_updated',
      'member_joined', 'member_left', 'member_role_changed',
      'sprint_started', 'sprint_completed', 'file_uploaded', 'project_updated'
    ],
    required: true
  },
  title: { type: String, required: true },
  description: { type: String },
  metadata: { type: Schema.Types.Mixed, default: {} }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Indexes for efficient queries
ProjectActivitySchema.index({ projectId: 1, createdAt: -1 });
ProjectActivitySchema.index({ boardId: 1, createdAt: -1 });
ProjectActivitySchema.index({ taskId: 1 });
ProjectActivitySchema.index({ userId: 1 });

export default mongoose.model<IProjectActivity>('ProjectActivity', ProjectActivitySchema);
