import { Response, Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { updateProfileValidation } from '../middleware/validation';
import { BoardTask } from '../models/Board';
import Project from '../models/Project';
import User from '../models/User';

const router = Router();

// Check if a username is available
router.get('/check-username/:username', async (req: any, res: Response): Promise<void> => {
  try {
    const { username } = req.params;
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;

    if (!usernameRegex.test(username)) {
      res.json({ available: false, error: 'Username must be 3-30 characters: letters, numbers, underscores only' });
      return;
    }

    const existing = await User.findOne({ username: username.toLowerCase() });
    res.json({ available: !existing });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update username (authenticated)
router.put('/update-username', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { username } = req.body;

    if (!username) {
      res.status(400).json({ error: 'Username is required' });
      return;
    }

    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    if (!usernameRegex.test(username)) {
      res.status(400).json({ error: 'Username must be 3-30 characters: letters, numbers, underscores only' });
      return;
    }

    const lowerUsername = username.toLowerCase();

    // Check if taken by another user
    const existing = await User.findOne({ username: lowerUsername, _id: { $ne: userId } });
    if (existing) {
      res.status(400).json({ error: 'Username already taken' });
      return;
    }

    const user = await User.findByIdAndUpdate(userId, { username: lowerUsername }, { new: true }).select('-password');
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user: { id: user._id.toString(), username: user.username, name: user.name } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users (accessible to any authenticated user)
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, limit = 50, page = 1 } = req.query;

    let query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await User.countDocuments(query);

    res.json({
      users,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit))
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's completed tasks count (MUST be before /:userId route)
// Counts tasks that are verified completed and assigned to this user
// Includes both old Project.issues system AND new Kanban BoardTask system
router.get('/:userId/completed-tasks', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId;

    // Get user to find their name for matching assignedTo
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const userName = user.name || user.email?.split('@')[0] || '';

    // Find all projects and count issues where:
    // - verified is true (approved by owner)
    // - assignedTo matches user's name OR completedBy matches user's id
    const projects = await Project.find({});

    let count = 0;
    const completedTasks: any[] = [];

    // 1. Count from old Project.issues system (legacy)
    for (const project of projects) {
      for (const issue of project.issues) {
        const issueData = issue as any;
        // Task is considered completed if:
        // 1. verified === true (owner approved it)
        // 2. AND (assignedTo matches userName OR completedBy matches userId)
        if (issueData.verified === true &&
            (issueData.assignedTo === userName ||
             issueData.assignedTo === user.email?.split('@')[0] ||
             issueData.completedBy === userId)) {
          count++;
          completedTasks.push({
            id: issueData._id,
            title: issueData.title,
            projectTitle: project.title,
            projectId: project._id.toString(), // Ensure string ID for consistent grouping
            completedAt: issueData.completedAt,
            verifiedAt: issueData.verifiedAt,
            verifiedByName: issueData.verifiedByName,
            source: 'issues'
          });
        }
      }
    }

    // 2. Count from Kanban BoardTask system (new)
    // Tasks where user is assignee AND task is approved by project creator
    // Only approved tasks count towards certificates
    // IMPORTANT: Only assignees get credit, NOT the owner who approved it
    const kanbanTasks = await BoardTask.find({
      'assignees': userId, // Only count if user is an assignee
      completedAt: { $exists: true, $ne: null },
      reviewStatus: 'approved'
    }).populate('projectId', 'title');

    for (const task of kanbanTasks) {
      count++;
      // Extract projectId properly - after populate, projectId is an object
      const populatedProject = task.projectId as any;
      const projectIdString = populatedProject?._id?.toString() || populatedProject?.toString() || '';
      const projectTitle = populatedProject?.title || 'Unknown Project';

      completedTasks.push({
        id: task._id,
        title: task.title,
        projectTitle: projectTitle,
        projectId: projectIdString, // Use string ID, not populated object
        completedAt: task.completedAt,
        reviewedAt: task.reviewedAt,
        reviewedBy: task.reviewedBy,
        source: 'kanban'
      });
    }

    res.json({ count, completedTasks });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's join requests (MUST be before /:userId route)
router.get('/:userId/join-requests', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Import JoinRequest model dynamically to avoid circular dependency
    const JoinRequest = require('../models/JoinRequest').default;
    const requests = await JoinRequest.find({ userId: req.params.userId })
      .populate('projectId', 'title description status')
      .sort({ createdAt: -1 });
    res.json({ requests });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get user profile by ID
router.get('/:userId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.userId).select('-password');
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update user profile
router.put('/:userId', authenticate, updateProfileValidation, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Check if user is updating their own profile
    if (req.user?.id !== req.params.userId && req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Not authorized to update this profile' });
      return;
    }

    const { password, ...updateData } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users (admin only or limited info)
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, limit = 20, page = 1 } = req.query;

    let query: any = {};
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const users = await User.find(query)
      .select('name email institute skills profileCompletion')
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await User.countDocuments(query);

    res.json({ users, total, page: Number(page), limit: Number(limit) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add badges to user
router.post('/:userId/badges', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { badges } = req.body;

    if (!badges || !Array.isArray(badges)) {
      res.status(400).json({ error: 'Badges array is required' });
      return;
    }

    // Check if user is adding badges to their own profile
    if (req.user?.id !== req.params.userId && req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Not authorized to add badges to this profile' });
      return;
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Get existing badges
    const existingBadges = user.badges || [];
    const existingBadgeIds = existingBadges.map((b: any) => b.id);

    // Filter out badges that are already earned
    const newBadges = badges.filter((b: any) => !existingBadgeIds.includes(b.id));

    if (newBadges.length === 0) {
      res.json({ message: 'No new badges to add', badges: existingBadges });
      return;
    }

    // Add new badges
    const updatedUser = await User.findByIdAndUpdate(
      req.params.userId,
      { $push: { badges: { $each: newBadges } } },
      { new: true }
    ).select('-password');

    res.json({
      message: `${newBadges.length} badge(s) added successfully!`,
      badges: updatedUser?.badges || [],
      newBadges
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get user badges
router.get('/:userId/badges', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.userId).select('badges name');
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ badges: user.badges || [], userName: user.name });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Save push token for the authenticated user
router.post('/push-token', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { pushToken } = req.body;
    if (!pushToken || typeof pushToken !== 'string') {
      res.status(400).json({ error: 'pushToken is required' });
      return;
    }
    // Add token if not already stored (avoid duplicates)
    await User.findByIdAndUpdate(req.user!.id, {
      $addToSet: { pushTokens: pushToken },
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Remove push token (on logout)
router.delete('/push-token', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { pushToken } = req.body;
    if (pushToken) {
      await User.findByIdAndUpdate(req.user!.id, {
        $pull: { pushTokens: pushToken },
      });
    } else {
      // Remove all tokens for this user (full logout)
      await User.findByIdAndUpdate(req.user!.id, {
        $set: { pushTokens: [] },
      });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
