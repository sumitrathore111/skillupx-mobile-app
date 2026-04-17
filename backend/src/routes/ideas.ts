import { Response, Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import Idea from '../models/Idea';
import Project from '../models/Project';
import User from '../models/User';
import emailNotifications from '../services/emailService';

const router = Router();

// ============================================
// In-memory cache for ideas (fast loading)
// ============================================
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

function getCache(key: string): any | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
}

function invalidateIdeasCache(): void {
  // Clear all ideas-related cache entries
  for (const key of cache.keys()) {
    if (key.startsWith('ideas:')) {
      cache.delete(key);
    }
  }
}

// Get all ideas (with optional filters) - CACHED
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, category, userId, limit = 50, page = 1 } = req.query;

    // Build cache key from query params
    const cacheKey = `ideas:list:${status || 'all'}:${category || 'all'}:${userId || 'all'}:${page}:${limit}`;

    // Try cache first
    const cached = getCache(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      res.set('Cache-Control', 'private, max-age=60');
      res.json(cached);
      return;
    }

    let query: any = {};

    if (status) query.status = status;
    if (category) query.category = category;
    if (userId) query.submittedBy = userId;

    const ideas = await Idea.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .populate('submittedBy', '_id name email')
      .populate('reviewedBy', '_id name email')
      .populate('projectId', '_id title');

    const total = await Idea.countDocuments(query);

    const response = {
      ideas,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit))
    };

    // Cache the response
    setCache(cacheKey, response);

    res.set('X-Cache', 'MISS');
    res.set('Cache-Control', 'private, max-age=60');
    res.json(response);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single idea by ID
router.get('/:ideaId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const idea = await Idea.findById(req.params.ideaId)
      .populate('submittedBy', '_id name email')
      .populate('reviewedBy', '_id name email')
      .populate('projectId', '_id title');

    if (!idea) {
      res.status(404).json({ error: 'Idea not found' });
      return;
    }

    res.json({ idea });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Submit a new idea
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, category, expectedTimeline } = req.body;

    if (!title || !description || !category || !expectedTimeline) {
      res.status(400).json({ error: 'All fields are required' });
      return;
    }

    const idea = new Idea({
      title,
      description,
      category,
      expectedTimeline,
      submittedBy: req.user?.id,
      submittedByName: req.user?.name,
      submittedByEmail: req.user?.email,
      status: 'pending'
    });

    await idea.save();

    // Invalidate cache after new idea
    invalidateIdeasCache();

    // Send email notification to admins about new pending idea (async, don't wait)
    try {
      const admins = await User.find({ role: 'admin' }).select('email');
      const adminEmails = admins.map(a => a.email).filter(Boolean);
      if (adminEmails.length > 0) {
        emailNotifications.notifyNewIdeaPendingReview(title, req.user?.name || 'Someone', category, adminEmails);
      }
    } catch (emailError) {
      console.error('Failed to send new idea email notifications:', emailError);
    }

    res.status(201).json({
      message: 'Idea submitted successfully',
      idea
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update an idea
router.put('/:ideaId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const idea = await Idea.findById(req.params.ideaId);

    if (!idea) {
      res.status(404).json({ error: 'Idea not found' });
      return;
    }

    // Only the owner or admin can update
    if (idea.submittedBy.toString() !== req.user?.id && req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Not authorized to update this idea' });
      return;
    }

    const { title, description, category, expectedTimeline } = req.body;

    const updatedIdea = await Idea.findByIdAndUpdate(
      req.params.ideaId,
      {
        $set: {
          title,
          description,
          category,
          expectedTimeline,
          updatedAt: new Date()
        }
      },
      { new: true }
    );

    // Invalidate cache after update
    invalidateIdeasCache();

    res.json({
      message: 'Idea updated successfully',
      idea: updatedIdea
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update idea status (admin or reviewer)
router.put('/:ideaId/status', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, feedback, reviewedBy } = req.body;

    if (!status) {
      res.status(400).json({ error: 'Status is required' });
      return;
    }

    const validStatuses = ['pending', 'approved', 'rejected', 'in-progress', 'completed'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const idea = await Idea.findById(req.params.ideaId);

    if (!idea) {
      res.status(404).json({ error: 'Idea not found' });
      return;
    }

    const updateData: any = {
      status,
      reviewedAt: new Date()
    };

    if (feedback) updateData.feedback = feedback;
    if (reviewedBy) updateData.reviewedBy = reviewedBy;
    else updateData.reviewedBy = req.user?.id;

    // If approved, create a project
    if (status === 'approved' && !idea.projectId) {
      const project = new Project({
        title: idea.title,
        description: idea.description,
        category: idea.category,
        status: 'planning',
        owner: idea.submittedBy,
        members: [{
          userId: idea.submittedBy,
          name: idea.submittedByName,
          email: idea.submittedByEmail,
          role: 'owner',
          joinedAt: new Date()
        }],
        ideaId: idea._id
      });

      await project.save();
      updateData.projectId = project._id;
    }

    const updatedIdea = await Idea.findByIdAndUpdate(
      req.params.ideaId,
      { $set: updateData },
      { new: true }
    );

    // Send email notification to idea submitter about status change (async, don't wait)
    try {
      if (idea.submittedByEmail && (status === 'approved' || status === 'rejected')) {
        emailNotifications.notifyIdeaStatusUpdate(
          idea.title,
          status,
          req.user?.name || 'Admin',
          idea.submittedByEmail
        );
      }

      // If approved, also notify all other users about the new approved idea
      if (status === 'approved') {
        const users = await User.find({ _id: { $ne: idea.submittedBy } }).select('email');
        const userEmails = users.map(u => u.email).filter(Boolean);
        if (userEmails.length > 0) {
          emailNotifications.notifyNewIdea(
            idea.title,
            idea.submittedByName || 'Someone',
            idea.category,
            userEmails
          );
        }
      }
    } catch (emailError) {
      console.error('Failed to send idea status email notification:', emailError);
    }

    // Invalidate cache after status change
    invalidateIdeasCache();

    res.json({
      message: `Idea ${status} successfully`,
      idea: updatedIdea
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete an idea (and associated project if it exists)
router.delete('/:ideaId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const idea = await Idea.findById(req.params.ideaId);

    if (!idea) {
      res.status(404).json({ error: 'Idea not found' });
      return;
    }

    // If idea has an associated project, delete it too
    if (idea.projectId) {
      await Project.findByIdAndDelete(idea.projectId);
    }

    await Idea.findByIdAndDelete(req.params.ideaId);

    // Invalidate cache after delete
    invalidateIdeasCache();

    res.json({ message: 'Idea and associated project deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get ideas submitted by current user
router.get('/my/ideas', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const ideas = await Idea.find({ submittedBy: req.user?.id })
      .sort({ createdAt: -1 });

    res.json({ ideas });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
