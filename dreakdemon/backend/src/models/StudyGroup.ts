import mongoose, { Document, Schema } from 'mongoose';

export interface IStudyGroup extends Document {
  name: string;
  description: string;
  category: string;
  topic: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  tags: string[];
  createdBy: string;
  creatorName: string;
  creatorAvatar: string;
  members: Array<{
    userId: string;
    userName: string;
    userAvatar: string;
    role: 'admin' | 'member';
    joinedAt: Date;
  }>;
  joinRequests: Array<{
    userId: string;
    userName: string;
    userAvatar: string;
    requestedAt: Date;
    status: 'pending' | 'approved' | 'rejected';
  }>;
  maxMembers: number;
  isPrivate: boolean;
  avatar?: string;
  resources: Array<{
    title: string;
    url: string;
    type: string;
    uploadedBy: string;
    uploadedAt: Date;
  }>;
  schedule: Array<{
    title: string;
    description: string;
    date: Date;
    duration: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const StudyGroupSchema: Schema = new Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, default: 'General' },
  topic: { type: String, required: true },
  level: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Beginner' },
  tags: [{ type: String }],
  createdBy: { type: String, required: true },
  creatorName: { type: String },
  creatorAvatar: { type: String },
  members: [{
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    userAvatar: { type: String },
    role: { type: String, enum: ['admin', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now }
  }],
  joinRequests: [{
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    userAvatar: { type: String },
    requestedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }
  }],
  maxMembers: { type: Number, default: 50 },
  isPrivate: { type: Boolean, default: false },
  avatar: { type: String },
  resources: [{
    title: { type: String },
    url: { type: String },
    type: { type: String },
    uploadedBy: { type: String },
    uploadedAt: { type: Date, default: Date.now }
  }],
  schedule: [{
    title: { type: String },
    description: { type: String },
    date: { type: Date },
    duration: { type: Number }
  }]
}, {
  timestamps: true
});

export default mongoose.model<IStudyGroup>('StudyGroup', StudyGroupSchema);
