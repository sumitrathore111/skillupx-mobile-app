import express, { Response } from 'express';
import mongoose from 'mongoose';
import { auth, AuthRequest, optionalAuth } from '../middleware/auth';
import {
    CareerInfo,
    InterviewQuestion,
    LearningProgress,
    Roadmap,
    Topic
} from '../models/Roadmap';

const router = express.Router();

// ==================== IN-MEMORY CACHE ====================
interface CacheEntry<T> {
  data: T;
  expires: number;
}

const cache = new Map<string, CacheEntry<any>>();
const CACHE_TTL_LIST = 5 * 60 * 1000;   // 5 minutes for list
const CACHE_TTL_DETAIL = 2 * 60 * 1000; // 2 minutes for detail

function getCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache<T>(key: string, data: T, ttl: number): void {
  cache.set(key, { data, expires: Date.now() + ttl });
}

// Badge type for type safety
interface Badge {
  id: string;
  name: string;
  earnedAt: Date;
}

// ==================== ROADMAP ROUTES ====================

// Get all roadmaps (public) - with caching
router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { category, difficulty, featured, search } = req.query;
    const cacheKey = `roadmaps:${category || 'all'}:${difficulty || 'all'}:${featured || ''}:${search || ''}`;

    // Try to get from cache first (for unauthenticated or base data)
    let roadmaps = getCache<any[]>(cacheKey);

    if (!roadmaps) {
      const filter: any = { isPublished: true };

      if (category && category !== 'all') {
        filter.category = category;
      }
      if (difficulty && difficulty !== 'all') {
        filter.difficulty = difficulty;
      }
      if (featured === 'true') {
        filter.isFeatured = true;
      }
      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search as string, 'i')] } }
        ];
      }

      roadmaps = await Roadmap.find(filter)
        .sort({ isFeatured: -1, enrolledCount: -1, createdAt: -1 })
        .lean();

      // Cache the base roadmaps list
      setCache(cacheKey, roadmaps, CACHE_TTL_LIST);
    }

    // Set cache headers for browser
    res.set('Cache-Control', 'public, max-age=60');

    // If user is authenticated, add their progress
    if (req.user) {
      const userId = req.user._id;
      const progressList = await LearningProgress.find({
        userId,
        roadmapId: { $in: roadmaps.map((r: any) => r._id) }
      }).lean();

      const progressMap = new Map(
        progressList.map(p => [p.roadmapId.toString(), p])
      );

      const roadmapsWithProgress = roadmaps.map((roadmap: any) => {
        const progress = progressMap.get(roadmap._id.toString());
        const totalTopics = roadmap.totalTopics || 1;
        const completedTopics = progress?.completedTopics?.length || 0;

        return {
          ...roadmap,
          userProgress: {
            isEnrolled: !!progress,
            completedTopics,
            progressPercent: Math.round((completedTopics / totalTopics) * 100),
            lastAccessedAt: progress?.lastAccessedAt
          }
        };
      });

      return res.json(roadmapsWithProgress);
    }

    res.json(roadmaps);
  } catch (error: any) {
    console.error('Error fetching roadmaps:', error);
    res.status(500).json({ error: 'Failed to fetch roadmaps' });
  }
});

// Get single roadmap with topics (public) - with caching
router.get('/:slug', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { slug } = req.params;
    const cacheKey = `roadmap:${slug}`;

    // Try to get cached base data
    let cachedData = getCache<{
      roadmap: any;
      topicsByPhase: any;
      careerInfo: any;
      questionStats: any;
    }>(cacheKey);

    if (!cachedData) {
      const roadmap = await Roadmap.findOne({ slug, isPublished: true }).lean();

      if (!roadmap) {
        return res.status(404).json({ error: 'Roadmap not found' });
      }

      // Run all independent queries in parallel for faster load
      const [topics, careerInfo, questionStats] = await Promise.all([
        Topic.find({ roadmapId: roadmap._id }).sort({ phase: 1, order: 1 }).lean(),
        CareerInfo.find({ roadmapId: roadmap._id }).lean(),
        InterviewQuestion.aggregate([
          { $match: { roadmapId: roadmap._id } },
          { $group: { _id: '$difficulty', count: { $sum: 1 } } }
        ])
      ]);

      // Group topics by phase
      const topicsByPhase = {
        beginner: topics.filter(t => t.phase === 'beginner'),
        intermediate: topics.filter(t => t.phase === 'intermediate'),
        advanced: topics.filter(t => t.phase === 'advanced'),
        interview: topics.filter(t => t.phase === 'interview')
      };

      cachedData = { roadmap, topicsByPhase, careerInfo, questionStats };
      setCache(cacheKey, cachedData, CACHE_TTL_DETAIL);
    }

    // Set cache headers
    res.set('Cache-Control', 'public, max-age=30');

    // Fetch user progress separately (always fresh)
    let userProgress: any = null;
    if (req.user) {
      const progress = await LearningProgress.findOne({
        userId: req.user._id,
        roadmapId: cachedData.roadmap._id
      }).lean();

      if (progress) {
        const completedTopicIds = new Set(
          progress.completedTopics.map(t => t.topicId.toString())
        );

        userProgress = {
          isEnrolled: true,
          completedTopics: progress.completedTopics,
          completedTopicIds: Array.from(completedTopicIds),
          progressPercent: Math.round(
            (progress.completedTopics.length / (cachedData.roadmap.totalTopics || 1)) * 100
          ),
          startedAt: progress.startedAt,
          lastAccessedAt: progress.lastAccessedAt,
          currentStreak: progress.currentStreak,
          badges: progress.badges
        };
      }
    }

    res.json({
      ...cachedData,
      userProgress
    });
  } catch (error: any) {
    console.error('Error fetching roadmap:', error);
    res.status(500).json({ error: 'Failed to fetch roadmap' });
  }
});

// Get single topic with details
router.get('/topic/:topicId', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { topicId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(topicId)) {
      return res.status(400).json({ error: 'Invalid topic ID' });
    }

    const topic = await Topic.findById(topicId)
      .populate('roadmapId', 'title slug')
      .lean();

    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    // Get related interview questions
    const questions = await InterviewQuestion.find({
      $or: [
        { topicId: topic._id },
        { roadmapId: topic.roadmapId, tags: { $in: [topic.title.toLowerCase()] } }
      ]
    }).limit(10).lean();

    // Get next and previous topics
    const allTopics = await Topic.find({
      roadmapId: topic.roadmapId,
      phase: topic.phase
    }).sort({ order: 1 }).select('_id title order').lean();

    const currentIndex = allTopics.findIndex(t => t._id.toString() === topicId);
    const prevTopic = currentIndex > 0 ? allTopics[currentIndex - 1] : null;
    const nextTopic = currentIndex < allTopics.length - 1 ? allTopics[currentIndex + 1] : null;

    let isCompleted = false;
    if (req.user) {
      const progress = await LearningProgress.findOne({
        userId: req.user._id,
        roadmapId: topic.roadmapId,
        'completedTopics.topicId': topic._id
      });
      isCompleted = !!progress;
    }

    res.json({
      topic,
      questions,
      navigation: { prevTopic, nextTopic },
      isCompleted
    });
  } catch (error: any) {
    console.error('Error fetching topic:', error);
    res.status(500).json({ error: 'Failed to fetch topic' });
  }
});

// ==================== PROGRESS ROUTES ====================

// Enroll in a roadmap
router.post('/:roadmapId/enroll', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { roadmapId } = req.params;
    const userId = req.user!._id;

    if (!mongoose.Types.ObjectId.isValid(roadmapId)) {
      return res.status(400).json({ error: 'Invalid roadmap ID' });
    }

    const roadmap = await Roadmap.findById(roadmapId);
    if (!roadmap) {
      return res.status(404).json({ error: 'Roadmap not found' });
    }

    // Check if already enrolled
    const existing = await LearningProgress.findOne({ userId, roadmapId });
    if (existing) {
      return res.status(400).json({ error: 'Already enrolled in this roadmap' });
    }

    // Create progress record
    const progress = await LearningProgress.create({
      userId,
      roadmapId,
      completedTopics: [],
      completedQuestions: [],
      startedAt: new Date(),
      lastAccessedAt: new Date()
    });

    // Increment enrolled count
    await Roadmap.findByIdAndUpdate(roadmapId, { $inc: { enrolledCount: 1 } });

    res.status(201).json({ message: 'Enrolled successfully', progress });
  } catch (error: any) {
    console.error('Error enrolling:', error);
    res.status(500).json({ error: 'Failed to enroll' });
  }
});

