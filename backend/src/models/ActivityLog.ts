import mongoose, { Document, Schema } from 'mongoose';

export type ActivityType =
  // Task activities
  | 'task_created'
  | 'task_updated'
  | 'task_deleted'
  | 'task_assigned'
  | 'task_unassigned'
  | 'task_status_changed'
  | 'task_completed'
  | 'task_reopened'
  | 'task_commented'
  | 'task_attachment_added'
  | 'task_attachment_removed'
  | 'subtask_added'
  | 'subtask_completed'
  | 'checklist_item_checked'
  | 'time_logged'
  // Sprint activities
  | 'sprint_created'
  | 'sprint_started'
  | 'sprint_completed'
  | 'sprint_cancelled'
  | 'standup_submitted'
  // Project activities
  | 'project_created'
  | 'project_updated'
  | 'member_joined'
  | 'member_left'
  | 'member_removed'
  | 'role_changed'
  | 'file_uploaded'
  | 'file_deleted'
  // Message activities
  | 'message_sent'
  | 'mention_created';

export interface IActivityLog extends Document {
  projectId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userName: string;
  userAvatar?: string;
  activityType: ActivityType;
  entityType: 'task' | 'sprint' | 'project' | 'file' | 'message' | 'member';
  entityId?: mongoose.Types.ObjectId;
  entityTitle?: string;

  // Activity details
  description: string;
  metadata: {
    oldValue?: any;
    newValue?: any;
    targetUserId?: mongoose.Types.ObjectId;
    targetUserName?: string;
    taskId?: mongoose.Types.ObjectId;
    sprintId?: mongoose.Types.ObjectId;
    commentId?: string;
    attachmentId?: string;
    [key: string]: any;
  };

  // Mentions for notifications
  mentions: mongoose.Types.ObjectId[];

  // Read status for notifications
  readBy: mongoose.Types.ObjectId[];

  createdAt: Date;
}

const ActivityLogSchema: Schema = new Schema({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  userAvatar: { type: String },
  activityType: {
    type: String,
    required: true,
    enum: [
      'task_created', 'task_updated', 'task_deleted', 'task_assigned',
      'task_unassigned', 'task_status_changed', 'task_completed', 'task_reopened',
      'task_commented', 'task_attachment_added', 'task_attachment_removed',
      'subtask_added', 'subtask_completed', 'checklist_item_checked', 'time_logged',
      'sprint_created', 'sprint_started', 'sprint_completed', 'sprint_cancelled', 'standup_submitted',
      'project_created', 'project_updated', 'member_joined', 'member_left',
      'member_removed', 'role_changed', 'file_uploaded', 'file_deleted',
      'message_sent', 'mention_created'
    ]
  },
  entityType: {
    type: String,
    required: true,
    enum: ['task', 'sprint', 'project', 'file', 'message', 'member']
  },
  entityId: { type: Schema.Types.ObjectId },
  entityTitle: { type: String },

  description: { type: String, required: true },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },

  mentions: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Indexes for efficient queries
ActivityLogSchema.index({ projectId: 1, createdAt: -1 });
ActivityLogSchema.index({ userId: 1, createdAt: -1 });
ActivityLogSchema.index({ entityType: 1, entityId: 1 });
ActivityLogSchema.index({ activityType: 1 });
ActivityLogSchema.index({ mentions: 1 });
ActivityLogSchema.index({ createdAt: -1 });

// TTL index to auto-delete old activity logs after 90 days (optional)
// ActivityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export default mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);
