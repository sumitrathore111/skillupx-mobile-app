import { COLORS } from '@constants/theme';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { CreatorStackParamList } from './types';

import CreatorHomeScreen from '@screens/creator/CreatorHomeScreen';
import IdeasFeedScreen from '@screens/creator/IdeasFeedScreen';
import MyProjectsScreen from '@screens/creator/MyProjectsScreen';
import ProjectDetailScreen from '@screens/creator/ProjectDetailScreen';
import ProjectWorkspaceScreen from '@screens/creator/ProjectWorkspaceScreen';
import SubmitIdeaScreen from '@screens/creator/SubmitIdeaScreen';

const Stack = createNativeStackNavigator<CreatorStackParamList>();

export default function CreatorNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="CreatorHome" component={CreatorHomeScreen} />
      <Stack.Screen name="ProjectDetail" component={ProjectDetailScreen} />
      <Stack.Screen name="ProjectWorkspace" component={ProjectWorkspaceScreen} />
      <Stack.Screen name="MyProjects" component={MyProjectsScreen} />
      <Stack.Screen name="IdeasFeed" component={IdeasFeedScreen} />
      <Stack.Screen name="SubmitIdea" component={SubmitIdeaScreen} options={{ animation: 'slide_from_bottom' }} />
    </Stack.Navigator>
  );
}
