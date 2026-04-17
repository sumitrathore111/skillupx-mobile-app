/**
 * Backfill script: Auto-assign unique usernames to all existing users who don't have one.
 *
 * Run with: npx ts-node src/scripts/backfillUsernames.ts
 * Or via: npm run backfill-usernames
 *
 * Logic:
 * - Generate username from user's name (lowercase, underscores)
 * - If collision, append random 4-digit suffix
 * - Skip users who already have a username
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
dotenv.config();

import User, { generateUniqueUsername } from '../models/User';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nextstep';

async function backfillUsernames() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all users without a username
    const usersWithoutUsername = await User.find({
      $or: [
        { username: { $exists: false } },
        { username: null },
        { username: '' }
      ]
    });

    console.log(`Found ${usersWithoutUsername.length} users without usernames`);

    let updated = 0;
    let errors = 0;

    for (const user of usersWithoutUsername) {
      try {
        const username = await generateUniqueUsername(user.name || user.email?.split('@')[0] || 'user');
        user.username = username;
        await user.save();
        updated++;
        console.log(`  ✓ ${user.email} → @${username}`);
      } catch (err: any) {
        errors++;
        console.error(`  ✗ ${user.email}: ${err.message}`);
      }
    }

    console.log(`\nDone! Updated: ${updated}, Errors: ${errors}`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Backfill failed:', error);
    process.exit(1);
  }
}

backfillUsernames();
