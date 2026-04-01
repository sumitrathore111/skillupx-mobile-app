import { Response, Router } from 'express';
import mongoose from 'mongoose';
import { Server as SocketIOServer } from 'socket.io';
import { authenticate, AuthRequest } from '../middleware/auth';
import Chat from '../models/Chat';
import ChatMessage from '../models/ChatMessage';
import Project from '../models/Project';
import ProjectInvite from '../models/ProjectInvite';
import User from '../models/User';
import emailNotifications from '../services/emailService';

// Helper to get socket.io instance from app
const getIO = (req: AuthRequest): SocketIOServer | null => {
  return req.app.get('io') as SocketIOServer | null;
};

const router = Router();

// Get all developers (paginated) - excludes current members and already invited
router.get('/developers/:projectId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { page = 1, limit = 20, search } = req.query;

    if (!projectId || projectId === 'undefined') {
      res.status(400).json({ error: 'Valid project ID is required' });
      return;
    }

    // First try to find by project ID
    let project = await Project.findById(projectId);

    // If not found, try to find by ideaId
    if (!project) {
      project = await Project.findOne({ ideaId: projectId });
    }

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Get pending invites to exclude already invited users
    const pendingInvites = await ProjectInvite.find({
      projectId: project._id, // Use actual project._id for querying
      status: 'pending'
    }).select('invitedUserId');

    // Build exclude list
    const excludeIds = [
      ...project.members.map(m => m.userId?.toString()).filter(Boolean),
      ...pendingInvites.map(i => i.invitedUserId?.toString()).filter(Boolean),
      req.user?.id
    ].filter(Boolean);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = {
      _id: { $nin: excludeIds }
    };

    // Add search filter if provided
    if (search && typeof search === 'string' && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { skills: { $elemMatch: { $regex: searchRegex } } },
        { bio: searchRegex },
        { institute: searchRegex }
      ];
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [developers, total] = await Promise.all([
      User.find(query)
        .select('name email avatar skills bio institute')
        .skip(skip)
        .limit(limitNum)
        .sort({ name: 1 }),
      User.countDocuments(query)
    ]);

    res.json({
      developers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasMore: skip + developers.length < total
      }
    });
  } catch (error) {
    console.error('Error fetching developers:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch developers' });
  }
});

