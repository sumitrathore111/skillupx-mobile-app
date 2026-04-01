import { Response, Router } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { authenticate, AuthRequest } from '../middleware/auth';
import JoinRequest from '../models/JoinRequest';
import Project from '../models/Project';
import User from '../models/User';
import emailNotifications from '../services/emailService';
import { invalidateMembersCache } from './projects';

// ============================================
// In-memory cache for join requests (fast loading)
// ============================================
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30 * 1000; // 30 seconds (shorter due to status changes)

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

function invalidateJoinRequestsCache(): void {
  cache.clear();
}

// Helper to get socket.io instance from app
const getIO = (req: AuthRequest): SocketIOServer | null => {
  return req.app.get('io') as SocketIOServer | null;
};

// Helper to find project by ID or ideaId (for dual ID lookup support)
const findProject = async (projectIdOrIdeaId: string) => {
  // First try to find by direct _id
  let project = await Project.findById(projectIdOrIdeaId).catch(() => null);

  // If not found, try to find by ideaId
  if (!project) {
    project = await Project.findOne({ ideaId: projectIdOrIdeaId });
  }

  return project;
};

const router = Router();

// Get all join requests (for debugging or admin) - CACHED
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Try cache first
    const cached = getCache('all-requests');
    if (cached) {
      res.set('X-Cache', 'HIT');
      res.set('Cache-Control', 'private, max-age=15');
      res.json(cached);
      return;
    }

    const requests = await JoinRequest.find()
      .populate('projectId', 'title')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    const response = { requests };
    setCache('all-requests', response);

    res.set('X-Cache', 'MISS');
    res.set('Cache-Control', 'private, max-age=15');
    res.json(response);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Debug route - get all requests with full details
router.get('/debug', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const requests = await JoinRequest.find()
      .populate('projectId')
      .populate('userId')
      .sort({ createdAt: -1 });
    res.json({ requests });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create a join request
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId, message } = req.body;

    // Check if project exists (supports both project ID and idea ID)
    const project = await findProject(projectId);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const actualProjectId = project._id.toString();
    console.log('📋 Creating join request for project:', actualProjectId, '(queried with:', projectId, ')');

    // Check if user is already a member
    const isMember = project.members.some(m => m.userId.toString() === req.user?.id);
    if (isMember) {
      res.status(400).json({ error: 'Already a member of this project' });
      return;
    }

    // Check if request already exists (check both the queried ID and actual project ID)
    const existingRequest = await JoinRequest.findOne({
      $or: [{ projectId: actualProjectId }, { projectId: projectId }],
      userId: req.user?.id
    });

    if (existingRequest) {
      res.status(400).json({
        error: 'Join request already exists',
        status: existingRequest.status
      });
      return;
    }

    // Get the user's name from database if not available in req.user
    let userName = req.user?.name || '';
    const userEmail = req.user?.email || '';

    if (!userName || userName.trim() === '') {
      const User = require('../models/User').default;
      const user = await User.findById(req.user?.id);
      if (user) {
        userName = user.name || userEmail.split('@')[0] || 'Unknown User';
      } else {
        userName = userEmail.split('@')[0] || 'Unknown User';
      }
    }

    // Create join request - use the actual project ID (not the idea ID)
    const request = await JoinRequest.create({
      projectId: actualProjectId,
      userId: req.user?.id,
      userName,
      userEmail,
      message
    });

    console.log('✅ Join request created:', request._id, 'for project:', actualProjectId);

    // Send email notification to project owner about new join request (async, don't wait)
    try {
      const owner = await User.findById(project.owner).select('email');
      if (owner?.email) {
        emailNotifications.notifyNewJoinRequest(project.title, userName, owner.email);
      }
    } catch (emailError) {
      console.error('Failed to send join request email notification:', emailError);
    }

    // Invalidate cache after new request
    invalidateJoinRequestsCache();

    res.status(201).json({ request });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's join requests
router.get('/user/:userId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const requests = await JoinRequest.find({ userId: req.params.userId })
      .populate('projectId', 'title description status')
      .sort({ createdAt: -1 });
    res.json({ requests });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get join requests for a project (for project owner/admin)
// Only returns pending requests - approved/rejected are filtered out
// Supports lookup by both project ID and idea ID
router.get('/project/:projectId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Find the actual project (supports both project ID and idea ID)
    const project = await findProject(req.params.projectId);

    if (!project) {
      console.log('❌ Project not found for ID:', req.params.projectId);
      res.json({ requests: [] });
      return;
    }

    const actualProjectId = project._id.toString();
    console.log('📋 Fetching join requests for project:', actualProjectId, '(queried with:', req.params.projectId, ')');

    const requests = await JoinRequest.find({
      projectId: actualProjectId,
      status: 'pending'  // Only show pending requests
    })
      .populate('userId', 'name email skills')
      .sort({ createdAt: -1 });

    console.log('📋 Found', requests.length, 'pending join requests');
    res.json({ requests });
  } catch (error: any) {
    console.error('Error fetching join requests:', error);
    res.status(500).json({ error: error.message });
  }
});

