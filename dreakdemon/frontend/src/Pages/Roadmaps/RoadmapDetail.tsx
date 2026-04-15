import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  BookOpen,
  Briefcase,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Code,
  ExternalLink,
  GraduationCap,
  HelpCircle,
  Map,
  Play,
  Star,
  Target,
  TrendingUp,
  Users,
  Zap
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import {
  enrollInRoadmap,
  getRoadmapBySlug,
  markTopicComplete,
  markTopicIncomplete,
  PHASE_LABELS,
  type RoadmapDetail,
  type Topic
} from '../../service/roadmapService';

export default function RoadmapDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const [data, setData] = useState<RoadmapDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedPhases, setExpandedPhases] = useState<string[]>(['beginner']);
  const [enrolling, setEnrolling] = useState(false);
  const [completingTopic, setCompletingTopic] = useState<string | null>(null);

  const loadRoadmap = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const result = await getRoadmapBySlug(slug!);
      setData(result);

      // Auto-expand phases with incomplete topics
      if (result.userProgress?.completedTopicIds) {
        const completedSet = new Set(result.userProgress.completedTopicIds);
        const phasesToExpand: string[] = [];

        Object.entries(result.topicsByPhase).forEach(([phase, topics]) => {
          const hasIncomplete = topics.some(t => !completedSet.has(t._id));
          if (hasIncomplete && phasesToExpand.length < 2) {
            phasesToExpand.push(phase);
          }
        });

        if (phasesToExpand.length > 0) {
          setExpandedPhases(phasesToExpand);
        }
      }
    } catch (error) {
      console.error('Error loading roadmap:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (slug) {
      loadRoadmap();
    }
  }, [slug, loadRoadmap]);

  const handleEnroll = async () => {
    if (!isAuthenticated || !data) return;

    try {
      setEnrolling(true);
      await enrollInRoadmap(data.roadmap._id);
      await loadRoadmap();
    } catch (error) {
      console.error('Error enrolling:', error);
    } finally {
      setEnrolling(false);
    }
  };

  const handleToggleComplete = async (topic: Topic, isCompleted: boolean) => {
    if (!isAuthenticated || !data) return;

    try {
      setCompletingTopic(topic._id);

      // Optimistic UI update — instantly toggle the checkmark
      setData(prev => {
        if (!prev || !prev.userProgress) return prev;
        const currentIds = prev.userProgress.completedTopicIds || [];
        const updatedIds = isCompleted
          ? currentIds.filter(id => id !== topic._id)
          : [...currentIds, topic._id];
        return {
          ...prev,
          userProgress: { ...prev.userProgress, completedTopicIds: updatedIds }
        };
      });

      // Call the API
      if (isCompleted) {
        await markTopicIncomplete(topic._id);
      } else {
        await markTopicComplete(topic._id);
      }

      // Silent background refresh to sync with server
      loadRoadmap(true);
    } catch (error) {
      console.error('Error toggling topic:', error);
      // Revert on error
      loadRoadmap(true);
    } finally {
      setCompletingTopic(null);
    }
  };

  const togglePhase = (phase: string) => {
    setExpandedPhases(prev =>
      prev.includes(phase)
        ? prev.filter(p => p !== phase)
        : [...prev, phase]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4" />
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2" />
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-8" />
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                ))}
              </div>
              <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <Map className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Roadmap not found
          </h2>
          <Link to="/dashboard/roadmaps" className="text-[#00ADB5] hover:underline">
            Browse all roadmaps
          </Link>
        </div>
      </div>
    );
  }

  const { roadmap, topicsByPhase, careerInfo, userProgress } = data;
  const completedTopicIds = new Set(userProgress?.completedTopicIds || []);
  const totalTopics = roadmap.totalTopics;
  const completedCount = userProgress?.completedTopicIds?.length || 0;
  const progressPercent = totalTopics > 0 ? Math.round((completedCount / totalTopics) * 100) : 0;

  const phases = [
    { key: 'foundation', topics: topicsByPhase.foundation || [] },
    { key: 'beginner', topics: topicsByPhase.beginner },
    { key: 'intermediate', topics: topicsByPhase.intermediate },
    { key: 'advanced', topics: topicsByPhase.advanced },
    { key: 'interview', topics: topicsByPhase.interview }
  ].filter(p => p.topics.length > 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        <Link
          to="/dashboard/roadmaps"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-[#00ADB5] mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Roadmaps
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-start gap-4 mb-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
              style={{ background: `${roadmap.color}20` }}
            >
              {roadmap.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                  {roadmap.title}
                </h1>
                {roadmap.isFeatured && (
                  <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs font-medium rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" />
                    Featured
                  </span>
                )}
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                {roadmap.description}
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" />
              {roadmap.totalTopics} topics
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {roadmap.estimatedWeeks} weeks
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              {roadmap.enrolledCount} learners
            </span>
            <span className="flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4" />
              {roadmap.totalQuestions} questions
            </span>
            <span className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              {roadmap.rating.toFixed(1)} ({roadmap.reviewCount} reviews)
            </span>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content - Phases & Topics */}
          <div className="lg:col-span-2 space-y-4">
            {/* Progress Bar (if enrolled) */}
            {userProgress?.isEnrolled && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Your Progress
                  </span>
                  <span className="text-sm text-[#00ADB5] font-medium">
                    {completedCount} / {totalTopics} topics ({progressPercent}%)
                  </span>
                </div>
                <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-[#00ADB5] to-purple-500 rounded-full"
                  />
                </div>
                {userProgress.currentStreak && userProgress.currentStreak > 0 && (
                  <div className="flex items-center gap-2 mt-3 text-sm text-gray-600 dark:text-gray-400">
                    <Zap className="w-4 h-4 text-orange-500" />
                    <span>{userProgress.currentStreak} day streak!</span>
                  </div>
                )}
              </motion.div>
            )}

            {/* Phases */}
            {phases.map((phase, phaseIndex) => {
              const phaseInfo = PHASE_LABELS[phase.key];
              const isExpanded = expandedPhases.includes(phase.key);
              const phaseCompleted = phase.topics.filter((t: Topic) => completedTopicIds.has(t._id)).length;
              const phaseTotal = phase.topics.length;
              const phaseProgress = phaseTotal > 0 ? Math.round((phaseCompleted / phaseTotal) * 100) : 0;

              return (
                <motion.div
                  key={phase.key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * phaseIndex }}
                  className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  {/* Phase Header */}
                  <button
                    onClick={() => togglePhase(phase.key)}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                        style={{ background: `${phaseInfo.color}20` }}
                      >
                        {phaseInfo.icon}
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {phaseInfo.label}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {phaseCompleted} / {phaseTotal} topics
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {userProgress?.isEnrolled && (
                        <div className="hidden sm:flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${phaseProgress}%`,
                                background: phaseInfo.color
                              }}
                            />
                          </div>
                          <span className="text-sm text-gray-500 dark:text-gray-400 w-10">
                            {phaseProgress}%
                          </span>
                        </div>
                      )}
                      <ChevronDown
                        className={`w-5 h-5 text-gray-400 transition-transform ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </button>

                  {/* Topics List */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-gray-100 dark:border-gray-700"
                      >
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                          {phase.topics.map((topic: Topic) => {
                            const isCompleted = completedTopicIds.has(topic._id);
                            const isLoading = completingTopic === topic._id;

                            return (
                              <div
                                key={topic._id}
                                className="p-4 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                              >
                                {/* Completion Checkbox */}
                                {isAuthenticated && (
                                  <button
                                    onClick={() => handleToggleComplete(topic, isCompleted)}
                                    disabled={isLoading}
                                    className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                      isCompleted
                                        ? 'bg-green-500 border-green-500 text-white'
                                        : 'border-gray-300 dark:border-gray-600 hover:border-[#00ADB5]'
                                    } ${isLoading ? 'opacity-50' : ''}`}
                                  >
                                    {isLoading ? (
                                      <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                    ) : isCompleted ? (
                                      <Check className="w-3.5 h-3.5" />
                                    ) : null}
                                  </button>
                                )}

                                {/* Topic Content */}
                                <Link
                                  to={`/dashboard/roadmaps/topic/${topic._id}`}
                                  className="flex-1 min-w-0"
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-lg">{topic.icon}</span>
                                    <h4
                                      className={`font-medium transition-colors ${
                                        isCompleted
                                          ? 'text-gray-400 dark:text-gray-500 line-through'
                                          : 'text-gray-900 dark:text-white hover:text-[#00ADB5]'
                                      }`}
                                    >
                                      {topic.title}
                                    </h4>
                                  </div>
                                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                                    {topic.description}
                                  </p>
                                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {topic.estimatedHours}h
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <ExternalLink className="w-3 h-3" />
                                      {topic.resources?.length || 0} resources
                                    </span>
                                  </div>
                                </Link>

                                <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}

            {/* Long Description */}
            {roadmap.longDescription && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
              >
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                  About This Roadmap
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {roadmap.longDescription}
                </p>
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* CTA Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700 sticky top-4"
            >
              {!isAuthenticated ? (
                <>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                    Start Learning
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Sign in to track your progress and mark topics as complete.
                  </p>
                  <Link
                    to="/login"
                    className="w-full flex items-center justify-center gap-2 bg-[#00ADB5] text-white py-3 rounded-lg font-medium hover:bg-[#00969d] transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Sign in to Start
                  </Link>
                </>
              ) : !userProgress?.isEnrolled ? (
                <>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                    Ready to Learn?
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Enroll to start tracking your progress on this roadmap.
                  </p>
                  <button
                    onClick={handleEnroll}
                    disabled={enrolling}
                    className="w-full flex items-center justify-center gap-2 bg-[#00ADB5] text-white py-3 rounded-lg font-medium hover:bg-[#00969d] transition-colors disabled:opacity-50"
                  >
                    {enrolling ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Enrolling...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Start Learning
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Continue Learning
                    </h3>
                    <span className="text-[#00ADB5] font-medium">{progressPercent}%</span>
                  </div>
                  <Link
                    to="/dashboard/learning-dashboard"
                    className="w-full flex items-center justify-center gap-2 bg-[#00ADB5] text-white py-3 rounded-lg font-medium hover:bg-[#00969d] transition-colors"
                  >
                    <TrendingUp className="w-4 h-4" />
                    View Dashboard
                  </Link>
                </>
              )}

              {/* Quick Links */}
              <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700 space-y-3">
                <Link
                  to={`/dashboard/roadmaps/${slug}/interview`}
                  className="flex items-center gap-3 text-gray-600 dark:text-gray-400 hover:text-[#00ADB5] transition-colors"
                >
                  <HelpCircle className="w-5 h-5" />
                  <span>Interview Questions</span>
                  <span className="ml-auto text-sm bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                    {roadmap.totalQuestions}
                  </span>
                </Link>
                <Link
                  to={`/dashboard/roadmaps/${slug}/careers`}
                  className="flex items-center gap-3 text-gray-600 dark:text-gray-400 hover:text-[#00ADB5] transition-colors"
                >
                  <Briefcase className="w-5 h-5" />
                  <span>Career Paths</span>
                  <span className="ml-auto text-sm bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                    {careerInfo.length}
                  </span>
                </Link>
              </div>
            </motion.div>

            {/* Prerequisites */}
            {roadmap.prerequisites.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
              >
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-purple-500" />
                  Prerequisites
                </h3>
                <ul className="space-y-2">
                  {roadmap.prerequisites.map((prereq, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                      {prereq}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {/* Outcomes */}
            {roadmap.outcomes.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
              >
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Target className="w-5 h-5 text-green-500" />
                  What You'll Learn
                </h3>
                <ul className="space-y-2">
                  {roadmap.outcomes.map((outcome, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      {outcome}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {/* Career Preview */}
            {careerInfo.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
              >
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-blue-500" />
                  Career Opportunities
                </h3>
                <div className="space-y-3">
                  {careerInfo.slice(0, 3).map(career => (
                    <div key={career._id} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {career.jobTitle}
                      </span>
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">
                        ₹{(career.salaryRange.min / 100000).toFixed(0)}-{(career.salaryRange.max / 100000).toFixed(0)} LPA
                      </span>
                    </div>
                  ))}
                </div>
                <Link
                  to={`/dashboard/roadmaps/${slug}/careers`}
                  className="mt-4 flex items-center justify-center gap-2 text-sm text-[#00ADB5] hover:underline"
                >
                  View all careers
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </motion.div>
            )}

            {/* Recommended Projects */}
            {(() => {
              const allProjects: string[] = [];
              Object.values(topicsByPhase).forEach(topics => {
                topics.forEach(topic => {
                  if (topic.relatedProjects) {
                    allProjects.push(...topic.relatedProjects);
                  }
                });
              });
              const uniqueProjects = [...new Set(allProjects)].slice(0, 6);

              if (uniqueProjects.length === 0) return null;

              return (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Code className="w-5 h-5 text-purple-500" />
                    Recommended Projects
                  </h3>
                  <ul className="space-y-2">
                    {uniqueProjects.map((project, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-yellow-500 mt-1">•</span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">{project}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
