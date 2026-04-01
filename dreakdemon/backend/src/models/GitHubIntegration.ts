import mongoose, { Document, Schema } from 'mongoose';

// GitHub Integration for storing user's GitHub connection
export interface IGitHubIntegration extends Document {
  userId: mongoose.Types.ObjectId;
  githubId: string;
  githubUsername: string;
  accessToken: string; // Encrypted
  refreshToken?: string;
  avatarUrl?: string;
  email?: string;
  connectedAt: Date;
  lastSyncAt?: Date;
  scopes: string[];
}

const GitHubIntegrationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  githubId: { type: String, required: true },
  githubUsername: { type: String, required: true },
  accessToken: { type: String, required: true },
  refreshToken: { type: String },
  avatarUrl: { type: String },
  email: { type: String },
  connectedAt: { type: Date, default: Date.now },
  lastSyncAt: { type: Date },
  scopes: [{ type: String }]
}, {
  timestamps: true
});

// Index for quick lookups
GitHubIntegrationSchema.index({ githubId: 1 });
GitHubIntegrationSchema.index({ githubUsername: 1 });

export default mongoose.model<IGitHubIntegration>('GitHubIntegration', GitHubIntegrationSchema);


// Project GitHub Connection - Links a project to a GitHub repo
export interface IProjectGitHubConnection extends Document {
  projectId: mongoose.Types.ObjectId;
  repoOwner: string;
  repoName: string;
  repoFullName: string; // owner/repo
  repoUrl: string;
  webhookId?: number;
  webhookSecret: string;
  connectedBy: mongoose.Types.ObjectId;
  connectedAt: Date;
  syncSettings: {
    syncIssues: boolean;
    syncPullRequests: boolean;
    syncCommits: boolean;
    autoPR: boolean; // Create PR links in tasks
    autoIssue: boolean; // Create issues from tasks
  };
  lastSyncAt?: Date;
}

const ProjectGitHubConnectionSchema = new Schema({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, unique: true },
  repoOwner: { type: String, required: true },
  repoName: { type: String, required: true },
  repoFullName: { type: String, required: true },
  repoUrl: { type: String, required: true },
  webhookId: { type: Number },
  webhookSecret: { type: String, required: true },
  connectedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  connectedAt: { type: Date, default: Date.now },
  syncSettings: {
    syncIssues: { type: Boolean, default: true },
    syncPullRequests: { type: Boolean, default: true },
    syncCommits: { type: Boolean, default: true },
    autoPR: { type: Boolean, default: false },
    autoIssue: { type: Boolean, default: false }
  },
  lastSyncAt: { type: Date }
}, {
  timestamps: true
});

ProjectGitHubConnectionSchema.index({ repoFullName: 1 });

export const ProjectGitHubConnection = mongoose.model<IProjectGitHubConnection>(
  'ProjectGitHubConnection',
  ProjectGitHubConnectionSchema
);


// GitHub Activity Log - Stores webhook events
export interface IGitHubActivity extends Document {
  projectId: mongoose.Types.ObjectId;
  taskId?: mongoose.Types.ObjectId;
  eventType: 'push' | 'pull_request' | 'issue' | 'issue_comment' | 'pull_request_review' | 'create' | 'delete';
  action?: string; // opened, closed, merged, etc.
  githubEventId: string;
  sender: {
    login: string;
    avatarUrl?: string;
    id: number;
  };
  payload: {
    // For push events
    commits?: Array<{
      sha: string;
      message: string;
      author: string;
      url: string;
      timestamp: string;
    }>;
    // For PR events
    pullRequest?: {
      number: number;
      title: string;
      state: string;
      url: string;
      merged: boolean;
      branch: string;
    };
    // For issue events
    issue?: {
      number: number;
      title: string;
      state: string;
      url: string;
      body?: string;
    };
    // For branch events
    ref?: string;
    refType?: 'branch' | 'tag';
  };
  createdAt: Date;
}

const GitHubActivitySchema = new Schema({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  taskId: { type: Schema.Types.ObjectId, ref: 'BoardTask' },
  eventType: {
    type: String,
    enum: ['push', 'pull_request', 'issue', 'issue_comment', 'pull_request_review', 'create', 'delete'],
    required: true
  },
  action: { type: String },
  githubEventId: { type: String, required: true },
  sender: {
    login: { type: String, required: true },
    avatarUrl: { type: String },
    id: { type: Number, required: true }
  },
  payload: { type: Schema.Types.Mixed }
}, {
  timestamps: true
});

GitHubActivitySchema.index({ projectId: 1, createdAt: -1 });
GitHubActivitySchema.index({ taskId: 1 });
GitHubActivitySchema.index({ githubEventId: 1 }, { unique: true });

export const GitHubActivity = mongoose.model<IGitHubActivity>('GitHubActivity', GitHubActivitySchema);
