export type RootStackParamList = {
  Auth: undefined;
  Register: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type BottomTabParamList = {
  Dashboard: undefined;
  Connect: undefined;
  Arena: undefined;
  Roadmaps: undefined;
  Creator: undefined;
};

// Developer Connect stack
export type ConnectStackParamList = {
  ConnectHome: undefined;
  DevProfile: { developerId: string };
  Chat: { participantId: string; participantName: string; participantAvatar?: string; isOnline?: boolean };
  GroupChat: { groupId: string; groupName: string };
  VoiceRoom: { groupId: string; roomId: string; roomName: string; groupName: string };
  ConnectionRequests: undefined;
  WriteReview: undefined;
  SubmitHelpRequest: undefined;
};

// Code Arena stack
export type ArenaStackParamList = {
  ArenaHome: undefined;
  PracticeChallenges: undefined;
  ProblemList: undefined;
  ProblemDetail: { challengeId: string; challengeTitle: string };
  CodeEditor: { challengeId: string; challengeTitle: string; difficulty: string };
  BattleLobby: undefined;
  BattleRoom: { battleId: string };
  BattleResult: { battleId: string; won?: boolean; coinsChange?: number; winnerId?: string; coinsEarned?: number; result?: string };
  BattleHistory: undefined;
  Leaderboard: undefined;
  Wallet: undefined;
};

// Roadmaps stack
export type RoadmapStackParamList = {
  LearningDashboard: undefined;
  RoadmapList: undefined;
  RoadmapDetail: { slug: string; title?: string };
  TopicDetail: { topicId: string; roadmapSlug?: string };
  CareerInfo: { roadmapId: string; title?: string };
  InterviewPrep: { roadmapId: string; title?: string };
};

// Creator Corner stack
export type CreatorStackParamList = {
  CreatorHome: undefined;
  ProjectDetail: { projectId: string; projectTitle: string };
  ProjectWorkspace: { projectId: string; projectTitle: string };
  MyProjects: undefined;
  IdeasFeed: undefined;
  SubmitIdea: { editIdea?: any } | undefined;
  InviteMember: { projectId: string; projectTitle: string };
  MyInvites: undefined;
  TaskDetail: { taskId: string; projectId: string; isCreator?: boolean };
  GitHubConnect: { projectId: string; projectTitle: string };
};
