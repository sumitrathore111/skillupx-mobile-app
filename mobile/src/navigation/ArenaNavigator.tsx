import { COLORS } from '@constants/theme';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ArenaStackParamList } from './types';

import ArenaHomeScreen from '@screens/arena/ArenaHomeScreen';
import BattleHistoryScreen from '@screens/arena/BattleHistoryScreen';
import BattleLobbyScreen from '@screens/arena/BattleLobbyScreen';
import BattleResultScreen from '@screens/arena/BattleResultScreen';
import BattleRoomScreen from '@screens/arena/BattleRoomScreen';
import CodeEditorScreen from '@screens/arena/CodeEditorScreen';
import LeaderboardScreen from '@screens/arena/LeaderboardScreen';
import PracticeChallengesScreen from '@screens/arena/PracticeChallengesScreen';
import ProblemDetailScreen from '@screens/arena/ProblemDetailScreen';
import ProblemListScreen from '@screens/arena/ProblemListScreen';
import WalletScreen from '@screens/arena/WalletScreen';

const Stack = createNativeStackNavigator<ArenaStackParamList>();

export default function ArenaNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="ArenaHome" component={ArenaHomeScreen} />
      <Stack.Screen name="PracticeChallenges" component={PracticeChallengesScreen} />
      <Stack.Screen name="ProblemList" component={ProblemListScreen} />
      <Stack.Screen name="ProblemDetail" component={ProblemDetailScreen} />
      <Stack.Screen name="CodeEditor" component={CodeEditorScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="BattleLobby" component={BattleLobbyScreen} />
      <Stack.Screen name="BattleRoom" component={BattleRoomScreen} options={{ gestureEnabled: false }} />
      <Stack.Screen name="BattleResult" component={BattleResultScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name="BattleHistory" component={BattleHistoryScreen} />
      <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Stack.Screen name="Wallet" component={WalletScreen} />
    </Stack.Navigator>
  );
}
