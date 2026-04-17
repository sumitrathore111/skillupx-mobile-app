import { motion } from 'framer-motion';
import {
    BookOpen,
    Briefcase,
    Clock,
    GraduationCap,
    Map,
    Search,
    Star,
    TrendingUp,
    Users
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import CustomSelect from '../../Component/Global/CustomSelect';
import {
    CATEGORY_LABELS,
    DIFFICULTY_LABELS,
    getAllRoadmaps,
    prefetchRoadmap,
    type Roadmap
} from '../../service/roadmapService';

// Component-level cache for instant revisit
interface RoadmapCache {
  roadmaps: Roadmap[];
  timestamp: number;
}
const CACHE_TTL = 60000; // 60 seconds
let roadmapListCache: RoadmapCache | null = null;

const getCachedRoadmaps = (): Roadmap[] | null => {
  if (!roadmapListCache) return null;
  if (Date.now() - roadmapListCache.timestamp > CACHE_TTL) {
    roadmapListCache = null;
    return null;
  }
  return roadmapListCache.roadmaps;
};

const setCachedRoadmaps = (roadmaps: Roadmap[]) => {
  roadmapListCache = { roadmaps, timestamp: Date.now() };
};

const categoryOptions = [
  { value: 'all', label: 'All Categories' },
  ...Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))
];

const difficultyOptions = [
  { value: 'all', label: 'All Levels' },
  ...Object.entries(DIFFICULTY_LABELS).map(([value, label]) => ({ value, label }))
];

