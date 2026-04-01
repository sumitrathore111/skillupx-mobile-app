import { COLORS } from '@constants/theme';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import DevFeedScreen from '@screens/dashboard/DevFeedScreen';
import MyInvitesScreen from '@screens/dashboard/MyInvitesScreen';
import NotificationsScreen from '@screens/dashboard/NotificationsScreen';
import ProfileScreen from '@screens/dashboard/ProfileScreen';
import QueryScreen from '@screens/dashboard/QueryScreen';

export type DashboardStackParamList = {
  DevFeed: undefined;
  Profile: undefined;
  Notifications: undefined;
  MyInvites: undefined;
  Query: undefined;
};

const Stack = createNativeStackNavigator<DashboardStackParamList>();

export default function DashboardNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="DevFeed" component={DevFeedScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="MyInvites" component={MyInvitesScreen} />
      <Stack.Screen name="Query" component={QueryScreen} />
    </Stack.Navigator>
  );
}
