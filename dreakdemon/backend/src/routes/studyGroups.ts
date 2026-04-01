import { Request, Response, Router } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { authenticate, AuthRequest } from '../middleware/auth';
import GroupMessage from '../models/GroupMessage';
import StudyGroup from '../models/StudyGroup';
import User from '../models/User';
import emailNotifications from '../services/emailService';

// Helper to get socket.io instance from app
const getIO = (req: Request): SocketIOServer | null => {
  return req.app.get('io') as SocketIOServer || null;
};

const router = Router();

// Helper function to transform group for response
const transformGroup = (group: any) => ({
  id: group._id.toString(),
  name: group.name,
  description: group.description,
  category: group.category,
  topic: group.topic,
  level: group.level,
  tags: group.tags,
  createdBy: group.createdBy,
  creatorId: group.createdBy,
  creatorName: group.creatorName || group.members?.[0]?.userName || 'Unknown',
  creatorAvatar: group.creatorAvatar || group.members?.[0]?.userAvatar || '',
  members: group.members?.map((m: any) => ({
    userId: m.userId,
    name: m.userName,
    avatar: m.userAvatar,
    role: m.role,
    joinedAt: m.joinedAt
  })) || [],
  joinRequests: group.joinRequests?.filter((r: any) => r.status === 'pending').map((r: any) => ({
    userId: r.userId,
    userName: r.userName,
    userAvatar: r.userAvatar,
    requestedAt: r.requestedAt,
    status: r.status
  })) || [],
  maxMembers: group.maxMembers,
  isPrivate: group.isPrivate,
  avatar: group.avatar,
  resources: group.resources,
  schedule: group.schedule,
  createdAt: group.createdAt,
  updatedAt: group.updatedAt
});

