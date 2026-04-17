import { COLORS } from '@constants/theme';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RoadmapStackParamList } from './types';

import CareerInfoScreen from '@screens/roadmaps/CareerInfoScreen';
import InterviewPrepScreen from '@screens/roadmaps/InterviewPrepScreen';
import LearningDashboardScreen from '@screens/roadmaps/LearningDashboardScreen';
import RoadmapDetailScreen from '@screens/roadmaps/RoadmapDetailScreen';
import RoadmapListScreen from '@screens/roadmaps/RoadmapListScreen';
import TopicDetailScreen from '@screens/roadmaps/TopicDetailScreen';

const Stack = createNativeStackNavigator<RoadmapStackParamList>();

export default function RoadmapNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="LearningDashboard" component={LearningDashboardScreen} />
      <Stack.Screen name="RoadmapList" component={RoadmapListScreen} />
      <Stack.Screen name="RoadmapDetail" component={RoadmapDetailScreen} />
      <Stack.Screen name="TopicDetail" component={TopicDetailScreen} />
      <Stack.Screen name="CareerInfo" component={CareerInfoScreen} />
      <Stack.Screen name="InterviewPrep" component={InterviewPrepScreen} />
    </Stack.Navigator>
  );
}
