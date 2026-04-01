import mongoose, { Document, Schema } from 'mongoose';

export interface IReply {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  createdAt: Date;
}

export interface IHelpRequest extends Document {
  userId: string;
  userName: string;
  userAvatar: string;
  title: string;
  description: string;
  tags: string[];
  responses: number;
  replies: IReply[];
  isResolved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ReplySchema: Schema = new Schema({
  id: { type: String, required: true },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  userAvatar: { type: String },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const HelpRequestSchema: Schema = new Schema({
  userId: { type: String, required: true, index: true },
  userName: { type: String, required: true },
  userAvatar: { type: String },
  title: { type: String, required: true },
  description: { type: String, required: true },
  tags: [{ type: String }],
  responses: { type: Number, default: 0 },
  replies: [ReplySchema],
  isResolved: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Indexes for efficient queries
HelpRequestSchema.index({ createdAt: -1 });
HelpRequestSchema.index({ tags: 1 });
HelpRequestSchema.index({ isResolved: 1 });

export default mongoose.model<IHelpRequest>('HelpRequest', HelpRequestSchema);
