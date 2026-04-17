import { Response, Router } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { authenticate, AuthRequest } from '../middleware/auth';
import Message from '../models/Message';
import Project from '../models/Project';
import User from '../models/User';
import emailNotifications from '../services/emailService';

// Helper to get socket.io instance from app
const getIO = (req: AuthRequest): SocketIOServer | null => {
  return req.app.get('io') as SocketIOServer | null;
};

// ============================================
// In-memory cache for project members (fast loading)
// ============================================
const membersCache = new Map<string, { data: any; timestamp: number }>();
const MEMBERS_CACHE_TTL = 60 * 1000; // 1 minute

function getMembersCache(projectId: string): any | null {
  const entry = membersCache.get(projectId);
  if (entry && Date.now() - entry.timestamp < MEMBERS_CACHE_TTL) {
    return entry.data;
  }
  membersCache.delete(projectId);
  return null;
}

function setMembersCache(projectId: string, data: any): void {
  membersCache.set(projectId, { data, timestamp: Date.now() });
}

export function invalidateMembersCache(projectId?: string): void {
  if (projectId) {
    membersCache.delete(projectId);
  } else {
    membersCache.clear();
  }
}

const router = Router();

// Get all projects (with filters)
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, category, visibility, search, limit = 20, page = 1 } = req.query;

    let query: any = {};

    if (status) query.status = status;
    if (category) query.category = category;
    if (visibility) query.visibility = visibility;
    else query.visibility = 'public'; // Default to public projects

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search as string, 'i')] } }
      ];
    }

    const projects = await Project.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .populate('owner', 'name email');

    const total = await Project.countDocuments(query);

    res.json({
      projects,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all project members (for admin stats) - MUST BE BEFORE /:projectId
router.get('/members', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const projects = await Project.find({})
      .select('members title')
      .populate('members.userId', 'name email');

    const allMembers = projects.flatMap(p =>
      p.members.map((m: any) => ({
        userId: m.userId,
        name: m.name,
        email: m.email,
        role: m.role,
        joinedAt: m.joinedAt,
        projectTitle: p.title,
        projectId: p._id
      }))
    );

    res.json({ members: allMembers });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single project by ID (supports both project ID and idea ID)
router.get('/:projectId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;

    // First try to find by project ID
    let project = await Project.findById(projectId)
      .populate('owner', 'name email')
      .populate('members.userId', 'name email');

    // If not found, try to find by ideaId
    if (!project) {
      project = await Project.findOne({ ideaId: projectId })
        .populate('owner', 'name email')
        .populate('members.userId', 'name email');
    }

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Check if user has access to private project
    if (project.visibility === 'private') {
      const isMember = project.members.some(m => m.userId.toString() === req.user?.id);
      const isOwner = project.owner.toString() === req.user?.id;

      if (!isMember && !isOwner && req.user?.role !== 'admin') {
        res.status(403).json({ error: 'Not authorized to view this project' });
        return;
      }
    }

    res.json({ project });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new project
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, category, visibility, techStack, tags, maxMembers } = req.body;

    if (!title || !description || !category) {
      res.status(400).json({ error: 'Title, description, and category are required' });
      return;
    }

    const project = new Project({
      title,
      description,
      category,
      visibility: visibility || 'public',
      techStack: techStack || [],
      tags: tags || [],
      maxMembers: maxMembers || 5,
      owner: req.user?.id,
      members: [{
        userId: req.user?.id,
        name: req.user?.name,
        email: req.user?.email,
        role: 'owner',
        joinedAt: new Date()
      }],
      status: 'planning'
    });

    await project.save();

    // Send email notification to all users about new project (async, don't wait)
    try {
      const users = await User.find({ _id: { $ne: req.user?.id } }).select('email');
      const userEmails = users.map(u => u.email).filter(Boolean);
      if (userEmails.length > 0) {
        emailNotifications.notifyNewProject(title, req.user?.name || 'Someone', userEmails);
      }
    } catch (emailError) {
      console.error('Failed to send new project email notifications:', emailError);
    }

    res.status(201).json({
      message: 'Project created successfully',
      project
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update a project
router.put('/:projectId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const project = await Project.findById(req.params.projectId);

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Check authorization
    const isOwner = project.owner.toString() === req.user?.id;
    const isAdmin = project.members.some(m =>
      m.userId.toString() === req.user?.id && (m.role === 'owner' || m.role === 'admin')
    );

    if (!isOwner && !isAdmin && req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Not authorized to update this project' });
      return;
    }

    const allowedUpdates = [
      'title', 'description', 'category', 'status', 'visibility',
      'techStack', 'tags', 'repositoryUrl', 'liveUrl', 'maxMembers',
      'startDate', 'expectedEndDate', 'actualEndDate'
    ];

    const updates: any = {};
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    const updatedProject = await Project.findByIdAndUpdate(
      req.params.projectId,
      { $set: updates },
      { new: true }
    );

    res.json({
      message: 'Project updated successfully',
      project: updatedProject
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a project (and associated ideas and join requests)
router.delete('/:projectId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const project = await Project.findById(req.params.projectId);

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Import models for cleanup
    const Idea = require('../models/Idea').default;
    const JoinRequest = require('../models/JoinRequest').default;

    // Delete associated idea that created this project
    await Idea.deleteMany({ projectId: req.params.projectId });

    // Delete all join requests for this project
    await JoinRequest.deleteMany({ projectId: req.params.projectId });

    // Delete the project itself
    await Project.findByIdAndDelete(req.params.projectId);

    res.json({ message: 'Project and all associated data deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Check user role in project
router.get('/:projectId/role/:userId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const project = await Project.findById(req.params.projectId);

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const userId = req.params.userId;

    // Check if owner
    if (project.owner.toString() === userId) {
      res.json({ role: 'creator' });
      return;
    }

    // Check if member
    const member = project.members.find(m => m.userId.toString() === userId);
    if (member) {
      res.json({ role: member.role === 'owner' ? 'creator' : 'contributor' });
      return;
    }

    res.json({ role: '' }); // No role
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get project members - CACHED
router.get('/:projectId/members', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const projectId = req.params.projectId;

    // Try cache first
    const cached = getMembersCache(projectId);
    if (cached) {
      res.set('X-Cache', 'HIT');
      res.set('Cache-Control', 'private, max-age=30');
      res.json(cached);
      return;
    }

    const project = await Project.findById(projectId)
      .populate('members.userId', 'name email _id');

    if (!project) {
      console.log('❌ Project not found:', projectId);
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Map members to ensure userId is always available as a string
    const mappedMembers = project.members.map((m: any) => {
      // Get userId - whether populated or not
      const userId = typeof m.userId === 'object' && m.userId !== null
        ? (m.userId._id?.toString() || m.userId.id?.toString() || m.userId.toString())
        : m.userId?.toString();

      return {
        _id: m._id,
        userId: userId,
        name: m.userId?.name || m.name,
        email: m.userId?.email || m.email,
        role: m.role,
        joinedAt: m.joinedAt
      };
    });

    const response = { members: mappedMembers };

    // Cache the response
    setMembersCache(projectId, response);

    res.set('X-Cache', 'MISS');
    res.set('Cache-Control', 'private, max-age=30');
    res.json(response);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get projects for current user (member or owner)
router.get('/my/projects', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const projects = await Project.find({
      $or: [
        { owner: req.user?.id },
        { 'members.userId': req.user?.id }
      ]
    }).sort({ updatedAt: -1 });

    res.json({ projects });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Join a project (request to join)
router.post('/:projectId/join', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const project = await Project.findById(req.params.projectId);

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Check if already a member
    const isMember = project.members.some(m => m.userId.toString() === req.user?.id);
    if (isMember) {
      res.status(400).json({ error: 'Already a member of this project' });
      return;
    }

    // Check if project is full
    if (project.members.length >= project.maxMembers) {
      res.status(400).json({ error: 'Project is full' });
      return;
    }

    // Add member
    project.members.push({
      userId: req.user?.id as any,
      name: req.user?.name || '',
      email: req.user?.email || '',
      role: 'member',
      joinedAt: new Date()
    });

    await project.save();

    // Invalidate members cache for this project
    invalidateMembersCache(req.params.projectId);

    res.json({
      message: 'Successfully joined the project',
      project
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Leave a project
router.post('/:projectId/leave', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const project = await Project.findById(req.params.projectId);

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Cannot leave if owner
    if (project.owner.toString() === req.user?.id) {
      res.status(400).json({ error: 'Owner cannot leave the project. Transfer ownership first or delete the project.' });
      return;
    }

    // Remove member
    project.members = project.members.filter(m => m.userId.toString() !== req.user?.id);
    await project.save();

    // Invalidate members cache for this project
    invalidateMembersCache(req.params.projectId);

    res.json({ message: 'Successfully left the project' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Remove a member from project (creator only)
router.delete('/:projectId/members/:memberId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const project = await Project.findById(req.params.projectId);

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Only the owner/creator can remove members
    const isOwner = project.owner.toString() === req.user?.id;
    if (!isOwner) {
      res.status(403).json({ error: 'Only the project creator can remove members' });
      return;
    }

    const memberIdToRemove = req.params.memberId;

    // Cannot remove yourself (the owner)
    if (memberIdToRemove === req.user?.id) {
      res.status(400).json({ error: 'You cannot remove yourself from the project. Delete the project instead.' });
      return;
    }

    // Check if member exists in the project
    const memberExists = project.members.some(m => m.userId.toString() === memberIdToRemove);
    if (!memberExists) {
      res.status(404).json({ error: 'Member not found in this project' });
      return;
    }

    // Remove the member
    project.members = project.members.filter(m => m.userId.toString() !== memberIdToRemove);
    await project.save();

    // Invalidate members cache for this project
    invalidateMembersCache(req.params.projectId);

    // Emit socket event for real-time update
    const io = getIO(req);
    if (io) {
      // Emit to project room for other members
      io.to(`project:${req.params.projectId}`).emit('member-removed', {
        projectId: req.params.projectId,
        memberId: memberIdToRemove
      });
      // Also emit to the removed user's personal room so they get notified
      io.to(`user:${memberIdToRemove}`).emit('member-removed', {
        projectId: req.params.projectId,
        memberId: memberIdToRemove
      });
    }

    res.json({ message: 'Member removed successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add an issue to a project
router.post('/:projectId/issues', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, description, priority, assignedTo } = req.body;

    if (!title) {
      res.status(400).json({ error: 'Issue title is required' });
      return;
    }

    const project = await Project.findById(req.params.projectId);

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Check if user is a member or owner
    const isMember = project.members.some(m => m.userId.toString() === req.user?.id);
    const isOwner = project.owner.toString() === req.user?.id;
    if (!isMember && !isOwner && req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Only project members can add issues' });
      return;
    }

    const issue = {
      title,
      description: description || '',
      status: 'open' as const,
      priority: priority || 'medium',
      assignedTo: assignedTo || undefined,  // Store as string (username) like Firebase
      createdBy: req.user?.id as any,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    project.issues.push(issue as any);
    await project.save();

    const newIssue = project.issues[project.issues.length - 1];

    // Emit real-time event for new task
    const io = getIO(req);
    if (io) {
      io.to(`project:${req.params.projectId}`).emit('task-created', { task: newIssue });
    }

    res.status(201).json({
      message: 'Issue added successfully',
      issue: newIssue
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update an issue
router.put('/:projectId/issues/:issueId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      title, description, status, priority, assignedTo,
      completedBy, completedByName, completedAt, pendingVerification,
      verified, verifiedBy, verifiedByName, verifiedAt, verificationFeedback
    } = req.body;

    const project = await Project.findById(req.params.projectId);

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const issueIndex = project.issues.findIndex((i: any) => i._id?.toString() === req.params.issueId);
    if (issueIndex === -1) {
      res.status(404).json({ error: 'Issue not found' });
      return;
    }

    const issue = project.issues[issueIndex] as any;

    // Update basic issue fields
    if (title) issue.title = title;
    if (description !== undefined) issue.description = description;
    if (status) issue.status = status;
    if (priority) issue.priority = priority;
    if (assignedTo !== undefined) issue.assignedTo = assignedTo;

    // Update completion/verification fields
    if (completedBy !== undefined) issue.completedBy = completedBy;
    if (completedByName !== undefined) issue.completedByName = completedByName;
    if (completedAt !== undefined) issue.completedAt = completedAt;
    if (pendingVerification !== undefined) issue.pendingVerification = pendingVerification;
    if (verified !== undefined) issue.verified = verified;
    if (verifiedBy !== undefined) issue.verifiedBy = verifiedBy;
    if (verifiedByName !== undefined) issue.verifiedByName = verifiedByName;
    if (verifiedAt !== undefined) issue.verifiedAt = verifiedAt;
    if (verificationFeedback !== undefined) issue.verificationFeedback = verificationFeedback;

    issue.updatedAt = new Date();

    await project.save();

    const updatedIssue = project.issues[issueIndex];

    // Emit real-time event for task update
    const io = getIO(req);
    if (io) {
      io.to(`project:${req.params.projectId}`).emit('task-updated', {
        taskId: req.params.issueId,
        task: updatedIssue
      });
    }

    res.json({
      message: 'Issue updated successfully',
      issue: updatedIssue
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all project members (for admin stats)
router.get('/members', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const projects = await Project.find({})
      .select('members title')
      .populate('members.userId', 'name email');

    const allMembers = projects.flatMap(p =>
      p.members.map((m: any) => ({
        userId: m.userId,
        name: m.name,
        email: m.email,
        role: m.role,
        joinedAt: m.joinedAt,
        projectTitle: p.title,
        projectId: p._id
      }))
    );

    res.json({ members: allMembers });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== PROJECT MESSAGES ====================

// Get project messages
router.get('/:projectId/messages', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const projectId = req.params.projectId;
    console.log('📨 [GET] Fetching messages for project:', projectId);

    // Find all messages for this project
    const messages = await Message.find({ projectId: projectId })
      .sort({ createdAt: 1 });

    console.log('📨 [GET] Found', messages.length, 'messages');

    // Map to frontend format
    const formattedMessages = messages.map((msg) => ({
      id: msg._id.toString(),
      text: msg.text || msg.content,
      senderId: msg.senderId,
      senderName: msg.senderName || 'Unknown',
      timestamp: msg.createdAt
    }));

    // Always return 200 with messages array (empty if no messages)
    res.status(200).json({ messages: formattedMessages });
  } catch (error: unknown) {
    console.error('📨 [GET] Error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error', messages: [] });
  }
});

// Send message to project
router.post('/:projectId/messages', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const projectId = req.params.projectId;
    console.log('📨 [POST] Sending message to project:', projectId);

    // Validate message text
    if (!req.body.text || !req.body.text.trim()) {
      res.status(400).json({ error: 'Message text is required' });
      return;
    }

    // Get sender name from user
    const sender = await User.findById(req.user?.id);
    const senderName = sender?.name || req.user?.email?.split('@')[0] || 'Unknown';

    // Create the message directly - if the user has the project open, they should be able to message
    const message = await Message.create({
      projectId: projectId,
      senderId: req.user?.id,
      senderName: senderName,
      text: req.body.text.trim(),
      content: req.body.text.trim()
    });

    console.log('📨 [POST] Message created:', message._id);

    // Emit real-time event to all users in the project room
    const io = req.app.get('io');
    console.log('📨 [POST] Socket.io available:', !!io);
    if (io) {
      const roomName = `project:${projectId}`;
      console.log('📨 [POST] Emitting to room:', roomName);
      io.to(roomName).emit('new-message', {
        id: message._id.toString(),
        text: message.text,
        senderId: req.user?.id,
        senderName: senderName,
        timestamp: message.createdAt
      });
      console.log('📨 [POST] Message emitted to socket room');
    }

    // Send email notification to other project members (async, don't wait)
    try {
      const project = await Project.findById(projectId);
      if (project) {
        const otherMemberIds = project.members
          .filter((m: any) => m.userId?.toString() !== req.user?.id)
          .map((m: any) => m.userId);
        const recipients = await User.find({ _id: { $in: otherMemberIds } }).select('email');
        const emails = recipients.map(r => r.email).filter(Boolean) as string[];
        emails.forEach(email => {
          emailNotifications.notifyProjectMessage(
            senderName,
            project.title,
            req.body.text.trim(),
            email
          );
        });
      }
    } catch (emailError) {
      console.error('Failed to send project message email notification:', emailError);
    }

    res.status(201).json({
      message: {
        id: message._id.toString(),
        text: message.text,
        senderId: req.user?.id,
        senderName: senderName,
        timestamp: message.createdAt
      }
    });
  } catch (error: unknown) {
    console.error('📨 [POST] Error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Edit project message
router.patch('/:projectId/messages/:messageId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      res.status(400).json({ error: 'Message text is required' });
      return;
    }

    const message = await Message.findById(req.params.messageId);

    if (!message) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    // Only sender can edit their message
    if (message.senderId !== req.user?.id) {
      res.status(403).json({ error: 'You can only edit your own messages' });
      return;
    }

    message.text = text.trim();
    message.content = text.trim();
    await message.save();

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.to(`project:${req.params.projectId}`).emit('message-edited', {
        id: message._id.toString(),
        text: message.text,
        updatedAt: message.updatedAt
      });
    }

    res.json({
      message: {
        id: message._id.toString(),
        text: message.text,
        updatedAt: message.updatedAt
      }
    });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Delete project message
router.delete('/:projectId/messages/:messageId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const message = await Message.findById(req.params.messageId);

    if (!message) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    // Only sender can delete their message
    if (message.senderId !== req.user?.id) {
      res.status(403).json({ error: 'You can only delete your own messages' });
      return;
    }

    await message.deleteOne();

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.to(`project:${req.params.projectId}`).emit('message-deleted', {
        messageId: req.params.messageId
      });
    }

    res.json({ success: true });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// ==================== PROJECT FILES ====================

// Get project files
router.get('/:projectId/files', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    console.log('📁 GET files for project:', projectId);

    // Try to find project - support both MongoDB ObjectId and string-based IDs
    let project = await Project.findById(projectId).catch(() => null);

    // If not found by _id, try by projectId field
    if (!project) {
      project = await Project.findOne({ projectId: projectId });
    }

    if (!project) {
      console.log('⚠️ Project not found, returning empty files');
      res.json({ files: [] });
      return;
    }

    const files = (project.files || []).map((file: any) => ({
      id: file._id?.toString() || file.id,
      name: file.name,
      url: file.url,
      type: file.type,
      size: file.size,
      uploadedBy: file.uploadedBy,
      uploadedAt: file.uploadedAt
    }));

    console.log(`📁 Returning ${files.length} files for project ${projectId}`);
    res.json({ files });
  } catch (error: unknown) {
    console.error('❌ Error getting files:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Upload file to project
router.post('/:projectId/files', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    console.log('📁 POST file to project:', projectId, req.body);

    // Try to find project - support both MongoDB ObjectId and string-based IDs
    let project = await Project.findById(projectId).catch(() => null);

    // If not found by _id, try by projectId field
    if (!project) {
      project = await Project.findOne({ projectId: projectId });
    }

    if (!project) {
      console.log('❌ Project not found for upload:', projectId);
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Check if user is a member or owner
    const isOwner = project.owner.toString() === req.user?.id;
    const isMember = project.members.some(m => m.userId.toString() === req.user?.id);

    if (!isOwner && !isMember) {
      console.log('⚠️ User not authorized to upload');
      res.status(403).json({ error: 'You must be a project member to upload files' });
      return;
    }

    const { name, url, size, type } = req.body;

    const newFile = {
      name,
      url: url || '#',
      type: type || 'unknown',
      size: size || 0,
      uploadedBy: req.user?.id,
      uploadedAt: new Date()
    };

    project.files.push(newFile as any);
    await project.save();

    // Get the saved file with its generated _id
    const savedFile = project.files[project.files.length - 1];

    console.log('✅ File uploaded:', savedFile);

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.to(`project:${projectId}`).emit('file-uploaded', {
        id: (savedFile as any)._id?.toString(),
        name: savedFile.name,
        url: savedFile.url,
        type: savedFile.type,
        size: savedFile.size,
        uploadedBy: req.user?.id,
        uploadedAt: savedFile.uploadedAt
      });
    }

    res.status(201).json({
      file: {
        id: (savedFile as any)._id?.toString(),
        name: savedFile.name,
        url: savedFile.url,
        type: savedFile.type,
        size: savedFile.size,
        uploadedBy: req.user?.id,
        uploadedAt: savedFile.uploadedAt
      }
    });
  } catch (error: unknown) {
    console.error('❌ Error uploading file:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Delete file from project
router.delete('/:projectId/files/:fileId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId, fileId } = req.params;
    console.log('🗑️ DELETE file from project:', projectId, fileId);

    // Try to find project - support both MongoDB ObjectId and string-based IDs
    let project = await Project.findById(projectId).catch(() => null);

    // If not found by _id, try by projectId field
    if (!project) {
      project = await Project.findOne({ projectId: projectId });
    }

    if (!project) {
      console.log('❌ Project not found for delete:', projectId);
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Check if user is a member or owner
    const isOwner = project.owner.toString() === req.user?.id;
    const isMember = project.members.some(m => m.userId.toString() === req.user?.id);

    if (!isOwner && !isMember) {
      res.status(403).json({ error: 'You must be a project member to delete files' });
      return;
    }

    const fileIndex = project.files.findIndex((f: any) => f._id?.toString() === fileId);
    if (fileIndex === -1) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    project.files.splice(fileIndex, 1);
    await project.save();

    console.log('✅ File deleted');

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.to(`project:${projectId}`).emit('file-deleted', {
        fileId: fileId
      });
    }

    res.json({ success: true });
  } catch (error: unknown) {
    console.error('❌ Error deleting file:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export default router;
