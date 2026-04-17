import mongoose, { Document, Schema } from 'mongoose';

export interface IIdea extends Document {
  title: string;
  description: string;
  category: string;
  expectedTimeline: string;
  submittedBy: mongoose.Types.ObjectId;
  submittedByName: string;
  submittedByEmail: string;
  status: 'pending' | 'approved' | 'rejected' | 'in-progress' | 'completed';
  feedback?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  projectId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const IdeaSchema: Schema = new Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  expectedTimeline: { type: String, required: true },
  submittedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  submittedByName: { type: String, required: true },
  submittedByEmail: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'in-progress', 'completed'],
    default: 'pending'
  },
  feedback: { type: String },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project' }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(_doc: any, ret: any) {
      ret.id = ret._id?.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    virtuals: true,
    transform: function(_doc: any, ret: any) {
      ret.id = ret._id?.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Index for efficient queries
IdeaSchema.index({ submittedBy: 1, status: 1 });
IdeaSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model<IIdea>('Idea', IdeaSchema);
