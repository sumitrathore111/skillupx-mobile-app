import { Activity, Award, BarChart3, Calendar, Code, Code2, Flame, FolderOpen, Map, MessageSquare, RefreshCw, Share2, Star, Target, Trophy, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import { useDataContext } from '../../Context/UserDataContext';
import { apiRequest } from '../../service/api';
import { getSocket, initializeSocket } from '../../service/socketService';

// DASHBOARD CACHE - 60 second TTL for instant revisit loading
interface DashboardCache {
  codeArenaStats: any;
  projectStats: any;
  weeklyProgress: any[];
  monthlyStats: any[];
  earnedBadges: any[];
  completedTasksCount: number;
  timestamp: number;
}

const CACHE_TTL = 60000; // 60 seconds
let dashboardCache: DashboardCache | null = null;

const getCachedDashboard = (): DashboardCache | null => {
  if (!dashboardCache) return null;
  if (Date.now() - dashboardCache.timestamp > CACHE_TTL) {
    dashboardCache = null;
    return null;
  }
  return dashboardCache;
};

const setCachedDashboard = (data: Omit<DashboardCache, 'timestamp'>) => {
  dashboardCache = { ...data, timestamp: Date.now() };
};

// Badge Definitions
const BADGE_DEFINITIONS = [
  {
    id: 'gold_badge',
    name: 'Gold Badge',
    icon: '💻',
    description: 'Finish 5 Projects',
    requirement: { type: 'projects', count: 5 },
    category: 'achievement' as const,
    reward: 'Gold Badge'
  },
  {
    id: 'battle_master',
    name: '+500 Coins',
    icon: '⚔️',
    description: 'Win 50 CodeArena Battles',
    requirement: { type: 'battles', count: 50 },
    category: 'reward' as const,
    reward: '+500 Coins'
  },
  {
    id: 'collaborator_badge',
    name: 'Collaborator Badge',
    icon: '👥',
    description: 'Join 3 Teams',
    requirement: { type: 'teams', count: 3 },
    category: 'achievement' as const,
    reward: 'Collaborator Badge'
  },
  {
    id: 'elite_status',
    name: 'Elite Status',
    icon: '🏆',
    description: 'Get 3 Certificates',
    requirement: { type: 'certificates', count: 3 },
    category: 'status' as const,
    reward: 'Elite Status'
  },
  {
    id: 'star_developer',
    name: 'Star Developer',
    icon: '⭐',
    description: 'Reach 4.8+ Rating',
    requirement: { type: 'rating', count: 4.8 },
    category: 'status' as const,
    reward: 'Star Developer'
  },
  {
    id: 'coding_master',
    name: 'Coding Master',
    icon: '🎯',
    description: 'Solve 100+ DSA Problems',
    requirement: { type: 'challenges', count: 100 },
    category: 'achievement' as const,
    reward: 'Coding Master'
  }
];

export default function DashboardComingSoon() {
  // Real analytics state
  const [codeArenaStats, setCodeArenaStats] = useState<any>(null);
  const [projectStats, setProjectStats] = useState<any>(null);
  const [_totalHours, setTotalHours] = useState<number>(0);
  const [_weeklyProgress, setWeeklyProgress] = useState<any[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [_companyMatches, setCompanyMatches] = useState<any[]>([]);
  const [_techStack, setTechStack] = useState<any[]>([]);
  const [_skillDemand, setSkillDemand] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [earnedBadges, setEarnedBadges] = useState<any[]>([]);
  const [newBadgeEarned, setNewBadgeEarned] = useState<any>(null);
  const [completedTasksCount, setCompletedTasksCount] = useState<number>(0);
  const [trendPeriod, setTrendPeriod] = useState<'3m' | '6m' | '1y'>('6m');
  const [trendFilter, setTrendFilter] = useState<'all' | 'challenges' | 'battles' | 'projects'>('all');
  // Category targets - user can customize goals
  const [categoryTargets, setCategoryTargets] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('categoryTargets');
    return saved ? JSON.parse(saved) : {
      'Arrays & Strings': 50,
      'Trees & Graphs': 40,
      'Dynamic Programming': 35,
      'Sorting & Searching': 30,
      'Math & Logic': 25
    };
  });
  // Raw data for historical charts
  const [rawSubmissions, setRawSubmissions] = useState<any[]>([]);
  const [rawBattles, setRawBattles] = useState<any[]>([]);
  const [rawProjects, setRawProjects] = useState<any[]>([]);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const REFRESH_INTERVAL = 30000; // 30 seconds auto-refresh

  const {
    userprofile,
    // CodeArena functions
    getUserProgress,
    getUserWallet,
    fetchUserSubmissions,
    fetchUserBattles,
    // Company functions
    fetchCompanies,
    // Project functions
    fetchAllIdeas,
    fetchAllProjectMembers,
    // Creator Corner
    fetchCompletedTasksData
  } = useDataContext();

  const { user } = useAuth();

  // Check and award badges based on user stats
  const checkAndAwardBadges = useCallback(async (stats: {
    projects: number;
    battles: number;
    teams: number;
    certificates: number;
    rating: number;
    challenges: number;
  }) => {
    if (!user || !userprofile) return;

    const currentBadges = userprofile?.badges || [];
    const newBadges: any[] = [];

    for (const badge of BADGE_DEFINITIONS) {
      const alreadyEarned = currentBadges.some((b: any) => b.id === badge.id);
      if (alreadyEarned) continue;

      let earned = false;
      switch (badge.requirement.type) {
        case 'projects':
          earned = stats.projects >= badge.requirement.count;
          break;
        case 'battles':
          earned = stats.battles >= badge.requirement.count;
          break;
        case 'teams':
          earned = stats.teams >= badge.requirement.count;
          break;
        case 'certificates':
          earned = stats.certificates >= badge.requirement.count;
          break;
        case 'rating':
          earned = stats.rating >= badge.requirement.count;
          break;
        case 'challenges':
          earned = stats.challenges >= badge.requirement.count;
          break;
      }

      if (earned) {
        const newBadge = {
          id: badge.id,
          name: badge.name,
          icon: badge.icon,
          description: badge.description,
          earnedAt: new Date(),
          category: badge.category,
          reward: badge.reward
        };
        newBadges.push(newBadge);
      }
    }

    if (newBadges.length > 0) {
      try {
        // Save badges to backend - check response for actually saved badges
        const response = await apiRequest(`/users/${user.id}/badges`, {
          method: 'POST',
          body: JSON.stringify({ badges: newBadges })
        });

        // Only award coins if backend confirms badge was newly added
        const actuallyNewBadges = response?.newBadges || [];

        if (actuallyNewBadges.length > 0) {
          // Check if battle_master badge was actually newly earned - award 500 coins only once
          const battleMasterBadge = actuallyNewBadges.find((b: any) => b.id === 'battle_master');
          if (battleMasterBadge) {
            try {
              await apiRequest(`/wallet/${user.id}/add`, {
                method: 'POST',
                body: JSON.stringify({
                  amount: 500,
                  reason: 'Badge Reward: Won 50 CodeArena Battles! ⚔️'
                })
              });
              toast.success('💰 +500 Coins added to your wallet!', { duration: 4000, icon: '🪙' });
            } catch (coinError) {
              console.error('Failed to add coins:', coinError);
            }
          }

          // Show notification only for actually new badges
          actuallyNewBadges.forEach((badge: any, index: number) => {
            setTimeout(() => {
              setNewBadgeEarned(badge);
              toast.success(
                `🎉 Badge Unlocked: ${badge.icon} ${badge.name}!\n${badge.description}`,
                { duration: 5000, icon: '🏆' }
              );
            }, index * 1500);
          });
        }

        // Update local state with all badges from backend
        setEarnedBadges(response?.badges || [...currentBadges, ...newBadges]);
      } catch (error) {
        console.error('Failed to save badges:', error);
      }
    } else {
      setEarnedBadges(currentBadges);
    }
  }, [user, userprofile]);

  // Share badge function
  const shareBadge = async (badge: any) => {
    const shareText = `🏆 I just earned the "${badge.icon} ${badge.name}" badge on CodeTermite!\n\n${badge.description}\n\nJoin me and start your coding journey! 🚀`;
    const shareUrl = window.location.origin;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `I earned ${badge.name}!`,
          text: shareText,
          url: shareUrl
        });
        toast.success('Badge shared successfully!');
      } catch (error) {
        // User cancelled or error
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
        toast.success('Badge info copied to clipboard! Share it anywhere.');
      } catch {
        toast.error('Failed to copy');
      }
    }
  };

  // Calculate real analytics from user data - wrapped in useCallback for real-time updates
  const calculateRealAnalytics = useCallback(async (isManualRefresh = false, skipCache = false) => {
    if (!user) return;

    try {
      // CHECK CACHE FIRST - instant load!
      if (!isManualRefresh && !skipCache) {
        const cached = getCachedDashboard();
        if (cached) {
          // INSTANT UI from cache
          setCodeArenaStats(cached.codeArenaStats);
          setProjectStats(cached.projectStats);
          setWeeklyProgress(cached.weeklyProgress);
          setMonthlyStats(cached.monthlyStats);
          setEarnedBadges(cached.earnedBadges);
          setCompletedTasksCount(cached.completedTasksCount);
          setLoading(false);
          setLastUpdated(new Date());
          // Refresh in background (stale-while-revalidate)
          calculateRealAnalytics(true, true);
          return;
        }
      }

      if (isManualRefresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }

      // 1. CodeArena Analytics
      const [userProgress, userWallet, userSubmissions, userBattles] = await Promise.all([
        getUserProgress(user.id),
        getUserWallet(user.id),
        fetchUserSubmissions(user.id),
        fetchUserBattles(user.id)
      ]);

      const solvedChallenges = userProgress?.solvedChallenges?.length || 0;
      const totalCoins = userWallet?.coins || 0;
      const battleWins = userBattles?.filter((b: any) => b.winnerId === user.id).length || 0;
      const acceptedSubmissions = userSubmissions?.filter((s: any) => s.status === 'Accepted').length || 0;

      // Helper to parse date from various formats (Firestore, MongoDB, ISO string)
      const parseDate = (dateValue: any): number => {
        if (!dateValue) return 0;
        if (typeof dateValue?.toDate === 'function') return dateValue.toDate().getTime(); // Firestore
        if (typeof dateValue === 'string') return new Date(dateValue).getTime(); // ISO string
        if (typeof dateValue === 'number') return dateValue; // Timestamp
        if (dateValue instanceof Date) return dateValue.getTime(); // Date object
        return 0;
      };

      // Calculate today's solved challenges
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTimestamp = today.getTime();
      const todaysSolved = userSubmissions?.filter((s: any) => {
        const submissionTime = parseDate(s.submittedAt);
        return submissionTime >= todayTimestamp && s.status === 'Accepted';
      }).length || 0;

      setCodeArenaStats({
        challengesSolved: solvedChallenges,
        coins: totalCoins,
        battleWins,
        submissions: userSubmissions?.length || 0,
        acceptanceRate: userSubmissions?.length ? Math.round((acceptedSubmissions / userSubmissions.length) * 100) : 0,
        todaysSolved,
        totalSolved: solvedChallenges
      });

      // Store raw data for historical charts
      setRawSubmissions(userSubmissions || []);
      setRawBattles(userBattles || []);

      // 2. Project Analytics
      const [allIdeas, allMembers] = await Promise.all([
        fetchAllIdeas(),
        fetchAllProjectMembers()
      ]);

      const userCreatedProjects = allIdeas?.filter((idea: any) => idea.userId === user.id) || [];
      const userJoinedProjects = allMembers?.filter((member: any) => member.userId === user.id) || [];
      const approvedProjects = userCreatedProjects?.filter((p: any) => p.status === 'approved').length || 0;
      const contributingProjects = userJoinedProjects?.length || 0;

      // Store raw projects for historical charts
      setRawProjects([...userCreatedProjects, ...userJoinedProjects]);

      setProjectStats({
        created: userCreatedProjects.length,
        approved: approvedProjects,
        contributing: contributingProjects,
        total: userCreatedProjects.length + contributingProjects,
        pendingReview: userCreatedProjects?.filter((p: any) => p.status === 'pending').length || 0
      });

      // 4. Company Matches (based on user's target companies and skills)
      const companies = await fetchCompanies();
      const userSkills = userprofile?.skills || [];
      const targetCompanies = userprofile?.target_compnay || [];

      const matchedCompanies = companies?.filter((company: any) =>
        targetCompanies.includes(company.id)
      ).map((company: any) => {
        // Calculate match percentage based on skills overlap
        const requiredSkills = company.requiredSkills || [];
        const matchingSkills = userSkills.filter((skill: string) =>
          requiredSkills.some((req: string) =>
            req.toLowerCase().includes(skill.toLowerCase()) ||
            skill.toLowerCase().includes(req.toLowerCase())
          )
        );
        const matchPercentage = requiredSkills.length > 0 ?
          Math.round((matchingSkills.length / requiredSkills.length) * 100) : 75;

        return {
          name: company.name || company.companyName || 'Unknown Company',
          match: Math.min(matchPercentage, 100),
          roles: company.openRoles || company.jobOpenings?.length || 0,
          id: company.id
        };
      }).slice(0, 5) || [];

      setCompanyMatches(matchedCompanies);

      // 5. Technology Stack Analysis (from user's actual skills and projects)
      const userTechSkills = userSkills.filter((skill: string) =>
        ['react', 'javascript', 'typescript', 'node', 'python', 'java', 'angular', 'vue', 'css', 'html'].some((tech: string) =>
          skill.toLowerCase().includes(tech)
        )
      );

      const techColors = ['#06b6d4', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
      const techStackData = userTechSkills.slice(0, 5).map((skill: string, index: number) => {
        // Calculate proficiency based on projects and submissions
        const projectCount = userprofile?.projects?.filter((p: any) =>
          p.technologies?.some((tech: string) => tech.toLowerCase() === skill.toLowerCase())
        ).length || 0;
        const challengeCount = userSubmissions?.filter((s: any) =>
          s.language?.toLowerCase().includes(skill.toLowerCase())
        ).length || 0;

        const baseScore = 60;
        const projectBonus = Math.min(projectCount * 8, 30);
        const challengeBonus = Math.min(challengeCount * 2, 10);
        const proficiency = Math.min(baseScore + projectBonus + challengeBonus, 100);

        return {
          tech: skill,
          proficiency,
          projects: projectCount,
          color: techColors[index % techColors.length]
        };
      });

      setTechStack(techStackData);

      // 6. Skill Demand Analysis
      const marketDemand = {
        'React': 95, 'JavaScript': 98, 'Python': 88, 'Java': 85, 'TypeScript': 82,
        'Node.js': 80, 'Angular': 75, 'Vue.js': 70, 'CSS': 90, 'HTML': 92
      };

      const skillDemandData = userTechSkills.slice(0, 5).map((skill: string, index: number) => {
        const marketScore = marketDemand[skill as keyof typeof marketDemand] || 70;
        const yourScore = techStackData[index]?.proficiency || 60;
        const gap = marketScore - yourScore;

        let trend = 'Good Progress 👍';
        if (gap <= 0) trend = 'Perfect Match! 🎯';
        else if (gap <= 5) trend = 'Close Gap ↗️';
        else if (gap <= 10) trend = 'Good Progress 👍';
        else trend = 'Focus Area 📚';

        return {
          skill,
          market: marketScore,
          yours: yourScore,
          color: techColors[index % techColors.length],
          gap,
          trend
        };
      });

      setSkillDemand(skillDemandData);

      // Debug log for analytics data (prevents unused variable warnings)
      console.log('Analytics calculated:', {
        companyMatches: matchedCompanies.length,
        techStack: techStackData.length,
        skillDemand: skillDemandData.length
      });

      // Calculate total hours spent (estimated from submissions and projects)
      const submissionHours = userSubmissions?.reduce((acc: number, s: any) => acc + (s.timeSpent || 0), 0) || 0;
      const projectHours = userCreatedProjects.length * 20 + contributingProjects * 15; // Estimate

      // Generate weekly progress data from real submission timestamps
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0).getTime();
        const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999).getTime();

        // Count submissions for this day
        const daySubmissions = userSubmissions?.filter((s: any) => {
          const submissionTime = parseDate(s.submittedAt);
          return submissionTime >= dayStart && submissionTime <= dayEnd;
        }).length || 0;

        // Count project activity for this day
        const dayProjectActivity = [...userCreatedProjects, ...userJoinedProjects].filter((p: any) => {
          const projectTime = parseDate(p.createdAt) || parseDate(p.updatedAt);
          return projectTime >= dayStart && projectTime <= dayEnd;
        }).length || 0;

        // Count battle activity for this day
        const dayBattleActivity = userBattles?.filter((b: any) => {
          const battleTime = parseDate(b.createdAt);
          return battleTime >= dayStart && battleTime <= dayEnd;
        }).length || 0;

        return {
          day: new Date(date).toLocaleDateString('en', { weekday: 'short' }),
          challenges: daySubmissions,
          battles: dayBattleActivity,
          projects: dayProjectActivity,
        };
      });
      setWeeklyProgress(last7Days);

      // Generate monthly stats for pie charts
      const totalActivities = solvedChallenges + battleWins + userCreatedProjects.length + contributingProjects;
      setMonthlyStats([
        {
          name: 'Code Challenges',
          value: solvedChallenges,
          color: '#3b82f6',
          percentage: totalActivities > 0 ? Math.round((solvedChallenges / totalActivities) * 100) : 0
        },
        {
          name: 'Battle Wins',
          value: battleWins,
          color: '#10b981',
          percentage: totalActivities > 0 ? Math.round((battleWins / totalActivities) * 100) : 0
        },
        {
          name: 'Projects Created',
          value: userCreatedProjects.length,
          color: '#f59e0b',
          percentage: totalActivities > 0 ? Math.round((userCreatedProjects.length / totalActivities) * 100) : 0
        },
        {
          name: 'Collaborations',
          value: contributingProjects,
          color: '#8b5cf6',
          percentage: totalActivities > 0 ? Math.round((contributingProjects / totalActivities) * 100) : 0
        }
      ]);

      setTotalHours(Math.round((submissionHours + projectHours) / 60)); // Convert to hours

      // Fetch completed tasks from Creator Corner for certificates
      let tasksCount = 0;
      try {
        const completedTasksData = await fetchCompletedTasksData(user.id);
        tasksCount = completedTasksData.count || 0;
        setCompletedTasksCount(tasksCount); // Store in state for progress display
      } catch (error) {
        console.error('Error fetching completed tasks:', error);
      }

      // Calculate certificates: 1 certificate per 50 completed tasks
      const certificatesEarned = Math.floor(tasksCount / 50);

      // Check and award badges based on current stats
      const teamsJoined = userprofile?.teamsJoined || contributingProjects || 0;
      const rating = userprofile?.rating || 0;

      await checkAndAwardBadges({
        projects: approvedProjects,
        battles: battleWins,
        teams: teamsJoined,
        certificates: certificatesEarned,
        rating: rating,
        challenges: solvedChallenges
      });

      // CACHE dashboard data for instant revisit
      const monthlyStatsData = [
        { name: 'Code Challenges', value: solvedChallenges, color: '#3b82f6', percentage: totalActivities > 0 ? Math.round((solvedChallenges / totalActivities) * 100) : 0 },
        { name: 'Battle Wins', value: battleWins, color: '#10b981', percentage: totalActivities > 0 ? Math.round((battleWins / totalActivities) * 100) : 0 },
        { name: 'Projects Created', value: userCreatedProjects.length, color: '#f59e0b', percentage: totalActivities > 0 ? Math.round((userCreatedProjects.length / totalActivities) * 100) : 0 },
        { name: 'Collaborations', value: contributingProjects, color: '#8b5cf6', percentage: totalActivities > 0 ? Math.round((contributingProjects / totalActivities) * 100) : 0 }
      ];
      setCachedDashboard({
        codeArenaStats: {
          challengesSolved: solvedChallenges,
          coins: userWallet?.coins || 0,
          battleWins,
          submissions: userSubmissions?.length || 0,
          acceptanceRate: userSubmissions?.length ? Math.round((acceptedSubmissions / userSubmissions.length) * 100) : 0,
          todaysSolved,
          totalSolved: solvedChallenges
        },
        projectStats: {
          created: userCreatedProjects.length,
          approved: approvedProjects,
          contributing: contributingProjects,
          total: userCreatedProjects.length + contributingProjects,
          pendingReview: userCreatedProjects?.filter((p: any) => p.status === 'pending').length || 0
        },
        weeklyProgress: last7Days,
        monthlyStats: monthlyStatsData,
        earnedBadges: userprofile?.badges || [],
        completedTasksCount: tasksCount
      });

    } catch (error) {
      console.error('Error calculating analytics:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      setLastUpdated(new Date());
    }
  }, [user, userprofile, getUserProgress, getUserWallet, fetchUserSubmissions, fetchUserBattles, fetchAllIdeas, fetchAllProjectMembers, fetchCompanies, checkAndAwardBadges, fetchCompletedTasksData]);

  // Generate chart data from real user statistics
  const generateChartData = () => {
    const skills = [
      { name: 'React', current: Math.min((codeArenaStats?.challengesSolved || 0) * 5, 85), target: 90, color: '#61dafb' },
      { name: 'Python', current: Math.min((projectStats?.total || 0) * 12, 75), target: 85, color: '#3776ab' },
      { name: 'JavaScript', current: Math.min((codeArenaStats?.battleWins || 0) * 15, 80), target: 95, color: '#f7df1e' },
      { name: 'Node.js', current: Math.min((userprofile?.streakCount || 0) * 4, 70), target: 80, color: '#339933' }
    ];

    // Generate performance data from real stats
    const now = new Date();
    const performanceData = Array.from({ length: 6 }, (_, i) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const monthName = monthDate.toLocaleDateString('en', { month: 'short' });

      // Calculate score based on actual progress - older months have less data
      const baseScore = codeArenaStats?.acceptanceRate || 60;
      const progressBonus = Math.min(i * 5, 25); // Simulated growth over time
      const score = Math.min(baseScore + progressBonus, 100);

      // Calculate submissions for that month period
      const monthSubmissions = Math.max(0, (codeArenaStats?.submissions || 0) - (5 - i) * 3);

      return {
        month: monthName,
        score: Math.max(score, 50),
        submissions: Math.max(monthSubmissions, 0)
      };
    });

    // Generate achievements based on real user data
    const achievements = [];

    if ((codeArenaStats?.challengesSolved || 0) > 0) {
      achievements.push({
        title: `${codeArenaStats?.challengesSolved} Challenges Solved!`,
        date: 'Recent',
        type: 'challenge',
        value: (codeArenaStats?.challengesSolved || 0) * 10
      });
    }

    if ((projectStats?.approved || 0) > 0) {
      achievements.push({
        title: `${projectStats?.approved} Project${projectStats?.approved > 1 ? 's' : ''} Approved`,
        date: 'Recent',
        type: 'project',
        value: (projectStats?.approved || 0) * 50
      });
    }

    if ((userprofile?.streakCount || 0) >= 7) {
      achievements.push({
        title: `${userprofile?.streakCount}-Day Streak!`,
        date: 'Active',
        type: 'streak',
        value: (userprofile?.streakCount || 0) * 5
      });
    }

    if ((codeArenaStats?.battleWins || 0) > 0) {
      achievements.push({
        title: `${codeArenaStats?.battleWins} Battle${codeArenaStats?.battleWins > 1 ? 's' : ''} Won!`,
        date: 'Recent',
        type: 'battle',
        value: (codeArenaStats?.battleWins || 0) * 40
      });
    }

    // Add placeholder if no achievements yet
    if (achievements.length === 0) {
      achievements.push({
        title: 'Start your journey!',
        date: 'Get started',
        type: 'challenge',
        value: 0
      });
    }

    // Generate 4 weeks of activity data from real user activity
    // Calculate total activity from real stats
    const challengeActivity = codeArenaStats?.challengesSolved || 0;
    const projectActivity = projectStats?.total || 0;
    const battleActivity = codeArenaStats?.battleWins || 0;
    const streakDays = userprofile?.streakCount || 0;

    const totalActivity = challengeActivity + projectActivity + battleActivity;

    const activityData = Array.from({ length: 4 }, (_, weekIndex) =>
      Array.from({ length: 7 }, (_, dayIndex) => {
        const date = new Date();
        date.setDate(date.getDate() - (3 - weekIndex) * 7 - (6 - dayIndex));
        const daysAgo = (3 - weekIndex) * 7 + (6 - dayIndex);

        // Determine activity value based on streak and recent activity
        let activityValue = 0;

        // If within streak days, show activity
        if (daysAgo < streakDays) {
          // Base activity from streak
          activityValue = Math.min(Math.ceil(totalActivity / Math.max(streakDays, 1)), 8);
          // Add variation - more active on recent days and weekdays
          if (daysAgo < 7) activityValue = Math.min(activityValue + 1, 8);
          if (dayIndex >= 1 && dayIndex <= 5) activityValue = Math.min(activityValue + 1, 8);
        } else if (totalActivity > 0 && daysAgo < 14) {
          // Some scattered activity in the past 2 weeks based on total stats
          activityValue = Math.random() < 0.3 ? Math.min(Math.ceil(totalActivity / 10), 4) : 0;
        }

        // Ensure at least some activity shows if user has any stats
        if (totalActivity > 0 && daysAgo === 0) {
          activityValue = Math.max(activityValue, 1);
        }

        return {
          date: date.toLocaleDateString(),
          value: activityValue,
          day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayIndex]
        };
      })
    );

    return { skills, performanceData, achievements, activityData };
  };

  // MEMOIZED chart data - only recalculates when dependencies change
  const chartData = useMemo(() => generateChartData(), [codeArenaStats, projectStats, userprofile?.streakCount]);

  // Advanced Chart Components removed - were unused (RadialProgressChart, SkillComparisonChart, PerformanceTrendGraph, AchievementTimeline)

  const ActivityHeatmap = ({ data }: { data: Array<Array<{date: string, value: number, day: string}>> }) => {
    const getIntensity = (value: number) => {
      if (value === 0) return 'bg-gray-100 dark:bg-gray-700';
      if (value <= 2) return 'bg-green-200';
      if (value <= 4) return 'bg-green-300';
      if (value <= 6) return 'bg-green-400';
      return 'bg-green-500';
    };

    return (
      <div className="space-y-2">
        <div className="grid grid-cols-7 gap-1 text-xs text-gray-500 font-medium mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center">{day}</div>
          ))}
        </div>
        {data.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-1">
            {week.map((day, dayIndex) => (
              <div
                key={dayIndex}
                className={`w-6 h-6 rounded ${getIntensity(day.value)} hover:scale-110 transition-all cursor-pointer`}
                title={`${day.date}: ${day.value} activities`}
              />
            ))}
          </div>
        ))}
        <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
          <span>Less active</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded bg-gray-100 dark:bg-gray-700"></div>
            <div className="w-3 h-3 rounded bg-green-200"></div>
            <div className="w-3 h-3 rounded bg-green-300"></div>
            <div className="w-3 h-3 rounded bg-green-400"></div>
            <div className="w-3 h-3 rounded bg-green-500"></div>
          </div>
          <span>More active</span>
        </div>
      </div>
    );
  };

  const CircularProgress = ({ percentage, size = 120, strokeWidth = 8, color = '#3b82f6' }: {
    percentage: number;
    size?: number;
    strokeWidth?: number;
    color?: string;
  }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;

    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold" style={{ color }}>{percentage}%</span>
        </div>
      </div>
    );
  };

  const PieChart = ({ data }: { data: any[] }) => {
    // Handle undefined or empty data
    if (!data || !Array.isArray(data) || data.length === 0) {
      return (
        <div className="flex items-center justify-center w-48 h-48 bg-gray-100 dark:bg-gray-700 rounded-full">
          <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">No data available</span>
        </div>
      );
    }

    const total = data.reduce((sum, item) => sum + item.value, 0);
    let cumulativePercentage = 0;

    return (
      <div className="flex items-center gap-8">
        <div className="relative w-48 h-48">
          <svg width="192" height="192" className="transform -rotate-90">
            {data.map((item, index) => {
              const percentage = (item.value / total) * 100;
              const strokeDasharray = `${(percentage / 100) * 603} 603`;
              const strokeDashoffset = -((cumulativePercentage / 100) * 603);
              cumulativePercentage += percentage;

              return (
                <circle
                  key={index}
                  cx="96"
                  cy="96"
                  r="96"
                  stroke={item.color}
                  strokeWidth="32"
                  fill="none"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-1000"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{total}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Total Activities</div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">{item.name}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{item.value} ({item.percentage}%)</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Skill Radar Chart Component
  const SkillRadarChart = ({ skills }: { skills: { name: string; value: number }[] }) => {
    // Handle empty data
    if (!skills || skills.length === 0) {
      return (
        <div className="flex items-center justify-center h-[300px] text-gray-400">
          <p>No skill data available</p>
        </div>
      );
    }

    const centerX = 150;
    const centerY = 150;
    const maxRadius = 100;
    const levels = 5;
    const angleSlice = (Math.PI * 2) / skills.length;

    // Generate polygon points for each level
    const getLevelPoints = (level: number) => {
      const radius = (maxRadius * level) / levels;
      return skills.map((_, i) => {
        const angle = angleSlice * i - Math.PI / 2;
        return `${centerX + radius * Math.cos(angle)},${centerY + radius * Math.sin(angle)}`;
      }).join(' ');
    };

    // Generate data polygon points
    const getDataPoints = () => {
      return skills.map((skill, i) => {
        const angle = angleSlice * i - Math.PI / 2;
        const radius = (skill.value / 100) * maxRadius;
        return `${centerX + radius * Math.cos(angle)},${centerY + radius * Math.sin(angle)}`;
      }).join(' ');
    };

    return (
      <div className="flex flex-col items-center">
        <svg width="300" height="300" viewBox="0 0 300 300">
          {/* Background level circles */}
          {[1, 2, 3, 4, 5].map((level) => (
            <polygon
              key={level}
              points={getLevelPoints(level)}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="1"
              className="dark:stroke-gray-700"
            />
          ))}

          {/* Axis lines */}
          {skills.map((_, i) => {
            const angle = angleSlice * i - Math.PI / 2;
            return (
              <line
                key={i}
                x1={centerX}
                y1={centerY}
                x2={centerX + maxRadius * Math.cos(angle)}
                y2={centerY + maxRadius * Math.sin(angle)}
                stroke="#e5e7eb"
                strokeWidth="1"
                className="dark:stroke-gray-700"
              />
            );
          })}

          {/* Data polygon */}
          <polygon
            points={getDataPoints()}
            fill="rgba(0, 173, 181, 0.3)"
            stroke="#00ADB5"
            strokeWidth="2"
            className="transition-all duration-500"
          />

          {/* Data points */}
          {skills.map((skill, i) => {
            const angle = angleSlice * i - Math.PI / 2;
            const radius = (skill.value / 100) * maxRadius;
            return (
              <circle
                key={i}
                cx={centerX + radius * Math.cos(angle)}
                cy={centerY + radius * Math.sin(angle)}
                r="5"
                fill="#00ADB5"
                stroke="white"
                strokeWidth="2"
                className="transition-all duration-500"
              />
            );
          })}

          {/* Labels */}
          {skills.map((skill, i) => {
            const angle = angleSlice * i - Math.PI / 2;
            const labelRadius = maxRadius + 25;
            return (
              <text
                key={i}
                x={centerX + labelRadius * Math.cos(angle)}
                y={centerY + labelRadius * Math.sin(angle)}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-xs fill-gray-600 dark:fill-gray-400 font-medium"
              >
                {skill.name}
              </text>
            );
          })}
        </svg>
      </div>
    );
  };

  // Monthly Progress Line Chart Component
  const MonthlyLineChart = ({ data }: { data: { month: string; challenges: number; battles: number; projects: number }[] }) => {
    // Handle empty or insufficient data
    if (!data || data.length === 0) {
      return (
        <div className="w-full h-[200px] flex items-center justify-center text-gray-400">
          <p>No data available for this period</p>
        </div>
      );
    }

    const totalActivity = data.reduce((sum, d) => sum + d.challenges + d.battles + d.projects, 0);
    const maxValue = Math.max(1, ...data.flatMap(d => [d.challenges, d.battles, d.projects]));
    const chartWidth = 500;
    const chartHeight = 200;
    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    const graphWidth = chartWidth - padding.left - padding.right;
    const graphHeight = chartHeight - padding.top - padding.bottom;

    // Fix division by zero when data length is 1
    const getX = (index: number) => {
      if (data.length <= 1) return padding.left + graphWidth / 2; // Center single point
      return padding.left + (graphWidth / (data.length - 1)) * index;
    };
    const getY = (value: number) => padding.top + graphHeight - (value / maxValue) * graphHeight;

    const createLinePath = (key: 'challenges' | 'battles' | 'projects') => {
      return data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d[key])}`).join(' ');
    };

    // Show message overlay when there's no activity
    const hasNoActivity = totalActivity === 0;

    return (
      <div className="w-full overflow-x-auto relative">
        {hasNoActivity && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/60 dark:bg-gray-900/60 backdrop-blur-[1px] rounded-lg">
            <p className="text-gray-400 dark:text-gray-500 text-sm">No activity recorded in this period</p>
          </div>
        )}
        <svg width={chartWidth} height={chartHeight} className="w-full" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((percent) => (
            <g key={percent}>
              <line
                x1={padding.left}
                y1={padding.top + graphHeight - (percent / 100) * graphHeight}
                x2={chartWidth - padding.right}
                y2={padding.top + graphHeight - (percent / 100) * graphHeight}
                stroke="#e5e7eb"
                strokeDasharray="4"
                className="dark:stroke-gray-700"
              />
              <text
                x={padding.left - 8}
                y={padding.top + graphHeight - (percent / 100) * graphHeight}
                textAnchor="end"
                dominantBaseline="middle"
                className="text-xs fill-gray-400"
              >
                {Math.round((percent / 100) * maxValue)}
              </text>
            </g>
          ))}

          {/* Lines - only render if category has data */}
          {data.some(d => d.challenges > 0) && (
            <path d={createLinePath('challenges')} fill="none" stroke="#3b82f6" strokeWidth="3" className="transition-all duration-500" />
          )}
          {data.some(d => d.battles > 0) && (
            <path d={createLinePath('battles')} fill="none" stroke="#10b981" strokeWidth="3" className="transition-all duration-500" />
          )}
          {data.some(d => d.projects > 0) && (
            <path d={createLinePath('projects')} fill="none" stroke="#f59e0b" strokeWidth="3" className="transition-all duration-500" />
          )}

          {/* Data points - only render if category has data */}
          {data.map((d, i) => (
            <g key={i}>
              {d.challenges > 0 && (
                <circle cx={getX(i)} cy={getY(d.challenges)} r="4" fill="#3b82f6" stroke="white" strokeWidth="2" />
              )}
              {d.battles > 0 && (
                <circle cx={getX(i)} cy={getY(d.battles)} r="4" fill="#10b981" stroke="white" strokeWidth="2" />
              )}
              {d.projects > 0 && (
                <circle cx={getX(i)} cy={getY(d.projects)} r="4" fill="#f59e0b" stroke="white" strokeWidth="2" />
              )}
              <text
                x={getX(i)}
                y={chartHeight - 8}
                textAnchor="middle"
                className="text-xs fill-gray-500 dark:fill-gray-400"
              >
                {d.month}
              </text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  // Coins Trend Mini Chart
  const CoinsTrendChart = ({ data }: { data: number[] }) => {
    // Handle empty or single-point data
    if (!data || data.length === 0) {
      return <div className="w-[120px] h-[40px] flex items-center justify-center text-gray-400 text-xs">--</div>;
    }

    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;
    const width = 120;
    const height = 40;

    const points = data.map((val, i) => {
      const x = data.length <= 1 ? width / 2 : (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          <linearGradient id="coinGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          points={`0,${height} ${points} ${width},${height}`}
          fill="url(#coinGradient)"
        />
        <polyline
          points={points}
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  // Helper to parse date (same as in calculateRealAnalytics)
  const parseDate = useCallback((dateValue: any): number => {
    if (!dateValue) return 0;
    if (typeof dateValue?.toDate === 'function') return dateValue.toDate().getTime();
    if (typeof dateValue === 'string') return new Date(dateValue).getTime();
    if (typeof dateValue === 'number') return dateValue;
    if (dateValue instanceof Date) return dateValue.getTime();
    return 0;
  }, []);

  // Generate monthly data for line chart with REAL DATA
  const monthlyData = useMemo(() => {
    const allMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Determine how many months to show based on period
    const monthCount = trendPeriod === '3m' ? 3 : trendPeriod === '6m' ? 6 : 12;

    // Generate month data with year context
    const monthsData = [];
    for (let i = monthCount - 1; i >= 0; i--) {
      const targetDate = new Date(currentYear, currentMonth - i, 1);
      const monthIndex = targetDate.getMonth();
      const year = targetDate.getFullYear();

      // Calculate month boundaries
      const monthStart = new Date(year, monthIndex, 1, 0, 0, 0, 0).getTime();
      const monthEnd = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999).getTime();

      // Count REAL submissions for this month
      const monthChallenges = (trendFilter === 'all' || trendFilter === 'challenges')
        ? rawSubmissions.filter((s: any) => {
            const time = parseDate(s.submittedAt);
            return time >= monthStart && time <= monthEnd;
          }).length
        : 0;

      // Count REAL battles for this month
      const monthBattles = (trendFilter === 'all' || trendFilter === 'battles')
        ? rawBattles.filter((b: any) => {
            const time = parseDate(b.createdAt);
            return time >= monthStart && time <= monthEnd;
          }).length
        : 0;

      // Count REAL projects for this month
      const monthProjects = (trendFilter === 'all' || trendFilter === 'projects')
        ? rawProjects.filter((p: any) => {
            const time = parseDate(p.createdAt) || parseDate(p.updatedAt);
            return time >= monthStart && time <= monthEnd;
          }).length
        : 0;

      monthsData.push({
        month: allMonths[monthIndex],
        challenges: monthChallenges,
        battles: monthBattles,
        projects: monthProjects
      });
    }

    return monthsData;
  }, [rawSubmissions, rawBattles, rawProjects, trendPeriod, trendFilter, parseDate]);

  // Generate skill data for radar chart
  const skillData = useMemo(() => [
    { name: 'DSA', value: Math.min(100, (codeArenaStats?.challengesSolved || 0) * 2) },
    { name: 'Battles', value: Math.min(100, (codeArenaStats?.battleWins || 0) * 5) },
    { name: 'Projects', value: Math.min(100, (projectStats?.total || 0) * 10) },
    { name: 'Consistency', value: Math.min(100, (userprofile?.streakCount || 0) * 3.3) },
    { name: 'Collab', value: Math.min(100, (projectStats?.contributing || 0) * 15) },
    { name: 'Success', value: codeArenaStats?.acceptanceRate || 0 }
  ], [codeArenaStats, projectStats, userprofile]);

  // Generate coin trend data
  const coinTrendData = useMemo(() => {
    const baseCoins = codeArenaStats?.coins || 0;
    return Array.from({ length: 7 }, (_, i) => Math.max(0, baseCoins - (6 - i) * Math.floor(baseCoins * 0.1)));
  }, [codeArenaStats]);

  // Initial fetch and real-time auto-refresh setup
  useEffect(() => {
    if (userprofile) {
      calculateRealAnalytics();
    }

    // Set up auto-refresh interval for real-time data (fallback)
    refreshIntervalRef.current = setInterval(() => {
      if (userprofile && user) {
        calculateRealAnalytics(true);
      }
    }, REFRESH_INTERVAL);

    // Cleanup interval on unmount
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [userprofile, user, calculateRealAnalytics]);

  // WebSocket real-time updates - instant refresh on relevant events
  useEffect(() => {
    if (!user) return;

    initializeSocket();
    const socket = getSocket();
    if (!socket) return;

    // Join user's personal room for dashboard updates
    socket.emit('join-user', user.id);
    socket.emit('join-dashboard', user.id);

    // Event handler: Trigger instant refresh
    const triggerRefresh = () => {
      console.log('🔄 Real-time event received - refreshing dashboard');
      calculateRealAnalytics(true, true);
    };

    // Listen for CodeArena events
    socket.on('battleWon', triggerRefresh);
    socket.on('battleLost', triggerRefresh);
    socket.on('battleCompleted', triggerRefresh);
    socket.on('challengeSolved', triggerRefresh);
    socket.on('submissionResult', triggerRefresh);

    // Listen for Wallet events
    socket.on('walletUpdated', triggerRefresh);
    socket.on('coinsEarned', triggerRefresh);

    // Listen for Project events
    socket.on('projectApproved', triggerRefresh);
    socket.on('projectCreated', triggerRefresh);
    socket.on('memberJoined', triggerRefresh);

    // Listen for Badge events
    socket.on('badgeEarned', triggerRefresh);

    // Listen for general stats update
    socket.on('statsUpdated', triggerRefresh);
    socket.on('dashboardUpdate', triggerRefresh);

    // Cleanup listeners on unmount
    return () => {
      socket.off('battleWon', triggerRefresh);
      socket.off('battleLost', triggerRefresh);
      socket.off('battleCompleted', triggerRefresh);
      socket.off('challengeSolved', triggerRefresh);
      socket.off('submissionResult', triggerRefresh);
      socket.off('walletUpdated', triggerRefresh);
      socket.off('coinsEarned', triggerRefresh);
      socket.off('projectApproved', triggerRefresh);
      socket.off('projectCreated', triggerRefresh);
      socket.off('memberJoined', triggerRefresh);
      socket.off('badgeEarned', triggerRefresh);
      socket.off('statsUpdated', triggerRefresh);
      socket.off('dashboardUpdate', triggerRefresh);
      socket.emit('leave-user', user.id);
      socket.emit('leave-dashboard', user.id);
    };
  }, [user, calculateRealAnalytics]);

  // Manual refresh handler
  const handleManualRefresh = () => {
    calculateRealAnalytics(true);
  };

  // Format last updated time
  const formatLastUpdated = () => {
    if (!lastUpdated) return 'Never';
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastUpdated.getTime()) / 1000);
    if (diff < 5) return 'Just now';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return lastUpdated.toLocaleTimeString();
  };

  // Course Advertisement Component
  return (
    <div className="min-h-screen bg-white dark:bg-black p-4 sm:p-6 lg:p-8 overflow-x-hidden">
      <div className="max-w-7xl mx-auto w-full">

        {/* Clean Header */}
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1" style={{ color: '#00ADB5' }}>
              Welcome back, {userprofile?.name?.split(' ')[0] || 'Developer'}! 👋
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Here's your progress overview</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 rounded-full border border-green-200 dark:border-green-800">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-green-600 dark:text-green-400">{formatLastUpdated()}</span>
            </div>
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing || loading}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-gray-600 dark:text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Simple Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Challenges Solved', value: codeArenaStats?.challengesSolved || 0, icon: Code2, color: '#3b82f6', bg: 'bg-blue-50 dark:bg-blue-900/20' },
            { label: 'Battle Wins', value: codeArenaStats?.battleWins || 0, icon: Trophy, color: '#f59e0b', bg: 'bg-amber-50 dark:bg-amber-900/20' },
            { label: 'Projects', value: projectStats?.total || 0, icon: FolderOpen, color: '#8b5cf6', bg: 'bg-purple-50 dark:bg-purple-900/20' },
            { label: 'Day Streak', value: userprofile?.streakCount || 0, icon: Flame, color: '#ef4444', bg: 'bg-red-50 dark:bg-red-900/20' },
          ].map((stat, i) => (
            <div key={i} className={`${stat.bg} rounded-xl p-4 sm:p-5 border border-gray-100 dark:border-gray-800`}>
              <div className="flex items-center gap-3 mb-3">
                <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{stat.label}</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                {loading ? '—' : stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

          {/* Problem Categories Distribution */}
          <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Code2 className="w-5 h-5 text-indigo-500" />
              Problem Categories
              <span className="ml-auto text-xs font-normal px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full">
                Set your targets
              </span>
            </h3>
            <div className="space-y-3">
              {[
                { name: 'Arrays & Strings', solved: Math.round((codeArenaStats?.challengesSolved || 0) * 0.3), color: '#3b82f6' },
                { name: 'Trees & Graphs', solved: Math.round((codeArenaStats?.challengesSolved || 0) * 0.2), color: '#10b981' },
                { name: 'Dynamic Programming', solved: Math.round((codeArenaStats?.challengesSolved || 0) * 0.15), color: '#f59e0b' },
                { name: 'Sorting & Searching', solved: Math.round((codeArenaStats?.challengesSolved || 0) * 0.2), color: '#8b5cf6' },
                { name: 'Math & Logic', solved: Math.round((codeArenaStats?.challengesSolved || 0) * 0.15), color: '#ec4899' },
              ].map((category, i) => {
                const target = categoryTargets[category.name] || 50;
                const displaySolved = Math.min(category.solved, target);
                const percentage = target > 0 ? Math.min((category.solved / target) * 100, 100) : 0;
                const isCompleted = category.solved >= target;

                const updateTarget = (newTarget: number) => {
                  const newTargets = { ...categoryTargets, [category.name]: newTarget };
                  setCategoryTargets(newTargets);
                  localStorage.setItem('categoryTargets', JSON.stringify(newTargets));
                };

                return (
                  <div key={i} className="group">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className={`text-sm transition-colors flex items-center gap-1.5 ${isCompleted ? 'text-green-600 dark:text-green-400 font-medium' : 'text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white'}`}>
                        {isCompleted && <span className="text-green-500">✓</span>}
                        {category.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${isCompleted ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                          {isCompleted ? '✨ Done!' : `${displaySolved}/`}
                        </span>
                        {!isCompleted && (
                          <select
                            value={target}
                            onChange={(e) => updateTarget(Number(e.target.value))}
                            className="text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded px-1.5 py-0.5 border-0 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors focus:ring-1 focus:ring-indigo-500"
                          >
                            {[10, 20, 30, 40, 50, 75, 100, 150, 200].map(val => (
                              <option key={val} value={val}>{val}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${isCompleted ? 'animate-pulse' : ''}`}
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: isCompleted ? '#10b981' : category.color,
                          background: isCompleted ? 'linear-gradient(90deg, #10b981, #34d399)' : category.color
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Total Solved</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">{codeArenaStats?.challengesSolved || 0}</span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-green-500" />
              Performance
            </h3>
            <div className="space-y-4">
              {[
                { label: 'Acceptance Rate', value: codeArenaStats?.acceptanceRate || 0, color: '#10b981' },
                { label: 'Projects Approved', value: projectStats?.total > 0 ? Math.round((projectStats?.approved / projectStats?.total) * 100) : 0, color: '#8b5cf6' },
                { label: 'Streak Goal', value: Math.min(Math.round(((userprofile?.streakCount || 0) / 30) * 100), 100), color: '#f59e0b' },
              ].map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{item.value}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${item.value}%`, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

          {/* Pie Chart - Activity Breakdown */}
          <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-pink-500" />
              Activity Breakdown
              <span className="ml-auto text-xs font-normal px-2 py-1 bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 rounded-full">Real-time</span>
            </h3>
            <div className="flex justify-center">
              <PieChart data={monthlyStats.filter(s => s.value > 0)} />
            </div>
          </div>

          {/* Circular Progress - Key Metrics */}
          <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-cyan-500" />
              Performance Metrics
              <span className="ml-auto text-xs font-normal px-2 py-1 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded-full">Live</span>
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="flex flex-col items-center">
                <CircularProgress
                  percentage={codeArenaStats?.acceptanceRate || 0}
                  color="#06b6d4"
                  size={100}
                />
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-3">Success Rate</p>
              </div>
              <div className="flex flex-col items-center">
                <CircularProgress
                  percentage={Math.min((codeArenaStats?.battleWins || 0) * 10, 100)}
                  color="#10b981"
                  size={100}
                />
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-3">Battle Wins</p>
              </div>
              <div className="flex flex-col items-center">
                <CircularProgress
                  percentage={projectStats?.total > 0 ? Math.round((projectStats?.approved / projectStats?.total) * 100) : 0}
                  color="#8b5cf6"
                  size={100}
                />
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-3">Projects Done</p>
              </div>
              <div className="flex flex-col items-center">
                <CircularProgress
                  percentage={Math.min(((userprofile?.streakCount || 0) / 30) * 100, 100)}
                  color="#f59e0b"
                  size={100}
                />
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-3">Streak Goal</p>
              </div>
            </div>
          </div>
        </div>

        {/* NEW: Skill Radar & Coins Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

          {/* Skill Radar Chart */}
          <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-cyan-500" />
              Skill Radar
              <span className="ml-auto text-xs font-normal px-2 py-1 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded-full">Profile Analysis</span>
            </h3>
            <SkillRadarChart skills={skillData} />
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {skillData.slice(0, 3).map((skill, i) => (
                <div key={i} className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-lg font-bold text-cyan-600">{skill.value}%</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{skill.name}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Coins & Wallet Overview */}
          <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              Wallet Overview
              <span className="ml-auto text-xs font-normal px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full">Balance</span>
            </h3>

            {/* Main Balance Card */}
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-5 text-white mb-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-amber-100 text-sm">Total Balance</p>
                  <p className="text-4xl font-bold">{codeArenaStats?.coins || 0}</p>
                  <p className="text-amber-200 text-xs mt-1">NextStep Coins</p>
                </div>
                <div className="p-3 bg-white/20 rounded-xl">
                  <Star className="w-8 h-8" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-amber-100">7-day trend</span>
                <CoinsTrendChart data={coinTrendData} />
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                <p className="text-lg font-bold text-green-600">{codeArenaStats?.battleWins || 0}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Battle Rewards</p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                <p className="text-lg font-bold text-blue-600">{codeArenaStats?.challengesSolved || 0}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Challenge Bonus</p>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
                <p className="text-lg font-bold text-purple-600">{earnedBadges.length}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Badge Rewards</p>
              </div>
            </div>
          </div>
        </div>

        {/* NEW: Monthly Progress Line Chart */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-700 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-500" />
              Monthly Progress Trend
              <span className="text-xs font-normal px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                Real Data
              </span>
            </h3>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Period Filter */}
              <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                {[
                  { value: '3m', label: '3M' },
                  { value: '6m', label: '6M' },
                  { value: '1y', label: '1Y' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTrendPeriod(option.value as '3m' | '6m' | '1y')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                      trendPeriod === option.value
                        ? 'bg-indigo-500 text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {/* Category Filter */}
              <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                {[
                  { value: 'all', label: 'All' },
                  { value: 'challenges', label: 'Challenges', color: 'blue' },
                  { value: 'battles', label: 'Battles', color: 'green' },
                  { value: 'projects', label: 'Projects', color: 'amber' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTrendFilter(option.value as 'all' | 'challenges' | 'battles' | 'projects')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                      trendFilter === option.value
                        ? option.value === 'all'
                          ? 'bg-indigo-500 text-white shadow-sm'
                          : option.value === 'challenges'
                            ? 'bg-blue-500 text-white shadow-sm'
                            : option.value === 'battles'
                              ? 'bg-green-500 text-white shadow-sm'
                              : 'bg-amber-500 text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <MonthlyLineChart data={monthlyData} />

          {/* Legend - only show when 'all' filter is active */}
          {trendFilter === 'all' && (
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full" />
                <span className="text-xs text-gray-600 dark:text-gray-400">Challenges</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span className="text-xs text-gray-600 dark:text-gray-400">Battles</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-amber-500 rounded-full" />
                <span className="text-xs text-gray-600 dark:text-gray-400">Projects</span>
              </div>
            </div>
          )}
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

          {/* Learning Roadmaps */}
          <Link to="/dashboard/roadmaps" className="group bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-6 text-white hover:shadow-lg hover:shadow-emerald-500/20 transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <Map className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Learning Roadmaps</h3>
                <p className="text-emerald-100 text-sm">Your learning path</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex gap-6">
                <div>
                  <p className="text-2xl font-bold">{projectStats?.created || 0}</p>
                  <p className="text-xs text-emerald-200">Completed</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{projectStats?.contributing || 0}</p>
                  <p className="text-xs text-emerald-200">In Progress</p>
                </div>
              </div>
              <div className="p-2 bg-white/10 rounded-full group-hover:bg-white/20 transition-colors">
                <Target className="w-5 h-5" />
              </div>
            </div>
          </Link>

          {/* Developer Connect */}
          <Link to="/dashboard/developer-connect" className="group bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl p-6 text-white hover:shadow-lg hover:shadow-purple-500/20 transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Developer Connect</h3>
                <p className="text-violet-100 text-sm">Network & collaborate</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex gap-6">
                <div>
                  <p className="text-2xl font-bold">{userprofile?.skills?.length || 0}</p>
                  <p className="text-xs text-violet-200">Skills</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{projectStats?.contributing || 0}</p>
                  <p className="text-xs text-violet-200">Collabs</p>
                </div>
              </div>
              <div className="p-2 bg-white/10 rounded-full group-hover:bg-white/20 transition-colors">
                <MessageSquare className="w-5 h-5" />
              </div>
            </div>
          </Link>
        </div>

        {/* Activity Heatmap */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-700 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-500" />
            Activity Heatmap
            <span className="ml-auto text-xs font-normal px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full">Last 4 weeks</span>
          </h3>
          <ActivityHeatmap data={chartData.activityData} />
          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-lg font-bold text-green-600">{chartData.activityData.flat().reduce((sum, day) => sum + day.value, 0)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Activities</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-lg font-bold text-green-600">{chartData.activityData.flat().filter(day => day.value > 0).length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Active Days</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-lg font-bold text-green-600">{Math.round((chartData.activityData.flat().filter(day => day.value > 0).length / 28) * 100)}%</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Consistency</p>
            </div>
          </div>
        </div>

        {/* Activity Distribution */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-700 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-500" />
            Activity Distribution
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {monthlyStats.map((stat, i) => (
              <div key={i} className="text-center p-4 rounded-lg" style={{ backgroundColor: `${stat.color}15` }}>
                <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stat.name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Badges Section */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-700 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-purple-500" />
            My Badges
            {earnedBadges.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full">
                {earnedBadges.length} Earned
              </span>
            )}
          </h3>

          {/* Earned Badges */}
          {earnedBadges.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500" />
                Earned Badges
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {earnedBadges.map((badge, i) => {
                  const isNew = newBadgeEarned?.id === badge.id;
                  return (
                    <div
                      key={i}
                      className={`relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-300 ${
                        isNew
                          ? 'border-yellow-400 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 shadow-lg shadow-yellow-200 dark:shadow-yellow-900/30'
                          : 'border-green-200 dark:border-green-800 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20'
                      }`}
                    >
                      {isNew && (
                        <span className="absolute -top-2 -right-2 px-2 py-0.5 text-xs font-bold bg-yellow-400 text-yellow-900 rounded-full animate-pulse">
                          NEW!
                        </span>
                      )}
                      <div className="text-3xl">{badge.icon}</div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-900 dark:text-white">{badge.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{badge.description}</p>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          Earned {new Date(badge.earnedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => shareBadge(badge)}
                        className="p-2 rounded-lg bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors border border-gray-200 dark:border-gray-600"
                        title="Share this badge"
                      >
                        <Share2 className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Available Badges (Not Yet Earned) */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-500" />
              Available Badges
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {BADGE_DEFINITIONS.filter(
                badge => !earnedBadges.some((eb: any) => eb.id === badge.id)
              ).map((badge, i) => {
                // Calculate progress for each badge
                let progress = 0;
                let current = 0;
                const target = badge.requirement.count;

                switch (badge.requirement.type) {
                  case 'projects':
                    current = projectStats?.approved || 0;
                    break;
                  case 'battles':
                    current = codeArenaStats?.battleWins || 0;
                    break;
                  case 'teams':
                    current = userprofile?.teamsJoined || projectStats?.contributing || 0;
                    break;
                  case 'certificates':
                    // Certificates based on Creator Corner completed tasks (1 per 50 tasks)
                    current = Math.floor(completedTasksCount / 50);
                    break;
                  case 'rating':
                    current = userprofile?.rating || 0;
                    break;
                  case 'challenges':
                    current = codeArenaStats?.challengesSolved || 0;
                    break;
                }
                progress = Math.min((current / target) * 100, 100);

                return (
                  <div
                    key={i}
                    className="relative flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 opacity-75 hover:opacity-100 transition-opacity"
                  >
                    <div className="text-3xl grayscale">{badge.icon}</div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-600 dark:text-gray-400">{badge.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">{badge.description}</p>
                      {/* Progress bar */}
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                          <span>Progress</span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {current} / {target} {badge.requirement.type}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* All badges earned message */}
          {earnedBadges.length === BADGE_DEFINITIONS.length && (
            <div className="mt-6 text-center p-4 bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 rounded-xl border border-yellow-200 dark:border-yellow-800">
              <p className="text-2xl mb-2">🎉</p>
              <p className="font-bold text-yellow-800 dark:text-yellow-200">Congratulations!</p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">You've earned all badges! You're a true coding master.</p>
            </div>
          )}
        </div>

        {/* Recent Achievements */}
        <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Recent Achievements
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {chartData.achievements.slice(0, 4).map((ach, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  {ach.type === 'challenge' && <Code className="w-4 h-4 text-amber-600" />}
                  {ach.type === 'project' && <FolderOpen className="w-4 h-4 text-amber-600" />}
                  {ach.type === 'battle' && <Trophy className="w-4 h-4 text-amber-600" />}
                  {ach.type === 'streak' && <Flame className="w-4 h-4 text-amber-600" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{ach.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">+{ach.value} pts</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