export default function RoadmapList() {
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const fetchingRef = useRef(false);

  // Debounce search for performance
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 150);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery]);

  // Cache-first loading with background refresh
  const loadRoadmaps = useCallback(async (skipCache = false) => {
    if (fetchingRef.current && !skipCache) return;

    // CHECK CACHE FIRST - instant load!
    if (!skipCache) {
      const cached = getCachedRoadmaps();
      if (cached) {
        setRoadmaps(cached);
        setLoading(false);
        // Refresh in background (stale-while-revalidate)
        loadRoadmaps(true);
        return;
      }
    }

    fetchingRef.current = true;
    if (!skipCache) setLoading(true);

    try {
      const data = await getAllRoadmaps();
      setRoadmaps(data);
      setCachedRoadmaps(data);
    } catch (error) {
      console.error('Error loading roadmaps:', error);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  // MEMOIZED filtering - only recalculates when dependencies change
  const filteredRoadmaps = useMemo(() => {
    let filtered = [...roadmaps];

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(r => r.category === selectedCategory);
    }

    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(r => r.difficulty === selectedDifficulty);
    }

    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        r =>
          r.title.toLowerCase().includes(query) ||
          r.description.toLowerCase().includes(query) ||
          r.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [roadmaps, debouncedSearch, selectedCategory, selectedDifficulty]);

  useEffect(() => {
    loadRoadmaps();
  }, [loadRoadmaps]);

  // MEMOIZED stats - only recalculates when roadmaps change
  const stats = useMemo(() => ({
    totalRoadmaps: roadmaps.length,
    totalTopics: roadmaps.reduce((sum, r) => sum + r.totalTopics, 0),
    totalResources: roadmaps.reduce((sum, r) => sum + r.totalResources, 0),
    totalLearners: roadmaps.reduce((sum, r) => sum + r.enrolledCount, 0)
  }), [roadmaps]);

  // MEMOIZED featured roadmaps
  const featuredRoadmaps = useMemo(() => roadmaps.filter(r => r.isFeatured), [roadmaps]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black p-4 md:p-6">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-[#00ADB5] to-purple-600 rounded-xl flex items-center justify-center">
            <Map className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
            Learning Roadmaps
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Master IT skills with complete roadmaps. Track your progress, access curated resources,
          and prepare for interviews.
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
      >
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Map className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalRoadmaps}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Roadmaps</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalTopics}+</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Topics</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalResources}+</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Resources</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalLearners}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Learners</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Featured Roadmaps */}
      {featuredRoadmaps.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#00ADB5]" />
            Featured Roadmaps
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {featuredRoadmaps.slice(0, 3).map((roadmap, index) => (
              <Link
                key={roadmap._id}
                to={`/dashboard/roadmaps/${roadmap.slug}`}
                className="block"
                onMouseEnter={() => prefetchRoadmap(roadmap.slug)}
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  whileHover={{ scale: 1.02 }}
                  className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 text-white relative overflow-hidden group"
                  style={{
                    background: `linear-gradient(135deg, ${roadmap.color}20, ${roadmap.color}05)`
                  }}
                >
                  <div
                    className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-30"
                    style={{ background: roadmap.color }}
                  />
                  <div className="relative z-10">
                    <span className="text-4xl mb-3 block">{roadmap.icon}</span>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {roadmap.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                      {roadmap.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <Clock className="w-4 h-4" />
                        {roadmap.estimatedWeeks} weeks
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-gray-600 dark:text-gray-300">
                          {roadmap.rating.toFixed(1)}
                        </span>
                      </div>
                    </div>
                    {roadmap.userProgress && (
                      <div className="mt-4">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-500 dark:text-gray-400">Progress</span>
                          <span className="font-medium" style={{ color: roadmap.color }}>
                            {roadmap.userProgress.progressPercent}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${roadmap.userProgress.progressPercent}%`,
                              background: roadmap.color
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-gray-900 rounded-xl p-4 mb-6 border border-gray-200 dark:border-gray-700"
      >
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search roadmaps..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-[#00ADB5] focus:border-transparent"
            />
          </div>
          <div className="flex gap-3">
            <CustomSelect
              value={selectedCategory}
              onChange={setSelectedCategory}
              options={categoryOptions}
              placeholder="Category"
            />
            <CustomSelect
              value={selectedDifficulty}
              onChange={setSelectedDifficulty}
              options={difficultyOptions}
              placeholder="Difficulty"
            />
          </div>
        </div>
      </motion.div>

      {/* Roadmaps Grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-xl p-6 animate-pulse">
              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl mb-4" />
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-4" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredRoadmaps.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <Map className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No roadmaps found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Try adjusting your filters or search query
          </p>
        </motion.div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRoadmaps.map((roadmap, index) => (
            <motion.div
              key={roadmap._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * index }}
            >
              <Link
                to={`/dashboard/roadmaps/${roadmap.slug}`}
                onMouseEnter={() => prefetchRoadmap(roadmap.slug)}
              >
                <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:border-[#00ADB5] dark:hover:border-[#00ADB5] transition-all hover:shadow-lg group h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                      style={{ background: `${roadmap.color}20` }}
                    >
                      {roadmap.icon}
                    </div>
                    <span
                      className="px-2.5 py-1 text-xs font-medium rounded-full"
                      style={{
                        background: `${roadmap.color}20`,
                        color: roadmap.color
                      }}
                    >
                      {DIFFICULTY_LABELS[roadmap.difficulty]}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-[#00ADB5] transition-colors">
                    {roadmap.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                    {roadmap.description}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {roadmap.tags.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                    {roadmap.tags.length > 3 && (
                      <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                        +{roadmap.tags.length - 3}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        {roadmap.totalTopics} topics
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {roadmap.estimatedWeeks}w
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {roadmap.enrolledCount}
                    </div>
                  </div>

                  {roadmap.userProgress && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-gray-500 dark:text-gray-400">Your Progress</span>
                        <span className="font-medium text-[#00ADB5]">
                          {roadmap.userProgress.progressPercent}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#00ADB5] rounded-full transition-all"
                          style={{ width: `${roadmap.userProgress.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {/* CTA Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-12 text-center"
      >
        <div className="bg-gradient-to-r from-[#00ADB5] to-purple-600 rounded-2xl p-8 text-white">
          <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-90" />
          <h3 className="text-2xl font-bold mb-2">Ready to Start Your Journey?</h3>
          <p className="text-white/80 mb-6 max-w-xl mx-auto">
            Pick a roadmap, follow the structured path, and track your progress.
            Join thousands of learners mastering new skills every day.
          </p>
          <Link
            to="/dashboard/learning-dashboard"
            className="inline-flex items-center gap-2 bg-white text-[#00ADB5] px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors"
          >
            <TrendingUp className="w-5 h-5" />
            View Your Progress
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
