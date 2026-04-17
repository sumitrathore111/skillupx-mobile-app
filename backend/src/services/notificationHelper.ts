import Notification, { INotification } from '../models/Notification';

type NotificationType = INotification['type'];

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
}

/**
 * Create a notification and optionally emit it via socket.
 */
export async function createNotification(
  params: CreateNotificationParams,
  io?: any
): Promise<void> {
  try {
    const notif = await Notification.create({
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      data: params.data,
    });

    // Emit real-time notification to the user
    if (io) {
      io.to(`user:${params.userId}`).emit('notification', {
        id: notif._id.toString(),
        type: notif.type,
        title: notif.title,
        message: notif.message,
        read: false,
        data: notif.data,
        createdAt: notif.createdAt,
      });
    }
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}

/**
 * Create notifications for multiple users at once.
 */
export async function createNotificationForMany(
  userIds: string[],
  type: NotificationType,
  title: string,
  message: string,
  data?: Record<string, any>,
  io?: any
): Promise<void> {
  const promises = userIds.map(userId =>
    createNotification({ userId, type, title, message, data }, io)
  );
  await Promise.allSettled(promises);
}
