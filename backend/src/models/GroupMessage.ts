import mongoose, { Document, Schema } from 'mongoose';

export interface IGroupMessage extends Document {
  groupId: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  message: string;
  createdAt: Date;
  updatedAt: Date;
}

const GroupMessageSchema: Schema = new Schema({
  groupId: { type: String, required: true, index: true },
  roomId: { type: String, default: 'general' },
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  senderAvatar: { type: String, default: '' },
  message: { type: String, required: true }
}, {
  timestamps: true
});

// Index for faster message retrieval by group + room
GroupMessageSchema.index({ groupId: 1, roomId: 1, createdAt: -1 });

export default mongoose.model<IGroupMessage>('GroupMessage', GroupMessageSchema);
