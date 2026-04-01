import {
  Code2,
  GitCommit,
  GitMerge,
  GitPullRequest,
  Loader2,
  RefreshCw,
  TrendingUp,
  Users
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { API_URL } from '../../../service/apiConfig';

interface GitHubContributor {
  login: string;
  avatarUrl: string;
  name?: string;
  commits: number;
  prsOpened: number;
  prsMerged: number;
  prsReviewed: number;
  linesAdded: number;
  linesDeleted: number;
  lastActivity: string;
}

interface GitHubRepoStats {
  totalCommits: number;
  totalPRs: number;
  openPRs: number;
  mergedPRs: number;
  totalIssues: number;
  openIssues: number;
  contributors: GitHubContributor[];
  commitActivity: { date: string; count: number }[];
}

interface GitHubContributorStatsProps {
  projectId: string;
  repoFullName?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function GitHubContributorStats({ projectId: _projectId, repoFullName }: GitHubContributorStatsProps) {
  const [stats, setStats] = useState<GitHubRepoStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!repoFullName) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('authToken');
      const [owner, repo] = repoFullName.split('/');

      // Fetch contributors and stats
      const [contributorsRes, commitsRes, prsRes] = await Promise.all([
        fetch(`${API_URL}/github/repos/${owner}/${repo}/contributors`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/github/repos/${owner}/${repo}/commits?perPage=100`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/github/repos/${owner}/${repo}/pulls?state=all`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      // Process contributors
      let contributors: GitHubContributor[] = [];
      if (contributorsRes.ok) {
        const contributorsData = await contributorsRes.json();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        contributors = (contributorsData.contributors || []).map((c: Record<string, any>) => ({
          login: c.login,
          avatarUrl: c.avatar_url || c.avatarUrl,
          name: c.name,
          commits: c.contributions || 0,
          prsOpened: 0,
          prsMerged: 0,
          prsReviewed: 0,
          linesAdded: 0,
          linesDeleted: 0,
          lastActivity: c.lastActivity || new Date().toISOString()
        }));
      }

      // Process commits for activity chart
      let commitActivity: { date: string; count: number }[] = [];
      let totalCommits = 0;
      if (commitsRes.ok) {
        const commitsData = await commitsRes.json();
        const commits = commitsData.commits || [];
        totalCommits = commits.length;

        // Group by date for last 7 days
        const activityMap: Record<string, number> = {};
        const now = new Date();
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          activityMap[date.toISOString().split('T')[0]] = 0;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        commits.forEach((commit: Record<string, any>) => {
          const commitDate = commit.author?.date || commit.commit?.author?.date || new Date().toISOString();
          const date = new Date(commitDate).toISOString().split('T')[0];
          if (activityMap[date] !== undefined) {
            activityMap[date]++;
          }
        });

        commitActivity = Object.entries(activityMap).map(([date, count]) => ({ date, count }));
      }

      // Process PRs
      let totalPRs = 0;
      let openPRs = 0;
      let mergedPRs = 0;
      if (prsRes.ok) {
        const prsData = await prsRes.json();
        const prs = prsData.pullRequests || [];
        totalPRs = prs.length;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        openPRs = prs.filter((pr: Record<string, any>) => pr.state === 'open').length;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mergedPRs = prs.filter((pr: Record<string, any>) => pr.merged).length;

        // Update contributor PR counts
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        prs.forEach((pr: Record<string, any>) => {
          const contributor = contributors.find(c => c.login === pr.user?.login);
          if (contributor) {
            contributor.prsOpened++;
            if (pr.merged) contributor.prsMerged++;
          }
        });
      }

      setStats({
        totalCommits,
        totalPRs,
        openPRs,
        mergedPRs,
        totalIssues: 0,
        openIssues: 0,
        contributors: contributors.sort((a, b) => b.commits - a.commits),
        commitActivity
      });
    } catch (err) {
      console.error('Error fetching GitHub stats:', err);
      setError('Failed to load GitHub statistics');
    } finally {
      setLoading(false);
    }
  }, [repoFullName]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (!repoFullName) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6 text-center">
        <Code2 className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500">Connect a GitHub repository to see contributor stats</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
        <span className="ml-2 text-gray-500">Loading GitHub stats...</span>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-3">{error || 'Failed to load stats'}</p>
        <button onClick={fetchStats} className="text-teal-600 hover:underline">
          Try again
        </button>
      </div>
    );
  }

  // Find max commits for chart scaling
  const maxCommitActivity = Math.max(...stats.commitActivity.map(a => a.count), 1);

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Code2 className="w-5 h-5 text-teal-500" />
          GitHub Contributor Stats
        </h3>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <GitCommit className="w-4 h-4" />
            <span className="text-sm">Commits</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalCommits}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <GitPullRequest className="w-4 h-4" />
            <span className="text-sm">Open PRs</span>
          </div>
          <p className="text-2xl font-bold text-orange-500">{stats.openPRs}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <GitMerge className="w-4 h-4" />
            <span className="text-sm">Merged PRs</span>
          </div>
          <p className="text-2xl font-bold text-purple-500">{stats.mergedPRs}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 mb-2">
            <Users className="w-4 h-4" />
            <span className="text-sm">Contributors</span>
          </div>
          <p className="text-2xl font-bold text-teal-500">{stats.contributors.length}</p>
        </div>
      </div>

      {/* Commit Activity Chart */}
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Commit Activity (Last 7 Days)
        </h4>
        <div className="flex items-end justify-between gap-2 h-24">
          {stats.commitActivity.map((day) => (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-teal-500 rounded-t transition-all duration-300"
                style={{ height: `${(day.count / maxCommitActivity) * 100}%`, minHeight: day.count > 0 ? '4px' : '0' }}
              />
              <span className="text-xs text-gray-400">
                {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Contributors */}
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
          Top Contributors
        </h4>
        <div className="space-y-3">
          {stats.contributors.slice(0, 5).map((contributor, index) => (
            <div key={contributor.login} className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-400 w-4">{index + 1}</span>
              <img
                src={contributor.avatarUrl}
                alt={contributor.login}
                className="w-8 h-8 rounded-full"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {contributor.name || contributor.login}
                </p>
                <p className="text-xs text-gray-500">@{contributor.login}</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <GitCommit className="w-3 h-3" />
                  {contributor.commits}
                </span>
                <span className="flex items-center gap-1">
                  <GitPullRequest className="w-3 h-3" />
                  {contributor.prsOpened}
                </span>
                <span className="flex items-center gap-1">
                  <GitMerge className="w-3 h-3" />
                  {contributor.prsMerged}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
