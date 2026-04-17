import mongoose, { Schema, Document } from 'mongoose';

export interface ITestCase {
  input: string;
  expectedOutput: string;
  isHidden?: boolean;
}

export interface IExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface IChallenge extends Document {
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string;
  points: number;
  testCases: ITestCase[];
  starterCode?: Map<string, string>;
  constraints?: string[];
  examples?: IExample[];
  hints?: string[];
  tags?: string[];
  problemStatement?: string;
  coinReward?: number;
  createdAt: Date;
  updatedAt: Date;
}

const TestCaseSchema = new Schema({
  input: { type: String, required: true },
  expectedOutput: { type: String, required: true },
  isHidden: { type: Boolean, default: false }
});

const ExampleSchema = new Schema({
  input: { type: String, required: true },
  output: { type: String, required: true },
  explanation: { type: String }
});

const ChallengeSchema: Schema = new Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  difficulty: { 
    type: String, 
    enum: ['Easy', 'Medium', 'Hard'],
    required: true
  },
  category: { type: String, required: true },
  points: { type: Number, default: 10 },
  testCases: [TestCaseSchema],
  starterCode: { type: Map, of: String },
  constraints: [{ type: String }],
  examples: [ExampleSchema],
  hints: [{ type: String }],
  tags: [{ type: String }],
  problemStatement: { type: String },
  coinReward: { type: Number, default: 10 }
}, {
  timestamps: true
});

// Indexes
ChallengeSchema.index({ difficulty: 1 });
ChallengeSchema.index({ category: 1 });
ChallengeSchema.index({ tags: 1 });

export default mongoose.model<IChallenge>('Challenge', ChallengeSchema);