// Send a project invite to a developer
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId, invitedUserId, message } = req.body;

    if (!projectId || !invitedUserId) {
      res.status(400).json({ error: 'Project ID and invited user ID are required' });
      return;
    }

    // First try to find by project ID, then by ideaId
    let project = await Project.findById(projectId);
    if (!project) {
      project = await Project.findOne({ ideaId: projectId });
    }
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Check if current user is the owner/creator of the project
    const isOwner = project.owner.toString() === req.user?.id;
    const isCreatorMember = project.members.some(
      m => m.userId.toString() === req.user?.id && m.role === 'owner'
    );

    if (!isOwner && !isCreatorMember) {
      res.status(403).json({ error: 'Only project owner can send invites' });
      return;
    }

    const invitedUser = await User.findById(invitedUserId);
    if (!invitedUser) {
      res.status(404).json({ error: 'Invited user not found' });
      return;
    }

    // Check if user is already a member
    const isMember = project.members.some(m => m.userId.toString() === invitedUserId);
    if (isMember) {
      res.status(400).json({ error: 'User is already a member of this project' });
      return;
    }

    // Check if invite already exists and is pending
    const existingInvite = await ProjectInvite.findOne({
      projectId: project._id, // Use actual project._id for checking
      invitedUserId,
      status: 'pending'
    });

    if (existingInvite) {
      res.status(400).json({ error: 'An invite is already pending for this user' });
      return;
    }

    // Get inviter's name
    const inviter = await User.findById(req.user?.id);
    const inviterName = inviter?.name || req.user?.email?.split('@')[0] || 'Unknown';

    // Create the invite
    const invite = await ProjectInvite.create({
      projectId: project._id, // Always use actual project._id, not the input projectId (which could be ideaId)
      projectTitle: project.title,
      invitedUserId,
      invitedBy: req.user?.id,
      invitedByName: inviterName,
      message,
      status: 'pending',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    // Generate the invite link
    const frontendUrl = process.env.FRONTEND_URL || 'https://skillupx.vercel.app';
    const inviteLink = `${frontendUrl}/project/join/${invite.inviteToken}`;

    // Create the invite message content
    const inviteMessageContent = `🎉 Project Invitation

You've been invited to join the project: ${project.title}

${message ? `📝 Message from ${inviterName}:\n"${message}"\n\n` : ''}🔗 Click here to join: ${inviteLink}

This invite link expires in 7 days.`;

    // Create or get Chat between inviter and invited user
    const participantIds = [req.user?.id!, invitedUserId];
    const participantNames = [inviterName, invitedUser.name || 'Unknown'];
    const participantAvatars = [inviter?.avatar || '', invitedUser.avatar || ''];

    // Sort all arrays in sync with sorted IDs
    const indexMap = participantIds.map((id, idx) => ({ id, idx }));
    indexMap.sort((a, b) => a.id.localeCompare(b.id));
    const sortedIds = indexMap.map(item => item.id);
    const sortedNames = indexMap.map(item => participantNames[item.idx]);
    const sortedAvatars = indexMap.map(item => participantAvatars[item.idx]);

    let chat = await Chat.findOne({
      participantIds: { $all: sortedIds, $size: sortedIds.length }
    });

    if (!chat) {
      // Create new chat with properly sorted data
      chat = await Chat.create({
        participantIds: sortedIds,
        participantNames: sortedNames,
        participantAvatars: sortedAvatars,
        lastMessage: inviteMessageContent.substring(0, 100) + '...',
        lastMessageAt: new Date()
      });
    } else {
      // Update last message
      await Chat.findByIdAndUpdate(chat._id, {
        lastMessage: inviteMessageContent.substring(0, 100) + '...',
        lastMessageAt: new Date()
      });
    }

    // Create the ChatMessage with invite link
    const chatMessage = await ChatMessage.create({
      chatId: chat._id,
      senderId: req.user?.id,
      senderName: inviterName,
      senderAvatar: inviter?.avatar || '',
      message: inviteMessageContent,
      isRead: false
    });

    // Send real-time notification to invited user with the join link
    const io = getIO(req);
    if (io) {
      // Emit the new chat message for real-time chat
      io.to(`user:${invitedUserId}`).emit('newChatMessage', {
        chatId: chat._id.toString(),
        message: {
          id: chatMessage._id.toString(),
          senderId: req.user?.id,
          senderName: inviterName,
          senderAvatar: inviter?.avatar || '',
          message: inviteMessageContent,
          createdAt: chatMessage.createdAt
        }
      });

      // Also emit project-invite notification
      io.to(`user:${invitedUserId}`).emit('project-invite', {
        inviteId: invite._id,
        projectId,
        projectTitle: project.title,
        invitedBy: inviterName,
        message,
        inviteLink
      });
    }

    // Send email notification to invited user (async, don't wait)
    try {
      if (invitedUser.email) {
        emailNotifications.notifyProjectInvite(
          project.title,
          inviterName,
          message || '',
          inviteLink,
          invitedUser.email
        );
      }
    } catch (emailError) {
      console.error('Failed to send project invite email notification:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'Invite sent successfully',
      invite: {
        ...invite.toObject(),
        inviteLink
      }
    });
  } catch (error) {
    console.error('Error sending project invite:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to send invite' });
  }
});

// Get invites received by current user
router.get('/my-invites', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const invites = await ProjectInvite.find({
      invitedUserId: req.user?.id,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    })
      .populate('projectId', 'title description status category')
      .populate('invitedBy', 'name email avatar')
      .sort({ createdAt: -1 });

    res.json({ invites });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch invites' });
  }
});

// Get count of pending invites for current user
router.get('/my-invites/count', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const count = await ProjectInvite.countDocuments({
      invitedUserId: req.user?.id,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    });

    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to count invites' });
  }
});

