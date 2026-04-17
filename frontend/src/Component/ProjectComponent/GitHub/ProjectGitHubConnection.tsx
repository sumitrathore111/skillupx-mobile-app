import {
    AlertCircle,
    Check,
    ExternalLink,
    Folder,
    Github,
    GitPullRequest,
    Link2,
    Loader2,
    Lock,
    Search,
    Settings,
    Star,
    Unlink,
    X
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    connectProjectToGitHub,
    disconnectProjectFromGitHub,
    getGitHubStatus,
    getProjectGitHubStatus,
    getUserRepositories,
    startGitHubAuth
} from '../../../service/githubService';

interface Repository {
  id: number;
  name: string;
  fullName: string;
  description: string;
  private: boolean;
  url: string;
  defaultBranch: string;
  language: string;
  starCount: number;
  forkCount: number;
  updatedAt: string;
}

interface ProjectGitHubStatus {
  connected: boolean;
  repository?: {
    fullName: string;
    url: string;
    private: boolean;
  };
  repoFullName?: string;
  repoUrl?: string;
  webhookActive?: boolean;
  connectedAt?: string;
  lastSyncAt?: string;
  syncSettings?: {
    syncIssues: boolean;
    syncPullRequests: boolean;
    syncCommits: boolean;
    autoCreateTasks: boolean;
    autoUpdateStatus: boolean;
  };
}

interface ProjectGitHubConnectionProps {
  projectId: string;
  projectName?: string;
  onConnectionChange?: (connected: boolean) => void;
}

