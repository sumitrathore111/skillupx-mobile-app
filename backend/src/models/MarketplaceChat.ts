import mongoose, { Document, Schema } from 'mongoose';

export interface IMarketplaceChat extends Document {
  participants: string[];
  participantNames: { [userId: string]: string };
  participantAvatars: { [userId: string]: string };
  projectId: string;
  projectTitle: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: { [userId: string]: number };
  status: 'pending' | 'accepted' | 'rejected';
  requesterId: string;
  sellerId: string;
  createdAt: Date;
  updatedAt: Date;
}

const MarketplaceChatSchema: Schema = new Schema({
  participants: [{ type: String, required: true }],
  participantNames: { type: Map, of: String },
  participantAvatars: { type: Map, of: String },
  projectId: { type: String, required: true },
  projectTitle: { type: String, required: true },
  lastMessage: { type: String, default: '' },
  lastMessageTime: { type: Date, default: Date.now },
  unreadCount: { type: Map, of: Number, default: {} },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  requesterId: { type: String, required: true },
  sellerId: { type: String, required: true }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(_doc: any, ret: any) {
      ret.id = ret._id?.toString();
      // Convert Maps to plain objects
      if (ret.participantNames instanceof Map) {
        ret.participantNames = Object.fromEntries(ret.participantNames);
      }
      if (ret.participantAvatars instanceof Map) {
        ret.participantAvatars = Object.fromEntries(ret.participantAvatars);
      }
      if (ret.unreadCount instanceof Map) {
        ret.unreadCount = Object.fromEntries(ret.unreadCount);
      }
      ret._id = undefined;
      ret.__v = undefined;
      return ret;
    }
  }
});

export default mongoose.model<IMarketplaceChat>('MarketplaceChat', MarketplaceChatSchema);
