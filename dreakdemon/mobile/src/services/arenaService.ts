import type {
    Battle,
    Challenge,
    ChallengeDetail,
    LeaderboardEntry,
    SubmissionResult,
    WaitingBattle,
    Wallet,
} from '@apptypes/index';
import { apiRequest } from './api';

// ============ CHALLENGES ============
export async function fetchChallenges(params?: {
  page?: number;
  difficulty?: string;
  topic?: string;
  search?: string;
  company?: string;
}) {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.difficulty && params.difficulty !== 'all') query.set('difficulty', params.difficulty);
  if (params?.topic && params.topic !== 'all') query.set('category', params.topic);
  if (params?.search) query.set('search', params.search);
  if (params?.company && params.company !== 'all') query.set('company', params.company);

  return apiRequest<{ challenges: Challenge[]; total: number }>(
    'GET',
    `/challenges?${query.toString()}`
  );
}

export async function fetchChallengeById(id: string): Promise<ChallengeDetail> {
  return apiRequest<ChallengeDetail>('GET', `/challenges/${id}`);
}

export async function executeCode(params: {
  language: string;
  code: string;
  challengeId: string;
}): Promise<SubmissionResult> {
  return apiRequest<SubmissionResult>('POST', '/execute', params);
}

export async function submitSolution(params: {
  challengeId: string;
  language: string;
  code: string;
}): Promise<SubmissionResult> {
  return apiRequest<SubmissionResult>('POST', `/challenges/${params.challengeId}/submit`, {
    language: params.language,
    code: params.code,
  });
}

export async function getUserProgress(userId: string) {
  const data = await apiRequest<{ progress: { solvedChallenges: any[]; attemptedChallenges?: any[] } }>(
    'GET',
    `/challenges/progress/${userId}`
  );
  return data?.progress || { solvedChallenges: [], attemptedChallenges: [] };
}

// ============ BATTLES ============
export async function fetchWaitingBattles(): Promise<WaitingBattle[]> {
  const data = await apiRequest<{ battles: WaitingBattle[] }>('GET', '/battles?status=waiting');
  return data?.battles || [];
}

export async function createBattle(params: {
  challengeId?: string;
  difficulty: string;
  entryFee?: number;
  timeLimit?: number;
  userName?: string;
  userAvatar?: string;
  rating?: number;
}): Promise<Battle> {
  return apiRequest<Battle>('POST', '/battles/create', params);
}

export async function joinBattle(battleId: string): Promise<Battle> {
  return apiRequest<Battle>('POST', `/battles/${battleId}/join`, {});
}

export async function getBattle(battleId: string): Promise<Battle> {
  return apiRequest<Battle>('GET', `/battles/${battleId}`);
}

export async function forfeitBattle(battleId: string): Promise<void> {
  return apiRequest<void>('POST', `/battles/${battleId}/forfeit`, {});
}

export async function getBattleHistory(): Promise<Battle[]> {
  const data = await apiRequest<{ battles: Battle[] }>('GET', '/battles/user/my-battles');
  return data?.battles || [];
}

export async function createBotBattle(difficulty: string): Promise<Battle> {
  return apiRequest<Battle>('POST', '/battles/create-bot-battle', { difficulty });
}

export async function inviteUserToBattle(params: {
  username: string;
  difficulty: string;
  entryFee: number;
}): Promise<void> {
  return apiRequest<void>('POST', '/battles/invite', params);
}

export async function getBattleInvites(): Promise<any[]> {
  const data = await apiRequest<{ invites: any[] }>('GET', '/battles/my-invites');
  return data?.invites || [];
}

export async function acceptBattleInvite(battleId: string): Promise<Battle> {
  return apiRequest<Battle>('POST', `/battles/${battleId}/accept-invite`, {});
}

export async function rejectBattleInvite(battleId: string): Promise<void> {
  return apiRequest<void>('POST', `/battles/${battleId}/reject-invite`, {});
}

// ============ LEADERBOARD ============
export async function fetchGlobalLeaderboard(): Promise<LeaderboardEntry[]> {
  const data = await apiRequest<{ leaderboard: LeaderboardEntry[] }>('GET', '/leaderboard');
  return data?.leaderboard || [];
}

export async function fetchWeeklyLeaderboard(): Promise<LeaderboardEntry[]> {
  const data = await apiRequest<{ leaderboard: LeaderboardEntry[] }>('GET', '/leaderboard?period=weekly');
  return data?.leaderboard || [];
}

export async function fetchMonthlyLeaderboard(): Promise<LeaderboardEntry[]> {
  const data = await apiRequest<{ leaderboard: LeaderboardEntry[] }>('GET', '/leaderboard?period=monthly');
  return data?.leaderboard || [];
}

// ============ WALLET ============
export async function fetchWallet(userId?: string): Promise<Wallet & { stats: any; transactions: any[] }> {
  if (!userId) return { balance: 0, coins: 0, stats: {}, transactions: [] } as any;
  const data = await apiRequest<{ wallet: any }>('GET', `/wallet/${userId}`);
  const w = data?.wallet || {};
  // Backend returns 'achievements' — expose as 'stats' for screen compatibility
  return { ...w, stats: w.achievements || {}, transactions: w.transactions || [] };
}
