import User from '../models/User';

// expo-server-sdk is ESM-only, so we use dynamic import + cache
let _expo: any = null;
let _ExpoModule: any = null;

async function getExpo() {
  if (!_expo) {
    _ExpoModule = await import('expo-server-sdk');
    const ExpoClass = _ExpoModule.default || _ExpoModule.Expo;
    _expo = new ExpoClass();
  }
  return { expo: _expo, Expo: _ExpoModule.default || _ExpoModule.Expo };
}

/**
 * Send push notification to a specific user by their userId.
 */
export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>,
): Promise<void> {
  try {
    const { expo, Expo } = await getExpo();
    const user = await User.findById(userId).select('pushTokens');
    if (!user?.pushTokens?.length) return;

    const messages: any[] = [];

    for (const token of user.pushTokens) {
      if (!Expo.isExpoPushToken(token)) {
        console.warn(`Invalid Expo push token: ${token}`);
        continue;
      }
      messages.push({
        to: token,
        sound: 'default',
        title,
        body,
        data: data || {},
      });
    }

    if (messages.length === 0) return;

    // Expo recommends sending in chunks
    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        const receipts = await expo.sendPushNotificationsAsync(chunk);
        // Clean up invalid tokens
        for (let i = 0; i < receipts.length; i++) {
          const receipt = receipts[i];
          if (receipt.status === 'error') {
            if (
              receipt.details?.error === 'DeviceNotRegistered'
            ) {
              // Remove invalid token
              await User.findByIdAndUpdate(userId, {
                $pull: { pushTokens: (chunk[i] as any).to },
              });
            }
          }
        }
      } catch (err) {
        console.error('Error sending push chunk:', err);
      }
    }
  } catch (err) {
    console.error('sendPushToUser error:', err);
  }
}

/**
 * Send push notification to multiple users.
 */
export async function sendPushToUsers(
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, any>,
): Promise<void> {
  // Fire all in parallel, non-blocking
  await Promise.allSettled(
    userIds.map((id) => sendPushToUser(id, title, body, data)),
  );
}
