import { AnimatePresence, motion } from 'framer-motion';
import {
    ArrowLeft,
    Building,
    ChevronDown,
    ChevronRight,
    HelpCircle,
    Search
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import CustomSelect from '../../Component/Global/CustomSelect';
import {
    getAllRoadmaps,
    getInterviewQuestions,
    type InterviewQuestion,
    type Roadmap
} from '../../service/roadmapService';

const difficultyOptions = [
  { value: 'all', label: 'All Difficulties' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' }
];

export default function InterviewPrep() {
  const { slug } = useParams<{ slug?: string }>();
  const [searchParams] = useSearchParams();

  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [selectedRoadmap, setSelectedRoadmap] = useState<Roadmap | null>(null);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [questionsLoading, setQuestionsLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [difficulty, setDifficulty] = useState(searchParams.get('difficulty') || 'all');
  const [category, setCategory] = useState(searchParams.get('category') || 'all');
  const [company, setCompany] = useState(searchParams.get('company') || '');

  const [categories, setCategories] = useState<string[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  const loadRoadmaps = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAllRoadmaps();
      setRoadmaps(data);

      // If slug is provided, select that roadmap
      if (slug) {
        const found = data.find(r => r.slug === slug);
        if (found) {
          setSelectedRoadmap(found);
        }
      } else if (data.length > 0) {
        // Default to first roadmap
        setSelectedRoadmap(data[0]);
      }
    } catch (error) {
      console.error('Error loading roadmaps:', error);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const loadQuestions = useCallback(async () => {
    if (!selectedRoadmap) return;

    try {
      setQuestionsLoading(true);
      const result = await getInterviewQuestions(selectedRoadmap._id, {
        difficulty: difficulty !== 'all' ? difficulty : undefined,
        category: category !== 'all' ? category : undefined,
        company: company || undefined,
        page: pagination.page,
        limit: pagination.limit
      });

      setQuestions(result.questions);
      setCategories(result.filters.categories);
      setCompanies(result.filters.companies);
      setPagination(prev => ({
        ...prev,
        total: result.pagination.total,
        totalPages: result.pagination.totalPages
      }));
    } catch (error) {
      console.error('Error loading questions:', error);
    } finally {
      setQuestionsLoading(false);
    }
  }, [selectedRoadmap, difficulty, category, company, pagination.page, pagination.limit]);

  useEffect(() => {
    loadRoadmaps();
  }, [loadRoadmaps]);

  useEffect(() => {
    if (selectedRoadmap) {
      loadQuestions();
    }
  }, [selectedRoadmap, loadQuestions]);

  const toggleQuestion = (questionId: string) => {
    setExpandedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const filteredQuestions = questions.filter(q => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      q.question.toLowerCase().includes(query) ||
      q.answer.toLowerCase().includes(query) ||
      q.tags.some(t => t.toLowerCase().includes(query))
    );
  });

  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    ...categories.map(c => ({ value: c, label: c }))
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black p-4 md:p-6">
        <div className="max-w-5xl mx-auto animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-8" />
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded mb-6" />
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link
            to="/dashboard/roadmaps"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-[#00ADB5] mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Roadmaps
          </Link>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
              <HelpCircle className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                Interview Preparation
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Practice questions from top companies
              </p>
            </div>
          </div>
        </motion.div>

        {/* Roadmap Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-900 rounded-xl p-4 mb-6 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex flex-wrap gap-2">
            {roadmaps.map(roadmap => (
              <button
                key={roadmap._id}
                onClick={() => {
                  setSelectedRoadmap(roadmap);
                  setPagination(prev => ({ ...prev, page: 1 }));
                  setCategory('all');
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  selectedRoadmap?._id === roadmap._id
                    ? 'bg-[#00ADB5] text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <span>{roadmap.icon}</span>
                <span className="font-medium">{roadmap.title}</span>
                <span className="text-xs opacity-75">
                  ({roadmap.totalQuestions})
                </span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-900 rounded-xl p-4 mb-6 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search questions..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-[#00ADB5] focus:border-transparent"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <CustomSelect
                value={difficulty}
                onChange={val => {
                  setDifficulty(val);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                options={difficultyOptions}
                placeholder="Difficulty"
              />
              <CustomSelect
                value={category}
                onChange={val => {
                  setCategory(val);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                options={categoryOptions}
                placeholder="Category"
              />
              {companies.length > 0 && (
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    value={company}
                    onChange={e => {
                      setCompany(e.target.value);
                      setPagination(prev => ({ ...prev, page: 1 }));
                    }}
                    className="pl-9 pr-8 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white appearance-none cursor-pointer"
                  >
                    <option value="">All Companies</option>
                    {companies.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="flex items-center justify-between mb-4"
        >
          <p className="text-gray-600 dark:text-gray-400">
            Showing {filteredQuestions.length} of {pagination.total} questions
          </p>
          <button
            onClick={() => setExpandedQuestions(new Set(questions.map(q => q._id)))}
            className="text-sm text-[#00ADB5] hover:underline"
          >
            Expand All
          </button>
        </motion.div>

        {/* Questions */}
        {questionsLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredQuestions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <HelpCircle className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No questions found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Try adjusting your filters or search query
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {filteredQuestions.map((question, index) => {
              const isExpanded = expandedQuestions.has(question._id);

              return (
                <motion.div
                  key={question._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.03 * index }}
                  className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  <button
                    onClick={() => toggleQuestion(question._id)}
                    className="w-full p-4 flex items-start gap-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <span
                        className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full ${
                          question.difficulty === 'easy'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : question.difficulty === 'medium'
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {question.difficulty}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {question.question}
                      </p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                          {question.category}
                        </span>
                        {question.company && (
                          <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">
                            {question.company}
                          </span>
                        )}
                        {question.tags.slice(0, 3).map(tag => (
                          <span
                            key={tag}
                            className="text-xs text-gray-500 dark:text-gray-400"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-gray-100 dark:border-gray-700"
                      >
                        <div className="p-4 bg-gray-50 dark:bg-gray-700">
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Answer:
                          </h4>
                          <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                            {question.answer}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex items-center justify-center gap-2 mt-8"
          >
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
              className="p-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>

            <span className="px-4 py-2 text-gray-600 dark:text-gray-400">
              Page {pagination.page} of {pagination.totalPages}
            </span>

            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page === pagination.totalPages}
              className="p-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
