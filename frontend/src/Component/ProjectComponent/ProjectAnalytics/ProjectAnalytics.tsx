import {
  BarChart2,
  CheckCircle2,
  Clock,
  Code2,
  GitCommit,
  GitMerge,
  GitPullRequest,
  RefreshCw,
  Target,
  TrendingUp,
  Users,
  Zap
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { API_URL } from '../../../service/apiConfig';

interface GitHubContributor {
  login: string;
  avatarUrl: string;
  commits: number;
  prsOpened: number;
  prsMerged: number;
}

interface GitHubStats {
  totalCommits: number;
  totalPRs: number;
  openPRs: number;
  mergedPRs: number;
  contributors: GitHubContributor[];
  commitActivity: { date: string; count: number }[];
}

interface AnalyticsData {
  tasks: {
    total: number;
    completed: number;
    completionRate: number;
    overdue: number;
    byPriority: Record<string, number>;
    byColumn: Record<string, number>;
  };
  time: {
    totalSpent: number;
    totalEstimated: number;
    efficiency: number;
  };
  sprints: {
    total: number;
    completed: number;
    averageVelocity: number;
  };
  team: {
    memberCount: number;
    tasksPerMember: number;
    completedPerMember: number;
  };
}

interface ProjectAnalyticsProps {
  projectId: string;
  githubRepoFullName?: string;
}

export default function ProjectAnalytics({ projectId, githubRepoFullName }: ProjectAnalyticsProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [githubStats, setGithubStats] = useState<GitHubStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'tasks' | 'github'>('tasks');

  // Fetch analytics
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('authToken');
        const res = await fetch(`${API_URL}/boards/project/${projectId}/analytics`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch analytics');
        const analyticsData = await res.json();
        setData(analyticsData);

        // Fetch GitHub stats if repo is connected
        if (githubRepoFullName) {
          try {
            const [owner, repo] = githubRepoFullName.split('/');
            const [commitsRes, prsRes, contributorsRes] = await Promise.all([
              fetch(`${API_URL}/github/repos/${owner}/${repo}/commits?perPage=100`, {
                headers: { 'Authorization': `Bearer ${token}` }
              }),
              fetch(`${API_URL}/github/repos/${owner}/${repo}/pulls?state=all`, {
                headers: { 'Authorization': `Bearer ${token}` }
              }),
              fetch(`${API_URL}/github/repos/${owner}/${repo}/contributors`, {
                headers: { 'Authorization': `Bearer ${token}` }
              }).catch(() => null)
            ]);

            let commits: any[] = [];
            let prs: any[] = [];
            let contributors: GitHubContributor[] = [];

            if (commitsRes.ok) {
              const commitsData = await commitsRes.json();
              commits = commitsData.commits || [];
            }

            if (prsRes.ok) {
              const prsData = await prsRes.json();
              prs = prsData.pullRequests || [];
            }

            if (contributorsRes && contributorsRes.ok) {
              const contribData = await contributorsRes.json();
              contributors = (contribData.contributors || []).slice(0, 5).map((c: any) => ({
                login: c.login,
                avatarUrl: c.avatar_url || c.avatarUrl,
                commits: c.contributions || 0,
                prsOpened: 0,
                prsMerged: 0
              }));
            }

            // Calculate commit activity for last 7 days
            const activityMap: Record<string, number> = {};
            const now = new Date();
            for (let i = 6; i >= 0; i--) {
              const date = new Date(now);
              date.setDate(date.getDate() - i);
              activityMap[date.toISOString().split('T')[0]] = 0;
            }
            commits.forEach((commit: any) => {
              const date = new Date(commit.author?.date).toISOString().split('T')[0];
              if (activityMap[date] !== undefined) activityMap[date]++;
            });

            // Update contributor PR counts
            prs.forEach((pr: any) => {
              const contributor = contributors.find(c => c.login === pr.user?.login);
              if (contributor) {
                contributor.prsOpened++;
                if (pr.merged) contributor.prsMerged++;
              }
            });

            setGithubStats({
              totalCommits: commits.length,
              totalPRs: prs.length,
              openPRs: prs.filter((pr: any) => pr.state === 'open').length,
              mergedPRs: prs.filter((pr: any) => pr.merged).length,
              contributors,
              commitActivity: Object.entries(activityMap).map(([date, count]) => ({ date, count }))
            });
          } catch (err) {
            console.error('Error fetching GitHub stats:', err);
          }
        }
      } catch (err: any) {
        console.error('Error fetching analytics:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [projectId, githubRepoFullName]);

  // Format time (minutes to hours/minutes)
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  // Priority colors for chart
  const priorityColors: Record<string, string> = {
    low: '#10B981',
    medium: '#F59E0B',
    high: '#F97316',
    critical: '#EF4444'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-teal-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <p className="text-red-500">Failed to load analytics</p>
      </div>
    );
  }

  // Calculate max value for bar chart scaling
  const maxColumnTasks = Math.max(...Object.values(data.tasks.byColumn), 1);
  const maxCommitActivity = githubStats ? Math.max(...githubStats.commitActivity.map(a => a.count), 1) : 1;

  return (
    <div className="space-y-6 p-4">
      {/* View Toggle - Show if GitHub is connected */}
      {githubStats && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveView('tasks')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeView === 'tasks'
                ? 'bg-teal-500 text-white'
                : 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Task Analytics
          </button>
          <button
            onClick={() => setActiveView('github')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeView === 'github'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <Code2 className="w-4 h-4" />
            GitHub Stats
          </button>
        </div>
      )}

      {/* GitHub Stats View */}
      {activeView === 'github' && githubStats && (
        <div className="space-y-6">
          {/* GitHub Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gray-100 dark:bg-gray-900 rounded-xl">
                  <GitCommit className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Commits</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{githubStats.totalCommits}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                  <GitPullRequest className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Open PRs</p>
                  <p className="text-2xl font-bold text-blue-600">{githubStats.openPRs}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                  <GitMerge className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Merged PRs</p>
                  <p className="text-2xl font-bold text-purple-600">{githubStats.mergedPRs}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-teal-100 dark:bg-teal-900/30 rounded-xl">
                  <Users className="w-6 h-6 text-teal-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Contributors</p>
                  <p className="text-2xl font-bold text-teal-600">{githubStats.contributors.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Commit Activity Chart */}
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-teal-500" />
              Commit Activity (Last 7 Days)
            </h3>
            <div className="flex items-end justify-between gap-2 h-32">
              {githubStats.commitActivity.map((day) => (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs text-gray-500 mb-1">{day.count}</span>
                  <div
                    className="w-full bg-gradient-to-t from-teal-500 to-teal-400 rounded-t transition-all duration-300"
                    style={{
                      height: `${(day.count / maxCommitActivity) * 100}%`,
                      minHeight: day.count > 0 ? '8px' : '2px',
                      opacity: day.count > 0 ? 1 : 0.3
                    }}
                  />
                  <span className="text-xs text-gray-400">
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Contributors */}
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-500" />
              Top Contributors
            </h3>
            <div className="space-y-3">
              {githubStats.contributors.map((contributor, index) => (
                <div key={contributor.login} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <span className="text-sm font-bold text-gray-400 w-6">{index + 1}</span>
                  <img
                    src={contributor.avatarUrl}
                    alt={contributor.login}
                    className="w-10 h-10 rounded-full"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white">@{contributor.login}</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1" title="Commits">
                      <GitCommit className="w-4 h-4" />
                      {contributor.commits}
                    </span>
                    <span className="flex items-center gap-1" title="PRs Opened">
                      <GitPullRequest className="w-4 h-4" />
                      {contributor.prsOpened}
                    </span>
                    <span className="flex items-center gap-1 text-purple-500" title="PRs Merged">
                      <GitMerge className="w-4 h-4" />
                      {contributor.prsMerged}
                    </span>
                  </div>
                </div>
              ))}
              {githubStats.contributors.length === 0 && (
                <p className="text-center text-gray-500 py-4">No contributor data available</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Task Analytics View */}
      {activeView === 'tasks' && (
        <>
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Tasks */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-teal-100 dark:bg-teal-900/30 rounded-xl">
              <Target className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Tasks</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {data.tasks.total}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500">Completed</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {data.tasks.completed}/{data.tasks.total}
              </span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-500 rounded-full transition-all duration-500"
                style={{ width: `${data.tasks.completionRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Completion Rate */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Completion Rate</p>
              <p className="text-2xl font-bold text-green-600">
                {data.tasks.completionRate}%
              </p>
            </div>
          </div>
          {data.tasks.overdue > 0 && (
            <p className="mt-4 text-sm text-red-500">
              ⚠️ {data.tasks.overdue} overdue tasks
            </p>
          )}
        </div>

        {/* Time Tracking */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Time Spent</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatTime(data.time.totalSpent)}
              </p>
            </div>
          </div>
          {data.time.totalEstimated > 0 && (
            <p className="mt-4 text-sm text-gray-500">
              Est: {formatTime(data.time.totalEstimated)} ({data.time.efficiency}% efficiency)
            </p>
          )}
        </div>

        {/* Team */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
              <Users className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Team Members</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {data.team.memberCount}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            ~{data.team.tasksPerMember} tasks per member
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tasks by Column */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-teal-500" />
            Tasks by Column
          </h3>
          <div className="space-y-3">
            {Object.entries(data.tasks.byColumn).map(([column, count]) => (
              <div key={column}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">{column}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{count}</span>
                </div>
                <div className="h-6 bg-gray-100 dark:bg-gray-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-teal-500 to-indigo-500 rounded-full transition-all duration-500 flex items-center justify-end px-2"
                    style={{ width: `${(count / maxColumnTasks) * 100}%` }}
                  >
                    {count > 0 && (
                      <span className="text-xs text-white font-medium">{count}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tasks by Priority */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-teal-500" />
            Tasks by Priority
          </h3>
          <div className="flex items-center justify-center gap-4 h-48">
            {Object.entries(data.tasks.byPriority).map(([priority, count]) => {
              const maxPriorityTasks = Math.max(...Object.values(data.tasks.byPriority), 1);
              const height = (count / maxPriorityTasks) * 100;
              return (
                <div key={priority} className="flex flex-col items-center gap-2">
                  <div className="relative h-36 w-12 bg-gray-100 dark:bg-gray-900 rounded-lg flex items-end">
                    <div
                      className="w-full rounded-lg transition-all duration-500"
                      style={{
                        backgroundColor: priorityColors[priority],
                        height: `${height}%`,
                        minHeight: count > 0 ? '8px' : '0'
                      }}
                    />
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-sm font-medium text-gray-900 dark:text-white">
                      {count}
                    </span>
                  </div>
                  <span className="text-xs capitalize text-gray-500">{priority}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sprint Stats */}
      {data.sprints.total > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-teal-500" />
            Sprint Performance
          </h3>
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {data.sprints.total}
              </p>
              <p className="text-sm text-gray-500">Total Sprints</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">
                {data.sprints.completed}
              </p>
              <p className="text-sm text-gray-500">Completed</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-teal-600">
                {data.sprints.averageVelocity}
              </p>
              <p className="text-sm text-gray-500">Avg Velocity (pts)</p>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
