import { motion } from 'framer-motion';
import {
    Award,
    BookOpen,
    Calendar,
    ChevronRight,
    Clock,
    Flame,
    Map,
    Target,
    TrendingUp,
    Trophy,
    Zap
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import {
    getLearningDashboard,
    PHASE_LABELS,
    type DashboardData
} from '../../service/roadmapService';

const badgeIcons: Record<string, string> = {
  'first-topic': '🌟',
  'ten-topics': '📚',
  'quarter-century': '🎯',
  'half-century': '🏆',
  'week-streak': '🔥',
  'month-streak': '💪'
};

export default function LearningDashboard() {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getLearningDashboard();
      setData(result);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboard();
    }
  }, [isAuthenticated, loadDashboard]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-[#00ADB5] to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <TrendingUp className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Track Your Learning Progress
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Sign in to view your personalized learning dashboard, track progress across roadmaps,
            and earn badges.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 bg-[#00ADB5] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#00969d] transition-colors"
          >
            Sign In to Continue
          </Link>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black p-4 md:p-6">
        <div className="max-w-6xl mx-auto animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-8" />
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            ))}
          </div>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.stats.totalRoadmaps === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <Map className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Learning Progress Yet
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Start learning by enrolling in a roadmap. Track your progress, earn badges,
            and master new skills!
          </p>
          <Link
            to="/dashboard/roadmaps"
            className="inline-flex items-center gap-2 bg-[#00ADB5] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#00969d] transition-colors"
          >
            <Map className="w-5 h-5" />
            Browse Roadmaps
          </Link>
        </motion.div>
      </div>
    );
  }

  const { stats, roadmapProgress, recentActivity, badges } = data;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome back, {user?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Here's your learning progress overview
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalCompleted}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Topics Completed</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.overallProgress}%
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Overall Progress</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <Flame className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.currentStreak}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Day Streak 🔥</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <Trophy className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.badgeCount}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Badges Earned</p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Roadmap Progress */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Map className="w-5 h-5 text-[#00ADB5]" />
                  Your Roadmaps
                </h2>
                <Link
                  to="/dashboard/roadmaps"
                  className="text-sm text-[#00ADB5] hover:underline flex items-center gap-1"
                >
                  View all
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="space-y-4">
                {roadmapProgress.filter(p => p.roadmap).map((progress, index) => (
                  <Link
                    key={progress.roadmap._id}
                    to={`/dashboard/roadmaps/${progress.roadmap.slug}`}
                    className="block"
                  >
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                          style={{ background: `${progress.roadmap.color}20` }}
                        >
                          {progress.roadmap.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-medium text-gray-900 dark:text-white truncate">
                              {progress.roadmap.title}
                            </h3>
                            <span
                              className="text-sm font-medium ml-2"
                              style={{ color: progress.roadmap.color }}
                            >
                              {progress.progressPercent}%
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-2">
                            <span>{progress.completedTopics} / {progress.totalTopics} topics</span>
                            <span>•</span>
                            <span>
                              Last accessed {new Date(progress.lastAccessedAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${progress.progressPercent}%` }}
                              transition={{ duration: 0.5, delay: 0.1 * index }}
                              className="h-full rounded-full"
                              style={{ background: progress.roadmap.color }}
                            />
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            </motion.div>

            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
            >
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-green-500" />
                Recent Activity
              </h2>

              {recentActivity.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  No recent activity. Start learning to see your progress here!
                </p>
              ) : (
                <div className="space-y-3">
                  {recentActivity.slice(0, 5).map((activity, index) => {
                    const phaseInfo = PHASE_LABELS[activity.phase] || PHASE_LABELS.beginner;
                    return (
                      <motion.div
                        key={`${activity.topicId}-${index}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 * index }}
                        className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                          style={{ background: `${phaseInfo.color}20` }}
                        >
                          {phaseInfo.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            Completed "{activity.topicTitle}"
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {activity.roadmapTitle}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {formatTimeAgo(new Date(activity.completedAt))}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Streak Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-gradient-to-br from-orange-500 to-red-600 rounded-xl p-6 text-white"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{stats.currentStreak}</p>
                  <p className="text-white/80 text-sm">Day Streak</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/80">Longest streak</span>
                <span className="font-medium">{stats.longestStreak} days</span>
              </div>
              <p className="mt-4 text-sm text-white/80">
                {stats.currentStreak > 0
                  ? "Keep it up! Complete a topic daily to maintain your streak."
                  : "Start learning today to begin your streak!"}
              </p>
            </motion.div>

            {/* Badges */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
            >
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-500" />
                Badges
              </h2>

              {badges.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4 text-sm">
                  Complete topics to earn badges!
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {badges.map((badge, index) => (
                    <motion.div
                      key={badge.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 * index }}
                      className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      title={badge.name}
                    >
                      <span className="text-2xl block mb-1">
                        {badgeIcons[badge.id] || '🏅'}
                      </span>
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                        {badge.name}
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Badge Progress */}
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Next badge at:
                </p>
                <div className="space-y-2">
                  {stats.totalCompleted < 10 && (
                    <BadgeProgress
                      name="Consistent Learner"
                      current={stats.totalCompleted}
                      target={10}
                    />
                  )}
                  {stats.totalCompleted >= 10 && stats.totalCompleted < 25 && (
                    <BadgeProgress
                      name="Knowledge Seeker"
                      current={stats.totalCompleted}
                      target={25}
                    />
                  )}
                  {stats.currentStreak < 7 && (
                    <BadgeProgress
                      name="Week Warrior"
                      current={stats.currentStreak}
                      target={7}
                      unit="days"
                    />
                  )}
                </div>
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
            >
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Quick Actions
              </h2>
              <div className="space-y-2">
                <Link
                  to="/dashboard/roadmaps"
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <Map className="w-5 h-5 text-[#00ADB5]" />
                  <span className="text-gray-700 dark:text-gray-300">Browse Roadmaps</span>
                </Link>
                <Link
                  to="/dashboard/interview-prep"
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <Calendar className="w-5 h-5 text-purple-500" />
                  <span className="text-gray-700 dark:text-gray-300">Interview Prep</span>
                </Link>
                <Link
                  to="/dashboard/careers"
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700 dark:text-gray-300">Career Info</span>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BadgeProgress({
  name,
  current,
  target,
  unit = 'topics'
}: {
  name: string;
  current: number;
  target: number;
  unit?: string;
}) {
  const percent = Math.min(Math.round((current / target) * 100), 100);

  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-600 dark:text-gray-400">{name}</span>
        <span className="text-gray-500">
          {current}/{target} {unit}
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-yellow-500 rounded-full transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
