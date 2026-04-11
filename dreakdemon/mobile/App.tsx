import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto';
import './global.css';
import RootNavigator from './src/navigation/RootNavigator';
import { registerForPushNotifications, savePushTokenToServer } from './src/services/pushService';
import { useAuthStore } from './src/store/authStore';

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

  // Register for push notifications when user is authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    registerForPushNotifications().then((token) => {
      if (token) savePushTokenToServer(token);
    });
  }, [isAuthenticated]);

  // Handle notification taps (navigate to relevant screen)
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
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

    return () => subscription.remove();
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
