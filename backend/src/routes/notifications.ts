import { Response, Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import Notification from '../models/Notification';

const router = Router();

// GET /api/notifications — get all notifications for the authenticated user
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const notifications = await Notification.find({ userId: req.user!.id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const mapped = notifications.map((n: any) => ({
      id: n._id.toString(),
      type: n.type,
      title: n.title,
      message: n.message,
      read: n.read,
      data: n.data,
      createdAt: n.createdAt,
    }));

    res.json(mapped);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const count = await Notification.countDocuments({ userId: req.user!.id, read: false });
    res.json({ count });
  } catch (err) {
    console.error('Error fetching unread count:', err);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// PUT /api/notifications/read-all — mark all as read
router.put('/read-all', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await Notification.updateMany({ userId: req.user!.id, read: false }, { $set: { read: true } });
    res.json({ success: true });
  } catch (err) {
    console.error('Error marking all read:', err);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

// PUT /api/notifications/:id/read — mark single notification as read
router.put('/:id/read', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!.id },
      { $set: { read: true } },
      { new: true }
    );
    if (!notification) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error marking notification read:', err);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

export default router;