// Mark topic as complete
router.post('/topic/:topicId/complete', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { topicId } = req.params;
    const { timeSpent } = req.body;
    const userId = req.user!._id;

    if (!mongoose.Types.ObjectId.isValid(topicId)) {
      return res.status(400).json({ error: 'Invalid topic ID' });
    }

    const topic = await Topic.findById(topicId);
    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    // Find or create progress
    let progress = await LearningProgress.findOne({
      userId,
      roadmapId: topic.roadmapId
    });

    if (!progress) {
      progress = await LearningProgress.create({
        userId,
        roadmapId: topic.roadmapId,
        completedTopics: [],
        completedQuestions: [],
        startedAt: new Date(),
        lastAccessedAt: new Date()
      });
      await Roadmap.findByIdAndUpdate(topic.roadmapId, { $inc: { enrolledCount: 1 } });
    }

    // Check if already completed
    const alreadyCompleted = progress.completedTopics.some(
      t => t.topicId.toString() === topicId
    );

    if (!alreadyCompleted) {
      progress.completedTopics.push({
        topicId: new mongoose.Types.ObjectId(topicId),
        completedAt: new Date(),
        timeSpent: timeSpent || 0
      });

      // Update streak
      const today = new Date().toDateString();
      const lastAccess = progress.lastAccessedAt?.toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();

      if (lastAccess === yesterday) {
        progress.currentStreak += 1;
        if (progress.currentStreak > progress.longestStreak) {
          progress.longestStreak = progress.currentStreak;
        }
      } else if (lastAccess !== today) {
        progress.currentStreak = 1;
      }

      // Check for badges
      const badges: Badge[] = [];
      const completedCount = progress.completedTopics.length;

      if (completedCount === 1) {
        badges.push({ id: 'first-topic', name: 'First Step', earnedAt: new Date() });
      }
      if (completedCount === 10) {
        badges.push({ id: 'ten-topics', name: 'Consistent Learner', earnedAt: new Date() });
      }
      if (completedCount === 25) {
        badges.push({ id: 'quarter-century', name: 'Knowledge Seeker', earnedAt: new Date() });
      }
      if (completedCount === 50) {
        badges.push({ id: 'half-century', name: 'Dedicated Scholar', earnedAt: new Date() });
      }
      if (progress.currentStreak === 7) {
        badges.push({ id: 'week-streak', name: 'Week Warrior', earnedAt: new Date() });
      }
      if (progress.currentStreak === 30) {
        badges.push({ id: 'month-streak', name: 'Monthly Master', earnedAt: new Date() });
      }

      if (badges.length > 0) {
        progress.badges.push(...badges as any);
      }
    }

    progress.lastAccessedAt = new Date();
    progress.totalTimeSpent += timeSpent || 0;
    await progress.save();

    // Check if roadmap is completed
    const roadmap = await Roadmap.findById(topic.roadmapId);
    if (roadmap && progress.completedTopics.length >= roadmap.totalTopics) {
      await Roadmap.findByIdAndUpdate(topic.roadmapId, { $inc: { completedCount: 1 } });
    }

    res.json({
      message: 'Topic marked as complete',
      progress: {
        completedTopics: progress.completedTopics.length,
        currentStreak: progress.currentStreak,
        newBadges: progress.badges.slice(-3)
      }
    });
  } catch (error: any) {
    console.error('Error completing topic:', error);
    res.status(500).json({ error: 'Failed to mark topic complete' });
  }
});

// Mark topic as incomplete
router.post('/topic/:topicId/uncomplete', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { topicId } = req.params;
    const userId = req.user!._id;

    const topic = await Topic.findById(topicId);
    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    await LearningProgress.updateOne(
      { userId, roadmapId: topic.roadmapId },
      {
        $pull: { completedTopics: { topicId: new mongoose.Types.ObjectId(topicId) } },
        $set: { lastAccessedAt: new Date() }
      }
    );

    res.json({ message: 'Topic marked as incomplete' });
  } catch (error: any) {
    console.error('Error uncompleting topic:', error);
    res.status(500).json({ error: 'Failed to mark topic incomplete' });
  }
});

// Get user's learning dashboard/analytics
router.get('/user/dashboard', auth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!._id;

    // Get all progress records for user
    const allProgress = await LearningProgress.find({ userId })
      .populate('roadmapId', 'title slug icon color totalTopics category')
      .lean();

    // Calculate overall stats
    let totalCompleted = 0;
    let totalTopics = 0;
    let totalTimeSpent = 0;
    let currentStreak = 0;
    let longestStreak = 0;
    const allBadges: any[] = [];

    const roadmapProgress = allProgress.map(progress => {
      const roadmap = progress.roadmapId as any;
      const completed = progress.completedTopics.length;
      const total = roadmap?.totalTopics || 1;

      totalCompleted += completed;
      totalTopics += total;
      totalTimeSpent += progress.totalTimeSpent;

      if (progress.currentStreak > currentStreak) {
        currentStreak = progress.currentStreak;
      }
      if (progress.longestStreak > longestStreak) {
        longestStreak = progress.longestStreak;
      }

      allBadges.push(...(progress.badges || []));

      return {
        roadmap: roadmap,
        completedTopics: completed,
        totalTopics: total,
        progressPercent: Math.round((completed / total) * 100),
        lastAccessedAt: progress.lastAccessedAt,
        startedAt: progress.startedAt
      };
    });

    // Get recent activity
    const recentActivity = allProgress
      .flatMap(p =>
        p.completedTopics.map(t => ({
          roadmapId: (p.roadmapId as any)?._id,
          roadmapTitle: (p.roadmapId as any)?.title,
          topicId: t.topicId,
          completedAt: t.completedAt
        }))
      )
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
      .slice(0, 10);

    // Fetch topic details for recent activity
    const topicIds = recentActivity.map(a => a.topicId);
    const topics = await Topic.find({ _id: { $in: topicIds } })
      .select('title phase')
      .lean();
    const topicMap = new Map(topics.map(t => [t._id.toString(), t]));

    const recentActivityWithDetails = recentActivity.map(a => ({
      ...a,
      topicTitle: topicMap.get(a.topicId.toString())?.title || 'Unknown',
      phase: topicMap.get(a.topicId.toString())?.phase || 'beginner'
    }));

    // Unique badges
    const uniqueBadges = Array.from(
      new Map(allBadges.map(b => [b.id, b])).values()
    );

    res.json({
      stats: {
        totalRoadmaps: allProgress.length,
        totalCompleted,
        totalTopics,
        overallProgress: totalTopics > 0 ? Math.round((totalCompleted / totalTopics) * 100) : 0,
        totalTimeSpent,
        currentStreak,
        longestStreak,
        badgeCount: uniqueBadges.length
      },
      roadmapProgress: roadmapProgress.sort(
        (a, b) => new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime()
      ),
      recentActivity: recentActivityWithDetails,
      badges: uniqueBadges
    });
  } catch (error: any) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

// ==================== INTERVIEW QUESTIONS ROUTES ====================

// Get interview questions for a roadmap
router.get('/:roadmapId/questions', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { roadmapId } = req.params;
    const { difficulty, company, category, page = 1, limit = 20 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(roadmapId)) {
      return res.status(400).json({ error: 'Invalid roadmap ID' });
    }

    const filter: any = { roadmapId };

    if (difficulty && difficulty !== 'all') {
      filter.difficulty = difficulty;
    }
    if (company) {
      filter.company = { $regex: company, $options: 'i' };
    }
    if (category && category !== 'all') {
      filter.category = category;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [questions, total] = await Promise.all([
      InterviewQuestion.find(filter)
        .sort({ difficulty: 1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      InterviewQuestion.countDocuments(filter)
    ]);

    // Get categories for filters
    const categories = await InterviewQuestion.distinct('category', { roadmapId });
    const companies = await InterviewQuestion.distinct('company', { roadmapId });

    res.json({
      questions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      },
      filters: {
        categories: categories.filter(Boolean),
        companies: companies.filter(Boolean)
      }
    });
  } catch (error: any) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// ==================== CAREER INFO ROUTES ====================

// Get career info for a roadmap
router.get('/:roadmapId/careers', async (req: AuthRequest, res: Response) => {
  try {
    const { roadmapId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(roadmapId)) {
      return res.status(400).json({ error: 'Invalid roadmap ID' });
    }

    const careers = await CareerInfo.find({ roadmapId })
      .sort({ demandLevel: -1, 'salaryRange.max': -1 })
      .lean();

    res.json(careers);
  } catch (error: any) {
    console.error('Error fetching careers:', error);
    res.status(500).json({ error: 'Failed to fetch career info' });
  }
});

// ==================== ADMIN ROUTES ====================

// Create a new roadmap (admin only)
router.post('/', auth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const roadmapData = {
      ...req.body,
      createdBy: req.user!._id,
      slug: req.body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    };

    const roadmap = await Roadmap.create(roadmapData);
    res.status(201).json(roadmap);
  } catch (error: any) {
    console.error('Error creating roadmap:', error);
    res.status(500).json({ error: 'Failed to create roadmap' });
  }
});

// Add topic to roadmap (admin only)
router.post('/:roadmapId/topics', auth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { roadmapId } = req.params;

    const topic = await Topic.create({
      ...req.body,
      roadmapId
    });

    // Update roadmap counts
    await Roadmap.findByIdAndUpdate(roadmapId, {
      $inc: {
        totalTopics: 1,
        totalResources: topic.resources?.length || 0
      }
    });

    res.status(201).json(topic);
  } catch (error: any) {
    console.error('Error creating topic:', error);
    res.status(500).json({ error: 'Failed to create topic' });
  }
});

// Add interview question (admin only)
router.post('/:roadmapId/questions', auth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { roadmapId } = req.params;

    const question = await InterviewQuestion.create({
      ...req.body,
      roadmapId
    });

    await Roadmap.findByIdAndUpdate(roadmapId, {
      $inc: { totalQuestions: 1 }
    });

    res.status(201).json(question);
  } catch (error: any) {
    console.error('Error creating question:', error);
    res.status(500).json({ error: 'Failed to create question' });
  }
});

// Add career info (admin only)
router.post('/:roadmapId/careers', auth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { roadmapId } = req.params;

    const career = await CareerInfo.create({
      ...req.body,
      roadmapId
    });

    res.status(201).json(career);
  } catch (error: any) {
    console.error('Error creating career:', error);
    res.status(500).json({ error: 'Failed to create career info' });
  }
});

