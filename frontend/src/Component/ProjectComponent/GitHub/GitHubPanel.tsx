import {
    Activity,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    ExternalLink,
    GitBranch,
    GitCommit,
    GitMerge,
    GitPullRequest,
    Loader2,
    RefreshCw,
    Settings,
    Users
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    getProjectGitHubStatus,
    getRepositoryBranches,
    getRepositoryCommits,
    getRepositoryPullRequests
} from '../../../service/githubService';
import GitHubActivityFeed from './GitHubActivityFeed';
import GitHubCollaborators from './GitHubCollaborators';
import GitHubSettings from './GitHubSettings';
import ProjectGitHubConnection from './ProjectGitHubConnection';

interface GitHubPanelProps {
  projectId: string;
  isOwner: boolean;
}

interface GitHubConnectionStatus {
  connected: boolean;
  repoFullName?: string;
  repoUrl?: string;
  webhookActive?: boolean;
  syncSettings?: {
    syncIssues: boolean;
    syncPullRequests: boolean;
    syncCommits: boolean;
    autoCreateTasks: boolean;
    autoUpdateStatus: boolean;
  };
}

interface Commit {
  sha: string;
  message: string;
  author: {
    name: string;
    email: string;
    date: string;
    login?: string;
    avatarUrl?: string;
  };
  url: string;
}

interface PullRequest {
  number: number;
  title: string;
  state: string;
  merged: boolean;
  url: string;
  user: {
    login: string;
    avatarUrl: string;
  };
  branch: string;
  baseBranch: string;
  createdAt: string;
  updatedAt: string;
  mergedAt?: string;
}

interface Branch {
  name: string;
  protected: boolean;
}

