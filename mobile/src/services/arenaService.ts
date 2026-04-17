import type {
    Battle,
    Challenge,
    ChallengeDetail,
    LeaderboardEntry,
    SubmissionResult,
    WaitingBattle
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

// ============ BATTLE REQUEST TYPE (matches frontend) ============
export interface BattleRequest {
  difficulty: 'easy' | 'medium' | 'hard';
  entryFee: number;
  userId: string;
  userName: string;
  userAvatar: string;
  rating: number;
  originalBattleId?: string;
}

// ============ BATTLES ============

/** Fetch waiting battles, optionally by difficulty */
export async function fetchWaitingBattles(difficulty?: string): Promise<WaitingBattle[]> {
  const q = difficulty ? `?status=waiting&difficulty=${difficulty}` : '?status=waiting';
  const data = await apiRequest<any>('GET', `/battles${q}`);
  // Backend may return array directly or { battles: [] }
  return Array.isArray(data) ? data : (data?.battles || []);
}

/** Find an available battle to join (same as frontend findAvailableBattle) */
export async function findAvailableBattle(difficulty: string, entryFee: number): Promise<any | null> {
  try {
    const data = await apiRequest<any>('GET', `/battles/find?difficulty=${difficulty}&entryFee=${entryFee}`);
    return data?.battle || data || null;
  } catch {
    return null;
  }
}

/** Create a new random battle (same as frontend createRandomBattle) */
export async function createBattle(params: BattleRequest): Promise<string> {
  const data = await apiRequest<any>('POST', '/battles/create', params);
  return data?.battleId || data?._id || data?.id || '';
}

/**
 * Join or create battle — the core matching flow from frontend.
 * First tries to find an existing battle, if not found creates a new one.
 */
export async function joinOrCreateBattle(params: BattleRequest): Promise<string> {
  // Try to find an existing battle first
  const existing = await findAvailableBattle(params.difficulty, params.entryFee);
  if (existing && (existing._id || existing.id)) {
    const battleId = existing._id || existing.id;
    // Join existing battle
    await joinBattle(battleId, params.userName, params.userAvatar, params.rating);
    return battleId;
  }
  // No existing battle found — create a new one
  return createBattle(params);
}

/** Join an existing battle — passes userName, userAvatar, rating like frontend */
export async function joinBattle(
  battleId: string,
  userName: string,
  userAvatar: string,
  rating: number
): Promise<any> {
  return apiRequest<any>('POST', `/battles/${battleId}/join`, {
    userName,
    userAvatar,
    rating,
  });
}

/** Get battle by ID — returns battle data (handles both wrapped and unwrapped response) */
export async function getBattle(battleId: string): Promise<any> {
  const data = await apiRequest<any>('GET', `/battles/${battleId}`);
  return data?.battle || data;
}

export async function forfeitBattle(battleId: string): Promise<void> {
  return apiRequest<void>('POST', `/battles/${battleId}/forfeit`, {});
}

/** Cancel/delete a waiting battle */
export async function cancelBattle(battleId: string): Promise<void> {
  return apiRequest<void>('DELETE', `/battles/${battleId}`);
}

export async function getBattleHistory(): Promise<Battle[]> {
  const data = await apiRequest<any>('GET', '/battles/user/my-battles');
  return Array.isArray(data) ? data : (data?.battles || []);
}

/** Create bot battle — passes full BattleRequest like frontend */
export async function createBotBattle(params: BattleRequest): Promise<{ battleId: string; botProfile?: any }> {
  return apiRequest<{ battleId: string; botProfile?: any }>('POST', '/battles/create-bot-battle', params);
}

/** Invite user to battle — matches frontend inviteUserToBattle */
export async function inviteUserToBattle(params: {
  targetUserId: string;
  difficulty: 'easy' | 'medium' | 'hard';
  entryFee: number;
  userId: string;
  userName: string;
  userAvatar: string;
  rating: number;
}): Promise<string> {
  const data = await apiRequest<any>('POST', '/battles/invite', params);
  return data?.battleId || data?._id || '';
}

export async function getBattleInvites(): Promise<any[]> {
  const data = await apiRequest<any>('GET', '/battles/my-invites');
  return Array.isArray(data) ? data : (data?.invites || []);
}

/** Accept invite — passes userName, userAvatar, rating like frontend */
export async function acceptBattleInvite(
  battleId: string,
  userName: string,
  userAvatar: string,
  rating: number
): Promise<any> {
  return apiRequest<any>('POST', `/battles/${battleId}/accept-invite`, {
    userName,
    userAvatar,
    rating,
  });
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
export async function fetchWallet(userId: string): Promise<any> {
  if (!userId) return { coins: 0, rating: 1000, achievements: {}, streak: {} };
  const data = await apiRequest<any>('GET', `/wallet/${userId}`);
  const w = data?.wallet || data || {};
  return {
    ...w,
    coins: w.coins ?? 0,
    rating: w.rating ?? 1000,
    stats: w.achievements || {},
    transactions: w.transactions || [],
  };
}

/** Initialize wallet if it doesn't exist */
export async function initializeWallet(userId: string): Promise<any> {
  const data = await apiRequest<any>('POST', `/wallet`, { userId });
  return data?.wallet || data;
}

/** Get user battle stats (optimized endpoint) */
export async function getUserBattleStats(userId: string): Promise<any> {
  try {
    const data = await apiRequest<any>('GET', `/battles/user-stats/${userId}`);
    return data || {};
  } catch {
    return {};
  }
}

// ============ SEARCH USERS (same endpoint as frontend) ============
export async function searchUsersForInvite(query: string): Promise<any[]> {
  const data = await apiRequest<any>('GET', `/battles/search-users?q=${encodeURIComponent(query)}`);
  return Array.isArray(data) ? data : (data?.users || []);
}

// ============ REMATCH (matches frontend createRematchBattle) ============
export async function createRematchBattle(
  params: BattleRequest & { originalBattleId?: string },
  targetOpponentId: string,
  targetOpponentName: string
): Promise<string> {
  const data = await apiRequest<any>('POST', `/battles/${params.originalBattleId}/rematch`, {
    to: targetOpponentId,
    toName: targetOpponentName,
    fromName: params.userName,
    difficulty: params.difficulty,
    entryFee: params.entryFee,
    userName: params.userName,
    userAvatar: params.userAvatar,
    rating: params.rating,
  });
  return data?.battleId || data?._id || data?.id || '';
}

// ============ BOT PROGRESS ============
export async function getBotProgress(battleId: string): Promise<any> {
  return apiRequest<any>('GET', `/battles/${battleId}/bot-progress`);
}

// ============ START BATTLE ============
export async function startBattle(battleId: string): Promise<void> {
  return apiRequest<void>('POST', `/battles/${battleId}/start`, {});
}

// ============ SUBMIT BATTLE CODE ============
export async function submitBattleCode(battleId: string, code: string, language: string): Promise<any> {
  return apiRequest<any>('POST', `/battles/${battleId}/submit`, { code, language });
}

// ============ AI SERVICES ============
export async function getAIHint(params: { challengeId: string; level: number; code?: string }): Promise<{ hint: string }> {
  return apiRequest<{ hint: string }>('POST', '/ai/hint', params);
}

export async function analyzeCodeAI(params: { code: string; language: string; challengeId: string }): Promise<any> {
  return apiRequest<any>('POST', '/ai/analyze', params);
}

// ============ DISCUSSIONS ============
export async function getDiscussions(challengeId: string): Promise<any[]> {
  const data = await apiRequest<{ discussions: any[] }>('GET', `/discussions/${challengeId}`);
  return data?.discussions || [];
}

export async function createDiscussion(challengeId: string, title: string, content: string): Promise<any> {
  return apiRequest<any>('POST', `/discussions/${challengeId}`, { title, content });
}

export async function voteDiscussion(discussionId: string): Promise<void> {
  return apiRequest<void>('POST', `/discussions/${discussionId}/vote`, {});
}
