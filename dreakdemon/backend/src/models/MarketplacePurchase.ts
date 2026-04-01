import mongoose, { Document, Schema } from 'mongoose';

export interface IMarketplacePurchase extends Document {
  projectId: string;
  projectTitle: string;
  projectImages: string[];
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  price: number;
  purchasedAt: Date;
  status: 'completed' | 'refunded' | 'disputed';
  accessLinks?: {
    github?: string;
    liveDemo?: string;
    documentation?: string;
    video?: string;
    demoVideo?: string;
    explanationVideo?: string;
  };
  // Video watch tracking
  videoWatched?: {
    demo: boolean;
    explanation: boolean;
  };
}

const MarketplacePurchaseSchema: Schema = new Schema({
  projectId: { type: String, required: true, index: true },
  projectTitle: { type: String, required: true },
  projectImages: [{ type: String }],
  buyerId: { type: String, required: true, index: true },
  buyerName: { type: String, required: true },
  sellerId: { type: String, required: true, index: true },
  sellerName: { type: String, required: true },
  price: { type: Number, required: true },
  purchasedAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['completed', 'refunded', 'disputed'],
    default: 'completed'
  },
  accessLinks: {
    github: { type: String },
    liveDemo: { type: String },
    documentation: { type: String },
    video: { type: String },
    demoVideo: { type: String },
    explanationVideo: { type: String }
  },
  // Video watch tracking for verified reviews
  videoWatched: {
    demo: { type: Boolean, default: false },
    explanation: { type: Boolean, default: false }
  }
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

// Compound index to prevent duplicate purchases
MarketplacePurchaseSchema.index({ projectId: 1, buyerId: 1 }, { unique: true });

export default mongoose.model<IMarketplacePurchase>('MarketplacePurchase', MarketplacePurchaseSchema);
