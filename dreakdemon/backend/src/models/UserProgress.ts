import mongoose, { Document, Schema } from 'mongoose';

export interface IUserProgress extends Document {
  userId: mongoose.Types.ObjectId;
  solvedChallenges: {
    challengeId: string;  // Can be MongoDB ObjectId or string ID like "A002"
    solvedAt: Date;
    language: string;
    executionTime?: number;
  }[];
  totalPoints: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserProgressSchema = new Schema<IUserProgress>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  solvedChallenges: [{
    challengeId: { type: String, required: true },  // Changed to String to support both formats
    solvedAt: { type: Date, default: Date.now },
    language: { type: String },
    executionTime: { type: Number }
  }],
  totalPoints: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model<IUserProgress>('UserProgress', UserProgressSchema);
