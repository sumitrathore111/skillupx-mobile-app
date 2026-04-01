import {
    CheckCircle2,
    Clock,
    FileText,
    GitBranch,
    GitCommit,
    GitMerge,
    GitPullRequest,
    MessageSquare,
    Play,
    Plus,
    RefreshCw,
    Settings,
    Trash2,
    UserPlus,
    Zap
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { API_URL } from '../../../service/apiConfig';

interface ActivityItem {
  _id: string;
  projectId: string;
  boardId?: string;
  taskId?: string;
  userId: string;
  userName: string;
  type: string;
  title: string;
  metadata?: Record<string, any>;
  createdAt: string;
  // GitHub specific fields
  isGitHubActivity?: boolean;
  githubEventType?: string;
  githubUrl?: string;
}

interface ActivityTimelineProps {
  projectId: string;
  limit?: number;
  includeGitHub?: boolean;
}

export default function ActivityTimeline({
  projectId,
  limit = 50,
  includeGitHub = true
}: ActivityTimelineProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [githubActivities, setGithubActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGitHub, setShowGitHub] = useState(true);

  // Activity type icons - including GitHub types
  const activityIcons: Record<string, React.ReactNode> = {
    task_created: <Plus className="w-4 h-4" />,
    task_updated: <Settings className="w-4 h-4" />,
    task_completed: <CheckCircle2 className="w-4 h-4" />,
    task_deleted: <Trash2 className="w-4 h-4" />,
    task_moved: <GitBranch className="w-4 h-4" />,
    task_commented: <MessageSquare className="w-4 h-4" />,
    board_created: <Plus className="w-4 h-4" />,
    sprint_started: <Play className="w-4 h-4" />,
    sprint_completed: <CheckCircle2 className="w-4 h-4" />,
    member_joined: <UserPlus className="w-4 h-4" />,
    file_uploaded: <FileText className="w-4 h-4" />,
    time_logged: <Clock className="w-4 h-4" />,
    // GitHub activity types
    github_push: <GitCommit className="w-4 h-4" />,
    github_commit: <GitCommit className="w-4 h-4" />,
    github_pr_opened: <GitPullRequest className="w-4 h-4" />,
    github_pr_merged: <GitMerge className="w-4 h-4" />,
    github_pr_closed: <GitPullRequest className="w-4 h-4" />,
    github_issue_opened: <GitBranch className="w-4 h-4" />,
    github_issue_closed: <CheckCircle2 className="w-4 h-4" />,
    github_review: <MessageSquare className="w-4 h-4" />,
    default: <Zap className="w-4 h-4" />
  };

  // Activity type colors - including GitHub types
  const activityColors: Record<string, string> = {
    task_created: 'bg-green-500',
    task_updated: 'bg-blue-500',
    task_completed: 'bg-teal-500',
    task_deleted: 'bg-red-500',
    task_moved: 'bg-yellow-500',
    task_commented: 'bg-indigo-500',
    board_created: 'bg-green-500',
    sprint_started: 'bg-teal-500',
    sprint_completed: 'bg-teal-500',
    member_joined: 'bg-cyan-500',
    file_uploaded: 'bg-orange-500',
    time_logged: 'bg-pink-500',
    // GitHub activity colors
    github_push: 'bg-gray-700',
    github_commit: 'bg-gray-700',
    github_pr_opened: 'bg-blue-600',
    github_pr_merged: 'bg-purple-600',
    github_pr_closed: 'bg-red-600',
    github_issue_opened: 'bg-green-600',
    github_issue_closed: 'bg-purple-500',
    github_review: 'bg-yellow-600',
    default: 'bg-gray-500'
  };

  // Fetch activities
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('authToken');

        // Fetch regular activities
        const res = await fetch(`${API_URL}/boards/project/${projectId}/activity?limit=${limit}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!res.ok) throw new Error('Failed to fetch activities');
        const data = await res.json();
        setActivities(data);

        // Fetch GitHub activities if enabled
        if (includeGitHub) {
          try {
            const githubRes = await fetch(`${API_URL}/github/projects/${projectId}/activity?limit=${limit}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });

            if (githubRes.ok) {
              const githubData = await githubRes.json();
              const formattedGithubActivities = (githubData.activities || []).map((activity: any) => ({
                _id: activity._id,
                projectId: activity.projectId,
                userId: activity.sender?.login || 'GitHub',
                userName: activity.sender?.login || 'GitHub',
                type: `github_${activity.eventType}${activity.action ? '_' + activity.action : ''}`,
                title: formatGitHubActivityTitle(activity),
                metadata: activity.payload,
                createdAt: activity.createdAt,
                isGitHubActivity: true,
                githubEventType: activity.eventType,
                githubUrl: activity.payload?.html_url || activity.payload?.pull_request?.html_url
              }));
              setGithubActivities(formattedGithubActivities);
            }
          } catch (err) {
            console.error('Error fetching GitHub activities:', err);
          }
        }
      } catch (err: any) {
        console.error('Error fetching activities:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [projectId, limit, includeGitHub]);

  // Format GitHub activity title
  const formatGitHubActivityTitle = (activity: any): string => {
    const { eventType, action, payload } = activity;

    switch (eventType) {
      case 'push':
        const commitCount = payload?.commits?.length || 1;
        return `pushed ${commitCount} commit${commitCount > 1 ? 's' : ''} to ${payload?.ref?.replace('refs/heads/', '') || 'main'}`;
      case 'pull_request':
        const prTitle = payload?.pull_request?.title || `PR #${payload?.number}`;
        if (action === 'opened') return `opened pull request: ${prTitle}`;
        if (action === 'closed' && payload?.pull_request?.merged) return `merged pull request: ${prTitle}`;
        if (action === 'closed') return `closed pull request: ${prTitle}`;
        return `${action} pull request: ${prTitle}`;
      case 'issue':
        const issueTitle = payload?.issue?.title || `Issue #${payload?.number}`;
        return `${action} issue: ${issueTitle}`;
      case 'pull_request_review':
        return `reviewed pull request #${payload?.pull_request?.number}`;
      case 'issue_comment':
        return `commented on issue #${payload?.issue?.number}`;
      default:
        return `${eventType} ${action || ''}`.trim();
    }
  };

  // Combine and sort all activities
  const allActivities = useMemo(() => {
    const combined = showGitHub
      ? [...activities, ...githubActivities]
      : activities;
    return combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [activities, githubActivities, showGitHub]);

  // Group activities by date
  const groupedActivities = useMemo(() => {
    const groups: Record<string, ActivityItem[]> = {};

    allActivities.forEach(activity => {
      const date = new Date(activity.createdAt);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let dateKey: string;
      if (date.toDateString() === today.toDateString()) {
        dateKey = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        dateKey = 'Yesterday';
      } else {
        dateKey = date.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric'
        });
      }

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(activity);
    });

    return groups;
  }, [allActivities]);

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-teal-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <p className="text-red-500 mb-2">Failed to load activities</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-teal-500 text-white rounded-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <Zap className="w-12 h-12 mb-4 text-gray-300" />
        <p>No activities yet</p>
        <p className="text-sm text-gray-400">Activities will appear here when team members start working</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-teal-500" />
          Activity Feed
        </h2>
        {/* GitHub toggle */}
        {includeGitHub && githubActivities.length > 0 && (
          <button
            onClick={() => setShowGitHub(!showGitHub)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              showGitHub
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400'
            }`}
          >
            <GitCommit className="w-4 h-4" />
            GitHub ({githubActivities.length})
          </button>
        )}
      </div>

      <div className="space-y-6">
        {Object.entries(groupedActivities).map(([date, dateActivities]) => (
          <div key={date}>
            {/* Date header */}
            <div className="sticky top-0 bg-white dark:bg-gray-900 py-2 mb-3 z-10">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {date}
              </h3>
            </div>

            {/* Activities for this date */}
            <div className="space-y-4 relative">
              {/* Vertical line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

              {dateActivities.map((activity) => {
                const icon = activityIcons[activity.type] || activityIcons.default;
                const color = activityColors[activity.type] || activityColors.default;

                return (
                  <div key={activity._id} className="flex gap-4 relative">
                    {/* Icon */}
                    <div className={`relative z-10 w-8 h-8 rounded-full ${color} flex items-center justify-center text-white flex-shrink-0`}>
                      {icon}
                    </div>

                    {/* Content */}
                    <div className={`flex-1 min-w-0 rounded-lg p-3 ${
                      activity.isGitHubActivity
                        ? 'bg-gray-900/5 dark:bg-gray-900 border border-gray-200 dark:border-gray-700'
                        : 'bg-gray-50 dark:bg-gray-900'
                    }`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          {/* User name and action */}
                          <p className="text-sm text-gray-900 dark:text-white">
                            <span className="font-medium">{activity.userName}</span>
                            {' '}
                            <span className="text-gray-600 dark:text-gray-400">{activity.title}</span>
                          </p>

                          {/* GitHub badge */}
                          {activity.isGitHubActivity && (
                            <div className="flex items-center gap-2 mt-1">
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-900 text-white">
                                <GitCommit className="w-3 h-3" />
                                GitHub
                              </span>
                              {activity.githubUrl && (
                                <a
                                  href={activity.githubUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-teal-600 hover:underline"
                                >
                                  View on GitHub →
                                </a>
                              )}
                            </div>
                          )}

                          {/* Metadata */}
                          {activity.metadata && Object.keys(activity.metadata).length > 0 && !activity.isGitHubActivity && (
                            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              {activity.metadata.taskTitle && (
                                <span className="bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">
                                  {activity.metadata.taskTitle}
                                </span>
                              )}
                              {activity.metadata.columnFrom && activity.metadata.columnTo && (
                                <span>
                                  {' → '}{activity.metadata.columnFrom} to {activity.metadata.columnTo}
                                </span>
                              )}
                              {activity.metadata.velocity !== undefined && (
                                <span> • Velocity: {activity.metadata.velocity} points</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Time */}
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {formatTime(activity.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