// Respond to join request (approve/reject)
router.put('/:requestId/respond', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      res.status(400).json({ error: 'Invalid status. Must be "approved" or "rejected"' });
      return;
    }

    const request = await JoinRequest.findById(req.params.requestId);
    if (!request) {
      res.status(404).json({ error: 'Join request not found' });
      return;
    }

    console.log('📋 Processing join request:', req.params.requestId);
    console.log('📋 Request projectId:', request.projectId.toString());

    // Check if user is project owner (only owner can approve/reject)
    const project = await Project.findById(request.projectId);
    if (!project) {
      console.log('❌ Project not found for request projectId:', request.projectId.toString());
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    console.log('📋 Found project:', project._id.toString(), 'Title:', project.title);

    const isOwner = project.owner.toString() === req.user?.id;

    if (!isOwner) {
      res.status(403).json({ error: 'Only the project owner can approve or reject join requests' });
      return;
    }

    // Update request
    request.status = status;
    request.respondedBy = req.user?.id as any;
    request.respondedAt = new Date();
    await request.save();

    // If approved, add user to project
    if (status === 'approved') {
      console.log('📋 Approving join request for project:', project._id.toString());
      console.log('📋 Request userId:', request.userId.toString());

      // Check if user is already a member to prevent duplicates
      const isAlreadyMember = project.members.some(m => m.userId.toString() === request.userId.toString());
      console.log('📋 Is already member:', isAlreadyMember);

      if (!isAlreadyMember) {
        // Get the user's name from the database if not stored in request
        let userName = request.userName;
        let userEmail = request.userEmail;

        if (!userName || userName.trim() === '') {
          const User = require('../models/User').default;
          const user = await User.findById(request.userId);
          if (user) {
            userName = user.name || user.email?.split('@')[0] || 'Unknown User';
            userEmail = user.email || userEmail;
          } else {
            userName = userEmail?.split('@')[0] || 'Unknown User';
          }
        }

        console.log('📋 Adding member:', { userId: request.userId.toString(), name: userName, email: userEmail });

        project.members.push({
          userId: request.userId,
          name: userName,
          email: userEmail,
          role: 'member',
          joinedAt: new Date()
        });

        const savedProject = await project.save();
        console.log('📋 Project saved with', savedProject.members.length, 'members');

        // Invalidate members cache for this project
        invalidateMembersCache(project._id.toString());

        // Emit real-time event for new member
        const io = getIO(req);
        if (io) {
          io.to(`project:${project._id}`).emit('member-joined', {
            userId: request.userId,
            userName,
            userEmail,
            role: 'member'
          });
          // Also emit to the user's personal room so they get notified even if not in project room
          io.to(`user:${request.userId}`).emit('member-joined', {
            userId: request.userId,
            userName,
            userEmail,
            role: 'member'
          });
        }
      }
    }

    // Emit real-time event for join request status change
    const io = getIO(req);
    if (io) {
      io.to(`project:${project._id}`).emit('join-request-updated', {
        requestId: req.params.requestId,
        status,
        userId: request.userId
      });
      // Also emit to the user who made the request so they get notified immediately
      io.to(`user:${request.userId}`).emit('join-request-updated', {
        requestId: req.params.requestId,
        status,
        userId: request.userId,
        projectId: project._id
      });
    }

    // Send email notification to the user about their join request status (async, don't wait)
    try {
      const requestUser = await User.findById(request.userId).select('email');
      if (requestUser?.email) {
        if (status === 'approved') {
          emailNotifications.notifyJoinRequestApproved(project.title, requestUser.email);
        } else if (status === 'rejected') {
          emailNotifications.notifyJoinRequestRejected(project.title, requestUser.email);
        }
      }
    } catch (emailError) {
      console.error('Failed to send join request status email notification:', emailError);
    }

    // Invalidate caches after status change
    invalidateJoinRequestsCache();

    res.json({ request, project: status === 'approved' ? project : undefined });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Fix join request project ID (for data correction)
router.put('/:requestId/fix', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.body;

    const request = await JoinRequest.findByIdAndUpdate(
      req.params.requestId,
      { projectId },
      { new: true }
    );

    if (!request) {
      res.status(404).json({ error: 'Join request not found' });
      return;
    }

    res.json({ request });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete join request
router.delete('/:requestId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const request = await JoinRequest.findById(req.params.requestId);
    if (!request) {
      res.status(404).json({ error: 'Join request not found' });
      return;
    }

    // Only allow deletion by the user who made the request
    if (request.userId.toString() !== req.user?.id) {
      res.status(403).json({ error: 'Not authorized to delete this request' });
      return;
    }

    await JoinRequest.findByIdAndDelete(req.params.requestId);
    res.json({ message: 'Join request deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
