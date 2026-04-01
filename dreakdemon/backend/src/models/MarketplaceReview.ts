import mongoose, { Document, Schema } from 'mongoose';

export interface IMarketplaceReview extends Document {
  projectId: string;
  buyerId: string;
  buyerName: string;
  buyerAvatar: string;
  rating: number;
  comment: string;
  helpful: number;
  isVerifiedWatcher: boolean; // True if buyer watched both videos before reviewing
  createdAt: Date;
}

const MarketplaceReviewSchema: Schema = new Schema({
  projectId: { type: String, required: true, index: true },
  buyerId: { type: String, required: true },
  buyerName: { type: String, required: true },
  buyerAvatar: { type: String, default: '' },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
  helpful: { type: Number, default: 0 },
  isVerifiedWatcher: { type: Boolean, default: false } // Badge for watching both videos
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

// Compound index to prevent duplicate reviews (one review per user per project)
MarketplaceReviewSchema.index({ projectId: 1, buyerId: 1 }, { unique: true });

export default mongoose.model<IMarketplaceReview>('MarketplaceReview', MarketplaceReviewSchema);