export default function ProjectGitHubConnection({
  projectId,
  projectName = 'Project'
}: ProjectGitHubConnectionProps) {
  const [githubConnected, setGitHubConnected] = useState(false);
  const [projectStatus, setProjectStatus] = useState<ProjectGitHubStatus | null>(null);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showRepoSelector, setShowRepoSelector] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [syncSettings, setSyncSettings] = useState({
    syncIssues: true,
    syncPullRequests: true,
    syncCommits: true,
    autoPR: false,
    autoIssue: false
  });

  const initialLoadDone = useRef(false);

  // Check statuses
  const checkStatuses = useCallback(async () => {
    setLoading(true);
    try {
      // Check if user has GitHub connected
      const githubStatus = await getGitHubStatus();
      setGitHubConnected(githubStatus.connected);

      // Check if project has a GitHub repo connected
      const projStatus = await getProjectGitHubStatus(projectId);
      setProjectStatus(projStatus);
    } catch (error) {
      console.error('Error checking statuses:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      checkStatuses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load repositories
  const loadRepositories = async () => {
    setLoadingRepos(true);
    try {
      const data = await getUserRepositories(1, 100);
      setRepositories(data.repos);
    } catch (error) {
      console.error('Error loading repositories:', error);
      setError('Failed to load repositories');
    } finally {
      setLoadingRepos(false);
    }
  };

  // Handle GitHub OAuth
  const handleConnectGitHub = async () => {
    try {
      const authUrl = await startGitHubAuth();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error starting GitHub auth:', error);
      setError('Failed to start GitHub authentication');
    }
  };

  // Handle connecting repo to project
  const handleConnectRepo = async (repo: Repository) => {
    setConnecting(true);
    setError(null);
    try {
      const [owner, name] = repo.fullName.split('/');
      await connectProjectToGitHub(projectId, owner, name, syncSettings);
      setSuccess(`Connected ${repo.fullName} to ${projectName}`);
      setShowRepoSelector(false);
      setSelectedRepo(null);
      await checkStatuses();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to connect repository';
      setError(message);
    } finally {
      setConnecting(false);
    }
  };

  // Handle disconnecting repo from project
  const handleDisconnectRepo = async () => {
    if (!confirm('Are you sure you want to disconnect this repository?')) {
      return;
    }

    setDisconnecting(true);
    setError(null);
    try {
      await disconnectProjectFromGitHub(projectId);
      setSuccess('Repository disconnected');
      setProjectStatus({ connected: false });
    } catch (error) {
      console.error('Error disconnecting repo:', error);
      setError('Failed to disconnect repository');
    } finally {
      setDisconnecting(false);
    }
  };

  // Filter repositories
  const filteredRepos = repositories.filter(repo =>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repo.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Clear messages
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 text-teal-500 animate-spin" />
          <span className="ml-2 text-gray-500">Loading GitHub integration...</span>
        </div>
      </div>
    );
  }

  // User hasn't connected GitHub
  if (!githubConnected) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="text-center py-4">
          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
            <Github className="w-6 h-6 text-gray-400" />
          </div>
          <h4 className="font-medium text-gray-900 dark:text-white mb-2">
            Connect GitHub First
          </h4>
          <p className="text-sm text-gray-500 mb-4">
            You need to connect your GitHub account before linking a repository.
          </p>
          <button
            onClick={handleConnectGitHub}
            className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center gap-2 mx-auto"
          >
            <Github className="w-4 h-4" />
            Connect GitHub
          </button>
        </div>
      </div>
    );
  }

  // Project has a connected repo
  if (projectStatus?.connected) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-900 dark:bg-white rounded-lg flex items-center justify-center">
              <Github className="w-5 h-5 text-white dark:text-gray-900" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">GitHub Repository</h3>
              <a
                href={projectStatus.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-teal-600 hover:underline flex items-center gap-1"
              >
                {projectStatus.repoFullName}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4 text-gray-500" />
            </button>
            <button
              onClick={handleDisconnectRepo}
              disabled={disconnecting}
              className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-red-500"
              title="Disconnect"
            >
              {disconnecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Unlink className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span className="text-sm text-red-700 dark:text-red-400">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="w-4 h-4 text-red-500" />
            </button>
          </div>
        )}

        {success && (
          <div className="mx-4 mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span className="text-sm text-green-700 dark:text-green-400">{success}</span>
            <button onClick={() => setSuccess(null)} className="ml-auto">
              <X className="w-4 h-4 text-green-500" />
            </button>
          </div>
        )}

        {/* Sync Settings */}
        {showSettings && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Sync Settings</h4>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={projectStatus.syncSettings?.syncIssues}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  readOnly
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Sync GitHub issues to tasks
                </span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={projectStatus.syncSettings?.syncPullRequests}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  readOnly
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Track pull requests
                </span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={projectStatus.syncSettings?.syncCommits}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  readOnly
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Show commits in activity feed
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Connected Info */}
        <div className="p-4">
          <div className="flex items-center justify-between text-sm text-gray-500">
            {projectStatus.connectedAt && (
              <span>Connected {new Date(projectStatus.connectedAt).toLocaleDateString()}</span>
            )}
            {projectStatus.lastSyncAt && (
              <span>Last sync: {new Date(projectStatus.lastSyncAt).toLocaleString()}</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // No repo connected - show selector
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
            <Link2 className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Connect Repository</h3>
            <p className="text-sm text-gray-500">Link a GitHub repository to this project</p>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700 dark:text-red-400">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4 text-red-500" />
          </button>
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {!showRepoSelector ? (
          <button
            onClick={() => {
              setShowRepoSelector(true);
              loadRepositories();
            }}
            className="w-full py-3 px-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-teal-500 dark:hover:border-teal-500 transition-colors flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400 hover:text-teal-600"
          >
            <Github className="w-5 h-5" />
            Select a Repository
          </button>
        ) : (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search repositories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            {/* Sync Settings */}
            <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sync Options</h4>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={syncSettings.syncIssues}
                    onChange={(e) => setSyncSettings({...syncSettings, syncIssues: e.target.checked})}
                    className="w-4 h-4 rounded border-gray-300 text-teal-600"
                  />
                  <span className="text-xs text-gray-600 dark:text-gray-400">Sync Issues</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={syncSettings.syncPullRequests}
                    onChange={(e) => setSyncSettings({...syncSettings, syncPullRequests: e.target.checked})}
                    className="w-4 h-4 rounded border-gray-300 text-teal-600"
                  />
                  <span className="text-xs text-gray-600 dark:text-gray-400">Track PRs</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={syncSettings.syncCommits}
                    onChange={(e) => setSyncSettings({...syncSettings, syncCommits: e.target.checked})}
                    className="w-4 h-4 rounded border-gray-300 text-teal-600"
                  />
                  <span className="text-xs text-gray-600 dark:text-gray-400">Show Commits</span>
                </label>
              </div>
            </div>

            {/* Repository List */}
            <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              {loadingRepos ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 text-teal-500 animate-spin" />
                  <span className="ml-2 text-gray-500">Loading repositories...</span>
                </div>
              ) : filteredRepos.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No repositories found
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredRepos.map((repo) => (
                    <button
                      key={repo.id?.toString() || repo.fullName}
                      onClick={() => setSelectedRepo(repo)}
                      className={`w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                        selectedRepo?.id === repo.id ? 'bg-teal-50 dark:bg-teal-900/20' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Folder className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 dark:text-white truncate">
                              {repo.name}
                            </span>
                            {repo.private && <Lock className="w-3 h-3 text-gray-400" />}
                            {selectedRepo?.id === repo.id && (
                              <Check className="w-4 h-4 text-teal-500" />
                            )}
                          </div>
                          {repo.description && (
                            <p className="text-sm text-gray-500 truncate">{repo.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                            {repo.language && <span>{repo.language}</span>}
                            <span className="flex items-center gap-1">
                              <Star className="w-3 h-3" /> {repo.starCount}
                            </span>
                            <span className="flex items-center gap-1">
                              <GitPullRequest className="w-3 h-3" /> {repo.forkCount}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowRepoSelector(false);
                  setSelectedRepo(null);
                  setSearchQuery('');
                }}
                className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => selectedRepo && handleConnectRepo(selectedRepo)}
                disabled={!selectedRepo || connecting}
                className="flex-1 py-2 px-4 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {connecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4" />
                    Connect Repository
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
