import mongoose, { Document, Schema } from 'mongoose';

export interface IMarketplaceMessage extends Document {
  chatId: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

const MarketplaceMessageSchema: Schema = new Schema({
  chatId: { type: String, required: true, index: true },
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  read: { type: Boolean, default: false }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(_doc: any, ret: any) {
      ret.id = ret._id?.toString();
      ret._id = undefined;
      ret.__v = undefined;
      return ret;
    }
  }
});

export default mongoose.model<IMarketplaceMessage>('MarketplaceMessage', MarketplaceMessageSchema);
