import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  senderId: string;
  senderName: string;
  senderAvatar: string;
  receiverId?: string;
  groupId?: string;
  projectId?: string;
  text?: string;
  content: string;
  type: 'text' | 'image' | 'file';
  fileUrl?: string;
  fileName?: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema: Schema = new Schema({
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  senderAvatar: { type: String },
  receiverId: { type: String },
  groupId: { type: String },
  projectId: { type: String },
  text: { type: String },
  content: { type: String, required: true },
  type: { type: String, enum: ['text', 'image', 'file'], default: 'text' },
  fileUrl: { type: String },
  fileName: { type: String },
  isRead: { type: Boolean, default: false }
}, {
  timestamps: true
});

export default mongoose.model<IMessage>('Message', MessageSchema);
