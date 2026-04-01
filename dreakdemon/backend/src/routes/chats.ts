import { Response, Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import Chat from '../models/Chat';
import ChatMessage from '../models/ChatMessage';
import User from '../models/User';
import emailNotifications from '../services/emailService';

const router = Router();

// Create or get existing chat between participants
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { participantIds, participantNames, participantAvatars } = req.body;

    if (!participantIds || participantIds.length < 2) {
      res.status(400).json({ error: 'At least 2 participant IDs are required' });
      return;
    }

    // Sort participant IDs to ensure consistent lookup
    const sortedIds = [...participantIds].sort();

    // Sort names and avatars to match the sorted IDs order
    const indexMap = participantIds.map((id: string, idx: number) => ({ id, idx }));
    indexMap.sort((a: any, b: any) => a.id.localeCompare(b.id));
    const sortedNames = indexMap.map((item: any) => participantNames?.[item.idx] || 'Unknown');
    const sortedAvatars = indexMap.map((item: any) => participantAvatars?.[item.idx] || '');

    // Check if chat already exists
    let chat = await Chat.findOne({
      participantIds: { $all: sortedIds, $size: sortedIds.length }
    });

    if (!chat) {
      // Create new chat
      chat = await Chat.create({
        participantIds: sortedIds,
        participantNames: sortedNames,
        participantAvatars: sortedAvatars
      });
    }

    res.json({
      id: chat._id.toString(),
      participantIds: chat.participantIds,
      participantNames: chat.participantNames,
      participantAvatars: chat.participantAvatars,
      lastMessage: chat.lastMessage,
      lastMessageAt: chat.lastMessageAt,
      createdAt: chat.createdAt
    });
  } catch (error: any) {
    console.error('Error creating/getting chat:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all chats for current user
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const chats = await Chat.find({
      participantIds: req.user?.id
    }).sort({ lastMessageAt: -1, updatedAt: -1 });

    // Transform to include other participant info with fresh data from DB
    const transformedChats = await Promise.all(chats.map(async chat => {
      const otherParticipantId = chat.participantIds.find(id => id !== req.user?.id) || chat.participantIds[0];
      const otherIndex = chat.participantIds.indexOf(otherParticipantId);

      // Try to get fresh user data from database
      let participantName = chat.participantNames?.[otherIndex] || 'Unknown User';
      let participantAvatar = chat.participantAvatars?.[otherIndex] || '';

      try {
        const otherUser = await User.findById(otherParticipantId).select('name avatar');
        if (otherUser) {
          participantName = otherUser.name || participantName;
          participantAvatar = otherUser.avatar || participantAvatar;
        }
      } catch {
        // Use cached data if user lookup fails
      }

      // Count unread messages for current user in this chat
      const unreadCount = await ChatMessage.countDocuments({
        chatId: chat._id,
        senderId: { $ne: req.user?.id },
        isRead: false
      });

      return {
        id: chat._id.toString(),
        participantId: otherParticipantId,
        participantName,
        participantAvatar: participantAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${participantName?.replace(/\s+/g, '')}`,
        lastMessage: chat.lastMessage,
        lastMessageAt: chat.lastMessageAt,
        createdAt: chat.createdAt,
        unreadCount
      };
    }));

    res.json(transformedChats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get messages for a chat
router.get('/:chatId/messages', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const messages = await ChatMessage.find({
      chatId: req.params.chatId
    }).sort({ createdAt: 1 });

    // Mark messages as read
    await ChatMessage.updateMany(
      {
        chatId: req.params.chatId,
        senderId: { $ne: req.user?.id },
        isRead: false
      },
      { isRead: true }
    );

    const transformedMessages = messages.map(msg => ({
      id: msg._id.toString(),
      senderId: msg.senderId,
      senderName: msg.senderName,
      senderAvatar: msg.senderAvatar,
      message: msg.message,
      text: msg.message, // Alias for compatibility
      isRead: msg.isRead,
      createdAt: msg.createdAt,
      timestamp: msg.createdAt
    }));

    res.json(transformedMessages);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Send message to a chat
router.post('/:chatId/messages', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { senderId, message, senderName, senderAvatar } = req.body;

    if (!message) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const chatMessage = await ChatMessage.create({
      chatId: req.params.chatId,
      senderId: senderId || req.user?.id,
      senderName: senderName || req.user?.name,
      senderAvatar: senderAvatar || '',
      message,
      isRead: false
    });

    // Update last message in chat
    await Chat.findByIdAndUpdate(req.params.chatId, {
      lastMessage: message,
      lastMessageAt: new Date()
    });

    const messagePayload = {
      id: chatMessage._id.toString(),
      chatId: req.params.chatId,
      senderId: chatMessage.senderId,
      senderName: chatMessage.senderName,
      senderAvatar: chatMessage.senderAvatar,
      message: chatMessage.message,
      text: chatMessage.message,
      createdAt: chatMessage.createdAt,
      timestamp: chatMessage.createdAt
    };

    // Emit real-time event to chat room
    const io = req.app.get('io');
    if (io) {
      io.to(`chat:${req.params.chatId}`).emit('newMessage', messagePayload);
    }

    // Send email notification to the other participant (async, don't wait)
    try {
      const chat = await Chat.findById(req.params.chatId);
      if (chat) {
        const sendingUserId = senderId || req.user?.id;
        const otherParticipantId = chat.participantIds.find(id => id !== sendingUserId);
        if (otherParticipantId) {
          const recipient = await User.findById(otherParticipantId).select('email');
          if (recipient?.email) {
            emailNotifications.notifyDeveloperConnectMessage(
              senderName || req.user?.name || 'Someone',
              message,
              recipient.email
            );
          }
        }
      }
    } catch (emailError) {
      console.error('Failed to send chat message email notification:', emailError);
    }

    res.status(201).json(messagePayload);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Edit message
router.patch('/:chatId/messages/:messageId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const chatMessage = await ChatMessage.findById(req.params.messageId);

    if (!chatMessage) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    // Only sender can edit their message
    if (chatMessage.senderId !== req.user?.id) {
      res.status(403).json({ error: 'You can only edit your own messages' });
      return;
    }

    chatMessage.message = message.trim();
    await chatMessage.save();

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.to(`chat:${req.params.chatId}`).emit('messageEdited', {
        messageId: chatMessage._id.toString(),
        chatId: req.params.chatId,
        message: chatMessage.message,
        updatedAt: chatMessage.updatedAt
      });
    }

    res.json({
      id: chatMessage._id.toString(),
      message: chatMessage.message,
      updatedAt: chatMessage.updatedAt
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete message
router.delete('/:chatId/messages/:messageId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const chatMessage = await ChatMessage.findById(req.params.messageId);

    if (!chatMessage) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    // Only sender can delete their message
    if (chatMessage.senderId !== req.user?.id) {
      res.status(403).json({ error: 'You can only delete your own messages' });
      return;
    }

    await chatMessage.deleteOne();

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.to(`chat:${req.params.chatId}`).emit('messageDeleted', {
        messageId: req.params.messageId,
        chatId: req.params.chatId
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get chat by ID
router.get('/:chatId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      res.status(404).json({ error: 'Chat not found' });
      return;
    }

    res.json({
      id: chat._id.toString(),
      participantIds: chat.participantIds,
      participantNames: chat.participantNames,
      participantAvatars: chat.participantAvatars,
      lastMessage: chat.lastMessage,
      lastMessageAt: chat.lastMessageAt,
      createdAt: chat.createdAt
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Mark all unread messages in a chat as read
router.patch('/:chatId/read', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await ChatMessage.updateMany(
      {
        chatId: req.params.chatId,
        senderId: { $ne: req.user?.id },
        isRead: false
      },
      { isRead: true }
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
