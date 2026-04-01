import { AnimatePresence, motion } from 'framer-motion';
import {
    ArrowUpDown,
    Award,
    BarChart3,
    BookOpen,
    Building2,
    Calendar,
    Check,
    CheckCircle,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Circle,
    Clock,
    Flame,
    FolderPlus,
    Gift,
    Heart,
    ListFilter,
    Lock,
    Plus,
    RefreshCw,
    Search,
    Settings,
    Shuffle,
    Sparkles,
    Target,
    TrendingUp,
    Trophy,
    X
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { useDataContext } from '../../Context/UserDataContext';
import { fetchAllQuestions, getAllTopics, type Question } from '../../service/questionsService';

type SortField = 'id' | 'title' | 'acceptance' | 'difficulty' | 'frequency';
type SortOrder = 'asc' | 'desc';
type StatusFilter = 'all' | 'solved' | 'unsolved' | 'attempted' | 'bookmarked';

// Popular companies for filtering
const POPULAR_COMPANIES = ['Google', 'Amazon', 'Microsoft', 'Meta', 'Apple', 'Netflix', 'Adobe', 'Goldman Sachs', 'Bloomberg', 'Uber'];

const PracticeChallenges = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getUserProgress } = useDataContext();

  const [challenges, setChallenges] = useState<any[]>([]);
  const [filteredChallenges, setFilteredChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('all');
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [solvedChallengeIds, setSolvedChallengeIds] = useState<Set<string>>(new Set());
  const [attemptedChallengeIds, setAttemptedChallengeIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTags, _setSelectedTags] = useState<string[]>([]);

  // NEW: Company filter
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);

  // NEW: Bookmarks (persisted)
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

  // NEW: Custom Lists
  const [customLists, setCustomLists] = useState<{id: string; name: string; problemIds: string[]}[]>([]);
  const [showListModal, setShowListModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [selectedListId, setSelectedListId] = useState<string>('all');
  const [showAddToListMenu, setShowAddToListMenu] = useState<string | null>(null);

  // NEW: Heatmap data from solved dates
  const [solvedDatesMap, setSolvedDatesMap] = useState<Map<string, number>>(new Map());

  // Load bookmarks from localStorage
  useEffect(() => {
    const savedBookmarks = localStorage.getItem('problemBookmarks');
    if (savedBookmarks) {
      try {
        const ids = JSON.parse(savedBookmarks);
        setBookmarkedIds(new Set(ids));
      } catch (e) {
        console.error('Error loading bookmarks:', e);
      }
    }
  }, []);

  // Save bookmarks to localStorage
  const toggleBookmark = (problemId: string) => {
    setBookmarkedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(problemId)) {
        newSet.delete(problemId);
      } else {
        newSet.add(problemId);
      }
      localStorage.setItem('problemBookmarks', JSON.stringify([...newSet]));
      return newSet;
    });
  };

  // Load custom lists from localStorage
  useEffect(() => {
    const savedLists = localStorage.getItem('customProblemLists');
    if (savedLists) {
      try {
        setCustomLists(JSON.parse(savedLists));
      } catch (e) {
        console.error('Error loading custom lists:', e);
      }
    }
  }, []);

  // Save custom lists to localStorage
  const saveListsToStorage = (lists: typeof customLists) => {
    localStorage.setItem('customProblemLists', JSON.stringify(lists));
  };

  // Create new list
  const handleCreateList = () => {
    if (newListName.trim()) {
      const newList = {
        id: `list_${Date.now()}`,
        name: newListName.trim(),
        problemIds: []
      };
      const updatedLists = [...customLists, newList];
      setCustomLists(updatedLists);
      saveListsToStorage(updatedLists);
      setNewListName('');
      setShowListModal(false);
    }
  };

  // Add problem to list
  const addToList = (problemId: string, listId: string) => {
    const updatedLists = customLists.map(list => {
      if (list.id === listId && !list.problemIds.includes(problemId)) {
        return { ...list, problemIds: [...list.problemIds, problemId] };
      }
      return list;
    });
    setCustomLists(updatedLists);
    saveListsToStorage(updatedLists);
    setShowAddToListMenu(null);
  };

  // Remove problem from list
  const removeFromList = (problemId: string, listId: string) => {
    const updatedLists = customLists.map(list => {
      if (list.id === listId) {
        return { ...list, problemIds: list.problemIds.filter(id => id !== problemId) };
      }
      return list;
    });
    setCustomLists(updatedLists);
    saveListsToStorage(updatedLists);
  };

  // Delete list
  const deleteList = (listId: string) => {
    const updatedLists = customLists.filter(list => list.id !== listId);
    setCustomLists(updatedLists);
    saveListsToStorage(updatedLists);
    if (selectedListId === listId) setSelectedListId('all');
  };

  // Advanced features state - now calculated from real data
  const [currentStreak, setCurrentStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [showDailyChallenge, setShowDailyChallenge] = useState(true);
  const [dailyCompleted, setDailyCompleted] = useState(false);
  const [weeklyGoal, setWeeklyGoal] = useState({ target: 10, completed: 0 });
  const [userAcceptanceRate, setUserAcceptanceRate] = useState(0);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [tempGoal, setTempGoal] = useState(10);

  // Load saved weekly goal from localStorage
  useEffect(() => {
    const savedGoal = localStorage.getItem('weeklyGoalTarget');
    if (savedGoal) {
      const target = parseInt(savedGoal, 10);
      if (!isNaN(target) && target > 0) {
        setWeeklyGoal(prev => ({ ...prev, target }));
        setTempGoal(target);
      }
    }
  }, []);

  // Save weekly goal to localStorage
  const handleSaveGoal = () => {
    if (tempGoal > 0 && tempGoal <= 100) {
      localStorage.setItem('weeklyGoalTarget', tempGoal.toString());
      setWeeklyGoal(prev => ({ ...prev, target: tempGoal }));
      setShowGoalModal(false);
    }
  };

  // Daily challenge - picks a problem based on the current date
  const [dailyChallenge, setDailyChallenge] = useState<any>(null);

  // Calculate daily challenge from loaded problems and check if completed
  useEffect(() => {
    if (challenges.length > 0) {
      // Use date to deterministically pick a daily challenge
      const today = new Date();
      const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
      const dailyIndex = dayOfYear % challenges.length;
      const selectedChallenge = challenges[dailyIndex];

      // Calculate time left until midnight
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const msLeft = midnight.getTime() - now.getTime();
      const hoursLeft = Math.floor(msLeft / (1000 * 60 * 60));
      const minutesLeft = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));

      setDailyChallenge({
        id: selectedChallenge.id,
        title: selectedChallenge.title,
        difficulty: selectedChallenge.difficulty,
        category: selectedChallenge.topic || selectedChallenge.category,
        reward: selectedChallenge.coinReward || 50,
        timeLeft: `${hoursLeft}h ${minutesLeft}m`,
        // Include full challenge data for navigation
        ...selectedChallenge
      });

      // Check if daily challenge is already completed
      const isCompleted = solvedChallengeIds.has(selectedChallenge.id?.toString() || selectedChallenge.id);
      setDailyCompleted(isCompleted);
    }
  }, [challenges, solvedChallengeIds]);

  // Study plans - progress calculated from solved challenges by topic
  const studyPlans = useMemo(() => {
    const dpProblems = challenges.filter(c => c.topic === 'Dynamic Programming' || c.tags?.includes('Dynamic Programming'));
    const dpSolved = dpProblems.filter(c => solvedChallengeIds.has(c.id?.toString() || c.id)).length;

    const arrayProblems = challenges.filter(c => c.topic === 'Array' || c.tags?.includes('Array'));
    const arraySolved = arrayProblems.filter(c => solvedChallengeIds.has(c.id?.toString() || c.id)).length;

    const treeProblems = challenges.filter(c => c.topic === 'Tree' || c.tags?.includes('Tree') || c.topic === 'Graph' || c.tags?.includes('Graph'));
    const treeSolved = treeProblems.filter(c => solvedChallengeIds.has(c.id?.toString() || c.id)).length;

    return [
      { name: 'Top Interview 150', progress: Math.min(solvedChallengeIds.size, 150), total: 150, icon: '💼' },
      { name: 'Array Mastery', progress: arraySolved, total: Math.max(arrayProblems.length, 75), icon: '🎯' },
      { name: 'DP + Trees', progress: dpSolved + treeSolved, total: Math.max(dpProblems.length + treeProblems.length, 80), icon: '🧠' },
    ];
  }, [challenges, solvedChallengeIds]);

  // Achievements - calculated from real progress
  const recentAchievements = useMemo(() => {
    const solved = solvedChallengeIds.size;
    return [
      {
        name: 'Week Warrior',
        icon: '🔥',
        earned: currentStreak >= 7,
        progress: currentStreak >= 7 ? 100 : Math.round((currentStreak / 7) * 100),
        description: `${currentStreak}/7 day streak`
      },
      {
        name: '100 Problems',
        icon: '💯',
        earned: solved >= 100,
        progress: solved >= 100 ? 100 : solved,
        description: `${solved}/100 solved`
      },
      {
        name: 'First Blood',
        icon: '⚡',
        earned: solved >= 1,
        progress: solved >= 1 ? 100 : 0,
        description: 'Solve your first problem'
      },
    ];
  }, [solvedChallengeIds.size, currentStreak]);

  const PROBLEMS_PER_PAGE = 50;

  const difficulties = [
    { id: 'all', label: 'All Levels', color: 'text-gray-400' },
    { id: 'easy', label: 'Easy', color: 'text-[#00b8a3]' },
    { id: 'medium', label: 'Medium', color: 'text-[#ffc01e]' },
    { id: 'hard', label: 'Hard', color: 'text-[#ff375f]' },
  ];

  const statusFilters = [
    { id: 'all', label: 'All', icon: Circle },
    { id: 'solved', label: 'Solved', icon: CheckCircle },
    { id: 'unsolved', label: 'Todo', icon: Target },
    { id: 'bookmarked', label: 'Bookmarked', icon: Heart },
  ];

  // List dropdown state (company dropdown already declared above)
  const [showListDropdown, setShowListDropdown] = useState(false);

  // LeetCode exact colors
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'text-[#00b8a3]'; // LeetCode teal
      case 'medium': return 'text-[#ffc01e]'; // LeetCode yellow
      case 'hard': return 'text-[#ff375f]'; // LeetCode red-pink
      default: return 'text-gray-500';
    }
  };

  const getDifficultyBgColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return 'bg-[#00b8a3]/10 border-[#00b8a3]/30';
      case 'medium': return 'bg-[#ffc01e]/10 border-[#ffc01e]/30';
      case 'hard': return 'bg-[#ff375f]/10 border-[#ff375f]/30';
      default: return 'bg-gray-500/10 border-gray-500/20';
    }
  };

  // Helper function to calculate streak from solved dates
  const calculateStreak = (dates: Date[]): { current: number; max: number } => {
    if (dates.length === 0) return { current: 0, max: 0 };

    // Sort dates descending (most recent first)
    const sortedDates = [...dates].sort((a, b) => b.getTime() - a.getTime());

    // Get unique dates (by day)
    const uniqueDays = new Set<string>();
    sortedDates.forEach(d => {
      const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      uniqueDays.add(dayKey);
    });
    const dayStrings = Array.from(uniqueDays).sort().reverse();

    // Calculate current streak (consecutive days from today or yesterday)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let currentStreak = 0;
    let checkDate = today;

    // Allow starting from today or yesterday
    const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    const yesterdayKey = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;

    if (uniqueDays.has(todayKey)) {
      currentStreak = 1;
      checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (uniqueDays.has(yesterdayKey)) {
      currentStreak = 1;
      checkDate = new Date(yesterday);
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Count consecutive days backwards
    while (currentStreak > 0) {
      const checkKey = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`;
      if (uniqueDays.has(checkKey)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Calculate max streak
    let maxStreak = 0;
    let tempStreak = 0;
    let prevDate: Date | null = null;

    dayStrings.reverse().forEach(dayStr => {
      const parts = dayStr.split('-').map(Number);
      const date = new Date(parts[0], parts[1], parts[2]);

      if (prevDate === null) {
        tempStreak = 1;
      } else {
        const diffDays = Math.round((date.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak++;
        } else {
          maxStreak = Math.max(maxStreak, tempStreak);
          tempStreak = 1;
        }
      }
      prevDate = date;
    });
    maxStreak = Math.max(maxStreak, tempStreak);

    return { current: currentStreak, max: Math.max(maxStreak, currentStreak) };
  };

  // Helper function to count solves this week
  const countWeeklySolves = (dates: Date[]): number => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Start from Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    return dates.filter(d => d >= startOfWeek).length;
  };

  // Fetch user's solved challenges and calculate stats
  useEffect(() => {
    const fetchSolvedChallenges = async () => {
      if (!user?.id) return;

      try {
        const progress = await getUserProgress(user.id);
        if (progress?.solvedChallenges) {
          const solvedIds = new Set<string>(
            progress.solvedChallenges.map((sc: any) => sc.challengeId?.toString() || sc.challengeId)
          );
          setSolvedChallengeIds(solvedIds);

          // Extract solved dates for streak calculation
          const dates = progress.solvedChallenges
            .map((sc: any) => sc.solvedAt ? new Date(sc.solvedAt) : null)
            .filter((d: Date | null): d is Date => d !== null);

          // Build heatmap data (count problems solved per day)
          const heatmapData = new Map<string, number>();
          dates.forEach((d: Date) => {
            const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            heatmapData.set(dateKey, (heatmapData.get(dateKey) || 0) + 1);
          });
          setSolvedDatesMap(heatmapData);

          // Calculate streaks
          const { current, max } = calculateStreak(dates);
          setCurrentStreak(current);
          setMaxStreak(max);

          // Calculate weekly solves
          const weeklySolves = countWeeklySolves(dates);
          setWeeklyGoal(prev => ({ ...prev, completed: weeklySolves }));

          // Calculate acceptance rate (if we have attempt data)
          const totalAttempts = progress.attemptedChallenges?.length || solvedIds.size;
          if (totalAttempts > 0) {
            const rate = Math.round((solvedIds.size / Math.max(totalAttempts, solvedIds.size)) * 100);
            setUserAcceptanceRate(rate);
          }
        }
        if (progress?.attemptedChallenges) {
          const attemptIds = new Set<string>(
            progress.attemptedChallenges.map((ac: any) => ac.challengeId?.toString() || ac.challengeId)
          );
          setAttemptedChallengeIds(attemptIds);
        }
      } catch (error) {
        console.error('Error fetching solved challenges:', error);
      }
    };

    fetchSolvedChallenges();
  }, [user?.id, getUserProgress]);

  useEffect(() => {
    const loadQuestions = async () => {
      setLoading(true);
      try {
        // Fetch all 3000 questions from GitHub
        const questionsData = await fetchAllQuestions();
        console.log('Questions loaded:', questionsData.length);

        const topics = await getAllTopics();
        console.log('Topics:', topics.length);

        // Convert questions to challenge format with problem numbers
        const challengesData = questionsData.map((q: Question, index: number) => ({
          id: q.id,
          problemNumber: index + 1,
          title: q.title,
          description: q.description,
          difficulty: q.difficulty,
          topic: q.category,
          tags: q.tags || [q.category],
          coinReward: q.coins,
          acceptanceRate: q.acceptanceRate ?? (Math.floor(Math.random() * 40) + 35),
          frequency: q.frequency ?? Math.random(),
          category: q.category,
          isDaily: false,
          isPremium: q.isPremium ?? false,
          testCases: q.testCases || q.test_cases,
          sampleCode: '',
          examples: '',
          constraints: q.constraints,
          solution_hint: q.solution_hint,
          // Additional fields for editor display
          companies: q.companies || [],
          relatedTopics: q.relatedTopics || [],
          similarProblems: q.similarProblems || [],
          hints: q.hints || [],
          totalSubmissions: q.totalSubmissions,
          totalAccepted: q.totalAccepted,
          likes: q.likes,
          dislikes: q.dislikes,
        }));

        console.log('Challenges prepared:', challengesData.length);
        setChallenges(challengesData);
        setAvailableTopics(topics);

        // Cache minimal problem data for prev/next navigation (keep it small for localStorage limit)
        const minimalProblems = challengesData.map((c: any) => ({
          id: c.id,
          title: c.title,
          difficulty: c.difficulty
        }));
        try {
          localStorage.setItem('cachedProblems', JSON.stringify(minimalProblems));
          console.log('Cached', minimalProblems.length, 'problems for navigation');
        } catch (e) {
          console.error('Failed to cache problems:', e);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error loading questions:', error);
        setLoading(false);
      }
    };

    loadQuestions();
  }, []);

  // Memoized filtered and sorted challenges
  const processedChallenges = useMemo(() => {
    let filtered = [...challenges];

    // Filter by difficulty
    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(c => c.difficulty === selectedDifficulty);
    }

    // Filter by topic
    if (selectedTopic !== 'all') {
      filtered = filtered.filter(c => c.topic === selectedTopic);
    }

    // Filter by tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(c =>
        selectedTags.some(tag => c.tags?.includes(tag) || c.category === tag)
      );
    }

    // NEW: Filter by company
    if (selectedCompany !== 'all') {
      filtered = filtered.filter(c =>
        c.companies?.some((comp: string) => comp.toLowerCase().includes(selectedCompany.toLowerCase()))
      );
    }

    // NEW: Filter by custom list
    if (selectedListId !== 'all') {
      const selectedList = customLists.find(l => l.id === selectedListId);
      if (selectedList) {
        filtered = filtered.filter(c => selectedList.problemIds.includes(c.id?.toString() || c.id));
      }
    }

    // Filter by status (including bookmarked)
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(c => {
        const problemId = c.id?.toString() || c.id;
        const isSolved = solvedChallengeIds.has(problemId);
        const isBookmarked = bookmarkedIds.has(problemId);
        if (selectedStatus === 'solved') return isSolved;
        if (selectedStatus === 'unsolved') return !isSolved;
        if (selectedStatus === 'bookmarked') return isBookmarked;
        return true;
      });
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.title.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query) ||
        c.problemNumber?.toString().includes(query) ||
        c.tags?.some((t: string) => t.toLowerCase().includes(query)) ||
        c.companies?.some((comp: string) => comp.toLowerCase().includes(query))
      );
    }

    // Sort (including frequency)
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'id':
          comparison = (a.problemNumber || 0) - (b.problemNumber || 0);
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'acceptance':
          comparison = (a.acceptanceRate || 0) - (b.acceptanceRate || 0);
          break;
        case 'difficulty': {
          const diffOrder: Record<string, number> = { easy: 1, medium: 2, hard: 3 };
          comparison = (diffOrder[a.difficulty] || 0) - (diffOrder[b.difficulty] || 0);
          break;
        }
        case 'frequency':
          comparison = (a.frequency || 0) - (b.frequency || 0);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [challenges, selectedDifficulty, selectedTopic, selectedTags, selectedCompany, selectedListId, customLists, selectedStatus, searchQuery, sortField, sortOrder, solvedChallengeIds, bookmarkedIds]);

  // Paginated challenges
  useEffect(() => {
    const start = (page - 1) * PROBLEMS_PER_PAGE;
    const paginated = processedChallenges.slice(start, start + PROBLEMS_PER_PAGE);
    setFilteredChallenges(paginated);
  }, [processedChallenges, page]);

  const totalPages = Math.ceil(processedChallenges.length / PROBLEMS_PER_PAGE);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const handlePickRandom = () => {
    if (processedChallenges.length > 0) {
      const randomIndex = Math.floor(Math.random() * processedChallenges.length);
      const randomChallenge = processedChallenges[randomIndex];
      handleSolve(randomChallenge);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const questionsData = await fetchAllQuestions();

      const challengesData = questionsData.map((q: Question, index: number) => ({
        id: q.id,
        problemNumber: index + 1,
        title: q.title,
        description: q.description,
        difficulty: q.difficulty,
        topic: q.category,
        tags: q.tags || [q.category],
        coinReward: q.coins,
        acceptanceRate: q.acceptanceRate ?? (Math.floor(Math.random() * 40) + 35),
        frequency: q.frequency ?? Math.random(),
        category: q.category,
        isDaily: false,
        isPremium: q.isPremium ?? false,
        testCases: q.testCases || q.test_cases,
        sampleCode: '',
        solution_hint: q.solution_hint,
        // Additional fields for editor display
        companies: q.companies || [],
        relatedTopics: q.relatedTopics || [],
        similarProblems: q.similarProblems || [],
        hints: q.hints || [],
        totalSubmissions: q.totalSubmissions,
        totalAccepted: q.totalAccepted,
        likes: q.likes,
        dislikes: q.dislikes,
      }));

      setChallenges(challengesData);
      setPage(1);
    } catch (error) {
      console.error('Error refreshing questions:', error);
    }
    setLoading(false);
  };

  const handleSolve = (challenge: any) => {
    navigate(`/dashboard/practice/${challenge.id}`, {
      state: { challenge }
    });
  };

  // Stats calculation
  const stats = useMemo(() => ({
    total: challenges.length,
    solved: solvedChallengeIds.size,
    easy: challenges.filter(c => c.difficulty === 'easy').length,
    medium: challenges.filter(c => c.difficulty === 'medium').length,
    hard: challenges.filter(c => c.difficulty === 'hard').length,
    easySolved: challenges.filter(c => c.difficulty === 'easy' && solvedChallengeIds.has(c.id?.toString() || c.id)).length,
    mediumSolved: challenges.filter(c => c.difficulty === 'medium' && solvedChallengeIds.has(c.id?.toString() || c.id)).length,
    hardSolved: challenges.filter(c => c.difficulty === 'hard' && solvedChallengeIds.has(c.id?.toString() || c.id)).length,
  }), [challenges, solvedChallengeIds]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1a1a1a]">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 pb-20 md:pb-6">

        {/* Daily Challenge Banner */}
        <AnimatePresence>
          {showDailyChallenge && !dailyCompleted && dailyChallenge && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="relative overflow-hidden bg-gradient-to-r from-[#ffa116] via-[#ff8c00] to-[#ff6b00] rounded-2xl p-6 text-white"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
              <div className="absolute bottom-0 left-1/2 w-32 h-32 bg-white/5 rounded-full translate-y-1/2" />

              <div className="relative flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold bg-white/20 px-2 py-0.5 rounded-full">DAILY CHALLENGE</span>
                      <span className="flex items-center gap-1 text-xs">
                        <Clock className="w-3 h-3" />
                        {dailyChallenge.timeLeft} left
                      </span>
                    </div>
                    <h3 className="text-xl font-bold">{dailyChallenge.title}</h3>
                    <div className="flex items-center gap-3 mt-1 text-sm text-white/80">
                      <span className="capitalize">{dailyChallenge.difficulty}</span>
                      <span>•</span>
                      <span>{dailyChallenge.category}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-xl backdrop-blur-sm">
                    <Gift className="w-5 h-5" />
                    <span className="font-bold">+{dailyChallenge.reward} coins</span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSolve(dailyChallenge)}
                    className="px-6 py-2 bg-white text-[#ff8c00] font-bold rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    Solve Now
                  </motion.button>
                  <button
                    onClick={() => setShowDailyChallenge(false)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    ×
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Streak */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl">
                <Flame className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{currentStreak}</div>
                <div className="text-xs text-gray-500">Day Streak</div>
              </div>
            </div>
            <div className="mt-3 flex gap-1">
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-1.5 rounded-full ${i < currentStreak % 7 ? 'bg-orange-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                />
              ))}
            </div>
          </motion.div>

          {/* Weekly Goal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 relative group"
          >
            <button
              onClick={() => { setTempGoal(weeklyGoal.target); setShowGoalModal(true); }}
              className="absolute top-2 right-2 p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-200 dark:hover:bg-gray-700"
              title="Edit Goal"
            >
              <Settings className="w-3.5 h-3.5 text-gray-500" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-[#00b8a3] to-[#00a394] rounded-xl">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{weeklyGoal.completed}/{weeklyGoal.target}</div>
                <div className="text-xs text-gray-500">Weekly Goal</div>
              </div>
            </div>
            <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div
                className="bg-[#00b8a3] h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((weeklyGoal.completed / weeklyGoal.target) * 100, 100)}%` }}
              />
            </div>
            {weeklyGoal.completed >= weeklyGoal.target && (
              <div className="mt-2 text-xs text-[#00b8a3] font-medium flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Goal achieved!
              </div>
            )}
          </motion.div>

          {/* Total Solved */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.solved}</div>
                <div className="text-xs text-gray-500">Problems Solved</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-400">
              {stats.solved > 0 ? (
                <>Top <span className="text-purple-500 font-medium">{Math.max(1, 100 - Math.floor(stats.solved / 10))}%</span> of users</>
              ) : (
                <span>Start solving to rank up!</span>
              )}
            </div>
          </motion.div>

          {/* Acceptance Rate */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{userAcceptanceRate || 0}%</div>
                <div className="text-xs text-gray-500">Acceptance</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-400">
              Best streak: <span className="text-[#00b8a3] font-medium">{maxStreak} days</span>
            </div>
          </motion.div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Progress Card */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white">Your Progress</h3>
              </div>

              {/* Circular Progress */}
              <div className="relative w-32 h-32 mx-auto mb-6">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-gray-200 dark:text-gray-700"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="url(#progressGradient)"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${(stats.solved / Math.max(stats.total, 1)) * 352} 352`}
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#00ADB5" />
                      <stop offset="100%" stopColor="#3B82F6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">{stats.solved}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">/{stats.total}</span>
                </div>
              </div>

              {/* Difficulty Breakdown - Using LeetCode colors */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#00b8a3]" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Easy</span>
                  </div>
                  <span className="text-sm font-medium text-[#00b8a3]">{stats.easySolved}/{stats.easy}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                  <div
                    className="bg-[#00b8a3] h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${(stats.easySolved / Math.max(stats.easy, 1)) * 100}%` }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#ffc01e]" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Medium</span>
                  </div>
                  <span className="text-sm font-medium text-[#ffc01e]">{stats.mediumSolved}/{stats.medium}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                  <div
                    className="bg-[#ffc01e] h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${(stats.mediumSolved / Math.max(stats.medium, 1)) * 100}%` }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#ff375f]" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Hard</span>
                  </div>
                  <span className="text-sm font-medium text-[#ff375f]">{stats.hardSolved}/{stats.hard}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                  <div
                    className="bg-[#ff375f] h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${(stats.hardSolved / Math.max(stats.hard, 1)) * 100}%` }}
                  />
                </div>
              </div>
            </motion.div>

            {/* Study Plans */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#ffa116]" />
                  <h3 className="font-bold text-gray-900 dark:text-white">Study Plans</h3>
                </div>
                <button className="text-xs text-[#ffa116] hover:underline">View All</button>
              </div>

              <div className="space-y-3">
                {studyPlans.map((plan, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{plan.icon}</span>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{plan.name}</div>
                        <div className="text-xs text-gray-500">{plan.progress}/{plan.total} completed</div>
                      </div>
                    </div>
                    <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                      <div
                        className="bg-[#ffa116] h-1 rounded-full"
                        style={{ width: `${(plan.progress / plan.total) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Achievements Preview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-500" />
                  <h3 className="font-bold text-gray-900 dark:text-white">Achievements</h3>
                </div>
                <button className="text-xs text-[#ffa116] hover:underline">View All</button>
              </div>

              <div className="flex justify-around">
                {recentAchievements.map((achievement, idx) => (
                  <div key={idx} className="text-center group relative">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-1 ${
                      achievement.earned
                        ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}>
                      {achievement.earned ? achievement.icon : <Lock className="w-5 h-5 text-gray-400" />}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 truncate w-16">{achievement.name}</div>
                    {!achievement.earned && achievement.progress !== undefined && (
                      <div className="text-xs text-[#ffa116]">{achievement.progress}%</div>
                    )}
                    {/* Tooltip with description */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                      {achievement.description}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Activity Heatmap */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#00b8a3]" />
                  <h3 className="font-bold text-gray-900 dark:text-white">Activity</h3>
                </div>
                <span className="text-xs text-gray-500">{solvedDatesMap.size} active days</span>
              </div>

              {/* Mini Heatmap - Last 12 weeks */}
              <div className="flex gap-1 overflow-hidden">
                {Array.from({ length: 12 }, (_, weekIdx) => {
                  const weekStart = new Date();
                  weekStart.setDate(weekStart.getDate() - (11 - weekIdx) * 7 - weekStart.getDay());

                  return (
                    <div key={weekIdx} className="flex flex-col gap-1">
                      {Array.from({ length: 7 }, (_, dayIdx) => {
                        const date = new Date(weekStart);
                        date.setDate(date.getDate() + dayIdx);
                        const dateStr = date.toISOString().split('T')[0];
                        const count = solvedDatesMap.get(dateStr) || 0;
                        const isFuture = date > new Date();

                        let intensity = 'bg-gray-100 dark:bg-gray-800';
                        if (!isFuture && count > 0) {
                          if (count === 1) intensity = 'bg-[#00b8a3]/30';
                          else if (count === 2) intensity = 'bg-[#00b8a3]/50';
                          else if (count <= 4) intensity = 'bg-[#00b8a3]/70';
                          else intensity = 'bg-[#00b8a3]';
                        }

                        return (
                          <div
                            key={dayIdx}
                            className={`w-3 h-3 rounded-sm ${intensity} ${isFuture ? 'opacity-30' : ''}`}
                            title={`${dateStr}: ${count} problem${count !== 1 ? 's' : ''}`}
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-end gap-2 mt-3 text-xs text-gray-500">
                <span>Less</span>
                <div className="flex gap-1">
                  <div className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-800" />
                  <div className="w-3 h-3 rounded-sm bg-[#00b8a3]/30" />
                  <div className="w-3 h-3 rounded-sm bg-[#00b8a3]/50" />
                  <div className="w-3 h-3 rounded-sm bg-[#00b8a3]/70" />
                  <div className="w-3 h-3 rounded-sm bg-[#00b8a3]" />
                </div>
                <span>More</span>
              </div>
            </motion.div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-4">
            {/* Search and Actions Bar */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4"
            >
              <div className="flex flex-wrap items-center gap-4">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search problems by title, number, or tag..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ffa116]/50 focus:border-[#ffa116] transition-all"
                  />
                </div>

                {/* Difficulty Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                  >
                    <ListFilter className="w-4 h-4" />
                    <span>Difficulty</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  {showFilters && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute z-50 top-full left-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden"
                    >
                      {difficulties.map((diff) => (
                        <button
                          key={diff.id}
                          onClick={() => { setSelectedDifficulty(diff.id); setShowFilters(false); setPage(1); }}
                          className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                            selectedDifficulty === diff.id ? 'bg-cyan-50 dark:bg-cyan-900/30' : ''
                          }`}
                        >
                          <span className={diff.color}>{diff.label}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </div>

                {/* Company Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowCompanyDropdown(!showCompanyDropdown)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                  >
                    <Building2 className="w-4 h-4" />
                    <span>{selectedCompany === 'all' ? 'Company' : selectedCompany}</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  {showCompanyDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute z-50 top-full left-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden max-h-64 overflow-y-auto"
                    >
                      <button
                        onClick={() => { setSelectedCompany('all'); setShowCompanyDropdown(false); setPage(1); }}
                        className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                          selectedCompany === 'all' ? 'bg-cyan-50 dark:bg-cyan-900/30' : ''
                        }`}
                      >
                        All Companies
                      </button>
                      {POPULAR_COMPANIES.map((company) => (
                        <button
                          key={company}
                          onClick={() => { setSelectedCompany(company); setShowCompanyDropdown(false); setPage(1); }}
                          className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                            selectedCompany === company ? 'bg-cyan-50 dark:bg-cyan-900/30' : ''
                          }`}
                        >
                          {company}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </div>

                {/* Custom Lists Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowListDropdown(!showListDropdown)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                  >
                    <FolderPlus className="w-4 h-4" />
                    <span>{selectedListId === 'all' ? 'Lists' : customLists.find(l => l.id === selectedListId)?.name || 'Lists'}</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  {showListDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute z-50 top-full left-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden"
                    >
                      <button
                        onClick={() => { setSelectedListId('all'); setShowListDropdown(false); setPage(1); }}
                        className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                          selectedListId === 'all' ? 'bg-cyan-50 dark:bg-cyan-900/30' : ''
                        }`}
                      >
                        All Problems
                      </button>
                      {customLists.map((list) => (
                        <div key={list.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700">
                          <button
                            onClick={() => { setSelectedListId(list.id); setShowListDropdown(false); setPage(1); }}
                            className={`flex-1 text-left text-sm ${
                              selectedListId === list.id ? 'text-cyan-600 dark:text-cyan-400' : 'text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {list.name} ({list.problemIds.length})
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteList(list.id); }}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <div className="border-t border-gray-200 dark:border-gray-700">
                        <button
                          onClick={() => { setShowListDropdown(false); setShowListModal(true); }}
                          className="w-full px-4 py-2.5 text-left text-sm text-cyan-600 dark:text-cyan-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Create New List
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                  {statusFilters.map((status) => (
                    <button
                      key={status.id}
                      onClick={() => { setSelectedStatus(status.id as StatusFilter); setPage(1); }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        selectedStatus === status.id
                          ? 'bg-white dark:bg-gray-700 text-cyan-600 dark:text-cyan-400 shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <status.icon className="w-3.5 h-3.5" />
                      {status.label}
                    </button>
                  ))}
                </div>

                {/* Pick Random */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handlePickRandom}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-purple-500/20"
                >
                  <Shuffle className="w-4 h-4" />
                  Pick Random
                </motion.button>

                {/* Refresh */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleRefresh}
                  disabled={loading}
                  className="p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </motion.button>
              </div>

              {/* Topic Tags */}
              {availableTopics.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => { setSelectedTopic('all'); setPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedTopic === 'all'
                        ? 'bg-cyan-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    All Topics
                  </button>
                  {availableTopics.slice(0, 12).map((topic) => (
                    <button
                      key={topic}
                      onClick={() => { setSelectedTopic(topic); setPage(1); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        selectedTopic === topic
                          ? 'bg-cyan-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {topic}
                    </button>
                  ))}
                  {availableTopics.length > 12 && (
                    <span className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400">
                      +{availableTopics.length - 12} more
                    </span>
                  )}
                </div>
              )}
            </motion.div>

            {/* Problems Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
            >
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-10 h-10 border-3 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4"
                    />
                    <p className="text-gray-600 dark:text-gray-400">Loading problems...</p>
                  </div>
                </div>
              ) : filteredChallenges.length === 0 ? (
                <div className="text-center py-20">
                  <BookOpen className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-700 dark:text-gray-300 text-lg font-medium">No problems found</p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">Try adjusting your filters</p>
                </div>
              ) : (
                <>
                  {/* Table Header */}
                  <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <div className="col-span-1 flex items-center gap-2 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200" onClick={() => handleSort('id')}>
                      Status
                    </div>
                    <div className="col-span-4 flex items-center gap-2 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200" onClick={() => handleSort('title')}>
                      Title
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                    <div className="col-span-2">Topic</div>
                    <div className="col-span-1 flex items-center gap-2 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200" onClick={() => handleSort('frequency')}>
                      Freq
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                    <div className="col-span-2 flex items-center gap-2 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200" onClick={() => handleSort('acceptance')}>
                      Acceptance
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                    <div className="col-span-2 flex items-center gap-2 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200" onClick={() => handleSort('difficulty')}>
                      Difficulty
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </div>

                  {/* Table Body */}
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredChallenges.map((challenge, index) => {
                      const isSolved = solvedChallengeIds.has(challenge.id?.toString() || challenge.id);
                      const isAttempted = attemptedChallengeIds.has(challenge.id?.toString() || challenge.id);

                      return (
                        <motion.div
                          key={challenge.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.02 }}
                          onClick={() => handleSolve(challenge)}
                          className={`grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-6 py-4 cursor-pointer transition-all duration-200 ${
                            isSolved
                              ? 'bg-emerald-50/50 dark:bg-emerald-900/10 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/20'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                          }`}
                        >
                          {/* Status */}
                          <div className="col-span-1 flex items-center">
                            {isSolved ? (
                              <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            ) : isAttempted ? (
                              <div className="w-5 h-5 rounded-full border-2 border-amber-500 flex items-center justify-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                            )}
                          </div>

                          {/* Title */}
                          <div className="col-span-4 flex items-center gap-3">
                            <span className="text-gray-400 dark:text-gray-500 text-sm font-mono min-w-[40px]">
                              {challenge.problemNumber}.
                            </span>
                            <span className="text-gray-900 dark:text-white font-medium hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors truncate flex-1">
                              {challenge.title}
                            </span>
                            {/* Bookmark & Add to List buttons */}
                            <div className="flex items-center gap-1 ml-auto">
                              {/* Remove from list button - only show when viewing a specific list */}
                              {selectedListId !== 'all' && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); removeFromList(challenge.id?.toString() || challenge.id, selectedListId); }}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                  title="Remove from list"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleBookmark(challenge.id?.toString() || challenge.id); }}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  bookmarkedIds.has(challenge.id?.toString() || challenge.id)
                                    ? 'text-red-500 bg-red-50 dark:bg-red-900/30'
                                    : 'text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                                title={bookmarkedIds.has(challenge.id?.toString() || challenge.id) ? 'Remove bookmark' : 'Bookmark'}
                              >
                                <Heart className={`w-3.5 h-3.5 ${bookmarkedIds.has(challenge.id?.toString() || challenge.id) ? 'fill-current' : ''}`} />
                              </button>
                              <div className="relative">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setShowAddToListMenu(showAddToListMenu === challenge.id ? null : challenge.id); }}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-cyan-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                  title="Add to list"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                                {showAddToListMenu === challenge.id && (
                                  <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg z-50">
                                    {customLists.length === 0 ? (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setShowAddToListMenu(null); setShowListModal(true); }}
                                        className="w-full px-3 py-2 text-left text-xs text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700"
                                      >
                                        Create a list first
                                      </button>
                                    ) : (
                                      customLists.map((list) => (
                                        <button
                                          key={list.id}
                                          onClick={(e) => { e.stopPropagation(); addToList(challenge.id?.toString() || challenge.id, list.id); setShowAddToListMenu(null); }}
                                          className="w-full px-3 py-2 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between"
                                        >
                                          {list.name}
                                          {list.problemIds.includes(challenge.id?.toString() || challenge.id) && (
                                            <Check className="w-3 h-3 text-green-500" />
                                          )}
                                        </button>
                                      ))
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Topic */}
                          <div className="col-span-2 flex items-center">
                            <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded-lg truncate">
                              {challenge.category}
                            </span>
                          </div>

                          {/* Frequency */}
                          <div className="col-span-1 flex items-center">
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                              <div
                                className="bg-[#ffa116] h-1.5 rounded-full"
                                style={{ width: `${Math.min((challenge.frequency || 0) * 100, 100)}%` }}
                                title={`Frequency: ${((challenge.frequency || 0) * 100).toFixed(0)}%`}
                              />
                            </div>
                          </div>

                          {/* Acceptance */}
                          <div className="col-span-2 flex items-center">
                            <span className="text-gray-600 dark:text-gray-400 text-sm">
                              {challenge.acceptanceRate?.toFixed(1)}%
                            </span>
                          </div>

                          {/* Difficulty */}
                          <div className="col-span-2 flex items-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getDifficultyBgColor(challenge.difficulty)} ${getDifficultyColor(challenge.difficulty)}`}>
                              {challenge.difficulty?.charAt(0).toUpperCase() + challenge.difficulty?.slice(1) || 'Unknown'}
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </>
              )}
            </motion.div>

            {/* Pagination */}
            {!loading && processedChallenges.length > PROBLEMS_PER_PAGE && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800"
              >
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {((page - 1) * PROBLEMS_PER_PAGE) + 1} to {Math.min(page * PROBLEMS_PER_PAGE, processedChallenges.length)} of {processedChallenges.length} problems
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-50 dark:bg-gray-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>

                  {/* Page Numbers */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                            page === pageNum
                              ? 'bg-cyan-500 text-white'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    {totalPages > 5 && page < totalPages - 2 && (
                      <>
                        <span className="text-gray-400">...</span>
                        <button
                          onClick={() => setPage(totalPages)}
                          className="w-8 h-8 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                        >
                          {totalPages}
                        </button>
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-50 dark:bg-gray-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Weekly Goal Edit Modal */}
      <AnimatePresence>
        {showGoalModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowGoalModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-[#00b8a3]" />
                Set Weekly Goal
              </h3>

              <p className="text-sm text-gray-500 mb-4">
                How many problems do you want to solve each week?
              </p>

              <div className="flex items-center gap-4 mb-6">
                <button
                  onClick={() => setTempGoal(Math.max(1, tempGoal - 1))}
                  className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center text-xl font-bold transition-colors"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={tempGoal}
                  onChange={(e) => setTempGoal(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="flex-1 text-center text-3xl font-bold bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00b8a3]"
                />
                <button
                  onClick={() => setTempGoal(Math.min(100, tempGoal + 1))}
                  className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center text-xl font-bold transition-colors"
                >
                  +
                </button>
              </div>

              {/* Quick presets */}
              <div className="flex gap-2 mb-6">
                {[5, 7, 10, 15, 21].map(preset => (
                  <button
                    key={preset}
                    onClick={() => setTempGoal(preset)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      tempGoal === preset
                        ? 'bg-[#00b8a3] text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowGoalModal(false)}
                  className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveGoal}
                  className="flex-1 py-3 rounded-xl bg-[#00b8a3] text-white font-medium hover:bg-[#00a394] transition-colors"
                >
                  Save Goal
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create List Modal */}
      <AnimatePresence>
        {showListModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowListModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-cyan-500" />
                Create New List
              </h3>

              <input
                type="text"
                placeholder="Enter list name..."
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 mb-4"
                autoFocus
              />

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowListModal(false); setNewListName(''); }}
                  className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateList}
                  disabled={!newListName.trim()}
                  className="flex-1 py-3 rounded-xl bg-cyan-500 text-white font-medium hover:bg-cyan-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create List
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PracticeChallenges;
