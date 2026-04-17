import {
    AlertCircle,
    ExternalLink,
    GitBranch,
    GitCommit,
    GitMerge,
    GitPullRequest,
    Loader2,
    MessageCircle,
    RefreshCw,
    Tag,
    Trash2
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getProjectGitHubActivity, getRepositoryCommits } from '../../../service/githubService';

interface GitHubCommit {
  sha: string;
  message: string;
  url?: string;
}

interface GitHubPayload {
  commits?: GitHubCommit[];
  ref?: string;
  refType?: string;
  pullRequest?: {
    number: number;
    title: string;
    url: string;
  };
  issue?: {
    number: number;
    title: string;
    url: string;
  };
}

interface GitHubActivityItem {
  _id: string;
  projectId: string;
  taskId?: string;
  eventType: string;
  action?: string;
  sender: {
    login: string;
    avatarUrl?: string;
    id: number;
  };
  payload: GitHubPayload;
  createdAt: string;
}

interface GitHubActivityFeedProps {
  projectId: string;
  repoFullName?: string;
  limit?: number;
  compact?: boolean;
}

interface ApiCommit {
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

export default function GitHubActivityFeed({
  projectId,
  repoFullName,
  limit = 20,
  compact = false
}: GitHubActivityFeedProps) {
  const [activities, setActivities] = useState<GitHubActivityItem[]>([]);
  const [apiCommits, setApiCommits] = useState<ApiCommit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initialLoadDone = useRef(false);

  const loadActivities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Load webhook activities
      const data = await getProjectGitHubActivity(projectId, limit, 0);
      setActivities(data.activities);

      // If no webhook activities and repoFullName is provided, fetch recent commits from API
      if (data.activities.length === 0 && repoFullName) {
        const [owner, repo] = repoFullName.split('/');
        if (owner && repo) {
          try {
            const commitsData = await getRepositoryCommits(owner, repo, { perPage: 20 });
            setApiCommits(commitsData.commits || []);
          } catch (commitErr) {
            console.error('Error fetching API commits:', commitErr);
          }
        }
      }
    } catch (err) {
      console.error('Error loading GitHub activity:', err);
      setError('Failed to load GitHub activity');
    } finally {
      setLoading(false);
    }
  }, [projectId, repoFullName, limit]);

  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      loadActivities();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Get icon for event type
  const getEventIcon = (eventType: string, action?: string) => {
    switch (eventType) {
      case 'push':
        return <GitCommit className="w-4 h-4" />;
      case 'pull_request':
        if (action === 'closed') {
          return <GitMerge className="w-4 h-4" />;
        }
        return <GitPullRequest className="w-4 h-4" />;
      case 'issues':
        return <AlertCircle className="w-4 h-4" />;
      case 'issue_comment':
        return <MessageCircle className="w-4 h-4" />;
      case 'create':
        return <GitBranch className="w-4 h-4" />;
      case 'delete':
        return <Trash2 className="w-4 h-4" />;
      default:
        return <Tag className="w-4 h-4" />;
    }
  };

  // Get color for event type
  const getEventColor = (eventType: string, action?: string) => {
    switch (eventType) {
      case 'push':
        return 'text-blue-500 bg-blue-50 dark:bg-blue-900/20';
      case 'pull_request':
        if (action === 'closed') {
          return 'text-purple-500 bg-purple-50 dark:bg-purple-900/20';
        }
        return 'text-green-500 bg-green-50 dark:bg-green-900/20';
      case 'issues':
        return 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      case 'issue_comment':
        return 'text-gray-500 bg-gray-50 dark:bg-gray-900/50';
      case 'create':
        return 'text-teal-500 bg-teal-50 dark:bg-teal-900/20';
      case 'delete':
        return 'text-red-500 bg-red-50 dark:bg-red-900/20';
      default:
        return 'text-gray-500 bg-gray-50 dark:bg-gray-900/50';
    }
  };

  // Format activity message
  const formatActivityMessage = (activity: GitHubActivityItem): React.ReactNode => {
    const { eventType, action, payload, sender } = activity;

    switch (eventType) {
      case 'push': {
        const commitCount = payload.commits?.length || 0;
        const branch = payload.ref?.replace('refs/heads/', '');
        return (
          <span>
            <strong>{sender.login}</strong> pushed {commitCount} commit{commitCount !== 1 ? 's' : ''} to{' '}
            <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-900 rounded text-sm">{branch}</code>
          </span>
        );
      }

      case 'pull_request': {
        const pr = payload.pullRequest;
        return (
          <span>
            <strong>{sender.login}</strong> {action} pull request{' '}
            <a
              href={pr?.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-600 hover:underline"
            >
              #{pr?.number}
            </a>{' '}
            - {pr?.title}
          </span>
        );
      }

      case 'issues': {
        const issue = payload.issue;
        return (
          <span>
            <strong>{sender.login}</strong> {action} issue{' '}
            <a
              href={issue?.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-600 hover:underline"
            >
              #{issue?.number}
            </a>{' '}
            - {issue?.title}
          </span>
        );
      }

      case 'issue_comment':
        return (
          <span>
            <strong>{sender.login}</strong> commented on issue #{payload.issue?.number}
          </span>
        );

      case 'create':
        return (
          <span>
            <strong>{sender.login}</strong> created {payload.refType}{' '}
            <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-900 rounded text-sm">{payload.ref}</code>
          </span>
        );

      case 'delete':
        return (
          <span>
            <strong>{sender.login}</strong> deleted {payload.refType}{' '}
            <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-900 rounded text-sm">{payload.ref}</code>
          </span>
        );

      default:
        return (
          <span>
            <strong>{sender.login}</strong> performed {eventType} {action && `(${action})`}
          </span>
        );
    }
  };

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
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-teal-500 animate-spin" />
        <span className="ml-2 text-gray-500">Loading activity...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-500">{error}</p>
        <button
          onClick={loadActivities}
          className="mt-2 text-sm text-teal-600 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (activities.length === 0 && apiCommits.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <GitCommit className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No GitHub activity yet</p>
        <p className="text-sm mt-1">Activity will appear here when commits are pushed</p>
      </div>
    );
  }

  // Format relative time
  const formatTime = (dateString: string) => {
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

  // Show API commits if no webhook activities
  if (activities.length === 0 && apiCommits.length > 0) {
    return (
      <div className={compact ? '' : 'bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700'}>
        {!compact && (
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">Recent Commits</h3>
            <button
              onClick={loadActivities}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        )}
        <div className={compact ? 'space-y-2' : 'divide-y divide-gray-100 dark:divide-gray-800'}>
          {apiCommits.map((commit) => (
            <div
              key={commit.sha}
              className={`${compact ? 'p-2' : 'p-4'} hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-blue-500 bg-blue-50 dark:bg-blue-900/20">
                  <GitCommit className="w-4 h-4" />
                </div>
                {commit.author?.avatarUrl && (
                  <img
                    src={commit.author.avatarUrl}
                    alt={commit.author.login || commit.author.name}
                    className="w-6 h-6 rounded-full"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-white">
                    <strong>{commit.author?.login || commit.author?.name}</strong> committed
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                    {commit.message.split('\n')[0]}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    <code className="font-mono">{commit.sha.slice(0, 7)}</code>
                    <span>•</span>
                    <span>{formatTime(commit.author?.date)}</span>
                  </div>
                </div>
                <a
                  href={commit.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={compact ? '' : 'bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700'}>
      {/* Header */}
      {!compact && (
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">GitHub Activity</h3>
          <button
            onClick={loadActivities}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      )}

      {/* Activity List */}
      <div className={compact ? 'space-y-2' : 'divide-y divide-gray-100 dark:divide-gray-800'}>
        {activities.map((activity, activityIndex) => (
          <div
            key={activity._id?.toString() || `activity-${activityIndex}`}
            className={`${compact ? 'p-2' : 'p-4'} hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors`}
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className={`p-2 rounded-lg ${getEventColor(activity.eventType, activity.action)}`}>
                {getEventIcon(activity.eventType, activity.action)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {activity.sender.avatarUrl && (
                      <img
                        src={activity.sender.avatarUrl}
                        alt={activity.sender.login}
                        className="w-5 h-5 rounded-full"
                      />
                    )}
                    <p className={`text-gray-900 dark:text-white ${compact ? 'text-sm' : ''}`}>
                      {formatActivityMessage(activity)}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {formatRelativeTime(activity.createdAt)}
                  </span>
                </div>

                {/* Commits for push events */}
                {activity.eventType === 'push' && activity.payload.commits && !compact && (
                  <div className="mt-2 space-y-1">
                    {activity.payload.commits.slice(0, 3).map((commit, index) => (
                      <div key={commit.sha || `commit-${index}`} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <code className="text-xs font-mono">{commit.sha?.slice(0, 7)}</code>
                        <span className="truncate">{commit.message?.split('\n')[0]}</span>
                        {commit.url && (
                          <a
                            href={commit.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-teal-500 hover:text-teal-600"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ))}
                    {activity.payload.commits.length > 3 && (
                      <span className="text-xs text-gray-400">
                        +{activity.payload.commits.length - 3} more commits
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
