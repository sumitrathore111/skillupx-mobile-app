import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  username: string;
  phone: string;
  // Google OAuth fields
  googleId?: string;
  authProvider: 'email' | 'google';
  // OTP fields
  otp?: string;
  otpExpiry?: Date;
  isEmailVerified: boolean;
  // Password reset fields
  resetOtp?: string;
  resetOtpExpiry?: Date;
  location: string;
  institute: string;
  bio: string;
  portfolio: string;
  resume_objective: string;
  skills: string[];
  languages: string[];
  achievements: string[];
  target_company: string[];
  education: Array<{
    degree: string;
    school: string;
    year: string;
  }>;
  experience: Array<{
    title: string;
    company: string;
    year: string;
    desc: string;
  }>;
  links: Array<{
    platform: string;
    url: string;
  }>;
  projects: Array<{
    project_id: string;
    role: string;
    project_status: 'Complete' | 'Running' | 'Not Started';
  }>;
  yearOfStudy: number;
  profileCompletion: number;
  isProfileComplete: boolean;
  role: 'student' | 'admin';
  marathon_score: number;
  marathon_rank: number;
  streakCount: number;
  challenges_solved: number;
  last_active_date: Date;
  githubUsername: string;
  avatar: string;
  battleRating: number;
  battlesWon: number;
  battlesLost: number;
  badges: Array<{
    id: string;
    name: string;
    icon: string;
    description: string;
    earnedAt: Date;
    category: 'achievement' | 'reward' | 'status';
  }>;
  rating: number;
  certificates: number;
  teamsJoined: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: function(this: any) { return this.authProvider === 'email'; } },
  name: { type: String, required: true },
  username: { type: String, unique: true, sparse: true, trim: true, lowercase: true,
    match: [/^[a-zA-Z0-9_]{3,30}$/, 'Username must be 3-30 characters: letters, numbers, underscores only'] },
  phone: { type: String, default: '9999999999' },
  // Google OAuth fields
  googleId: { type: String, sparse: true },
  authProvider: { type: String, enum: ['email', 'google'], default: 'email' },
  // OTP fields
  otp: { type: String },
  otpExpiry: { type: Date },
  isEmailVerified: { type: Boolean, default: false },
  // Password reset fields
  resetOtp: { type: String },
  resetOtpExpiry: { type: Date },
  location: { type: String, default: 'Location' },
  institute: { type: String, default: 'University Name' },
  bio: { type: String, default: 'About yourself' },
  portfolio: { type: String, default: '' },
  resume_objective: { type: String, default: '' },
  skills: [{ type: String }],
  languages: [{ type: String }],
  achievements: [{ type: String }],
  target_company: [{ type: String }],
  education: [{
    degree: { type: String },
    school: { type: String },
    year: { type: String }
  }],
  experience: [{
    title: { type: String },
    company: { type: String },
    year: { type: String },
    desc: { type: String }
  }],
  links: [{
    platform: { type: String },
    url: { type: String }
  }],
  projects: [{
    project_id: { type: String },
    role: { type: String },
    project_status: { type: String, enum: ['Complete', 'Running', 'Not Started'] }
  }],
  yearOfStudy: { type: Number, default: 0 },
  profileCompletion: { type: Number, default: 0 },
  isProfileComplete: { type: Boolean, default: false },
  role: { type: String, enum: ['student', 'admin'], default: 'student' },
  marathon_score: { type: Number, default: 0 },
  marathon_rank: { type: Number, default: 0 },
  streakCount: { type: Number, default: 0 },
  challenges_solved: { type: Number, default: 0 },
  last_active_date: { type: Date },
  githubUsername: { type: String, default: '' },
  avatar: { type: String, default: '' },
  battleRating: { type: Number, default: 1000 },
  battlesWon: { type: Number, default: 0 },
  battlesLost: { type: Number, default: 0 },
  badges: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    icon: { type: String, required: true },
    description: { type: String, required: true },
    earnedAt: { type: Date, default: Date.now },
    category: { type: String, enum: ['achievement', 'reward', 'status'], default: 'achievement' }
  }],
  rating: { type: Number, default: 0 },
  certificates: { type: Number, default: 0 },
  teamsJoined: { type: Number, default: 0 }
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

// Helper: generate a unique username from a name
export async function generateUniqueUsername(name: string): Promise<string> {
  const User = mongoose.model<IUser>('User');
  // Create base: lowercase, replace spaces/special chars with underscore, trim
  let base = (name || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 20);
  if (base.length < 3) base = base + '_user';

  // Check if base is available
  let username = base;
  let exists = await User.findOne({ username });
  if (!exists) return username;

  // Append random numbers until unique
  for (let i = 0; i < 50; i++) {
    const suffix = Math.floor(Math.random() * 9000) + 1000;
    username = `${base}_${suffix}`;
    exists = await User.findOne({ username });
    if (!exists) return username;
  }
  // Fallback: use timestamp
  return `${base}_${Date.now()}`;
}

export default mongoose.model<IUser>('User', UserSchema);
