import crypto from 'crypto';
import mongoose, { Document, Schema } from 'mongoose';

export interface IProjectInvite extends Document {
  projectId: mongoose.Types.ObjectId;
  projectTitle: string;
  invitedUserId: mongoose.Types.ObjectId;
  invitedBy: mongoose.Types.ObjectId;
  invitedByName: string;
  message?: string;
  inviteToken: string; // Unique token for direct join link
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt: Date;
  respondedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectInviteSchema: Schema = new Schema({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  projectTitle: { type: String, required: true },
  invitedUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  invitedByName: { type: String, required: true },
  message: { type: String },
  inviteToken: {
    type: String,
    unique: true,
    default: () => crypto.randomBytes(32).toString('hex')
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'expired'],
    default: 'pending'
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  },
  respondedAt: { type: Date }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(_doc: unknown, ret: Record<string, unknown>) {
      ret.id = ret._id?.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    virtuals: true,
    transform: function(_doc: unknown, ret: Record<string, unknown>) {
      ret.id = ret._id?.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes
ProjectInviteSchema.index({ projectId: 1, invitedUserId: 1 }, { unique: true });
ProjectInviteSchema.index({ invitedUserId: 1, status: 1 });
ProjectInviteSchema.index({ invitedBy: 1 });
ProjectInviteSchema.index({ expiresAt: 1 });
// `inviteToken` already has `unique: true` in schema field definition

export default mongoose.model<IProjectInvite>('ProjectInvite', ProjectInviteSchema);
