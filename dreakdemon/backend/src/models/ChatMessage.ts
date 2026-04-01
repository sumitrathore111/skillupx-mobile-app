import mongoose, { Schema, Document } from 'mongoose';

export interface IChatMessage extends Document {
  chatId: mongoose.Types.ObjectId;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema: Schema = new Schema({
  chatId: { type: Schema.Types.ObjectId, ref: 'Chat', required: true },
  senderId: { type: String, required: true },
  senderName: { type: String },
  senderAvatar: { type: String },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Index for efficient lookups
ChatMessageSchema.index({ chatId: 1, createdAt: 1 });

export default mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);
