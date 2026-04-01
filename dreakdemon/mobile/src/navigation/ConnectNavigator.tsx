import { COLORS } from '@constants/theme';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ConnectStackParamList } from './types';

import ChatScreen from '@screens/connect/ChatScreen';
import ConnectHomeScreen from '@screens/connect/ConnectHomeScreen';
import DevProfileScreen from '@screens/connect/DevProfileScreen';
import GroupChatScreen from '@screens/connect/GroupChatScreen';
import SubmitHelpRequestScreen from '@screens/connect/SubmitHelpRequestScreen';
import WriteReviewScreen from '@screens/connect/WriteReviewScreen';

const Stack = createNativeStackNavigator<ConnectStackParamList>();

export default function ConnectNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="ConnectHome" component={ConnectHomeScreen} />
      <Stack.Screen name="DevProfile" component={DevProfileScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="GroupChat" component={GroupChatScreen} />
      <Stack.Screen name="WriteReview" component={WriteReviewScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="SubmitHelpRequest" component={SubmitHelpRequestScreen} options={{ animation: 'slide_from_bottom' }} />
    </Stack.Navigator>
  );
}
