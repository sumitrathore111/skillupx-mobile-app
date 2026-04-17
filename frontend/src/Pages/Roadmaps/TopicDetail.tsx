import { motion } from 'framer-motion';
import {
    ArrowLeft,
    BookOpen,
    Check,
    ChevronLeft,
    ChevronRight,
    Clock,
    ExternalLink,
    FileText,
    HelpCircle,
    Play,
    Video
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import {
    getTopicDetail,
    markTopicComplete,
    markTopicIncomplete,
    PHASE_LABELS,
    type TopicDetail as TopicDetailType
} from '../../service/roadmapService';

const resourceTypeIcons: Record<string, React.ReactNode> = {
  video: <Video className="w-4 h-4" />,
  article: <FileText className="w-4 h-4" />,
  course: <BookOpen className="w-4 h-4" />,
  documentation: <FileText className="w-4 h-4" />,
  tutorial: <Play className="w-4 h-4" />
};

const resourceTypeColors: Record<string, string> = {
  video: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  article: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  course: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  documentation: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  tutorial: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
};

export default function TopicDetail() {
  const { topicId } = useParams<{ topicId: string }>();
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const [data, setData] = useState<TopicDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [showAnswer, setShowAnswer] = useState<Record<string, boolean>>({});

  const loadTopic = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const result = await getTopicDetail(topicId!);
      setData(result);
    } catch (error) {
      console.error('Error loading topic:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [topicId]);

  useEffect(() => {
    if (topicId) {
      loadTopic();
    }
  }, [topicId, loadTopic]);

  const handleToggleComplete = async () => {
    if (!data || !isAuthenticated) return;

    try {
      setCompleting(true);

      // Optimistic UI update — instantly toggle the checkmark
      setData(prev => prev ? { ...prev, isCompleted: !prev.isCompleted } : prev);

      // Call the API
      if (data.isCompleted) {
        await markTopicIncomplete(data.topic._id);
      } else {
        await markTopicComplete(data.topic._id);
      }

      // Silent background refresh to sync with server
      loadTopic(true);
    } catch (error) {
      console.error('Error toggling completion:', error);
      // Revert on error
      loadTopic(true);
    } finally {
      setCompleting(false);
    }
  };

  const toggleAnswer = (questionId: string) => {
    setShowAnswer(prev => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black p-4 md:p-6">
        <div className="max-w-4xl mx-auto animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4" />
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-full mb-8" />
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Topic not found
          </h2>
          <Link to="/dashboard/roadmaps" className="text-[#00ADB5] hover:underline">
            Browse all roadmaps
          </Link>
        </div>
      </div>
    );
  }

  const { topic, questions, navigation, isCompleted } = data;
  const phaseInfo = PHASE_LABELS[topic.phase];
  const roadmapInfo = topic.roadmapId as { title: string; slug: string };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6 flex-wrap">
          <Link to="/dashboard/roadmaps" className="hover:text-[#00ADB5]">Roadmaps</Link>
          <ChevronRight className="w-4 h-4" />
          <Link to={`/dashboard/roadmaps/${roadmapInfo.slug}`} className="hover:text-[#00ADB5]">
            {roadmapInfo.title}
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 dark:text-white">{topic.title}</span>
        </div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700 mb-6"
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-start gap-4">
              <span className="text-4xl">{topic.icon}</span>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="px-2.5 py-1 text-xs font-medium rounded-full"
                    style={{
                      background: `${phaseInfo.color}20`,
                      color: phaseInfo.color
                    }}
                  >
                    {phaseInfo.label}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                    <Clock className="w-4 h-4" />
                    {topic.estimatedHours} hours
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {topic.title}
                </h1>
              </div>
            </div>

            {isAuthenticated && (
              <button
                onClick={handleToggleComplete}
                disabled={completing}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  isCompleted
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-[#00ADB5] text-white hover:bg-[#00969d]'
                } ${completing ? 'opacity-50' : ''}`}
              >
                {completing ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : null}
                {isCompleted ? 'Completed' : 'Mark Complete'}
              </button>
            )}
          </div>

          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {topic.description}
          </p>

          {/* Key Points */}
          {topic.keyPoints && topic.keyPoints.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Key Concepts
              </h3>
              <div className="flex flex-wrap gap-2">
                {topic.keyPoints.map((point, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg"
                  >
                    {point}
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Resources */}
        {topic.resources && topic.resources.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700 mb-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#00ADB5]" />
              Learning Resources
            </h2>
            <div className="space-y-3">
              {topic.resources.map((resource, i) => (
                <a
                  key={i}
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      resourceTypeColors[resource.type] || 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {resourceTypeIcons[resource.type] || <FileText className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-white group-hover:text-[#00ADB5] transition-colors truncate">
                      {resource.title}
                    </h4>
                    <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                      <span className="capitalize">{resource.type}</span>
                      {resource.platform && (
                        <>
                          <span>•</span>
                          <span>{resource.platform}</span>
                        </>
                      )}
                      {resource.duration && (
                        <>
                          <span>•</span>
                          <span>{resource.duration}</span>
                        </>
                      )}
                      {resource.isFree && (
                        <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs rounded">
                          Free
                        </span>
                      )}
                    </div>
                  </div>
                  <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-[#00ADB5] transition-colors" />
                </a>
              ))}
            </div>
          </motion.div>
        )}

        {/* Related Questions */}
        {questions && questions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700 mb-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-purple-500" />
              Related Interview Questions
            </h2>
            <div className="space-y-4">
              {questions.map(question => (
                <div
                  key={question._id}
                  className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded ${
                            question.difficulty === 'easy'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : question.difficulty === 'medium'
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}
                        >
                          {question.difficulty}
                        </span>
                        {question.company && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {question.company}
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {question.question}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleAnswer(question._id)}
                      className="text-sm text-[#00ADB5] hover:underline whitespace-nowrap"
                    >
                      {showAnswer[question._id] ? 'Hide' : 'Show'} Answer
                    </button>
                  </div>
                  {showAnswer[question._id] && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600"
                    >
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        {question.answer}
                      </p>
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Related Projects */}
        {topic.relatedProjects && topic.relatedProjects.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700 mb-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              🚀 Practice Projects
            </h2>
            <ul className="space-y-2">
              {topic.relatedProjects.map((project, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 text-gray-600 dark:text-gray-400"
                >
                  <div className="w-2 h-2 bg-[#00ADB5] rounded-full" />
                  {project}
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-between"
        >
          {navigation.prevTopic ? (
            <Link
              to={`/dashboard/roadmaps/topic/${navigation.prevTopic._id}`}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:border-[#00ADB5] hover:text-[#00ADB5] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{navigation.prevTopic.title}</span>
              <span className="sm:hidden">Previous</span>
            </Link>
          ) : (
            <div />
          )}

          <Link
            to={`/dashboard/roadmaps/${roadmapInfo.slug}`}
            className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-[#00ADB5] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Roadmap
          </Link>

          {navigation.nextTopic ? (
            <Link
              to={`/dashboard/roadmaps/topic/${navigation.nextTopic._id}`}
              className="flex items-center gap-2 px-4 py-2 bg-[#00ADB5] text-white rounded-lg hover:bg-[#00969d] transition-colors"
            >
              <span className="hidden sm:inline">{navigation.nextTopic.title}</span>
              <span className="sm:hidden">Next</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          ) : (
            <div />
          )}
        </motion.div>
      </div>
    </div>
  );
}
