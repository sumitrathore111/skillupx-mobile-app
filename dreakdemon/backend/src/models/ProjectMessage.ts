import mongoose, { Document, Schema } from 'mongoose';

export interface IProjectMessage extends Document {
  projectId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userName: string;
  message: string;
  timestamp: Date;
}

const ProjectMessageSchema: Schema = new Schema({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

// Index for efficient queries
ProjectMessageSchema.index({ projectId: 1, timestamp: 1 });

export default mongoose.model<IProjectMessage>('ProjectMessage', ProjectMessageSchema);
