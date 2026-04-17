import { Response, Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import Message from '../models/Message';
import User from '../models/User';
import emailNotifications from '../services/emailService';

const router = Router();

// Send message
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const message = await Message.create({
      senderId: req.user!.id,
      ...req.body
    });

    // Send email notification to recipient if it's a direct message (async, don't wait)
    try {
      if (req.body.receiverId) {
        const recipient = await User.findById(req.body.receiverId).select('email');
        if (recipient?.email) {
          const messagePreview = req.body.content || req.body.message || 'You have a new message';
          emailNotifications.notifyNewMessage(
            req.user!.name || 'Someone',
            messagePreview,
            recipient.email
          );
        }
      }
    } catch (emailError) {
      console.error('Failed to send new message email notification:', emailError);
    }

    res.status(201).json({ message });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get conversation between two users
router.get('/conversation/:userId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const messages = await Message.find({
      $or: [
        { senderId: req.user!.id, receiverId: req.params.userId },
        { senderId: req.params.userId, receiverId: req.user!.id }
      ]
    }).sort({ createdAt: 1 });

    // Mark messages as read
    await Message.updateMany(
      { senderId: req.params.userId, receiverId: req.user!.id, isRead: false },
      { isRead: true }
    );

    res.json({ messages });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get group messages
router.get('/group/:groupId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const messages = await Message.find({ groupId: req.params.groupId }).sort({ createdAt: 1 });
    res.json({ messages });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's conversations list
router.get('/conversations', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const messages = await Message.aggregate([
      {
        $match: {
          $or: [
            { senderId: req.user!.id },
            { receiverId: req.user!.id }
          ],
          groupId: { $exists: false }
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$senderId', req.user!.id] },
              '$receiverId',
              '$senderId'
            ]
          },
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ['$receiverId', req.user!.id] },
                  { $eq: ['$isRead', false] }
                ]},
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    res.json({ conversations: messages });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create or get developer chat between two users
router.post('/developer-chat', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { user1Id, user2Id } = req.body;

    // Check if chat already exists between these users
    const existingMessage = await Message.findOne({
      $or: [
        { senderId: user1Id, receiverId: user2Id },
        { senderId: user2Id, receiverId: user1Id }
      ]
    });

    // Return a chat ID based on the two user IDs (sorted for consistency)
    const chatId = [user1Id, user2Id].sort().join('_');

    res.json({ chatId });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get messages by chat ID (for developer chat)
router.get('/chat/:chatId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { chatId } = req.params;
    const [user1Id, user2Id] = chatId.split('_');

    const messages = await Message.find({
      $or: [
        { senderId: user1Id, receiverId: user2Id },
        { senderId: user2Id, receiverId: user1Id }
      ]
    }).sort({ createdAt: 1 });

    res.json({ messages });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get conversations with messages for a user
router.get('/conversations-with-messages', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.query;
    const targetUserId = userId || req.user!.id;

    const messages = await Message.aggregate([
      {
        $match: {
          $or: [
            { senderId: targetUserId },
            { receiverId: targetUserId }
          ],
          groupId: { $exists: false }
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$senderId', targetUserId] },
              '$receiverId',
              '$senderId'
            ]
          },
          lastMessage: { $first: '$$ROOT' },
          messages: { $push: '$$ROOT' }
        }
      }
    ]);

    res.json({ conversations: messages });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Edit message
router.patch('/:messageId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { content, message: messageText } = req.body;
    const newContent = content || messageText;

    if (!newContent || !newContent.trim()) {
      res.status(400).json({ error: 'Message content is required' });
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

    message.content = newContent.trim();
    await message.save();

    res.json({ message });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete message
router.delete('/:messageId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
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

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
