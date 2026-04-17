import { COLORS } from '@constants/theme';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { CreatorStackParamList } from './types';

import CreatorHomeScreen from '@screens/creator/CreatorHomeScreen';
import GitHubConnectScreen from '@screens/creator/GitHubConnectScreen';
import IdeasFeedScreen from '@screens/creator/IdeasFeedScreen';
import InviteMemberScreen from '@screens/creator/InviteMemberScreen';
import MyInvitesScreen from '@screens/creator/MyInvitesScreen';
import MyProjectsScreen from '@screens/creator/MyProjectsScreen';
import ProjectDetailScreen from '@screens/creator/ProjectDetailScreen';
import ProjectWorkspaceScreen from '@screens/creator/ProjectWorkspaceScreen';
import SubmitIdeaScreen from '@screens/creator/SubmitIdeaScreen';
import TaskDetailScreen from '@screens/creator/TaskDetailScreen';

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
      <Stack.Screen name="InviteMember" component={InviteMemberScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="MyInvites" component={MyInvitesScreen} />
      <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
      <Stack.Screen name="GitHubConnect" component={GitHubConnectScreen} options={{ animation: 'slide_from_bottom' }} />
    </Stack.Navigator>
  );
}
