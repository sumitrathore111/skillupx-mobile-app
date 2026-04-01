import mongoose, { Document, Schema } from 'mongoose';

export interface ITechReview extends Document {
  userId: string;
  userName: string;
  userAvatar: string;
  userLevel: string;
  website: string;
  url: string;
  category: string;
  rating: number;
  title: string;
  content: string;
  pros: string[];
  cons: string[];
  likes: number;
  likedBy: string[];
  helpful: number;
  helpfulBy: string[];
  comments: number;
  createdAt: Date;
  updatedAt: Date;
}

const TechReviewSchema: Schema = new Schema({
  userId: { type: String, required: true, index: true },
  userName: { type: String, required: true },
  userAvatar: { type: String },
  userLevel: { type: String, default: 'Student' },
  website: { type: String, required: true },
  url: { type: String },
  category: { type: String, default: 'Other' },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String, required: true },
  content: { type: String, required: true },
  pros: [{ type: String }],
  cons: [{ type: String }],
  likes: { type: Number, default: 0 },
  likedBy: [{ type: String }],
  helpful: { type: Number, default: 0 },
  helpfulBy: [{ type: String }],
  comments: { type: Number, default: 0 }
}, {
  timestamps: true
});

// Indexes for efficient queries
TechReviewSchema.index({ createdAt: -1 });
TechReviewSchema.index({ website: 1 });
TechReviewSchema.index({ category: 1 });
TechReviewSchema.index({ rating: -1 });

export default mongoose.model<ITechReview>('TechReview', TechReviewSchema);
