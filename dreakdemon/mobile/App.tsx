import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto';
import './global.css';
import RootNavigator from './src/navigation/RootNavigator';
import { registerForPushNotifications, savePushTokenToServer } from './src/services/pushService';
import { useAuthStore } from './src/store/authStore';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function AppContent() {
  const initialize = useAuthStore(s => s.initialize);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const navigationRef = useRef<any>(null);

  useEffect(() => { initialize(); }, []);

  // Register for push notifications when user is authenticated (skip in Expo Go)
  useEffect(() => {
    if (!isAuthenticated || isExpoGo) return;
    registerForPushNotifications().then((token) => {
      if (token) savePushTokenToServer(token);
    }).catch(() => {});
  }, [isAuthenticated]);

  // Handle notification taps (skip in Expo Go)
  useEffect(() => {
    if (isExpoGo) return;
    let subscription: any;
    try {
      const Notifications = require('expo-notifications');
      subscription = Notifications.addNotificationResponseReceivedListener((response: any) => {
        const data = response.notification.request.content.data;
        if (!navigationRef.current) return;

        if (data?.type === 'chat' && data?.chatId) {
          navigationRef.current.navigate('Connect', {
            screen: 'Chat',
            params: { participantId: data.senderId, participantName: '' },
          });
        } else if (data?.type === 'groupChat' && data?.groupId) {
          navigationRef.current.navigate('Connect', {
            screen: 'GroupChat',
            params: { groupId: data.groupId, groupName: data.groupName || '' },
          });
        }
      });
    } catch {}

    return () => subscription?.remove();
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar style="light" />
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
