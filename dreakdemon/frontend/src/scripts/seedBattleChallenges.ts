/**
 * Seed Battle Challenges Script
 * Run this once to populate Firestore with 3050+ practice questions for battles
 * 
 * Usage:
 * 1. Import this in your app initialization
 * 2. Call seedBattleChallengesFromPractice() when app starts or manually trigger it
 */

import { seedBattleChallengesFromPractice } from '../service/challenges';

/**
 * Initialize battle challenges seeding
 * Call this once in your app (e.g., in App.tsx or main initialization)
 */
export const initializeBattleChallenges = async () => {
  console.log('🚀 Initializing battle challenges from practice questions...');
  try {
    await seedBattleChallengesFromPractice();
    console.log('✅ Battle challenges initialization complete!');
  } catch (error) {
    console.error('❌ Failed to initialize battle challenges:', error);
  }
};

export default initializeBattleChallenges;
