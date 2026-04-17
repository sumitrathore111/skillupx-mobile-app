import {
    AlertCircle,
    Check,
    ExternalLink,
    Github,
    Link2,
    Loader2,
    RefreshCw,
    Unlink,
    X
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    disconnectGitHub,
    getGitHubStatus,
    startGitHubAuth
} from '../../../service/githubService';

interface GitHubConnectionStatus {
  connected: boolean;
  githubUsername?: string;
  avatarUrl?: string;
  connectedAt?: string;
  scopes?: string[];
}

interface GitHubSettingsProps {
  onConnectionChange?: (connected: boolean) => void;
  compact?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function GitHubSettings({ onConnectionChange: _onConnectionChange, compact: _compact }: GitHubSettingsProps) {
  const [status, setStatus] = useState<GitHubConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const initialLoadDone = useRef(false);

  // Check URL params for OAuth callback result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const githubResult = params.get('github');

    if (githubResult === 'success') {
      setSuccess('GitHub account connected successfully!');
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (githubResult === 'error') {
      const message = params.get('message') || 'Failed to connect GitHub account';
      setError(message);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Fetch GitHub connection status
  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getGitHubStatus();
      setStatus(data);
    } catch (err) {
      console.error('Error fetching GitHub status:', err);
      setError('Failed to check GitHub connection status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      fetchStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start GitHub OAuth flow
  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      const authUrl = await startGitHubAuth();
      // Redirect to GitHub OAuth page
      window.location.href = authUrl;
    } catch (err) {
      console.error('Error starting GitHub auth:', err);
      setError('Failed to start GitHub authentication');
      setConnecting(false);
    }
  };

  // Disconnect GitHub account
  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your GitHub account?')) {
      return;
    }

    setDisconnecting(true);
    setError(null);
    try {
      await disconnectGitHub();
      setStatus({ connected: false });
      setSuccess('GitHub account disconnected');
    } catch (err) {
      console.error('Error disconnecting GitHub:', err);
      setError('Failed to disconnect GitHub account');
    } finally {
      setDisconnecting(false);
    }
  };

  // Clear messages after 5 seconds
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
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
          <span className="ml-2 text-gray-500">Checking GitHub connection...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-900 dark:bg-white rounded-lg flex items-center justify-center">
            <Github className="w-6 h-6 text-white dark:text-gray-900" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">GitHub Integration</h3>
            <p className="text-sm text-gray-500">Connect your GitHub account for seamless integration</p>
          </div>
        </div>
        <button
          onClick={fetchStatus}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="Refresh status"
        >
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
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

      {/* Content */}
      <div className="p-4">
        {status?.connected ? (
          // Connected State
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              {status.avatarUrl && (
                <img
                  src={status.avatarUrl}
                  alt={status.githubUsername}
                  className="w-12 h-12 rounded-full border-2 border-green-500"
                />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    @{status.githubUsername}
                  </span>
                  <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full">
                    Connected
                  </span>
                </div>
                {status.connectedAt && (
                  <p className="text-sm text-gray-500 mt-1">
                    Connected {new Date(status.connectedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              <a
                href={`https://github.com/${status.githubUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4 text-gray-500" />
              </a>
            </div>

            {/* Scopes */}
            {status.scopes && status.scopes.length > 0 && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Permissions:</p>
                <div className="flex flex-wrap gap-2">
                  {status.scopes.map((scope, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded"
                    >
                      {scope}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Features */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                What you can do:
              </p>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Connect repositories to projects
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  View commits, PRs, and issues
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Auto-sync GitHub issues with tasks
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Receive real-time GitHub events
                </li>
              </ul>
            </div>

            {/* Disconnect Button */}
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="w-full mt-4 py-2 px-4 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {disconnecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Unlink className="w-4 h-4" />
              )}
              {disconnecting ? 'Disconnecting...' : 'Disconnect GitHub'}
            </button>
          </div>
        ) : (
          // Not Connected State
          <div className="space-y-4">
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Github className="w-8 h-8 text-gray-400" />
              </div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                Connect Your GitHub Account
              </h4>
              <p className="text-sm text-gray-500 max-w-sm mx-auto">
                Link your GitHub account to sync repositories, track commits, and automate task management with GitHub issues and pull requests.
              </p>
            </div>

            {/* Features List */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Features you'll unlock:
              </p>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-teal-500" />
                  Connect GitHub repos to your projects
                </li>
                <li className="flex items-center gap-2">
                  <Github className="w-4 h-4 text-teal-500" />
                  View commits, branches, and PRs in-app
                </li>
                <li className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-teal-500" />
                  Auto-create tasks from GitHub issues
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-teal-500" />
                  Auto-complete tasks when PRs merge
                </li>
              </ul>
            </div>

            {/* Connect Button */}
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full py-3 px-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {connecting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Github className="w-5 h-5" />
              )}
              {connecting ? 'Connecting...' : 'Connect with GitHub'}
            </button>

            <p className="text-xs text-center text-gray-400">
              We'll ask for permission to access your repositories and create webhooks.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