// Get invite by token (for join page) - allows partial info without auth
router.get('/join/:inviteToken', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { inviteToken } = req.params;

    if (!inviteToken) {
      res.status(400).json({ error: 'Invite token is required' });
      return;
    }

    const invite = await ProjectInvite.findOne({ inviteToken })
      .populate('projectId', 'title description status category')
      .populate('invitedBy', 'name email avatar');

    if (!invite) {
      res.status(404).json({ error: 'Invalid or expired invite link' });
      return;
    }

    if (invite.expiresAt < new Date()) {
      res.status(410).json({ error: 'This invite has expired' });
      return;
    }

    if (invite.status !== 'pending') {
      res.status(400).json({ error: `This invite has already been ${invite.status}` });
      return;
    }

    // Return invite info (can be viewed by anyone with the link)
    res.json({
      invite: {
        projectTitle: invite.projectTitle,
        projectDescription: (invite.projectId as { description?: string })?.description,
        invitedByName: invite.invitedByName,
        expiresAt: invite.expiresAt,
        status: invite.status
      }
    });
  } catch (error) {
    console.error('Error validating invite token:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to validate invite' });
  }
});

// Accept invite via token - any authenticated user with the link can join
router.post('/join/:inviteToken/accept', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { inviteToken } = req.params;

    const invite = await ProjectInvite.findOne({ inviteToken });

    if (!invite) {
      res.status(404).json({ error: 'Invalid or expired invite link' });
      return;
    }

    if (invite.expiresAt < new Date()) {
      res.status(410).json({ error: 'This invite has expired' });
      return;
    }

    if (invite.status !== 'pending') {
      res.status(400).json({ error: `This invite has already been ${invite.status}` });
      return;
    }

    // Check if user is already a member
    const project = await Project.findById(invite.projectId);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const isAlreadyMember = project.members.some(m => m.userId.toString() === req.user?.id);
    if (isAlreadyMember) {
      res.status(400).json({ error: 'You are already a member of this project' });
      return;
    }

    // Update invite status
    invite.status = 'accepted';
    invite.respondedAt = new Date();
    await invite.save();

    // Add user to project (project already fetched above)
    const user = await User.findById(req.user?.id);

    if (user) {
      project.members.push({
        userId: user._id as mongoose.Types.ObjectId,
        name: user.name,
        email: user.email,
        role: 'member',
        joinedAt: new Date()
      });
      await project.save();

      // Notify project owner
      const io = getIO(req);
      if (io) {
        io.to(`project:${project._id}`).emit('member-joined', {
          projectId: project._id,
          member: {
            userId: user._id,
            name: user.name,
            email: user.email,
            role: 'member'
          }
        });
      }
    }

    res.json({
      success: true,
      message: 'You have joined the project!',
      projectId: project._id // Return actual project._id for correct redirect
    });
  } catch (error) {
    console.error('Error accepting invite via token:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to accept invite' });
  }
});

// Respond to an invite (accept/decline) by invite ID
router.put('/:inviteId/respond', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { inviteId } = req.params;
    const { response } = req.body;

    if (!['accepted', 'declined'].includes(response)) {
      res.status(400).json({ error: 'Invalid response. Must be "accepted" or "declined"' });
      return;
    }

    const invite = await ProjectInvite.findById(inviteId);
    if (!invite) {
      res.status(404).json({ error: 'Invite not found' });
      return;
    }

    if (invite.invitedUserId.toString() !== req.user?.id) {
      res.status(403).json({ error: 'You can only respond to your own invites' });
      return;
    }

    if (invite.status !== 'pending') {
      res.status(400).json({ error: `This invite has already been ${invite.status}` });
      return;
    }

    if (invite.expiresAt < new Date()) {
      res.status(410).json({ error: 'This invite has expired' });
      return;
    }

    invite.status = response;
    invite.respondedAt = new Date();
    await invite.save();

    // If accepted, add user to project
    if (response === 'accepted') {
      const project = await Project.findById(invite.projectId);
      if (project) {
        const user = await User.findById(req.user?.id);
        const isMember = project.members.some(m => m.userId.toString() === req.user?.id);

        if (!isMember && user) {
          project.members.push({
            userId: user._id as mongoose.Types.ObjectId,
            name: user.name,
            email: user.email,
            role: 'member',
            joinedAt: new Date()
          });
          await project.save();
        }
      }
    }

    res.json({
      success: true,
      message: response === 'accepted' ? 'You have joined the project!' : 'Invite declined',
      invite
    });
  } catch (error) {
    console.error('Error responding to invite:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to respond' });
  }
});

export default router;
