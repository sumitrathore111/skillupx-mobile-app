import mongoose, { Schema, Document } from 'mongoose';

export interface IChat extends Document {
  participantIds: string[];
  participantNames: string[];
  participantAvatars: string[];
  lastMessage?: string;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ChatSchema: Schema = new Schema({
  participantIds: [{ type: String, required: true }],
  participantNames: [{ type: String }],
  participantAvatars: [{ type: String }],
  lastMessage: { type: String },
  lastMessageAt: { type: Date }
}, {
  timestamps: true
});

// Index for efficient lookups
ChatSchema.index({ participantIds: 1 });

export default mongoose.model<IChat>('Chat', ChatSchema);
