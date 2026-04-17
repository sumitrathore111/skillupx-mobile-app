import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import api from './api';

const isExpoGo = Constants.appOwnership === 'expo';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Android needs a notification channel
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#00D4AA',
    sound: 'default',
  }).catch(() => {});
}

/**
 * Register for push notifications and return the Expo push token.
 * Returns null if permissions denied, running on simulator, or in Expo Go.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Remote push notifications don't work in Expo Go (SDK 53+)
  if (isExpoGo) {
    console.log('Push notifications are not supported in Expo Go. Use a development build.');
    return null;
  }

  // Push doesn't work on simulators
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  try {
    // Check existing permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Ask if not already granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission denied');
      return null;
    }

    // Get Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: undefined, // Uses projectId from app.json automatically
    });

    return tokenData.data;
  } catch (e) {
    console.warn('Failed to register for push notifications:', e);
    return null;
  }
}

/**
 * Send the push token to the backend so it can send notifications to this device.
 */
export async function savePushTokenToServer(token: string): Promise<void> {
  try {
    await api.post('/users/push-token', { pushToken: token });
  } catch (e) {
    console.error('Failed to save push token:', e);
  }
}

/**
 * Remove push token from server (on logout).
 */
export async function removePushTokenFromServer(): Promise<void> {
  try {
    await api.delete('/users/push-token');
  } catch (e) {
    console.error('Failed to remove push token:', e);
  }
}
