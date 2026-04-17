import { apiRequest } from "./api";

interface BattleRequest {
  difficulty: 'easy' | 'medium' | 'hard';
  entryFee: number;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating?: number;
}

interface BotProfile {
  name: string;
  avatar: string;
  rating: number;
  skillLevel: string;
}

// Create a new battle with random challenge from database
export const createRandomBattle = async (battleRequest: BattleRequest): Promise<string | null> => {
  try {
    const response = await apiRequest('/battles/create', {
      method: 'POST',
      body: JSON.stringify(battleRequest)
    });

    console.log(`Created battle ${response.battleId}`);
    return response.battleId;
  } catch (error) {
    console.error('Error creating random battle:', error);
    throw error;
  }
};

// Find existing battle to join
export const findAvailableBattle = async (
  difficulty: 'easy' | 'medium' | 'hard',
  entryFee: number
): Promise<string | null> => {
  try {
    const response = await apiRequest(`/battles/find?difficulty=${difficulty}&entryFee=${entryFee}`);
    return response.battle?._id || null;
  } catch (error) {
    console.error('Error finding available battle:', error);
    return null;
  }
};

// Join existing battle or create new one
export const joinOrCreateBattle = async (battleRequest: BattleRequest): Promise<string> => {
  try {
    const { difficulty, entryFee } = battleRequest;

    // First try to find an existing battle to join
    const existingBattleId = await findAvailableBattle(difficulty, entryFee);

    if (existingBattleId) {
      return existingBattleId;
    }

    // Create new battle if no suitable one exists
    const newBattleId = await createRandomBattle(battleRequest);

    if (!newBattleId) {
      throw new Error('Failed to create battle');
    }

    return newBattleId;
  } catch (error) {
    console.error('Error joining or creating battle:', error);
    throw error;
  }
};

// Join a battle
export const joinBattle = async (
  battleId: string,
  userName: string,
  userAvatar?: string,
  rating?: number
): Promise<any> => {
  try {
    const response = await apiRequest(`/battles/${battleId}/join`, {
      method: 'POST',
      body: JSON.stringify({ userName, userAvatar, rating })
    });

    return response.battle;
  } catch (error) {
    console.error('Error joining battle:', error);
    throw error;
  }
};

// Submit code to battle
export const submitBattleCode = async (
  battleId: string,
  code: string,
  language: string
): Promise<any> => {
  try {
    const response = await apiRequest(`/battles/${battleId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ code, language })
    });

    return response;
  } catch (error) {
    console.error('Error submitting battle code:', error);
    throw error;
  }
};

// Get battle details
export const getBattle = async (battleId: string): Promise<any> => {
  try {
    const response = await apiRequest(`/battles/${battleId}`);
    return response.battle;
  } catch (error) {
    console.error('Error getting battle:', error);
    throw error;
  }
};

// Get user's battles
export const getUserBattles = async (): Promise<any[]> => {
  try {
    const response = await apiRequest('/battles/user/my-battles');
    return response.battles;
  } catch (error) {
    console.error('Error getting user battles:', error);
    return [];
  }
};

// Create a rematch battle request
export const createRematchBattle = async (
  battleRequest: BattleRequest & { originalBattleId?: string },
  targetOpponentId: string,
  targetOpponentName?: string
): Promise<string | null> => {
  try {
    // Use the rematch endpoint if we have an original battle ID
    if (battleRequest.originalBattleId) {
      const response = await apiRequest(`/battles/${battleRequest.originalBattleId}/rematch`, {
        method: 'POST',
        body: JSON.stringify({
          to: targetOpponentId,
          toName: targetOpponentName || 'Opponent',
          fromName: battleRequest.userName,
          difficulty: battleRequest.difficulty,
          entryFee: battleRequest.entryFee,
          userName: battleRequest.userName,
          userAvatar: battleRequest.userAvatar,
          rating: battleRequest.rating
        })
      });

      console.log(`Created rematch battle ${response.battleId}`);
      return response.battleId;
    }

    // Fallback: create a regular battle
    return createRandomBattle(battleRequest);
  } catch (error) {
    console.error('Error creating rematch battle:', error);
    throw error;
  }
};

// Create a battle against a bot opponent
export const createBotBattle = async (battleRequest: BattleRequest): Promise<{ battleId: string; botProfile: BotProfile }> => {
  try {
    const response = await apiRequest('/battles/create-bot-battle', {
      method: 'POST',
      body: JSON.stringify(battleRequest)
    });

    console.log(`Created bot battle ${response.battleId}`);
    return {
      battleId: response.battleId,
      botProfile: response.botProfile,
    };
  } catch (error) {
    console.error('Error creating bot battle:', error);
    throw error;
  }
};

// Get bot progress for a battle
export const getBotProgress = async (battleId: string): Promise<{ progress: number; isBot: boolean; submitted: boolean; botName?: string }> => {
  try {
    const response = await apiRequest(`/battles/${battleId}/bot-progress`);
    return response;
  } catch (error) {
    console.error('Error getting bot progress:', error);
    return { progress: 0, isBot: false, submitted: false };
  }
};

// Search users by username for battle invite
export const searchUsersForInvite = async (query: string): Promise<Array<{
  id: string;
  username: string;
  name: string;
  avatar: string;
}>> => {
  try {
    if (!query || query.trim().length < 2) return [];
    const response = await apiRequest(`/battles/search-users?q=${encodeURIComponent(query.trim())}`);
    return response.users || [];
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
};

// Invite a user to a battle
export const inviteUserToBattle = async (battleRequest: BattleRequest & { targetUserId: string }): Promise<string | null> => {
  try {
    const response = await apiRequest('/battles/invite', {
      method: 'POST',
      body: JSON.stringify(battleRequest)
    });
    console.log(`Created invite battle ${response.battleId}`);
    return response.battleId;
  } catch (error) {
    console.error('Error inviting user to battle:', error);
    throw error;
  }
};

// Get pending battle invites for current user
export const getMyBattleInvites = async (): Promise<Array<{
  battleId: string;
  fromUserId: string;
  fromUsername: string;
  fromName: string;
  difficulty: string;
  entryFee: number;
  prize: number;
  createdAt: string;
  creatorAvatar: string;
}>> => {
  try {
    const response = await apiRequest('/battles/my-invites');
    return response.invites || [];
  } catch (error) {
    console.error('Error fetching invites:', error);
    return [];
  }
};

// Accept a battle invite
export const acceptBattleInvite = async (
  battleId: string,
  userName: string,
  userAvatar?: string,
  rating?: number
): Promise<any> => {
  try {
    const response = await apiRequest(`/battles/${battleId}/accept-invite`, {
      method: 'POST',
      body: JSON.stringify({ userName, userAvatar, rating })
    });
    return response.battle;
  } catch (error) {
    console.error('Error accepting invite:', error);
    throw error;
  }
};

// Reject a battle invite
export const rejectBattleInvite = async (battleId: string): Promise<void> => {
  try {
    await apiRequest(`/battles/${battleId}/reject-invite`, {
      method: 'POST'
    });
  } catch (error) {
    console.error('Error rejecting invite:', error);
    throw error;
  }
};
