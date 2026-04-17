/**
 * Discussion Model
 * Stores discussion posts for coding challenges
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface IDiscussion extends Document {
  challengeId: string;
  author: mongoose.Types.ObjectId;
  authorUsername: string;
  title: string;
  content: string;
  votes: number;
  votedBy: mongoose.Types.ObjectId[];
  replies: IReply[];
  createdAt: Date;
  updatedAt: Date;
}

interface IReply {
  author: mongoose.Types.ObjectId;
  authorUsername: string;
  content: string;
  createdAt: Date;
}

const ReplySchema = new Schema<IReply>({
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  authorUsername: { type: String, required: true },
  content: { type: String, required: true, maxlength: 5000 },
  createdAt: { type: Date, default: Date.now }
});

const DiscussionSchema = new Schema<IDiscussion>({
  challengeId: { type: String, required: true, index: true },
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  authorUsername: { type: String, required: true },
  title: { type: String, required: true, maxlength: 200 },
  content: { type: String, required: true, maxlength: 10000 },
  votes: { type: Number, default: 0 },
  votedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  replies: [ReplySchema]
}, {
  timestamps: true
});

// Index for faster queries
DiscussionSchema.index({ challengeId: 1, votes: -1 });
DiscussionSchema.index({ challengeId: 1, createdAt: -1 });

export default mongoose.model<IDiscussion>('Discussion', DiscussionSchema);
