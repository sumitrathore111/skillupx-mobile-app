// Challenges service using custom backend API
import { apiRequest } from './api';

export interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string;
  points: number;
  testCases: TestCase[];
  starterCode?: { [language: string]: string };
  constraints?: string[];
  examples?: Example[];
  hints?: string[];
  createdAt: Date;
  updatedAt: Date;
  problemStatement?: string;  // Alias for description or additional problem details
  coinReward?: number;  // Alias for points
  tags?: string[];  // Category tags
}

export interface TestCase {
  input: string;
  expectedOutput: string;
  isHidden?: boolean;
}

export interface Example {
  input: string;
  output: string;
  explanation?: string;
}

// Get all challenges
export const getAllChallenges = async (): Promise<Challenge[]> => {
  try {
    const response = await apiRequest('/challenges');
    return response.challenges || [];
  } catch (error) {
    console.error('Error fetching challenges:', error);
    return [];
  }
};

// Get challenges by difficulty
export const getChallengesByDifficulty = async (difficulty: string): Promise<Challenge[]> => {
  try {
    const response = await apiRequest(`/challenges?difficulty=${difficulty}`);
    return response.challenges || [];
  } catch (error) {
    console.error('Error fetching challenges by difficulty:', error);
    return [];
  }
};

// Get challenges by category
export const getChallengesByCategory = async (category: string): Promise<Challenge[]> => {
  try {
    const response = await apiRequest(`/challenges?category=${category}`);
    return response.challenges || [];
  } catch (error) {
    console.error('Error fetching challenges by category:', error);
    return [];
  }
};

// Get challenge by ID
export const getChallengeById = async (challengeId: string): Promise<Challenge | null> => {
  try {
    const response = await apiRequest(`/challenges/${challengeId}`);
    return response.challenge || null;
  } catch (error) {
    console.error('Error fetching challenge:', error);
    return null;
  }
};

// Alias for getChallengeById (for backward compatibility)
export const fetchChallengeById = getChallengeById;

// Submit challenge solution
export const submitChallengeSolution = async (
  challengeId: string,
  code: string,
  language: string,
  userId: string
): Promise<{ success: boolean; passed: number; total: number; message: string }> => {
  try {
    const response = await apiRequest(`/challenges/${challengeId}/submit`, {
      method: 'POST',
      body: JSON.stringify({
        code,
        language,
        userId
      })
    });
    return response;
  } catch (error) {
    console.error('Error submitting challenge:', error);
    return { success: false, passed: 0, total: 0, message: 'Submission failed' };
  }
};

// Get user's completed challenges
export const getUserCompletedChallenges = async (userId: string): Promise<string[]> => {
  try {
    const response = await apiRequest(`/users/${userId}/completed-challenges`);
    return response.completedChallenges || [];
  } catch (error) {
    console.error('Error fetching completed challenges:', error);
    return [];
  }
};

// Create new challenge (admin only)
export const createChallenge = async (challengeData: Omit<Challenge, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const response = await apiRequest('/challenges', {
      method: 'POST',
      body: JSON.stringify(challengeData)
    });
    return response.challengeId;
  } catch (error) {
    console.error('Error creating challenge:', error);
    throw error;
  }
};

// Update challenge (admin only)
export const updateChallenge = async (
  challengeId: string,
  updates: Partial<Challenge>
): Promise<void> => {
  try {
    await apiRequest(`/challenges/${challengeId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  } catch (error) {
    console.error('Error updating challenge:', error);
    throw error;
  }
};

// Delete challenge (admin only)
export const deleteChallenge = async (challengeId: string): Promise<void> => {
  try {
    await apiRequest(`/challenges/${challengeId}`, {
      method: 'DELETE'
    });
  } catch (error) {
    console.error('Error deleting challenge:', error);
    throw error;
  }
};

// Get random challenge
export const getRandomChallenge = async (difficulty?: string): Promise<Challenge | null> => {
  try {
    const url = difficulty ? `/challenges/random?difficulty=${difficulty}` : '/challenges/random';
    const response = await apiRequest(url);
    return response.challenge || null;
  } catch (error) {
    console.error('Error fetching random challenge:', error);
    return null;
  }
};

// Get test cases for a challenge
export const getChallengeTestCases = async (challengeId: string): Promise<TestCase[]> => {
  try {
    const response = await apiRequest(`/challenges/${challengeId}/testcases`);
    return response.testCases || [];
  } catch (error) {
    console.error('Error fetching test cases:', error);
    return [];
  }
};

// Get validation test cases
export const getValidationTestCases = async (challengeId: string): Promise<TestCase[]> => {
  try {
    const response = await apiRequest(`/challenges/${challengeId}/validation-testcases`);
    return response.testCases || [];
  } catch (error) {
    console.error('Error fetching validation test cases:', error);
    return [];
  }
};

// Seed battle challenges from practice challenges
export const seedBattleChallengesFromPractice = async (): Promise<{ success: boolean; count: number }> => {
  try {
    const response = await apiRequest('/challenges/seed-battles', {
      method: 'POST'
    });
    return { success: true, count: response.count || 0 };
  } catch (error) {
    console.error('Error seeding battle challenges:', error);
    return { success: false, count: 0 };
  }
};

// Export default challenges list
export const defaultChallenges: any[] = [];
