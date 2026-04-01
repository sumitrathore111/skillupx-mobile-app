import mongoose, { Document, Schema } from 'mongoose';

export interface IBattle extends Document {
  status: 'waiting' | 'countdown' | 'active' | 'completed' | 'cancelled' | 'forfeited' | 'rejected';
  difficulty: 'easy' | 'medium' | 'hard';
  entryFee: number;
  prize: number;
  timeLimit: number;
  maxParticipants: number;
  participants: Array<{
    userId: string;
    userName: string;
    userAvatar: string;
    rating: number;
    hasSubmitted: boolean;
    score?: number;
    submissionTime?: Date;
    code?: string;
    passedCount?: number;
    totalCount?: number;
    totalTime?: number;
  }>;
  challenge: {
    id: string;
    title: string;
    difficulty: string;
    category: string;
    coinReward: number;
    description: string;
    testCases: any[];
    test_cases: any[];
  };
  isBot?: boolean; // Whether this battle has a bot opponent
  botProfile?: {
    id: string;
    name: string;
    avatar: string;
    rating: number;
    skillLevel: string;
  };
  botSubmitAt?: Date; // When the bot is scheduled to submit
  botSubmitted?: boolean; // Whether the bot has already submitted
  winner?: string;
  forfeitedBy?: string;
  prizeAwarded?: boolean; // Prevent double prize awarding
  invite?: {
    fromUserId: string;
    fromUsername: string;
    fromName: string;
    toUserId: string;
    toUsername: string;
    toName: string;
    status: 'pending' | 'accepted' | 'rejected' | 'expired';
    createdAt: Date;
  };
  rematchRequest?: {
    from: string;
    fromName: string;
    to: string;
    toName: string;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: Date;
  };
  startedAt?: Date;
  completedAt?: Date;
  createdBy: string;
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

const BattleSchema: Schema = new Schema({
  status: {
    type: String,
    enum: ['waiting', 'countdown', 'active', 'completed', 'cancelled', 'forfeited', 'rejected'],
    default: 'waiting'
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true
  },
  entryFee: { type: Number, required: true },
  prize: { type: Number, required: true },
  timeLimit: { type: Number, required: true },
  maxParticipants: { type: Number, default: 2 },
  participants: [{
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    userAvatar: { type: String },
    rating: { type: Number, default: 1000 },
    hasSubmitted: { type: Boolean, default: false },
    score: { type: Number },
    submissionTime: { type: Date },
    code: { type: String },
    passedCount: { type: Number, default: 0 },
    totalCount: { type: Number, default: 0 },
    totalTime: { type: Number, default: 0 }
  }],
  challenge: {
    id: { type: String, required: true },
    title: { type: String, required: true },
    difficulty: { type: String },
    category: { type: String },
    coinReward: { type: Number },
    description: { type: String },
    testCases: [{ type: Schema.Types.Mixed }],
    test_cases: [{ type: Schema.Types.Mixed }]
  },
  winner: { type: String },
  isBot: { type: Boolean, default: false },
  botProfile: {
    id: { type: String },
    name: { type: String },
    avatar: { type: String },
    rating: { type: Number },
    skillLevel: { type: String },
  },
  botSubmitAt: { type: Date },
  botSubmitted: { type: Boolean, default: false },
  forfeitedBy: { type: String },
  prizeAwarded: { type: Boolean, default: false },
  ratingChanges: {
    winner: {
      oldRating: { type: Number },
      newRating: { type: Number }
    },
    loser: {
      oldRating: { type: Number },
      newRating: { type: Number }
    }
  },
  invite: {
    fromUserId: { type: String },
    fromUsername: { type: String },
    fromName: { type: String },
    toUserId: { type: String },
    toUsername: { type: String },
    toName: { type: String },
    status: { type: String, enum: ['pending', 'accepted', 'rejected', 'expired'], default: 'pending' },
    createdAt: { type: Date }
  },
  rematchRequest: {
    from: { type: String },
    fromName: { type: String },
    to: { type: String },
    toName: { type: String },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    createdAt: { type: Date }
  },
  startedAt: { type: Date },
  completedAt: { type: Date },
  createdBy: { type: String, required: true },
  version: { type: String, default: 'v2.0' }
}, {
  timestamps: true
});

export default mongoose.model<IBattle>('Battle', BattleSchema);