// Get all study groups
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { category, search } = req.query;

    let query: any = {};
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { topic: { $regex: search, $options: 'i' } }
      ];
    }

    // Only show public groups or groups user is a member of
    const groups = await StudyGroup.find({
      $and: [
        query,
        {
          $or: [
            { isPrivate: false },
            { 'members.userId': req.user!.id }
          ]
        }
      ]
    }).sort({ createdAt: -1 });

    const transformedGroups = groups.map(transformGroup);

    res.json({ groups: transformedGroups });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create study group
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description, topic, level, maxMembers, creatorName, creatorAvatar } = req.body;

    const group = await StudyGroup.create({
      name,
      description,
      category: topic, // Use topic as category
      topic,
      level: level || 'Beginner',
      maxMembers: maxMembers || 10,
      createdBy: req.user!.id,
      creatorName: creatorName || req.user!.name,
      creatorAvatar: creatorAvatar || '',
      members: [{
        userId: req.user!.id,
        userName: creatorName || req.user!.name,
        userAvatar: creatorAvatar || '',
        role: 'admin',
        joinedAt: new Date()
      }]
    });

    // Send email notification to all users about new study group (async, don't wait)
    try {
      const users = await User.find({ _id: { $ne: req.user!.id } }).select('email');
      const userEmails = users.map(u => u.email).filter(Boolean);
      if (userEmails.length > 0) {
        emailNotifications.notifyNewStudyGroup(name, topic, creatorName || req.user!.name || 'Someone', userEmails);
      }
    } catch (emailError) {
      console.error('Failed to send new study group email notifications:', emailError);
    }

    res.status(201).json({ group: transformGroup(group) });
  } catch (error: any) {
    console.error('Error creating study group:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get group by ID
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const group = await StudyGroup.findById(req.params.id);
    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    // Check access for private groups
    if (group.isPrivate && !group.members.some(m => m.userId === req.user!.id)) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    res.json({ group: transformGroup(group) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Request to join group (creates a pending request)
router.post('/:id/join', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userName, userAvatar } = req.body;
    const group = await StudyGroup.findById(req.params.id);

    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    if (group.members.some(m => m.userId === req.user!.id)) {
      res.status(400).json({ error: 'Already a member' });
      return;
    }

    if (group.members.length >= group.maxMembers) {
      res.status(400).json({ error: 'Group is full' });
      return;
    }

    // Check if user already has a pending request
    const existingRequest = group.joinRequests?.find(
      r => r.userId === req.user!.id && r.status === 'pending'
    );
    if (existingRequest) {
      res.status(400).json({ error: 'Join request already pending' });
      return;
    }

    // Create join request
    if (!group.joinRequests) {
      group.joinRequests = [];
    }

    group.joinRequests.push({
      userId: req.user!.id,
      userName: userName || req.user!.name,
      userAvatar: userAvatar || '',
      requestedAt: new Date(),
      status: 'pending'
    });

    await group.save();

    // Emit real-time event to group owner/admins
    const io = getIO(req);
    if (io) {
      io.to(`group:${group._id.toString()}`).emit('joinRequest', {
        groupId: group._id.toString(),
        request: {
          userId: req.user!.id,
          userName: userName || req.user!.name,
          userAvatar: userAvatar || '',
          requestedAt: new Date(),
          status: 'pending'
        }
      });
    }

    res.json({
      message: 'Join request sent successfully',
      group: transformGroup(group),
      requestStatus: 'pending'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Approve join request (admin only)
router.post('/:id/approve/:userId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const group = await StudyGroup.findById(req.params.id);

    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    // Check if current user is admin
    const currentMember = group.members.find(m => m.userId === req.user!.id);
    if (!currentMember || (currentMember.role !== 'admin' && group.createdBy !== req.user!.id)) {
      res.status(403).json({ error: 'Only admins can approve join requests' });
      return;
    }

    // Find the pending request
    const requestIndex = group.joinRequests?.findIndex(
      r => r.userId === req.params.userId && r.status === 'pending'
    );

    if (requestIndex === undefined || requestIndex === -1) {
      res.status(404).json({ error: 'Join request not found' });
      return;
    }

    const request = group.joinRequests[requestIndex];

    // Check if group is full
    if (group.members.length >= group.maxMembers) {
      res.status(400).json({ error: 'Group is full' });
      return;
    }

    // Add user to members
    group.members.push({
      userId: request.userId,
      userName: request.userName,
      userAvatar: request.userAvatar,
      role: 'member',
      joinedAt: new Date()
    });

    // Update request status
    group.joinRequests[requestIndex].status = 'approved';

    await group.save();

    // Send email notification to the approved user (async, don't wait)
    try {
      const approvedUser = await User.findById(req.params.userId).select('email');
      if (approvedUser?.email) {
        emailNotifications.notifyStudyGroupJoinApproved(group.name, approvedUser.email);
      }
    } catch (emailError) {
      console.error('Failed to send study group join approved email:', emailError);
    }

    // Emit real-time event to the approved user and group members
    const io = getIO(req);
    if (io) {
      const transformedGroup = transformGroup(group);
      // Notify the approved user
      io.to(`user:${req.params.userId}`).emit('requestApproved', {
        groupId: group._id.toString(),
        groupName: group.name,
        group: transformedGroup
      });
      // Notify group members about new member
      io.to(`group:${group._id.toString()}`).emit('memberJoined', {
        groupId: group._id.toString(),
        member: {
          userId: request.userId,
          name: request.userName,
          avatar: request.userAvatar,
          role: 'member'
        },
        group: transformedGroup
      });
    }

    res.json({
      message: 'Join request approved',
      group: transformGroup(group)
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Reject join request (admin only)
router.post('/:id/reject/:userId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const group = await StudyGroup.findById(req.params.id);

    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    // Check if current user is admin
    const currentMember = group.members.find(m => m.userId === req.user!.id);
    if (!currentMember || (currentMember.role !== 'admin' && group.createdBy !== req.user!.id)) {
      res.status(403).json({ error: 'Only admins can reject join requests' });
      return;
    }

    // Find the pending request
    const requestIndex = group.joinRequests?.findIndex(
      r => r.userId === req.params.userId && r.status === 'pending'
    );

    if (requestIndex === undefined || requestIndex === -1) {
      res.status(404).json({ error: 'Join request not found' });
      return;
    }

    // Update request status
    group.joinRequests[requestIndex].status = 'rejected';

    await group.save();

    // Emit real-time event to the rejected user
    const io = getIO(req);
    if (io) {
      io.to(`user:${req.params.userId}`).emit('requestRejected', {
        groupId: group._id.toString(),
        groupName: group.name
      });
      // Update group for admins
      io.to(`group:${group._id.toString()}`).emit('groupUpdated', {
        groupId: group._id.toString(),
        group: transformGroup(group)
      });
    }

    res.json({
      message: 'Join request rejected',
      group: transformGroup(group)
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Remove member (admin only)
router.delete('/:id/members/:userId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const group = await StudyGroup.findById(req.params.id);

    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    // Check if current user is admin
    const currentMember = group.members.find(m => m.userId === req.user!.id);
    if (!currentMember || (currentMember.role !== 'admin' && group.createdBy !== req.user!.id)) {
      res.status(403).json({ error: 'Only admins can remove members' });
      return;
    }

    // Cannot remove the creator
    if (req.params.userId === group.createdBy) {
      res.status(400).json({ error: 'Cannot remove the group creator' });
      return;
    }

    // Remove the member
    group.members = group.members.filter(m => m.userId !== req.params.userId);

    await group.save();

    // Emit real-time event to the removed user and group members
    const io = getIO(req);
    if (io) {
      const transformedGroup = transformGroup(group);
      // Notify the removed user
      io.to(`user:${req.params.userId}`).emit('removedFromGroup', {
        groupId: group._id.toString(),
        groupName: group.name
      });
      // Notify group members
      io.to(`group:${group._id.toString()}`).emit('memberRemoved', {
        groupId: group._id.toString(),
        userId: req.params.userId,
        group: transformedGroup
      });
    }

    res.json({
      message: 'Member removed successfully',
      group: transformGroup(group)
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Leave group
router.post('/:id/leave', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const group = await StudyGroup.findById(req.params.id);

    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    group.members = group.members.filter(m => m.userId !== req.user!.id);

    // Delete group if no members left
    if (group.members.length === 0) {
      await group.deleteOne();
      res.json({ message: 'Group deleted' });
      return;
    }

    await group.save();
    res.json({ group: transformGroup(group) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add resource
router.post('/:id/resources', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const group = await StudyGroup.findById(req.params.id);

    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    if (!group.members.some(m => m.userId === req.user!.id)) {
      res.status(403).json({ error: 'Not a member' });
      return;
    }

    group.resources.push({
      ...req.body,
      uploadedBy: req.user!.id,
      uploadedAt: new Date()
    });

    await group.save();
    res.json({ group: transformGroup(group) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete study group (admin only)
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const group = await StudyGroup.findById(req.params.id);

    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    // Check if user is the creator or an admin
    const member = group.members.find(m => m.userId === req.user!.id);
    if (!member || (member.role !== 'admin' && group.createdBy !== req.user!.id)) {
      res.status(403).json({ error: 'Only group admins can delete the group' });
      return;
    }

    await group.deleteOne();
    res.json({ message: 'Group deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get group messages
router.get('/:id/messages', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const group = await StudyGroup.findById(req.params.id);

    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    // Check if user is a member
    if (!group.members.some(m => m.userId === req.user!.id)) {
      res.status(403).json({ error: 'Only members can view messages' });
      return;
    }

    const messages = await GroupMessage.find({ groupId: req.params.id })
      .sort({ createdAt: 1 })
      .limit(100);

    const formattedMessages = messages.map(msg => ({
      id: msg._id.toString(),
      groupId: msg.groupId,
      senderId: msg.senderId,
      name: msg.senderName,
      avatar: msg.senderAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.senderName?.replace(/\s+/g, '') || 'User'}`,
      message: msg.message,
      timestamp: msg.createdAt
    }));

    res.json({ messages: formattedMessages });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Send message to group
router.post('/:id/messages', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { message, senderName, senderAvatar } = req.body;

    if (!message || !message.trim()) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const group = await StudyGroup.findById(req.params.id);

    if (!group) {
      res.status(404).json({ error: 'Group not found' });
      return;
    }

    // Check if user is a member
    if (!group.members.some(m => m.userId === req.user!.id)) {
      res.status(403).json({ error: 'Only members can send messages' });
      return;
    }

    const newMessage = await GroupMessage.create({
      groupId: req.params.id,
      senderId: req.user!.id,
      senderName: senderName || req.user!.name || 'User',
      senderAvatar: senderAvatar || '',
      message: message.trim()
    });

    const formattedMessage = {
      id: newMessage._id.toString(),
      groupId: newMessage.groupId,
      senderId: newMessage.senderId,
      name: newMessage.senderName,
      avatar: newMessage.senderAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${newMessage.senderName?.replace(/\s+/g, '') || 'User'}`,
      message: newMessage.message,
      timestamp: newMessage.createdAt
    };

    // Emit real-time message to group members
    const io = getIO(req);
    if (io) {
      io.to(`group:${req.params.id}`).emit('newGroupMessage', {
        groupId: req.params.id,
        message: formattedMessage
      });
    }

    // Send email notification to other group members (async, don't wait)
    try {
      const otherMembers = group.members.filter(m => m.userId !== req.user!.id);
      const memberIds = otherMembers.map(m => m.userId);
      const recipients = await User.find({ _id: { $in: memberIds } }).select('email');
      const emails = recipients.map(r => r.email).filter(Boolean) as string[];
      if (emails.length > 0) {
        emails.forEach(email => {
          emailNotifications.notifyStudyGroupMessage(
            senderName || req.user?.name || 'Someone',
            group.name,
            message.trim(),
            email
          );
        });
      }
    } catch (emailError) {
      console.error('Failed to send study group message email notification:', emailError);
    }

    res.status(201).json({ message: formattedMessage });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Edit group message
router.patch('/:id/messages/:messageId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const groupMessage = await GroupMessage.findById(req.params.messageId);

    if (!groupMessage) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    // Only sender can edit their message
    if (groupMessage.senderId !== req.user?.id) {
      res.status(403).json({ error: 'You can only edit your own messages' });
      return;
    }

    groupMessage.message = message.trim();
    await groupMessage.save();

    // Emit real-time event
    const io = getIO(req);
    if (io) {
      io.to(`group:${req.params.id}`).emit('groupMessageEdited', {
        groupId: req.params.id,
        messageId: groupMessage._id.toString(),
        message: groupMessage.message,
        updatedAt: groupMessage.updatedAt
      });
    }

    res.json({
      id: groupMessage._id.toString(),
      message: groupMessage.message,
      updatedAt: groupMessage.updatedAt
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete group message
router.delete('/:id/messages/:messageId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const groupMessage = await GroupMessage.findById(req.params.messageId);

    if (!groupMessage) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    // Only sender can delete their message
    if (groupMessage.senderId !== req.user?.id) {
      res.status(403).json({ error: 'You can only delete your own messages' });
      return;
    }

    await groupMessage.deleteOne();

    // Emit real-time event
    const io = getIO(req);
    if (io) {
      io.to(`group:${req.params.id}`).emit('groupMessageDeleted', {
        groupId: req.params.id,
        messageId: req.params.messageId
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