// Seed sample data (admin only - for initial setup)
router.post('/seed', auth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Sample roadmaps data
    const sampleRoadmaps = [
      {
        title: 'Web Development',
        slug: 'web-development',
        description: 'Complete path to becoming a full-stack web developer',
        longDescription: 'Master HTML, CSS, JavaScript, React, Node.js, databases, and deployment. This comprehensive roadmap covers everything from basic web concepts to advanced full-stack development.',
        icon: '🌐',
        color: '#3B82F6',
        category: 'web',
        difficulty: 'all-levels',
        estimatedWeeks: 16,
        isPublished: true,
        isFeatured: true,
        prerequisites: ['Basic computer knowledge', 'Logical thinking'],
        outcomes: ['Build responsive websites', 'Create full-stack applications', 'Deploy to cloud platforms', 'Handle databases'],
        tags: ['html', 'css', 'javascript', 'react', 'nodejs', 'mongodb'],
        createdBy: req.user!._id
      },
      {
        title: 'Data Science',
        slug: 'data-science',
        description: 'Learn data analysis, visualization, and machine learning',
        longDescription: 'From Python basics to advanced ML models. Learn data manipulation with Pandas, visualization with Matplotlib, and build predictive models with Scikit-learn.',
        icon: '📊',
        color: '#10B981',
        category: 'data',
        difficulty: 'intermediate',
        estimatedWeeks: 20,
        isPublished: true,
        isFeatured: true,
        prerequisites: ['Basic programming', 'High school math'],
        outcomes: ['Analyze large datasets', 'Create data visualizations', 'Build ML models', 'Extract insights from data'],
        tags: ['python', 'pandas', 'numpy', 'matplotlib', 'scikit-learn', 'statistics'],
        createdBy: req.user!._id
      },
      {
        title: 'Machine Learning',
        slug: 'machine-learning',
        description: 'Deep dive into ML algorithms and neural networks',
        longDescription: 'Understand the math behind ML, implement algorithms from scratch, and build production-ready models with TensorFlow and PyTorch.',
        icon: '🤖',
        color: '#8B5CF6',
        category: 'ai-ml',
        difficulty: 'advanced',
        estimatedWeeks: 24,
        isPublished: true,
        isFeatured: true,
        prerequisites: ['Python programming', 'Linear algebra', 'Statistics'],
        outcomes: ['Implement ML algorithms', 'Build neural networks', 'Deploy ML models', 'Solve real-world problems'],
        tags: ['python', 'tensorflow', 'pytorch', 'deep-learning', 'neural-networks'],
        createdBy: req.user!._id
      },
      {
        title: 'SQL & Databases',
        slug: 'sql-databases',
        description: 'Master database design and SQL queries',
        longDescription: 'Learn relational database concepts, write complex SQL queries, design efficient schemas, and work with both SQL and NoSQL databases.',
        icon: '🗄️',
        color: '#F59E0B',
        category: 'database',
        difficulty: 'beginner',
        estimatedWeeks: 8,
        isPublished: true,
        isFeatured: false,
        prerequisites: ['Basic computer knowledge'],
        outcomes: ['Write complex SQL queries', 'Design database schemas', 'Optimize queries', 'Work with NoSQL'],
        tags: ['sql', 'mysql', 'postgresql', 'mongodb', 'database-design'],
        createdBy: req.user!._id
      },
      {
        title: 'DevOps',
        slug: 'devops',
        description: 'CI/CD, containerization, and cloud infrastructure',
        longDescription: 'Learn Docker, Kubernetes, CI/CD pipelines, cloud platforms (AWS/Azure/GCP), and infrastructure as code with Terraform.',
        icon: '⚙️',
        color: '#EF4444',
        category: 'devops',
        difficulty: 'intermediate',
        estimatedWeeks: 16,
        isPublished: true,
        isFeatured: false,
        prerequisites: ['Linux basics', 'Command line', 'Basic programming'],
        outcomes: ['Containerize applications', 'Set up CI/CD pipelines', 'Manage cloud infrastructure', 'Implement IaC'],
        tags: ['docker', 'kubernetes', 'aws', 'terraform', 'jenkins', 'github-actions'],
        createdBy: req.user!._id
      }
    ];

    // Create roadmaps
    const createdRoadmaps = await Roadmap.insertMany(sampleRoadmaps);
    const webDevRoadmap = createdRoadmaps[0];
    const dataScience = createdRoadmaps[1];

    // Sample topics for Web Development
    const webDevTopics = [
      // Beginner
      { roadmapId: webDevRoadmap._id, title: 'HTML Fundamentals', description: 'Learn the structure of web pages with HTML5', phase: 'beginner', order: 1, estimatedHours: 4, icon: '📄', keyPoints: ['HTML elements', 'Semantic HTML', 'Forms', 'Accessibility'], resources: [
        { title: 'HTML Tutorial - W3Schools', url: 'https://www.w3schools.com/html/', type: 'tutorial', platform: 'W3Schools', isFree: true },
        { title: 'HTML Crash Course', url: 'https://www.youtube.com/watch?v=UB1O30fR-EE', type: 'video', platform: 'YouTube', duration: '1 hour', isFree: true }
      ]},
      { roadmapId: webDevRoadmap._id, title: 'CSS Basics', description: 'Style your web pages with CSS', phase: 'beginner', order: 2, estimatedHours: 6, icon: '🎨', keyPoints: ['Selectors', 'Box model', 'Flexbox', 'Grid'], resources: [
        { title: 'CSS Tutorial - MDN', url: 'https://developer.mozilla.org/en-US/docs/Web/CSS', type: 'documentation', platform: 'MDN', isFree: true }
      ]},
      { roadmapId: webDevRoadmap._id, title: 'JavaScript Basics', description: 'Add interactivity to your websites', phase: 'beginner', order: 3, estimatedHours: 10, icon: '⚡', keyPoints: ['Variables', 'Functions', 'DOM manipulation', 'Events'], resources: [
        { title: 'JavaScript.info', url: 'https://javascript.info/', type: 'tutorial', platform: 'JavaScript.info', isFree: true }
      ]},
      // Intermediate
      { roadmapId: webDevRoadmap._id, title: 'React Fundamentals', description: 'Build modern UIs with React', phase: 'intermediate', order: 1, estimatedHours: 15, icon: '⚛️', keyPoints: ['Components', 'Props', 'State', 'Hooks'], resources: [
        { title: 'React Official Docs', url: 'https://react.dev/', type: 'documentation', platform: 'React', isFree: true }
      ]},
      { roadmapId: webDevRoadmap._id, title: 'Node.js & Express', description: 'Build backend APIs with Node.js', phase: 'intermediate', order: 2, estimatedHours: 12, icon: '🚀', keyPoints: ['REST APIs', 'Middleware', 'Routing', 'Error handling'], resources: []},
      { roadmapId: webDevRoadmap._id, title: 'MongoDB', description: 'Work with NoSQL databases', phase: 'intermediate', order: 3, estimatedHours: 8, icon: '🍃', keyPoints: ['CRUD operations', 'Mongoose', 'Aggregation', 'Indexing'], resources: []},
      // Advanced
      { roadmapId: webDevRoadmap._id, title: 'TypeScript', description: 'Add type safety to JavaScript', phase: 'advanced', order: 1, estimatedHours: 10, icon: '📘', keyPoints: ['Types', 'Interfaces', 'Generics', 'Type guards'], resources: []},
      { roadmapId: webDevRoadmap._id, title: 'Testing', description: 'Write tests for your applications', phase: 'advanced', order: 2, estimatedHours: 8, icon: '🧪', keyPoints: ['Unit testing', 'Integration testing', 'Jest', 'React Testing Library'], resources: []},
      { roadmapId: webDevRoadmap._id, title: 'Deployment & DevOps', description: 'Deploy your apps to production', phase: 'advanced', order: 3, estimatedHours: 6, icon: '☁️', keyPoints: ['Vercel', 'Docker basics', 'CI/CD', 'Environment variables'], resources: []},
      // Interview
      { roadmapId: webDevRoadmap._id, title: 'JavaScript Interview Prep', description: 'Prepare for JS technical interviews', phase: 'interview', order: 1, estimatedHours: 8, icon: '💼', keyPoints: ['Closures', 'Promises', 'Event loop', 'Prototypes'], resources: []},
      { roadmapId: webDevRoadmap._id, title: 'React Interview Prep', description: 'Master React interview questions', phase: 'interview', order: 2, estimatedHours: 6, icon: '💼', keyPoints: ['Virtual DOM', 'Hooks internals', 'Performance', 'State management'], resources: []},
    ];

    const createdTopics = await Topic.insertMany(webDevTopics);

    // Update roadmap counts
    await Roadmap.findByIdAndUpdate(webDevRoadmap._id, {
      totalTopics: createdTopics.length,
      totalResources: createdTopics.reduce((sum, t) => sum + (t.resources?.length || 0), 0)
    });

    // Machine Learning Roadmap Topics
    const mlRoadmap = createdRoadmaps[2]; // Machine Learning is index 2
    const mlTopics = [
      // Beginner
      { roadmapId: mlRoadmap._id, title: 'Python for ML', description: 'Master Python fundamentals for machine learning', phase: 'beginner', order: 1, estimatedHours: 15, icon: '🐍', keyPoints: ['Python basics', 'NumPy', 'Pandas', 'Data manipulation'], resources: [
        { title: 'Python for Data Science - Coursera', url: 'https://www.coursera.org/learn/python-for-applied-data-science-ai', type: 'course', platform: 'Coursera', isFree: false },
        { title: 'NumPy Tutorial', url: 'https://numpy.org/doc/stable/user/quickstart.html', type: 'documentation', platform: 'NumPy', isFree: true }
      ]},
      { roadmapId: mlRoadmap._id, title: 'Mathematics for ML', description: 'Essential math concepts - Linear Algebra, Calculus, Statistics', phase: 'beginner', order: 2, estimatedHours: 20, icon: '📐', keyPoints: ['Linear algebra', 'Calculus', 'Probability', 'Statistics'], resources: [
        { title: 'Mathematics for Machine Learning - Coursera', url: 'https://www.coursera.org/specializations/mathematics-machine-learning', type: 'course', platform: 'Coursera', isFree: false },
        { title: '3Blue1Brown Linear Algebra', url: 'https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab', type: 'video', platform: 'YouTube', isFree: true }
      ]},
      { roadmapId: mlRoadmap._id, title: 'Data Visualization', description: 'Visualize data with Matplotlib and Seaborn', phase: 'beginner', order: 3, estimatedHours: 8, icon: '📊', keyPoints: ['Matplotlib', 'Seaborn', 'Plotly', 'Data storytelling'], resources: []},
      // Intermediate
      { roadmapId: mlRoadmap._id, title: 'Supervised Learning', description: 'Classification and Regression algorithms', phase: 'intermediate', order: 1, estimatedHours: 25, icon: '🎯', keyPoints: ['Linear Regression', 'Logistic Regression', 'Decision Trees', 'SVM', 'KNN'], resources: [
        { title: 'Scikit-learn Documentation', url: 'https://scikit-learn.org/stable/supervised_learning.html', type: 'documentation', platform: 'Scikit-learn', isFree: true }
      ]},
      { roadmapId: mlRoadmap._id, title: 'Unsupervised Learning', description: 'Clustering and Dimensionality Reduction', phase: 'intermediate', order: 2, estimatedHours: 15, icon: '🔮', keyPoints: ['K-Means', 'Hierarchical Clustering', 'PCA', 'DBSCAN'], resources: []},
      { roadmapId: mlRoadmap._id, title: 'Model Evaluation', description: 'Metrics, Cross-validation, and Hyperparameter Tuning', phase: 'intermediate', order: 3, estimatedHours: 10, icon: '📈', keyPoints: ['Accuracy', 'Precision/Recall', 'F1 Score', 'ROC-AUC', 'Cross-validation'], resources: []},
      { roadmapId: mlRoadmap._id, title: 'Feature Engineering', description: 'Transform raw data into meaningful features', phase: 'intermediate', order: 4, estimatedHours: 12, icon: '🔧', keyPoints: ['Feature scaling', 'Encoding', 'Feature selection', 'Handling missing data'], resources: []},
      // Advanced
      { roadmapId: mlRoadmap._id, title: 'Deep Learning Fundamentals', description: 'Neural Networks and Backpropagation', phase: 'advanced', order: 1, estimatedHours: 30, icon: '🧠', keyPoints: ['Perceptrons', 'Activation functions', 'Backpropagation', 'Gradient descent'], resources: [
        { title: 'Deep Learning Specialization - Coursera', url: 'https://www.coursera.org/specializations/deep-learning', type: 'course', platform: 'Coursera', isFree: false },
        { title: 'Neural Networks - 3Blue1Brown', url: 'https://www.youtube.com/playlist?list=PLZHQObOWTQDNU6R1_67000Dx_ZCJB-3pi', type: 'video', platform: 'YouTube', isFree: true }
      ]},
      { roadmapId: mlRoadmap._id, title: 'TensorFlow & Keras', description: 'Build neural networks with TensorFlow', phase: 'advanced', order: 2, estimatedHours: 20, icon: '🔥', keyPoints: ['Tensors', 'Keras Sequential API', 'Custom layers', 'Model training'], resources: [
        { title: 'TensorFlow Official Tutorials', url: 'https://www.tensorflow.org/tutorials', type: 'tutorial', platform: 'TensorFlow', isFree: true }
      ]},
      { roadmapId: mlRoadmap._id, title: 'PyTorch', description: 'Dynamic neural networks with PyTorch', phase: 'advanced', order: 3, estimatedHours: 20, icon: '🔦', keyPoints: ['Tensors', 'Autograd', 'nn.Module', 'DataLoaders'], resources: [
        { title: 'PyTorch Tutorials', url: 'https://pytorch.org/tutorials/', type: 'tutorial', platform: 'PyTorch', isFree: true }
      ]},
      { roadmapId: mlRoadmap._id, title: 'CNNs for Computer Vision', description: 'Convolutional Neural Networks for image tasks', phase: 'advanced', order: 4, estimatedHours: 25, icon: '👁️', keyPoints: ['Convolutions', 'Pooling', 'ResNet', 'Transfer Learning'], resources: []},
      { roadmapId: mlRoadmap._id, title: 'RNNs & Transformers', description: 'Sequence models and attention mechanisms', phase: 'advanced', order: 5, estimatedHours: 25, icon: '🔄', keyPoints: ['RNN', 'LSTM', 'GRU', 'Attention', 'Transformers'], resources: []},
      { roadmapId: mlRoadmap._id, title: 'MLOps & Deployment', description: 'Deploy ML models to production', phase: 'advanced', order: 6, estimatedHours: 15, icon: '🚀', keyPoints: ['Model serialization', 'Flask/FastAPI', 'Docker', 'Cloud deployment'], resources: []},
      // Interview
      { roadmapId: mlRoadmap._id, title: 'ML Theory Interview', description: 'Prepare for ML theory questions', phase: 'interview', order: 1, estimatedHours: 12, icon: '💼', keyPoints: ['Bias-Variance tradeoff', 'Regularization', 'Overfitting', 'Loss functions'], resources: []},
      { roadmapId: mlRoadmap._id, title: 'ML Coding Interview', description: 'Implement ML algorithms from scratch', phase: 'interview', order: 2, estimatedHours: 15, icon: '💻', keyPoints: ['Linear Regression from scratch', 'Gradient Descent', 'K-Means implementation', 'Decision Tree'], resources: []},
      { roadmapId: mlRoadmap._id, title: 'ML System Design', description: 'Design end-to-end ML systems', phase: 'interview', order: 3, estimatedHours: 10, icon: '🏗️', keyPoints: ['Problem framing', 'Data pipeline', 'Model selection', 'Evaluation', 'Deployment'], resources: []},
    ];

    const createdMLTopics = await Topic.insertMany(mlTopics);
    await Roadmap.findByIdAndUpdate(mlRoadmap._id, {
      totalTopics: createdMLTopics.length,
      totalResources: createdMLTopics.reduce((sum, t) => sum + (t.resources?.length || 0), 0)
    });

    // Data Science Roadmap Topics
    const dataScienceRoadmap = createdRoadmaps[1];
    const dataScienceTopics = [
      // Foundation Phase
      { roadmapId: dataScienceRoadmap._id, title: 'Python for Data Science', description: 'Master Python basics, data structures, functions, and OOP for data analysis', phase: 'foundation', order: 1, estimatedHours: 20, icon: '🐍', keyPoints: ['Python basics', 'Lists, Dicts, Sets', 'Functions & Classes', 'File handling', 'Comprehensions'], resources: [{ title: 'Python.org Tutorial', type: 'documentation', url: 'https://docs.python.org/3/tutorial/' }] },
      { roadmapId: dataScienceRoadmap._id, title: 'Statistics & Probability', description: 'Foundation of statistical concepts essential for data analysis', phase: 'foundation', order: 2, estimatedHours: 25, icon: '📊', keyPoints: ['Descriptive statistics', 'Probability distributions', 'Hypothesis testing', 'Confidence intervals', 'Correlation'], resources: [] },
      { roadmapId: dataScienceRoadmap._id, title: 'Linear Algebra Basics', description: 'Matrix operations and vector spaces for ML algorithms', phase: 'foundation', order: 3, estimatedHours: 15, icon: '🔢', keyPoints: ['Vectors', 'Matrix operations', 'Eigenvalues', 'Linear transformations'], resources: [] },
      { roadmapId: dataScienceRoadmap._id, title: 'NumPy Mastery', description: 'Numerical computing with arrays and vectorized operations', phase: 'foundation', order: 4, estimatedHours: 10, icon: '🔵', keyPoints: ['Arrays', 'Broadcasting', 'Vectorization', 'Linear algebra ops', 'Random sampling'], resources: [] },
      // Intermediate Phase
      { roadmapId: dataScienceRoadmap._id, title: 'Pandas for Data Analysis', description: 'Data manipulation, cleaning, and analysis with Pandas', phase: 'intermediate', order: 1, estimatedHours: 20, icon: '🐼', keyPoints: ['DataFrames', 'Data cleaning', 'GroupBy operations', 'Merging/Joining', 'Time series'], resources: [] },
      { roadmapId: dataScienceRoadmap._id, title: 'Data Visualization', description: 'Create compelling visualizations with Matplotlib, Seaborn, and Plotly', phase: 'intermediate', order: 2, estimatedHours: 15, icon: '📈', keyPoints: ['Matplotlib basics', 'Seaborn statistical plots', 'Interactive plots with Plotly', 'Dashboard basics'], resources: [] },
      { roadmapId: dataScienceRoadmap._id, title: 'SQL for Data Science', description: 'Query databases and perform data analysis with SQL', phase: 'intermediate', order: 3, estimatedHours: 18, icon: '🗄️', keyPoints: ['SELECT queries', 'JOINs', 'Aggregations', 'Window functions', 'CTEs', 'Query optimization'], resources: [] },
      { roadmapId: dataScienceRoadmap._id, title: 'Exploratory Data Analysis', description: 'Techniques for understanding and exploring datasets', phase: 'intermediate', order: 4, estimatedHours: 15, icon: '🔍', keyPoints: ['Data profiling', 'Univariate analysis', 'Bivariate analysis', 'Missing data handling', 'Outlier detection'], resources: [] },
      { roadmapId: dataScienceRoadmap._id, title: 'Feature Engineering', description: 'Create and transform features for better model performance', phase: 'intermediate', order: 5, estimatedHours: 15, icon: '⚙️', keyPoints: ['Feature creation', 'Encoding categorical', 'Scaling', 'Feature selection', 'Dimensionality reduction'], resources: [] },
      // Advanced Phase
      { roadmapId: dataScienceRoadmap._id, title: 'Machine Learning Algorithms', description: 'Core ML algorithms for classification, regression, and clustering', phase: 'advanced', order: 1, estimatedHours: 25, icon: '🤖', keyPoints: ['Linear/Logistic regression', 'Decision trees', 'Random forests', 'SVM', 'K-Means', 'Ensemble methods'], resources: [] },
      { roadmapId: dataScienceRoadmap._id, title: 'Time Series Analysis', description: 'Analyze and forecast time-dependent data', phase: 'advanced', order: 2, estimatedHours: 18, icon: '⏰', keyPoints: ['Trend & Seasonality', 'ARIMA models', 'Prophet', 'Stationarity', 'Forecasting'], resources: [] },
      { roadmapId: dataScienceRoadmap._id, title: 'A/B Testing & Experimentation', description: 'Design and analyze experiments for data-driven decisions', phase: 'advanced', order: 3, estimatedHours: 12, icon: '🧪', keyPoints: ['Hypothesis formulation', 'Sample size calculation', 'Statistical significance', 'Multi-armed bandits', 'Causal inference basics'], resources: [] },
      { roadmapId: dataScienceRoadmap._id, title: 'Big Data Tools', description: 'Work with large-scale data using Spark and distributed systems', phase: 'advanced', order: 4, estimatedHours: 20, icon: '💾', keyPoints: ['PySpark basics', 'Spark DataFrames', 'Distributed computing', 'Data pipelines'], resources: [] },
      // Interview Phase
      { roadmapId: dataScienceRoadmap._id, title: 'Statistics Interview Prep', description: 'Prepare for statistics and probability questions', phase: 'interview', order: 1, estimatedHours: 10, icon: '📊', keyPoints: ['Probability puzzles', 'A/B testing questions', 'Statistical inference', 'Bayesian vs Frequentist'], resources: [] },
      { roadmapId: dataScienceRoadmap._id, title: 'SQL Interview Prep', description: 'Master SQL problems commonly asked in interviews', phase: 'interview', order: 2, estimatedHours: 12, icon: '🗄️', keyPoints: ['Complex JOINs', 'Window functions', 'Query optimization', 'Case studies'], resources: [] },
      { roadmapId: dataScienceRoadmap._id, title: 'Case Study Practice', description: 'Solve business case studies end-to-end', phase: 'interview', order: 3, estimatedHours: 15, icon: '💼', keyPoints: ['Problem framing', 'Metric selection', 'Analysis approach', 'Recommendations'], resources: [] },
    ];

    const createdDSTopics = await Topic.insertMany(dataScienceTopics);
    await Roadmap.findByIdAndUpdate(dataScienceRoadmap._id, {
      totalTopics: createdDSTopics.length,
      totalResources: createdDSTopics.reduce((sum, t) => sum + (t.resources?.length || 0), 0)
    });

    // DevOps Roadmap Topics
    const devOpsRoadmap = createdRoadmaps[4];
    const devOpsTopics = [
      // Foundation Phase
      { roadmapId: devOpsRoadmap._id, title: 'Linux Fundamentals', description: 'Master Linux command line and system administration', phase: 'foundation', order: 1, estimatedHours: 25, icon: '🐧', keyPoints: ['File system navigation', 'User management', 'Permissions', 'Package management', 'Process management', 'Shell scripting'], resources: [] },
      { roadmapId: devOpsRoadmap._id, title: 'Networking Basics', description: 'Understand networking concepts essential for DevOps', phase: 'foundation', order: 2, estimatedHours: 15, icon: '🌐', keyPoints: ['TCP/IP', 'DNS', 'HTTP/HTTPS', 'Load balancing', 'Firewalls', 'VPN'], resources: [] },
      { roadmapId: devOpsRoadmap._id, title: 'Version Control with Git', description: 'Advanced Git workflows and collaboration', phase: 'foundation', order: 3, estimatedHours: 10, icon: '📚', keyPoints: ['Branching strategies', 'Git flow', 'Merge vs Rebase', 'Hooks', 'Large file storage'], resources: [] },
      { roadmapId: devOpsRoadmap._id, title: 'Shell Scripting', description: 'Automate tasks with Bash scripts', phase: 'foundation', order: 4, estimatedHours: 15, icon: '📜', keyPoints: ['Variables', 'Control structures', 'Functions', 'Text processing', 'Cron jobs'], resources: [] },
      // Intermediate Phase
      { roadmapId: devOpsRoadmap._id, title: 'Docker & Containerization', description: 'Build and manage containerized applications', phase: 'intermediate', order: 1, estimatedHours: 20, icon: '🐳', keyPoints: ['Dockerfile', 'Images & Containers', 'Volumes', 'Networking', 'Docker Compose', 'Best practices'], resources: [] },
      { roadmapId: devOpsRoadmap._id, title: 'CI/CD Pipelines', description: 'Implement continuous integration and delivery', phase: 'intermediate', order: 2, estimatedHours: 18, icon: '🔄', keyPoints: ['GitHub Actions', 'Jenkins', 'GitLab CI', 'Pipeline design', 'Automated testing', 'Deployment strategies'], resources: [] },
      { roadmapId: devOpsRoadmap._id, title: 'Infrastructure as Code', description: 'Manage infrastructure with Terraform and Ansible', phase: 'intermediate', order: 3, estimatedHours: 22, icon: '📝', keyPoints: ['Terraform basics', 'Ansible playbooks', 'State management', 'Modules', 'Best practices'], resources: [] },
      { roadmapId: devOpsRoadmap._id, title: 'Cloud Platforms (AWS/Azure/GCP)', description: 'Deploy and manage applications on cloud', phase: 'intermediate', order: 4, estimatedHours: 30, icon: '☁️', keyPoints: ['Compute (EC2/VMs)', 'Storage (S3/Blob)', 'Networking (VPC)', 'IAM', 'Serverless', 'Managed services'], resources: [] },
      // Advanced Phase
      { roadmapId: devOpsRoadmap._id, title: 'Kubernetes', description: 'Container orchestration at scale', phase: 'advanced', order: 1, estimatedHours: 30, icon: '☸️', keyPoints: ['Pods & Deployments', 'Services', 'ConfigMaps & Secrets', 'Ingress', 'Helm charts', 'Operators'], resources: [] },
      { roadmapId: devOpsRoadmap._id, title: 'Monitoring & Observability', description: 'Implement comprehensive monitoring solutions', phase: 'advanced', order: 2, estimatedHours: 18, icon: '📊', keyPoints: ['Prometheus', 'Grafana', 'ELK Stack', 'Distributed tracing', 'Alerting', 'SLOs/SLIs'], resources: [] },
      { roadmapId: devOpsRoadmap._id, title: 'Security & Compliance', description: 'DevSecOps practices and security automation', phase: 'advanced', order: 3, estimatedHours: 15, icon: '🔒', keyPoints: ['Secret management', 'Container security', 'SAST/DAST', 'Compliance automation', 'Zero trust'], resources: [] },
      { roadmapId: devOpsRoadmap._id, title: 'Site Reliability Engineering', description: 'SRE principles and practices', phase: 'advanced', order: 4, estimatedHours: 15, icon: '🛡️', keyPoints: ['Error budgets', 'Incident management', 'Chaos engineering', 'Capacity planning', 'Postmortems'], resources: [] },
      // Interview Phase
      { roadmapId: devOpsRoadmap._id, title: 'DevOps Interview Prep', description: 'Prepare for DevOps/SRE interviews', phase: 'interview', order: 1, estimatedHours: 12, icon: '💼', keyPoints: ['System design', 'Troubleshooting scenarios', 'Tool-specific questions', 'Behavioral questions'], resources: [] },
      { roadmapId: devOpsRoadmap._id, title: 'Hands-on Projects', description: 'Build real-world DevOps projects for portfolio', phase: 'interview', order: 2, estimatedHours: 20, icon: '🔧', keyPoints: ['CI/CD pipeline project', 'Kubernetes deployment', 'Monitoring setup', 'Infrastructure automation'], resources: [] },
    ];

    const createdDevOpsTopics = await Topic.insertMany(devOpsTopics);
    await Roadmap.findByIdAndUpdate(devOpsRoadmap._id, {
      totalTopics: createdDevOpsTopics.length,
      totalResources: createdDevOpsTopics.reduce((sum, t) => sum + (t.resources?.length || 0), 0)
    });

    // SQL & Databases Roadmap Topics
    const sqlRoadmap = createdRoadmaps[3];
    const sqlTopics = [
      // Foundation Phase
      { roadmapId: sqlRoadmap._id, title: 'SQL Basics', description: 'Learn fundamental SQL commands and syntax', phase: 'foundation', order: 1, estimatedHours: 15, icon: '📝', keyPoints: ['SELECT statements', 'WHERE clause', 'ORDER BY', 'INSERT/UPDATE/DELETE', 'Data types'], resources: [] },
      { roadmapId: sqlRoadmap._id, title: 'Database Design', description: 'Design efficient and normalized databases', phase: 'foundation', order: 2, estimatedHours: 12, icon: '📐', keyPoints: ['ER diagrams', 'Normalization (1NF-3NF)', 'Primary & Foreign keys', 'Relationships', 'Constraints'], resources: [] },
      { roadmapId: sqlRoadmap._id, title: 'JOINs Mastery', description: 'Master all types of SQL JOINs', phase: 'foundation', order: 3, estimatedHours: 10, icon: '🔗', keyPoints: ['INNER JOIN', 'LEFT/RIGHT JOIN', 'FULL OUTER JOIN', 'CROSS JOIN', 'Self JOIN'], resources: [] },
      // Intermediate Phase
      { roadmapId: sqlRoadmap._id, title: 'Aggregations & Grouping', description: 'Summarize and analyze data with GROUP BY', phase: 'intermediate', order: 1, estimatedHours: 10, icon: '📊', keyPoints: ['COUNT, SUM, AVG', 'GROUP BY', 'HAVING clause', 'ROLLUP & CUBE', 'Pivot tables'], resources: [] },
      { roadmapId: sqlRoadmap._id, title: 'Subqueries & CTEs', description: 'Write complex queries with subqueries and CTEs', phase: 'intermediate', order: 2, estimatedHours: 12, icon: '🔄', keyPoints: ['Scalar subqueries', 'Correlated subqueries', 'Common Table Expressions', 'Recursive CTEs'], resources: [] },
      { roadmapId: sqlRoadmap._id, title: 'Window Functions', description: 'Advanced analytics with window functions', phase: 'intermediate', order: 3, estimatedHours: 15, icon: '🪟', keyPoints: ['ROW_NUMBER', 'RANK/DENSE_RANK', 'LAG/LEAD', 'Running totals', 'Moving averages', 'PARTITION BY'], resources: [] },
      { roadmapId: sqlRoadmap._id, title: 'Indexing & Performance', description: 'Optimize query performance with indexes', phase: 'intermediate', order: 4, estimatedHours: 12, icon: '⚡', keyPoints: ['Index types', 'B-tree indexes', 'Composite indexes', 'EXPLAIN plans', 'Query optimization'], resources: [] },
      // Advanced Phase
      { roadmapId: sqlRoadmap._id, title: 'Stored Procedures & Functions', description: 'Create reusable database code', phase: 'advanced', order: 1, estimatedHours: 12, icon: '⚙️', keyPoints: ['Stored procedures', 'User-defined functions', 'Triggers', 'Cursors', 'Error handling'], resources: [] },
      { roadmapId: sqlRoadmap._id, title: 'Transactions & ACID', description: 'Understand database transactions', phase: 'advanced', order: 2, estimatedHours: 10, icon: '🔐', keyPoints: ['ACID properties', 'Transaction isolation levels', 'Deadlocks', 'Locking mechanisms'], resources: [] },
      { roadmapId: sqlRoadmap._id, title: 'NoSQL Databases', description: 'Work with MongoDB and other NoSQL solutions', phase: 'advanced', order: 3, estimatedHours: 18, icon: '🍃', keyPoints: ['Document databases (MongoDB)', 'Key-value stores (Redis)', 'When to use NoSQL', 'CAP theorem'], resources: [] },
      { roadmapId: sqlRoadmap._id, title: 'Database Administration', description: 'Basic DBA tasks and maintenance', phase: 'advanced', order: 4, estimatedHours: 15, icon: '🛠️', keyPoints: ['Backup & Recovery', 'User management', 'Monitoring', 'Replication', 'Sharding'], resources: [] },
      // Interview Phase
      { roadmapId: sqlRoadmap._id, title: 'SQL Interview Questions', description: 'Practice common SQL interview problems', phase: 'interview', order: 1, estimatedHours: 15, icon: '💼', keyPoints: ['LeetCode SQL', 'Window function problems', 'Complex JOINs', 'Query writing under pressure'], resources: [] },
      { roadmapId: sqlRoadmap._id, title: 'Database Design Interview', description: 'Prepare for schema design questions', phase: 'interview', order: 2, estimatedHours: 10, icon: '📐', keyPoints: ['Design scenarios', 'Normalization decisions', 'Trade-offs discussion'], resources: [] },
    ];

    const createdSQLTopics = await Topic.insertMany(sqlTopics);
    await Roadmap.findByIdAndUpdate(sqlRoadmap._id, {
      totalTopics: createdSQLTopics.length,
      totalResources: createdSQLTopics.reduce((sum, t) => sum + (t.resources?.length || 0), 0)
    });

    // Sample interview questions
    const sampleQuestions = [
      { roadmapId: webDevRoadmap._id, question: 'What is the difference between let, const, and var?', answer: 'var is function-scoped and hoisted, let and const are block-scoped. const cannot be reassigned.', difficulty: 'easy', category: 'JavaScript', tags: ['javascript', 'variables'] },
      { roadmapId: webDevRoadmap._id, question: 'Explain closures in JavaScript', answer: 'A closure is a function that has access to variables in its outer scope, even after the outer function has returned.', difficulty: 'medium', category: 'JavaScript', tags: ['javascript', 'closures'] },
      { roadmapId: webDevRoadmap._id, question: 'What is the Virtual DOM in React?', answer: 'The Virtual DOM is a lightweight copy of the actual DOM. React uses it to efficiently update only the parts of the UI that changed.', difficulty: 'easy', category: 'React', tags: ['react', 'virtual-dom'] },
      { roadmapId: webDevRoadmap._id, question: 'Explain the useEffect hook', answer: 'useEffect is used for side effects in functional components - data fetching, subscriptions, DOM mutations. It runs after render.', difficulty: 'medium', category: 'React', tags: ['react', 'hooks'] },
      { roadmapId: webDevRoadmap._id, question: 'What is event bubbling?', answer: 'Event bubbling is when an event triggers on a nested element and propagates up to parent elements.', difficulty: 'easy', category: 'JavaScript', tags: ['javascript', 'events'] },
      // ML Interview Questions
      { roadmapId: mlRoadmap._id, question: 'What is the bias-variance tradeoff?', answer: 'Bias is error from oversimplified models (underfitting). Variance is error from models too sensitive to training data (overfitting). The tradeoff is finding the right model complexity that minimizes total error.', difficulty: 'medium', category: 'ML Theory', tags: ['machine-learning', 'bias-variance'] },
      { roadmapId: mlRoadmap._id, question: 'Explain the difference between L1 and L2 regularization', answer: 'L1 (Lasso) adds absolute value of weights to loss, leading to sparse models (feature selection). L2 (Ridge) adds squared weights, shrinking all weights but keeping them non-zero. L1 is better for feature selection, L2 for preventing overfitting.', difficulty: 'medium', category: 'ML Theory', tags: ['regularization', 'machine-learning'] },
      { roadmapId: mlRoadmap._id, question: 'What is gradient descent and its variants?', answer: 'Gradient descent optimizes model parameters by iteratively moving in the direction of steepest descent. Variants: Batch GD (uses all data), Stochastic GD (one sample), Mini-batch GD (small batches). Adam, RMSprop, and Momentum are adaptive variants.', difficulty: 'medium', category: 'Optimization', tags: ['gradient-descent', 'optimization'] },
      { roadmapId: mlRoadmap._id, question: 'How do you handle imbalanced datasets?', answer: 'Techniques include: 1) Resampling (oversampling minority/undersampling majority), 2) SMOTE for synthetic samples, 3) Class weights in loss function, 4) Ensemble methods like balanced random forest, 5) Anomaly detection approach, 6) Using appropriate metrics (F1, AUC-ROC instead of accuracy).', difficulty: 'medium', category: 'Data Handling', tags: ['imbalanced-data', 'machine-learning'] },
      { roadmapId: mlRoadmap._id, question: 'Explain how a Decision Tree works', answer: 'Decision trees split data recursively based on feature values to minimize impurity (Gini or entropy for classification, MSE for regression). Each internal node tests a feature, branches represent outcomes, leaves contain predictions. Prone to overfitting, addressed by pruning or ensemble methods.', difficulty: 'easy', category: 'Algorithms', tags: ['decision-tree', 'machine-learning'] },
      { roadmapId: mlRoadmap._id, question: 'What is the vanishing gradient problem?', answer: 'In deep networks, gradients can become extremely small during backpropagation, causing early layers to learn very slowly. Caused by sigmoid/tanh activations. Solutions: ReLU activation, batch normalization, residual connections, proper weight initialization (Xavier/He).', difficulty: 'hard', category: 'Deep Learning', tags: ['deep-learning', 'neural-networks'] },
      { roadmapId: mlRoadmap._id, question: 'Explain how Transformers work', answer: 'Transformers use self-attention to process sequences in parallel (unlike RNNs). Key components: Multi-head attention computes weighted relationships between all positions, positional encoding adds sequence order info, feedforward layers process each position. Enables capturing long-range dependencies efficiently.', difficulty: 'hard', category: 'Deep Learning', tags: ['transformers', 'attention', 'deep-learning'] },
      { roadmapId: mlRoadmap._id, question: 'What is cross-validation and why use it?', answer: 'Cross-validation splits data into k folds, trains on k-1 folds, validates on remaining fold, repeats k times. Provides more reliable performance estimate than single train-test split, helps detect overfitting, and makes efficient use of limited data. Common: 5-fold or 10-fold CV.', difficulty: 'easy', category: 'Model Evaluation', tags: ['cross-validation', 'model-evaluation'] },
      { roadmapId: mlRoadmap._id, question: 'How would you approach a machine learning system design problem?', answer: '1) Clarify requirements and metrics, 2) Frame as ML problem (classification/regression/etc), 3) Data collection and feature engineering, 4) Model selection and baseline, 5) Training pipeline, 6) Evaluation strategy, 7) Deployment considerations (latency, throughput), 8) Monitoring and iteration. Always start simple!', difficulty: 'hard', category: 'System Design', tags: ['system-design', 'ml-engineering'] },
      { roadmapId: mlRoadmap._id, question: 'What are precision, recall, and F1 score?', answer: 'Precision = TP/(TP+FP) - of predicted positives, how many are correct. Recall = TP/(TP+FN) - of actual positives, how many were found. F1 = 2*(P*R)/(P+R) - harmonic mean balancing both. Use precision when false positives costly, recall when false negatives costly.', difficulty: 'easy', category: 'Model Evaluation', tags: ['metrics', 'classification'] },
      // Data Science Interview Questions
      { roadmapId: dataScienceRoadmap._id, question: 'Explain the Central Limit Theorem', answer: 'CLT states that the sampling distribution of the sample mean approaches a normal distribution as sample size increases, regardless of the populations distribution. This is why we can use normal distribution-based tests for large samples.', difficulty: 'medium', category: 'Statistics', tags: ['statistics', 'probability'] },
      { roadmapId: dataScienceRoadmap._id, question: 'What is p-value and how do you interpret it?', answer: 'P-value is the probability of observing results at least as extreme as the measured results, assuming the null hypothesis is true. If p < alpha (usually 0.05), reject null hypothesis. Its NOT the probability that null is true!', difficulty: 'medium', category: 'Statistics', tags: ['statistics', 'hypothesis-testing'] },
      { roadmapId: dataScienceRoadmap._id, question: 'How would you handle missing data?', answer: 'Options: 1) Delete rows (if MCAR and small %), 2) Mean/Median/Mode imputation, 3) Forward/Backward fill for time series, 4) KNN imputation, 5) Model-based imputation (MICE), 6) Create missing indicator feature.', difficulty: 'medium', category: 'Data Handling', tags: ['data-cleaning', 'missing-data'] },
      { roadmapId: dataScienceRoadmap._id, question: 'How do you design an A/B test?', answer: '1) Define hypothesis and metrics, 2) Calculate required sample size using power analysis, 3) Randomize users into control/treatment, 4) Run for adequate duration, 5) Analyze with statistical tests, 6) Consider practical vs statistical significance.', difficulty: 'hard', category: 'Experimentation', tags: ['ab-testing', 'experimentation'] },
      { roadmapId: dataScienceRoadmap._id, question: 'Write SQL to find the second highest salary', answer: 'Multiple approaches: 1) SELECT MAX(salary) FROM employees WHERE salary < (SELECT MAX(salary) FROM employees), 2) DENSE_RANK() window function, 3) LIMIT 1 OFFSET 1 with ORDER BY DESC.', difficulty: 'medium', category: 'SQL', tags: ['sql', 'data-analysis'] },
      { roadmapId: dataScienceRoadmap._id, question: 'What is multicollinearity and how do you detect it?', answer: 'Multicollinearity is high correlation between independent variables. Detection: correlation matrix, VIF (Variance Inflation Factor) > 5-10 indicates problems. Solutions: remove variables, combine features, PCA, or regularization.', difficulty: 'medium', category: 'Statistics', tags: ['regression', 'statistics'] },
      { roadmapId: dataScienceRoadmap._id, question: 'Explain the difference between correlation and causation', answer: 'Correlation measures linear relationship between variables. Causation means one variable directly affects another. Correlation doesnt imply causation due to confounding variables, reverse causality, or coincidence.', difficulty: 'easy', category: 'Statistics', tags: ['statistics', 'causation'] },
      { roadmapId: dataScienceRoadmap._id, question: 'How do you communicate technical findings to non-technical stakeholders?', answer: 'Focus on: 1) Start with business impact, 2) Use visualizations over numbers, 3) Avoid jargon, 4) Lead with conclusions, 5) Provide clear recommendations, 6) Use analogies and storytelling.', difficulty: 'medium', category: 'Soft Skills', tags: ['communication', 'business'] },
      // DevOps Interview Questions
      { roadmapId: devOpsRoadmap._id, question: 'Explain the difference between Docker and Kubernetes', answer: 'Docker is a containerization platform - packages apps with dependencies into containers. Kubernetes is an orchestration platform - manages, scales, and deploys containers across clusters. Docker: single host focus. K8s: cluster management, self-healing, load balancing.', difficulty: 'easy', category: 'Containers', tags: ['docker', 'kubernetes'] },
      { roadmapId: devOpsRoadmap._id, question: 'What is Infrastructure as Code and why is it important?', answer: 'IaC manages infrastructure through code files rather than manual processes. Benefits: version control, reproducibility, consistency, automation, documentation, testing, collaboration. Tools: Terraform, Ansible, CloudFormation, Pulumi.', difficulty: 'easy', category: 'IaC', tags: ['terraform', 'infrastructure'] },
      { roadmapId: devOpsRoadmap._id, question: 'Design a CI/CD pipeline for a microservices application', answer: 'Stages: 1) Code commit triggers pipeline, 2) Build & unit tests, 3) Static code analysis, 4) Build Docker images, 5) Push to registry, 6) Deploy to staging, 7) Integration tests, 8) Security scans, 9) Approval gate, 10) Rolling deployment to production.', difficulty: 'hard', category: 'CI/CD', tags: ['cicd', 'microservices'] },
      { roadmapId: devOpsRoadmap._id, question: 'How would you handle a production incident?', answer: '1) Acknowledge and communicate, 2) Assess impact and severity, 3) Triage - mitigate immediately vs root cause, 4) Rollback if needed, 5) Debug with logs/metrics/traces, 6) Implement fix, 7) Verify resolution, 8) Blameless postmortem.', difficulty: 'medium', category: 'SRE', tags: ['incident-management', 'sre'] },
      { roadmapId: devOpsRoadmap._id, question: 'Explain Kubernetes deployments, services, and ingress', answer: 'Deployment: manages ReplicaSets for stateless apps, handles rollouts/rollbacks. Service: stable network endpoint for pods (ClusterIP/NodePort/LoadBalancer). Ingress: HTTP/S routing from outside cluster, manages external access, SSL termination.', difficulty: 'medium', category: 'Kubernetes', tags: ['kubernetes', 'networking'] },
      { roadmapId: devOpsRoadmap._id, question: 'What is GitOps and how does it differ from traditional CI/CD?', answer: 'GitOps uses Git as single source of truth for infrastructure and apps. Changes via pull requests, automated reconciliation. Traditional CI/CD pushes changes; GitOps pulls/syncs desired state. Tools: ArgoCD, Flux.', difficulty: 'medium', category: 'CI/CD', tags: ['gitops', 'argocd'] },
      { roadmapId: devOpsRoadmap._id, question: 'How do you ensure high availability and disaster recovery?', answer: 'HA: redundancy at all levels (multi-AZ, replicas, load balancers), auto-scaling, health checks, circuit breakers. DR: RTO/RPO targets, backup strategies (3-2-1 rule), cross-region replication, documented runbooks, regular DR drills.', difficulty: 'hard', category: 'Architecture', tags: ['high-availability', 'disaster-recovery'] },
      // SQL Interview Questions
      { roadmapId: sqlRoadmap._id, question: 'Explain the difference between WHERE and HAVING', answer: 'WHERE filters rows before grouping - works on individual rows. HAVING filters groups after GROUP BY - works on aggregated values. Cant use aggregate functions in WHERE.', difficulty: 'easy', category: 'SQL Basics', tags: ['sql', 'filtering'] },
      { roadmapId: sqlRoadmap._id, question: 'Write a query to find employees earning more than their manager', answer: 'SELECT e.name, e.salary FROM employees e JOIN employees m ON e.manager_id = m.id WHERE e.salary > m.salary; This is a self-join comparing each employees salary with their managers salary.', difficulty: 'medium', category: 'JOINs', tags: ['sql', 'self-join'] },
      { roadmapId: sqlRoadmap._id, question: 'Explain different types of indexes and when to use them', answer: 'B-tree: default, good for equality and range queries. Hash: exact matches only. Covering: includes all query columns. Composite: multi-column, order matters. Use on frequently queried columns, JOIN conditions, WHERE clauses.', difficulty: 'medium', category: 'Performance', tags: ['indexes', 'optimization'] },
      { roadmapId: sqlRoadmap._id, question: 'What is the difference between UNION and UNION ALL?', answer: 'UNION combines results and removes duplicates (slower). UNION ALL keeps all rows including duplicates (faster). Use UNION ALL when you know there are no duplicates or want to keep them.', difficulty: 'easy', category: 'SQL Basics', tags: ['sql', 'union'] },
      { roadmapId: sqlRoadmap._id, question: 'Explain normalization and denormalization trade-offs', answer: 'Normalization: reduces redundancy, ensures data integrity, but requires JOINs. Denormalization: faster reads, simpler queries, but data redundancy, update anomalies. OLTP favors normalization; OLAP often uses denormalization.', difficulty: 'medium', category: 'Database Design', tags: ['normalization', 'database-design'] },
      { roadmapId: sqlRoadmap._id, question: 'Write a query using window functions to calculate running total', answer: 'SELECT date, amount, SUM(amount) OVER (ORDER BY date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) as running_total FROM transactions; PARTITION BY for per-group running totals.', difficulty: 'medium', category: 'Window Functions', tags: ['sql', 'window-functions'] },
      { roadmapId: sqlRoadmap._id, question: 'How do you optimize a slow query?', answer: '1) EXPLAIN/EXPLAIN ANALYZE to see execution plan, 2) Check for table scans vs index usage, 3) Add appropriate indexes, 4) Rewrite query, 5) Limit result set, 6) Check for N+1 queries, 7) Consider caching, 8) Partition large tables.', difficulty: 'hard', category: 'Performance', tags: ['optimization', 'performance'] },
    ];

    await InterviewQuestion.insertMany(sampleQuestions);
    await Roadmap.findByIdAndUpdate(webDevRoadmap._id, { totalQuestions: 5 });
    await Roadmap.findByIdAndUpdate(mlRoadmap._id, { totalQuestions: 10 });
    await Roadmap.findByIdAndUpdate(dataScienceRoadmap._id, { totalQuestions: 8 });
    await Roadmap.findByIdAndUpdate(devOpsRoadmap._id, { totalQuestions: 7 });
    await Roadmap.findByIdAndUpdate(sqlRoadmap._id, { totalQuestions: 7 });

    // Sample career info
    const sampleCareers = [
      { roadmapId: webDevRoadmap._id, jobTitle: 'Frontend Developer', description: 'Build user interfaces and client-side applications', salaryRange: { min: 400000, max: 1500000, currency: 'INR', period: 'year' }, demandLevel: 'very-high', requiredSkills: ['HTML', 'CSS', 'JavaScript', 'React'], preferredSkills: ['TypeScript', 'Testing', 'Performance optimization'], experienceLevel: 'fresher', growthPath: ['Junior Dev', 'Mid Dev', 'Senior Dev', 'Lead', 'Architect'], companies: ['Google', 'Microsoft', 'Amazon', 'Meta', 'Flipkart'] },
      { roadmapId: webDevRoadmap._id, jobTitle: 'Full Stack Developer', description: 'Work on both frontend and backend', salaryRange: { min: 600000, max: 2500000, currency: 'INR', period: 'year' }, demandLevel: 'very-high', requiredSkills: ['JavaScript', 'React', 'Node.js', 'MongoDB'], preferredSkills: ['TypeScript', 'AWS', 'Docker'], experienceLevel: 'junior', growthPath: ['Full Stack Dev', 'Senior Dev', 'Tech Lead', 'Engineering Manager'], companies: ['Startups', 'Product companies', 'Consultancies'] },
      { roadmapId: webDevRoadmap._id, jobTitle: 'Backend Developer', description: 'Build APIs and server-side applications', salaryRange: { min: 500000, max: 2000000, currency: 'INR', period: 'year' }, demandLevel: 'high', requiredSkills: ['Node.js', 'Databases', 'REST APIs', 'Authentication'], preferredSkills: ['Microservices', 'Message queues', 'Caching'], experienceLevel: 'junior', growthPath: ['Backend Dev', 'Senior Dev', 'Staff Engineer', 'Principal Engineer'], companies: ['Tech giants', 'Fintech', 'E-commerce'] },
      // ML Career Info
      { roadmapId: mlRoadmap._id, jobTitle: 'Machine Learning Engineer', description: 'Build and deploy ML models in production systems', salaryRange: { min: 800000, max: 3500000, currency: 'INR', period: 'year' }, demandLevel: 'very-high', requiredSkills: ['Python', 'TensorFlow/PyTorch', 'Scikit-learn', 'SQL', 'MLOps'], preferredSkills: ['Kubernetes', 'Spark', 'Cloud ML services', 'Feature stores'], experienceLevel: 'junior', growthPath: ['ML Engineer', 'Senior ML Engineer', 'Staff ML Engineer', 'ML Architect', 'Director of ML'], companies: ['Google', 'Meta', 'Amazon', 'Netflix', 'Uber', 'OpenAI'] },
      { roadmapId: mlRoadmap._id, jobTitle: 'Data Scientist', description: 'Analyze data and build predictive models to drive business decisions', salaryRange: { min: 600000, max: 2800000, currency: 'INR', period: 'year' }, demandLevel: 'very-high', requiredSkills: ['Python', 'Statistics', 'ML algorithms', 'Data visualization', 'SQL'], preferredSkills: ['A/B testing', 'Causal inference', 'Deep learning', 'Business acumen'], experienceLevel: 'fresher', growthPath: ['Data Scientist', 'Senior DS', 'Lead DS', 'Principal DS', 'Head of Data Science'], companies: ['Amazon', 'Microsoft', 'Flipkart', 'Swiggy', 'Zomato', 'Paytm'] },
      { roadmapId: mlRoadmap._id, jobTitle: 'Deep Learning Engineer', description: 'Develop neural network models for complex AI tasks', salaryRange: { min: 1200000, max: 5000000, currency: 'INR', period: 'year' }, demandLevel: 'high', requiredSkills: ['Python', 'TensorFlow/PyTorch', 'CNNs', 'RNNs', 'Transformers'], preferredSkills: ['CUDA', 'Distributed training', 'Model optimization', 'MLOps'], experienceLevel: 'mid', growthPath: ['DL Engineer', 'Senior DL Engineer', 'Research Scientist', 'Principal Scientist'], companies: ['NVIDIA', 'Google DeepMind', 'OpenAI', 'Meta AI', 'Microsoft Research'] },
      { roadmapId: mlRoadmap._id, jobTitle: 'MLOps Engineer', description: 'Build and maintain ML infrastructure and pipelines', salaryRange: { min: 1000000, max: 3000000, currency: 'INR', period: 'year' }, demandLevel: 'very-high', requiredSkills: ['Python', 'Docker', 'Kubernetes', 'CI/CD', 'Cloud platforms'], preferredSkills: ['Airflow', 'MLflow', 'Kubeflow', 'Feature stores', 'Model monitoring'], experienceLevel: 'junior', growthPath: ['MLOps Engineer', 'Senior MLOps', 'Platform Engineer', 'ML Platform Lead'], companies: ['Any ML-focused company', 'Tech giants', 'AI startups'] },
      { roadmapId: mlRoadmap._id, jobTitle: 'AI Research Scientist', description: 'Conduct research to advance the field of AI/ML', salaryRange: { min: 2000000, max: 8000000, currency: 'INR', period: 'year' }, demandLevel: 'medium', requiredSkills: ['PhD or strong research background', 'Deep Learning', 'Mathematics', 'Publication record'], preferredSkills: ['Specific domain expertise', 'Novel architectures', 'Theoretical ML'], experienceLevel: 'senior', growthPath: ['Research Scientist', 'Senior Scientist', 'Principal Scientist', 'Research Director'], companies: ['Google Research', 'OpenAI', 'Meta FAIR', 'DeepMind', 'Microsoft Research'] },
      // Data Science Career Info
      { roadmapId: dataScienceRoadmap._id, jobTitle: 'Data Analyst', description: 'Analyze data to provide actionable business insights', salaryRange: { min: 400000, max: 1200000, currency: 'INR', period: 'year' }, demandLevel: 'very-high', requiredSkills: ['SQL', 'Excel', 'Data visualization', 'Basic statistics'], preferredSkills: ['Python', 'Tableau/PowerBI', 'Business acumen'], experienceLevel: 'fresher', growthPath: ['Data Analyst', 'Senior Analyst', 'Lead Analyst', 'Analytics Manager'], companies: ['Amazon', 'Flipkart', 'Paytm', 'Swiggy', 'Any large company'] },
      { roadmapId: dataScienceRoadmap._id, jobTitle: 'Data Scientist', description: 'Build predictive models and derive insights from complex data', salaryRange: { min: 600000, max: 2500000, currency: 'INR', period: 'year' }, demandLevel: 'very-high', requiredSkills: ['Python', 'Statistics', 'ML algorithms', 'SQL', 'Data visualization'], preferredSkills: ['Deep learning', 'A/B testing', 'Cloud platforms', 'Big data tools'], experienceLevel: 'junior', growthPath: ['Data Scientist', 'Senior DS', 'Lead DS', 'Principal DS', 'Head of Data Science'], companies: ['Google', 'Amazon', 'Microsoft', 'Flipkart', 'Uber'] },
      { roadmapId: dataScienceRoadmap._id, jobTitle: 'Analytics Engineer', description: 'Build data pipelines and analytics infrastructure', salaryRange: { min: 800000, max: 2200000, currency: 'INR', period: 'year' }, demandLevel: 'high', requiredSkills: ['SQL', 'Python', 'dbt', 'Data warehousing', 'ETL'], preferredSkills: ['Airflow', 'Spark', 'Cloud data platforms'], experienceLevel: 'junior', growthPath: ['Analytics Engineer', 'Senior AE', 'Staff AE', 'Data Platform Lead'], companies: ['Tech companies', 'Data-driven startups'] },
      { roadmapId: dataScienceRoadmap._id, jobTitle: 'Business Intelligence Developer', description: 'Create dashboards and reports for business decision making', salaryRange: { min: 500000, max: 1500000, currency: 'INR', period: 'year' }, demandLevel: 'high', requiredSkills: ['SQL', 'Tableau/PowerBI', 'Data modeling', 'Business understanding'], preferredSkills: ['Python', 'ETL tools', 'Cloud platforms'], experienceLevel: 'fresher', growthPath: ['BI Developer', 'Senior BI Dev', 'BI Architect', 'BI Manager'], companies: ['Consulting firms', 'Large enterprises', 'E-commerce'] },
      // DevOps Career Info
      { roadmapId: devOpsRoadmap._id, jobTitle: 'DevOps Engineer', description: 'Automate and streamline software delivery processes', salaryRange: { min: 600000, max: 2500000, currency: 'INR', period: 'year' }, demandLevel: 'very-high', requiredSkills: ['Linux', 'Docker', 'CI/CD', 'Cloud platforms', 'Scripting'], preferredSkills: ['Kubernetes', 'Terraform', 'Monitoring tools'], experienceLevel: 'junior', growthPath: ['DevOps Engineer', 'Senior DevOps', 'DevOps Lead', 'Platform Architect'], companies: ['All tech companies', 'Startups', 'Enterprises'] },
      { roadmapId: devOpsRoadmap._id, jobTitle: 'Site Reliability Engineer', description: 'Ensure reliability and performance of production systems', salaryRange: { min: 1000000, max: 3500000, currency: 'INR', period: 'year' }, demandLevel: 'very-high', requiredSkills: ['Linux', 'Programming', 'Distributed systems', 'Monitoring', 'Incident management'], preferredSkills: ['Kubernetes', 'Chaos engineering', 'SLO/SLI design'], experienceLevel: 'mid', growthPath: ['SRE', 'Senior SRE', 'Staff SRE', 'SRE Manager', 'Director of SRE'], companies: ['Google', 'Amazon', 'Microsoft', 'Netflix', 'Uber'] },
      { roadmapId: devOpsRoadmap._id, jobTitle: 'Cloud Engineer', description: 'Design and manage cloud infrastructure', salaryRange: { min: 700000, max: 2800000, currency: 'INR', period: 'year' }, demandLevel: 'very-high', requiredSkills: ['AWS/Azure/GCP', 'Networking', 'Security', 'IaC'], preferredSkills: ['Multi-cloud', 'Cost optimization', 'FinOps'], experienceLevel: 'junior', growthPath: ['Cloud Engineer', 'Senior Cloud Engineer', 'Cloud Architect', 'Principal Architect'], companies: ['Cloud providers', 'Consulting firms', 'Tech companies'] },
      { roadmapId: devOpsRoadmap._id, jobTitle: 'Platform Engineer', description: 'Build internal developer platforms and tooling', salaryRange: { min: 1200000, max: 3500000, currency: 'INR', period: 'year' }, demandLevel: 'high', requiredSkills: ['Kubernetes', 'Go/Python', 'Platform design', 'Developer experience'], preferredSkills: ['Service mesh', 'GitOps', 'Internal tooling'], experienceLevel: 'mid', growthPath: ['Platform Engineer', 'Senior PE', 'Staff PE', 'Platform Architect'], companies: ['Large tech companies', 'Scale-ups'] },
      // SQL & Databases Career Info
      { roadmapId: sqlRoadmap._id, jobTitle: 'Database Administrator', description: 'Manage and maintain database systems', salaryRange: { min: 500000, max: 2000000, currency: 'INR', period: 'year' }, demandLevel: 'high', requiredSkills: ['SQL', 'Database management', 'Backup/Recovery', 'Performance tuning'], preferredSkills: ['Cloud databases', 'Automation', 'Multiple DBMS'], experienceLevel: 'junior', growthPath: ['DBA', 'Senior DBA', 'Lead DBA', 'Database Architect'], companies: ['Banks', 'Large enterprises', 'Tech companies'] },
      { roadmapId: sqlRoadmap._id, jobTitle: 'Data Engineer', description: 'Build and maintain data pipelines and infrastructure', salaryRange: { min: 800000, max: 3000000, currency: 'INR', period: 'year' }, demandLevel: 'very-high', requiredSkills: ['SQL', 'Python', 'ETL', 'Data warehousing', 'Big data tools'], preferredSkills: ['Spark', 'Kafka', 'Cloud data services', 'Data modeling'], experienceLevel: 'junior', growthPath: ['Data Engineer', 'Senior DE', 'Staff DE', 'Data Architect', 'Head of Data Engineering'], companies: ['Google', 'Amazon', 'Uber', 'Airbnb', 'Data-driven companies'] },
      { roadmapId: sqlRoadmap._id, jobTitle: 'Backend Developer (Database Focus)', description: 'Build database-driven backend applications', salaryRange: { min: 600000, max: 2200000, currency: 'INR', period: 'year' }, demandLevel: 'very-high', requiredSkills: ['SQL', 'ORM frameworks', 'API development', 'Database design'], preferredSkills: ['NoSQL', 'Caching', 'Query optimization'], experienceLevel: 'junior', growthPath: ['Backend Dev', 'Senior Dev', 'Tech Lead', 'Staff Engineer'], companies: ['All tech companies'] },
    ];

    await CareerInfo.insertMany(sampleCareers);

    res.json({
      message: 'Sample data seeded successfully',
      created: {
        roadmaps: createdRoadmaps.length,
        topics: createdTopics.length + createdMLTopics.length + createdDSTopics.length + createdDevOpsTopics.length + createdSQLTopics.length,
        questions: sampleQuestions.length,
        careers: sampleCareers.length
      }
    });
  } catch (error: any) {
    console.error('Error seeding data:', error);
    res.status(500).json({ error: 'Failed to seed data' });
  }
});

export default router;
