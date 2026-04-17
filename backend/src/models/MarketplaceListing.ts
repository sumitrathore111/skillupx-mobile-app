import mongoose, { Document, Schema } from 'mongoose';

export interface IMarketplaceListing extends Document {
  title: string;
  description: string;
  price: number;
  isFree: boolean;
  category: string;
  tags: string[];
  images: string[];
  sellerId: string;
  sellerName: string;
  sellerAvatar: string;
  status: 'draft' | 'pending_verification' | 'published' | 'rejected' | 'sold-out' | 'archived';
  rejectionReason?: string;
  techStack: string[];
  links: {
    github?: string;
    liveDemo?: string;
    documentation?: string;
    video?: string;
    demoVideo?: string;
    explanationVideo?: string;
  };
  licenseType: 'personal' | 'commercial' | 'open-source' | 'mit';
  views: number;
  likes: string[];
  purchases: number;
  rating: number;
  reviewCount: number;
  features?: string[];
  // Reward tracking
  lastViewMilestone: number;
  totalCoinsRewarded: number;
  createdAt: Date;
  updatedAt: Date;
}

const MarketplaceListingSchema: Schema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  isFree: { type: Boolean, default: false },
  category: { type: String, required: true },
  tags: [{ type: String }],
  images: [{ type: String }],
  sellerId: { type: String, required: true },
  sellerName: { type: String, required: true },
  sellerAvatar: { type: String, default: '' },
  status: {
    type: String,
    enum: ['draft', 'pending_verification', 'published', 'rejected', 'sold-out', 'archived'],
    default: 'pending_verification'
  },
  rejectionReason: { type: String },
  techStack: [{ type: String }],
  links: {
    github: { type: String },
    liveDemo: { type: String },
    documentation: { type: String },
    video: { type: String },
    demoVideo: { type: String, required: true },
    explanationVideo: { type: String, required: true }
  },
  licenseType: {
    type: String,
    enum: ['personal', 'commercial', 'open-source', 'mit'],
    default: 'personal'
  },
  views: { type: Number, default: 0 },
  likes: [{ type: String }],
  purchases: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  features: [{ type: String }],
  // Reward tracking
  lastViewMilestone: { type: Number, default: 0 },
  totalCoinsRewarded: { type: Number, default: 0 }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(_doc: any, ret: any) {
      ret.id = ret._id?.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    virtuals: true,
    transform: function(_doc: any, ret: any) {
      ret.id = ret._id?.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

export default mongoose.model<IMarketplaceListing>('MarketplaceListing', MarketplaceListingSchema);
