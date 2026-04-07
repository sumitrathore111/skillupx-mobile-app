import { COLORS } from '@constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabParamList } from './types';

// Import screen stacks
import ArenaNavigator from './ArenaNavigator';
import ConnectNavigator from './ConnectNavigator';
import CreatorNavigator from './CreatorNavigator';
import DashboardNavigator from './DashboardNavigator';
import RoadmapNavigator from './RoadmapNavigator';

const Tab = createBottomTabNavigator<BottomTabParamList>();

export default function BottomTabNavigator() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 10);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 55 + bottomPadding,
          paddingBottom: bottomPadding,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Connect':
              iconName = focused ? 'people' : 'people-outline';
              break;
            case 'Arena':
              iconName = focused ? 'flash' : 'flash-outline';
              break;
            case 'Roadmaps':
              iconName = focused ? 'map' : 'map-outline';
              break;
            case 'Creator':
              iconName = focused ? 'sparkles' : 'sparkles-outline';
              break;
          }

          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardNavigator} options={{ tabBarLabel: 'Dashboard' }} />
      <Tab.Screen name="Connect" component={ConnectNavigator} options={{ tabBarLabel: 'Connect' }} />
      <Tab.Screen name="Arena" component={ArenaNavigator} options={{ tabBarLabel: 'Arena' }} />
      <Tab.Screen name="Roadmaps" component={RoadmapNavigator} options={{ tabBarLabel: 'Learn' }} />
      <Tab.Screen name="Creator" component={CreatorNavigator} options={{ tabBarLabel: 'Creator' }} />
    </Tab.Navigator>
  );
}
