// Battle Questions Service - Fetches random questions for battle mode
// Uses the same question database from GitHub but with battle-specific filtering

import {
  getRandomQuestions,
  getRandomQuestion,
  type Question,
} from './questionsService';

export interface BattleQuestion extends Question {
  timeLimit?: number; // seconds
  pointsPerCorrect?: number;
}

/**
 * Get random questions for a 1v1 battle
 */
export const getBattle1v1Question = async (
  difficulty?: 'easy' | 'medium' | 'hard',
  topic?: string
): Promise<BattleQuestion | null> => {
  const question = await getRandomQuestion(difficulty, topic);
  if (!question) return null;

  return {
    ...question,
    timeLimit: difficulty === 'hard' ? 45 : difficulty === 'medium' ? 35 : 25,
    pointsPerCorrect: difficulty === 'hard' ? 300 : difficulty === 'medium' ? 200 : 100,
  };
};

/**
 * Get random questions for tournament/group battles
 */
export const getBattleTournamentQuestions = async (
  count: number = 3,
  difficulty?: 'easy' | 'medium' | 'hard',
  topic?: string
): Promise<BattleQuestion[]> => {
  const questions = await getRandomQuestions(count, difficulty, topic);
  
  return questions.map((q, idx) => ({
    ...q,
    timeLimit: difficulty === 'hard' ? 45 : difficulty === 'medium' ? 35 : 25,
    pointsPerCorrect: (idx + 1) * (difficulty === 'hard' ? 300 : difficulty === 'medium' ? 200 : 100),
  }));
};

/**
 * Get mixed difficulty questions for survival mode
 */
export const getSurvivalModeQuestions = async (
  count: number = 5,
  topic?: string
): Promise<BattleQuestion[]> => {
  const difficulties: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard'];
  const questions: BattleQuestion[] = [];

  // Get questions from each difficulty level
  for (let i = 0; i < count; i++) {
    const difficulty = difficulties[i % difficulties.length];
    const question = await getRandomQuestion(difficulty, topic);
    if (question) {
      questions.push({
        ...question,
        timeLimit: difficulty === 'hard' ? 50 : difficulty === 'medium' ? 40 : 30,
        pointsPerCorrect: difficulty === 'hard' ? 500 : difficulty === 'medium' ? 300 : 150,
      });
    }
  }

  return questions;
};

/**
 * Get team battle questions with varied difficulties
 */
export const getTeamBattleQuestions = async (
  questionsPerTeam: number = 2,
  topic?: string
): Promise<{ team1: BattleQuestion[]; team2: BattleQuestion[] }> => {
  const [team1Questions, team2Questions] = await Promise.all([
    getBattleTournamentQuestions(questionsPerTeam, undefined, topic),
    getBattleTournamentQuestions(questionsPerTeam, undefined, topic),
  ]);

  return {
    team1: team1Questions,
    team2: team2Questions,
  };
};

/**
 * Calculate battle score based on performance
 */
export const calculateBattleScore = (
  question: BattleQuestion,
  isCorrect: boolean,
  timeTaken: number // in seconds
): number => {
  if (!isCorrect) return 0;

  const basePoints = question.pointsPerCorrect || 100;
  const timeLimit = question.timeLimit || 30;
  
  // Time bonus: more points for faster solutions
  const timeRatio = Math.max(0, (timeLimit - timeTaken) / timeLimit);
  const timeBonus = timeRatio * (basePoints * 0.5); // Up to 50% bonus for speed

  return Math.round(basePoints + timeBonus);
};

/**
 * Get questions for quick battle (30 seconds per question)
 */
export const getQuickBattleQuestions = async (
  count: number = 3,
  difficulty: 'easy' | 'medium' = 'easy'
): Promise<BattleQuestion[]> => {
  const questions = await getRandomQuestions(count, difficulty);
  
  return questions.map(q => ({
    ...q,
    timeLimit: 30, // 30 seconds for quick battle
    pointsPerCorrect: 150,
  }));
};

/**
 * Get ranked battle questions (based on user rating/skill)
 */
export const getRankedBattleQuestion = async (
  userRating: number,
  topic?: string
): Promise<BattleQuestion | null> => {
  // Determine difficulty based on user rating
  let difficulty: 'easy' | 'medium' | 'hard' = 'medium';
  
  if (userRating < 1200) difficulty = 'easy';
  else if (userRating > 2000) difficulty = 'hard';

  return getBattle1v1Question(difficulty, topic);
};

/**
 * Get leaderboard battle questions - fixed set for same experience
 */
export const getLeaderboardBattleQuestions = async (
  roundNumber: number
): Promise<BattleQuestion[]> => {
  // Use round number as seed for deterministic selection
  const difficulties: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard'];
  const difficulty = difficulties[roundNumber % 3];
  
  return getBattleTournamentQuestions(3, difficulty);
};
