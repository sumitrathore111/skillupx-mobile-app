import mongoose, { Document, Schema } from 'mongoose';

export interface IConnectionRequest extends Document {
  senderId: string;
  senderName: string;
  senderAvatar: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

const ConnectionRequestSchema: Schema = new Schema({
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  senderAvatar: { type: String, default: '' },
  receiverId: { type: String, required: true },
  receiverName: { type: String, required: true },
  receiverAvatar: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
}, {
  timestamps: true,
});

// Prevent duplicate requests
ConnectionRequestSchema.index({ senderId: 1, receiverId: 1 }, { unique: true });
ConnectionRequestSchema.index({ receiverId: 1, status: 1 });
ConnectionRequestSchema.index({ senderId: 1, status: 1 });

export default mongoose.model<IConnectionRequest>('ConnectionRequest', ConnectionRequestSchema);