export default function GitHubPanel({ projectId, isOwner }: GitHubPanelProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'collaborators' | 'settings'>('overview');
  const [connectionStatus, setConnectionStatus] = useState<GitHubConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Repository data
  const [commits, setCommits] = useState<Commit[]>([]);
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Collapsible sections
  const [showCommits, setShowCommits] = useState(true);
  const [showPRs, setShowPRs] = useState(true);
  const [showBranches, setShowBranches] = useState(false);

  // Track if initial load is done
  const initialLoadDone = useRef(false);

  const loadConnectionStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const status = await getProjectGitHubStatus(projectId);
      setConnectionStatus(status);
    } catch (err) {
      console.error('Error loading GitHub status:', err);
      setError('Failed to load GitHub connection status');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const loadRepositoryData = useCallback(async (repoFullName: string) => {
    const [owner, repo] = repoFullName.split('/');
    if (!owner || !repo) return;

    setLoadingData(true);
    try {
      const [commitsData, prsData, branchesData] = await Promise.all([
        getRepositoryCommits(owner, repo, { perPage: 10 }),
        getRepositoryPullRequests(owner, repo),
        getRepositoryBranches(owner, repo)
      ]);

      setCommits(commitsData.commits || []);
      setPullRequests(prsData.pullRequests || []);
      setBranches(branchesData.branches || []);
    } catch (err) {
      console.error('Error loading repository data:', err);
    } finally {
      setLoadingData(false);
    }
  }, []);

  // Load connection status on mount only
  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      loadConnectionStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load repository data when connection status is available and connected
  useEffect(() => {
    if (connectionStatus?.connected && connectionStatus?.repoFullName) {
      loadRepositoryData(connectionStatus.repoFullName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionStatus?.connected, connectionStatus?.repoFullName]);

  // Manual refresh function
  const handleRefresh = useCallback(() => {
    loadConnectionStatus();
  }, [loadConnectionStatus]);

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
        <span className="ml-2 text-gray-500">Loading GitHub integration...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <p className="text-red-500 font-medium">{error}</p>
        <button
          onClick={loadConnectionStatus}
          className="mt-3 text-teal-600 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  // Not connected - show connection setup (owner only) or info message for members
  if (!connectionStatus?.connected) {
    if (!isOwner) {
      return (
        <div className="space-y-6">
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
            <GitBranch className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              GitHub Not Connected
            </h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Only the project owner can connect a GitHub repository to this project. Please contact the project owner to set up GitHub integration.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
          <GitBranch className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Connect GitHub Repository
          </h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Link your GitHub repository to automatically sync issues, pull requests, and commits with your project tasks.
          </p>
        </div>

        {/* GitHub Settings for user connection */}
        <GitHubSettings compact />

        {/* Project GitHub Connection */}
        <ProjectGitHubConnection
          projectId={projectId}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
              <GitBranch className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{connectionStatus.repoFullName}</h3>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-300">
                <span className={`flex items-center gap-1 ${
                  connectionStatus.webhookActive ? 'text-green-400' : 'text-yellow-400'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    connectionStatus.webhookActive ? 'bg-green-400' : 'bg-yellow-400'
                  }`} />
                  {connectionStatus.webhookActive ? 'Webhook Active' : 'Webhook Inactive'}
                </span>
              </div>
            </div>
          </div>
          <a
            href={connectionStatus.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ExternalLink className="w-5 h-5" />
          </a>
        </div>

        {/* Sync Settings */}
        {connectionStatus.syncSettings && (
          <div className="flex flex-wrap gap-2 mt-4">
            {connectionStatus.syncSettings.syncIssues && (
              <span className="px-2 py-1 bg-white/10 rounded text-xs">Issues</span>
            )}
            {connectionStatus.syncSettings.syncPullRequests && (
              <span className="px-2 py-1 bg-white/10 rounded text-xs">Pull Requests</span>
            )}
            {connectionStatus.syncSettings.syncCommits && (
              <span className="px-2 py-1 bg-white/10 rounded text-xs">Commits</span>
            )}
            {connectionStatus.syncSettings.autoCreateTasks && (
              <span className="px-2 py-1 bg-teal-500/20 text-teal-300 rounded text-xs">Auto-Create Tasks</span>
            )}
            {connectionStatus.syncSettings.autoUpdateStatus && (
              <span className="px-2 py-1 bg-teal-500/20 text-teal-300 rounded text-xs">Auto-Update Status</span>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'overview'
              ? 'border-teal-500 text-teal-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <GitCommit className="w-4 h-4" />
          Overview
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`px-4 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'activity'
              ? 'border-teal-500 text-teal-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Activity className="w-4 h-4" />
          Activity
        </button>
        <button
          onClick={() => setActiveTab('collaborators')}
          className={`px-4 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'collaborators'
              ? 'border-teal-500 text-teal-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <Users className="w-4 h-4" />
          Collaborators
        </button>
        {isOwner && (
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'settings'
                ? 'border-teal-500 text-teal-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Refresh Button */}
          <div className="flex justify-end">
            <button
              onClick={handleRefresh}
              disabled={loading || loadingData}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${(loading || loadingData) ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {loadingData && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-teal-500 animate-spin" />
              <span className="ml-2 text-gray-500">Loading repository data...</span>
            </div>
          )}

          {/* Recent Commits */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => setShowCommits(!showCommits)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <GitCommit className="w-5 h-5 text-blue-500" />
                <span className="font-medium text-gray-900 dark:text-white">Recent Commits</span>
                <span className="text-sm text-gray-500">({commits.length})</span>
              </div>
              {showCommits ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showCommits && (
              <div className="border-t border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                {commits.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">No commits found</div>
                ) : (
                  commits.map((commit, index) => (
                    <div key={commit.sha?.toString() || `commit-${index}`} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <div className="flex items-start gap-3">
                        {commit.author?.avatarUrl && (
                          <img
                            src={commit.author.avatarUrl}
                            alt={commit.author.login}
                            className="w-8 h-8 rounded-full"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-900 dark:text-white font-medium truncate">
                            {commit.message.split('\n')[0]}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                            <code className="text-xs font-mono">{commit.sha.slice(0, 7)}</code>
                            <span>•</span>
                            <span>{commit.author?.login || commit.author.name}</span>
                            <span>•</span>
                            <span>{formatRelativeTime(commit.author.date)}</span>
                          </div>
                        </div>
                        <a
                          href={commit.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
                        >
                          <ExternalLink className="w-4 h-4 text-gray-400" />
                        </a>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Pull Requests */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => setShowPRs(!showPRs)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <GitPullRequest className="w-5 h-5 text-green-500" />
                <span className="font-medium text-gray-900 dark:text-white">Pull Requests</span>
                <span className="text-sm text-gray-500">({pullRequests.length})</span>
              </div>
              {showPRs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showPRs && (
              <div className="border-t border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                {pullRequests.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">No open pull requests</div>
                ) : (
                  pullRequests.map((pr) => (
                    <div key={`pr-${pr.number}`} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <div className="flex items-start gap-3">
                        {pr.merged ? (
                          <GitMerge className="w-5 h-5 text-purple-500 mt-0.5" />
                        ) : pr.state === 'open' ? (
                          <GitPullRequest className="w-5 h-5 text-green-500 mt-0.5" />
                        ) : (
                          <GitPullRequest className="w-5 h-5 text-red-500 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-900 dark:text-white font-medium">
                            #{pr.number} {pr.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                            <img
                              src={pr.user.avatarUrl}
                              alt={pr.user.login}
                              className="w-4 h-4 rounded-full"
                            />
                            <span>{pr.user.login}</span>
                            <span>•</span>
                            <span>{formatRelativeTime(pr.updatedAt)}</span>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          pr.merged
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                            : pr.state === 'open'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                        }`}>
                          {pr.merged ? 'Merged' : pr.state}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Branches */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => setShowBranches(!showBranches)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-teal-500" />
                <span className="font-medium text-gray-900 dark:text-white">Branches</span>
                <span className="text-sm text-gray-500">({branches.length})</span>
              </div>
              {showBranches ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showBranches && (
              <div className="border-t border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                {branches.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">No branches found</div>
                ) : (
                  branches.map((branch) => (
                    <div key={`branch-${branch.name}`} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GitBranch className="w-4 h-4 text-gray-400" />
                          <span className="font-mono text-sm text-gray-900 dark:text-white">
                            {branch.name}
                          </span>
                          {branch.protected && (
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 rounded text-xs">
                              Protected
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <GitHubActivityFeed projectId={projectId} repoFullName={connectionStatus?.repoFullName} limit={50} />
      )}

      {activeTab === 'collaborators' && (
        <GitHubCollaborators
          projectId={projectId}
          isOwner={isOwner}
          repoFullName={connectionStatus?.repoFullName}
        />
      )}

      {activeTab === 'settings' && isOwner && (
        <div className="space-y-6">
          <GitHubSettings />
          <ProjectGitHubConnection
            projectId={projectId}
            onConnectionChange={loadConnectionStatus}
          />
        </div>
      )}
    </div>
  );
}
