// Secure code execution service - now uses custom backend only
// All Firebase authentication removed

import { validateCodeSubmission } from '../middleware/inputValidator';
import { apiRequest } from './api';

interface ExecutionResult {
  output: string;
  status: string;
  time: string;
  memory: string;
  stderr: string | null;
  compile_output: string | null;
}

interface ChallengeSubmissionResult {
  success: boolean;
  passed: number;
  total: number;
  passedCount: number;
  totalCount: number;
  message: string;
  coinsChanged: number;
  testResults?: Array<{
    passed: boolean;
    input: string;
    expected: string;
    output: string;
    error?: string;
  }>;
}

// BattleResult interface for potential future use
interface _BattleResult {
  winnerId: string | null;
  winnerCoins: number;
  loserCoins: number;
  executionResults: {
    [playerId: string]: ExecutionResult;
  };
}

// Export for external use if needed
export type { _BattleResult as BattleResult };

    import { API_BASE_URL } from './apiConfig';

class SecureCodeExecutionService {
  private readonly BACKEND_URL = API_BASE_URL;

  // Execute code securely through backend proxy
  async executeCode(code: string, language: string, input?: string, problemTitle?: string): Promise<ExecutionResult> {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      throw new Error('Authentication required');
    }

    // Validate and sanitize input
    const validatedSubmission = validateCodeSubmission({ code, language });

    try {
      const response = await fetch(`${this.BACKEND_URL}/api/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          source_code: validatedSubmission.code,
          language_id: this.getLanguageId(language),
          stdin: input || '',
          problemTitle: problemTitle || ''
        })
      });

      if (!response.ok) {
        throw new Error(`Execution failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Code execution error:', error);
      throw new Error('Failed to execute code. Please try again.');
    }
  }

  // Submit code for challenge with server-side validation
  async submitChallenge(
    challengeId: string,
    code: string,
    language: string,
    testCases?: Array<{ input: string; expected_output?: string; expectedOutput?: string; output?: string }>,
    coinReward?: number,
    title?: string,
    difficulty?: string
  ): Promise<ChallengeSubmissionResult> {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      throw new Error('Authentication required');
    }

    const validatedSubmission = validateCodeSubmission({ code, language, challengeId });

    try {
      const response = await apiRequest(`/challenges/${challengeId}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          code: validatedSubmission.code,
          language: language,
          testCases: testCases,
          coinReward: coinReward,
          title: title,
          difficulty: difficulty
        })
      });

      return {
        success: response.success || false,
        passed: response.passed || response.passedCount || 0,
        total: response.total || response.totalCount || 0,
        passedCount: response.passedCount || response.passed || 0,
        totalCount: response.totalCount || response.total || 0,
        message: response.message || (response.success ? 'All test cases passed!' : 'Some test cases failed'),
        coinsChanged: response.coinsChanged || 0,
        testResults: response.testResults
      };
    } catch (error) {
      console.error('Challenge submission error:', error);
      throw new Error('Failed to submit solution. Please try again.');
    }
  }

  // Submit battle solution with server-side validation
  async submitBattleSolution(battleId: string, code: string, language: string): Promise<ExecutionResult> {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      throw new Error('Authentication required');
    }

    const validatedSubmission = validateCodeSubmission({ code, language, battleId });

    try {
      const response = await apiRequest(`/battles/${battleId}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          code: validatedSubmission.code,
          language: language
        })
      });

      return response;
    } catch (error) {
      console.error('Battle submission error:', error);
      throw new Error('Failed to submit battle solution. Please try again.');
    }
  }

  private getLanguageId(language: string): number {
    const languageMap: { [key: string]: number } = {
      javascript: 63,
      python: 71,
      java: 62,
      cpp: 54,
      c: 50,
      csharp: 51,
      ruby: 72,
      go: 60,
      rust: 73,
      php: 68,
      swift: 83,
      kotlin: 78
    };
    return languageMap[language.toLowerCase()] || 63;
  }

  // Verify user can enter battle (check coins, etc.)
  async verifyBattleEntry(userId: string, entryFee: number): Promise<boolean> {
    try {
      const response = await apiRequest(`/battles/verify-entry?userId=${userId}&fee=${entryFee}`);
      return response.canEnter || false;
    } catch (error) {
      console.error('Battle entry verification error:', error);
      return false;
    }
  }
}

export const secureCodeExecutionService = new SecureCodeExecutionService();
export default secureCodeExecutionService;
