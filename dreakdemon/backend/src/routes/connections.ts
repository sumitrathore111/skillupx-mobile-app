import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import ConnectionRequest from '../models/ConnectionRequest';
import User from '../models/User';

const router = express.Router();

// Send connection request
router.post('/request/:receiverId', authenticate, async (req: AuthRequest, res) => {
  try {
    const senderId = req.user!.id;
    const { receiverId } = req.params;

    if (senderId === receiverId) {
      return res.status(400).json({ error: 'Cannot send request to yourself' });
    }

    const receiver = await User.findById(receiverId).select('name avatar');
    if (!receiver) return res.status(404).json({ error: 'User not found' });

    // Check if already connected (either direction)
    const existing = await ConnectionRequest.findOne({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    });

    if (existing) {
      if (existing.status === 'accepted') {
        return res.status(400).json({ error: 'Already connected' });
      }
      if (existing.status === 'pending') {
        return res.status(400).json({ error: 'Request already pending' });
      }
      // If rejected, allow re-request by updating
      existing.status = 'pending';
      existing.senderId = senderId;
      existing.senderName = req.user!.name;
      existing.senderAvatar = '';
      existing.receiverId = receiverId;
      existing.receiverName = receiver.name;
      existing.receiverAvatar = receiver.avatar || '';
      await existing.save();

      const io = req.app.get('io');
      io?.to(`user:${receiverId}`).emit('connectionRequest', { request: existing });

      return res.json({ message: 'Request sent', request: existing });
    }

    const request = await ConnectionRequest.create({
      senderId,
      senderName: req.user!.name,
      senderAvatar: '',
      receiverId,
      receiverName: receiver.name,
      receiverAvatar: receiver.avatar || '',
    });

    const io = req.app.get('io');
    io?.to(`user:${receiverId}`).emit('connectionRequest', { request });

    res.status(201).json({ message: 'Request sent', request });
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Request already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Accept connection request
router.patch('/accept/:requestId', authenticate, async (req: AuthRequest, res) => {
  try {
    const request = await ConnectionRequest.findById(req.params.requestId);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.receiverId !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request is not pending' });
    }

    request.status = 'accepted';
    await request.save();

    const io = req.app.get('io');
    io?.to(`user:${request.senderId}`).emit('connectionAccepted', {
      request,
      acceptedBy: { id: req.user!.id, name: req.user!.name },
    });

    res.json({ message: 'Connection accepted', request });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reject connection request
router.patch('/reject/:requestId', authenticate, async (req: AuthRequest, res) => {
  try {
    const request = await ConnectionRequest.findById(req.params.requestId);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.receiverId !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    request.status = 'rejected';
    await request.save();

    const io = req.app.get('io');
    io?.to(`user:${request.senderId}`).emit('connectionRejected', { request });

    res.json({ message: 'Connection rejected', request });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Remove connection (unfriend)
router.delete('/remove/:userId', authenticate, async (req: AuthRequest, res) => {
  try {
    const myId = req.user!.id;
    const { userId } = req.params;

    const deleted = await ConnectionRequest.findOneAndDelete({
      $or: [
        { senderId: myId, receiverId: userId, status: 'accepted' },
        { senderId: userId, receiverId: myId, status: 'accepted' },
      ],
    });

    if (!deleted) return res.status(404).json({ error: 'Connection not found' });

    const io = req.app.get('io');
    io?.to(`user:${userId}`).emit('connectionRemoved', { removedBy: myId });

    res.json({ message: 'Connection removed' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get my connections (accepted)
router.get('/my-connections', authenticate, async (req: AuthRequest, res) => {
  try {
    const myId = req.user!.id;
    const connections = await ConnectionRequest.find({
      $or: [{ senderId: myId }, { receiverId: myId }],
      status: 'accepted',
    }).sort({ updatedAt: -1 });

    const people = connections.map(c => {
      const isMe = c.senderId === myId;
      return {
        connectionId: c._id,
        userId: isMe ? c.receiverId : c.senderId,
        name: isMe ? c.receiverName : c.senderName,
        avatar: isMe ? c.receiverAvatar : c.senderAvatar,
        connectedAt: c.updatedAt,
      };
    });

    res.json({ connections: people });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get pending requests received
router.get('/requests/received', authenticate, async (req: AuthRequest, res) => {
  try {
    const requests = await ConnectionRequest.find({
      receiverId: req.user!.id,
      status: 'pending',
    }).sort({ createdAt: -1 });
    res.json({ requests });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get pending requests sent
router.get('/requests/sent', authenticate, async (req: AuthRequest, res) => {
  try {
    const requests = await ConnectionRequest.find({
      senderId: req.user!.id,
      status: 'pending',
    }).sort({ createdAt: -1 });
    res.json({ requests });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get connection status with a specific user
router.get('/status/:userId', authenticate, async (req: AuthRequest, res) => {
  try {
    const myId = req.user!.id;
    const { userId } = req.params;

    const connection = await ConnectionRequest.findOne({
      $or: [
        { senderId: myId, receiverId: userId },
        { senderId: userId, receiverId: myId },
      ],
    });

    if (!connection) return res.json({ status: 'none' });

    res.json({
      status: connection.status,
      requestId: connection._id,
      isSender: connection.senderId === myId,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
