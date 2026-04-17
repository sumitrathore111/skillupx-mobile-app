import axios from 'axios';
import { Response, Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import Battle from '../models/Battle';
import User from '../models/User';
import { BOT_PROFILES, calculateBotDelay, disguiseBotProfile, generateBotCode, getBotProgress, selectBotProfile } from '../services/botService';
import emailNotifications from '../services/emailService';
import { createNotification } from '../services/notificationHelper';

const router = Router();

// DEBUG: Test Judge0 API directly with a known problem
router.get('/debug-judge0', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Test with "Find Missing Number" problem - A003
    const testInput = "3\n3 0 1"; // Expected output: "2"
    const testCode = `
n = int(input())
nums = list(map(int, input().split()))
total = n * (n + 1) // 2
print(total - sum(nums))
`;

    console.log('=== DEBUG JUDGE0 TEST ===');
    console.log('Input:', JSON.stringify(testInput));
    console.log('Code:', testCode);

    const response = await axios.post(
      'https://ce.judge0.com/submissions?base64_encoded=false&wait=true',
      {
        source_code: testCode,
        language_id: 71, // Python 3
        stdin: testInput,
        cpu_time_limit: 5,
        memory_limit: 128000
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );

    console.log('Judge0 Response:', JSON.stringify(response.data, null, 2));

    const output = (response.data.stdout || '').trim();
    const stderr = response.data.stderr || '';
    const compileOutput = response.data.compile_output || '';

    res.json({
      success: true,
      input: testInput,
      expectedOutput: "2",
      actualOutput: output,
      passed: output === "2",
      judge0Response: response.data,
      status: response.data.status,
      stderr: stderr,
      compileOutput: compileOutput
    });
  } catch (error: any) {
    console.error('Debug Judge0 Error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});

// Get recent completed battles (for activity feed - no auth required)
router.get('/recent', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    const battles = await Battle.find({ status: 'completed' })
      .sort({ completedAt: -1, updatedAt: -1 })
      .limit(limit);

    const formattedBattles = battles.map(battle => {
      const winner = battle.participants.find((p: any) => p.status === 'completed');
      return {
        _id: battle._id,
        status: battle.status,
        winnerName: winner?.userName || 'A player',
        prize: battle.prize,
        completedAt: battle.completedAt || battle.updatedAt
      };
    });

    res.json(formattedBattles);
  } catch (error: any) {
    console.error('Error fetching recent battles:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get list of battles (with optional filters)
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, difficulty } = req.query;

    // Clean up stale waiting battles (older than 15 minutes)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    await Battle.deleteMany({
      status: 'waiting',
      createdAt: { $lt: fifteenMinutesAgo }
    });

    // Clean up stale active/countdown battles (older than 1 hour - abandoned battles)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    await Battle.updateMany(
      {
        status: { $in: ['active', 'countdown'] },
        createdAt: { $lt: oneHourAgo }
      },
      {
        $set: { status: 'cancelled' }
      }
    );

    // Build query
    const query: any = {};
    if (status) query.status = status;
    if (difficulty) query.difficulty = difficulty;

    // If filtering for waiting battles, only show fresh ones and exclude invite battles
    if (status === 'waiting') {
      query.createdAt = { $gte: fifteenMinutesAgo };
      query['invite.status'] = { $exists: false };
    }

    // For active/countdown, only show battles from last hour (not stale ones)
    if (status === 'active' || status === 'countdown') {
      query.createdAt = { $gte: oneHourAgo };
    }

    const battles = await Battle.find(query)
      .sort({ createdAt: -1 })
      .limit(50);

    // Transform to frontend expected format - filter out battles without proper creator names
    const formattedBattles = battles
      .filter(battle => {
        const creator = battle.participants[0];
        // Only include battles where creator has a proper name
        return creator?.userName && creator.userName.trim() !== '';
      })
      .map(battle => {
      const creator = battle.participants[0];
      return {
        id: battle._id,
        creatorId: creator?.userId || battle.createdBy,
        creatorName: creator?.userName,
        creatorProfilePic: creator?.userAvatar,
        creatorRating: creator?.rating || 1000,
        difficulty: battle.difficulty,
        entryFee: battle.entryFee,
        prize: battle.prize,
        timeLimit: battle.timeLimit,
        status: battle.status,
        // Include all participants for live battles display
        participants: battle.participants.map((p: any) => ({
          odId: p.userId,
          odName: p.userName,
          odProfilePic: p.userAvatar,
          userId: p.userId,
          userName: p.userName,
          userAvatar: p.userAvatar,
          rating: p.rating || 1000,
          hasSubmitted: p.hasSubmitted || false
        })),
        challenge: battle.challenge ? {
          id: battle.challenge.id,
          title: battle.challenge.title,
          difficulty: battle.challenge.difficulty,
          category: battle.challenge.category
        } : null,
        createdAt: battle.createdAt
      };
    });

    res.json({ battles: formattedBattles });
  } catch (error: any) {
    console.error('Error fetching battles:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search users by username for battle invite
router.get('/search-users', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { q } = req.query;
    const currentUserId = req.user!.id;

    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      res.json({ users: [] });
      return;
    }

    const query = q.trim().toLowerCase();
    const users = await User.find({
      _id: { $ne: currentUserId },
      username: { $regex: query, $options: 'i' }
    })
      .select('username name profilePic avatar')
      .limit(10);

    res.json({
      users: users.map(u => ({
        id: u._id.toString(),
        username: (u as any).username || '',
        name: u.name || '',
        avatar: (u as any).profilePic || (u as any).avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u._id}`
      }))
    });
  } catch (error: any) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: error.message });
  }
});

// Invite a user to battle by username
router.post('/invite', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { targetUserId, difficulty, entryFee, userName, userAvatar, rating } = req.body;
    const userId = req.user!.id;

    if (!targetUserId) {
      res.status(400).json({ error: 'Target user is required' });
      return;
    }

    // Find the target user
    const targetUser = await User.findById(targetUserId).select('username name profilePic avatar');
    if (!targetUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Find the inviting user
    const invitingUser = await User.findById(userId).select('username name');
    if (!invitingUser) {
      res.status(404).json({ error: 'Your user record not found' });
      return;
    }

    // Check if user has enough coins
    const Wallet = require('../models/Wallet').default;
    const mongoose = require('mongoose');
    const wallet = await Wallet.findOne({ userId: new mongoose.Types.ObjectId(userId) });

    if (!wallet || wallet.coins < entryFee) {
      res.status(400).json({ error: 'Insufficient coins to create battle' });
      return;
    }

    // Cancel any existing waiting invite battles from this user
    await Battle.deleteMany({
      'invite.fromUserId': userId,
      'invite.status': 'pending',
      status: 'waiting'
    });

    // Deduct entry fee from creator
    await Wallet.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      {
        $inc: { coins: -entryFee },
        $push: {
          transactions: {
            type: 'debit',
            amount: entryFee,
            reason: `Battle invite to @${(targetUser as any).username} (${difficulty})`,
            createdAt: new Date()
          }
        }
      }
    );

    // Load questions
    const fs = await import('fs/promises');
    const path = await import('path');
    const possiblePaths = [
      path.join(__dirname, '../../../public/questions.json'),
      path.join(__dirname, '../../public/questions.json'),
      path.join(process.cwd(), 'public/questions.json'),
      path.join(process.cwd(), 'backend/public/questions.json')
    ];

    let questionsData: string | null = null;
    for (const questionsPath of possiblePaths) {
      try {
        questionsData = await fs.readFile(questionsPath, 'utf-8');
        break;
      } catch (pathErr) { /* try next */ }
    }

    if (!questionsData) {
      res.status(500).json({ error: 'Could not load questions database' });
      return;
    }

    const questionsJson = JSON.parse(questionsData);
    let questions: any[] = Array.isArray(questionsJson)
      ? questionsJson
      : questionsJson.problems || questionsJson.questions || [];

    const difficultyQuestions = questions.filter((q: any) =>
      q.difficulty && q.difficulty.toLowerCase() === difficulty.toLowerCase()
    );
    if (difficultyQuestions.length === 0) {
      res.status(400).json({ error: `No ${difficulty} questions available` });
      return;
    }

    const randomQuestion = difficultyQuestions[Math.floor(Math.random() * difficultyQuestions.length)];
    const prize = Math.floor(entryFee * 2 * 0.9);
    const timeLimit = difficulty === 'easy' ? 900 : difficulty === 'medium' ? 1200 : 1800;

    const challengeData = {
      id: randomQuestion.id,
      title: randomQuestion.title,
      difficulty: randomQuestion.difficulty,
      category: randomQuestion.category || randomQuestion.tags?.[0] || 'general',
      coinReward: randomQuestion.coins || randomQuestion.coinReward || 10,
      description: randomQuestion.description,
      testCases: randomQuestion.testCases || randomQuestion.test_cases || [],
      test_cases: randomQuestion.test_cases || randomQuestion.testCases || []
    };

    const battle = await Battle.create({
      status: 'waiting',
      difficulty,
      entryFee,
      prize,
      timeLimit,
      maxParticipants: 2,
      participants: [{
        userId,
        userName,
        userAvatar: userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
        rating: rating || 1000,
        hasSubmitted: false
      }],
      challenge: challengeData,
      createdBy: userId,
      version: 'v2.0-custom',
      invite: {
        fromUserId: userId,
        fromUsername: (invitingUser as any).username || '',
        fromName: invitingUser.name || userName,
        toUserId: targetUserId,
        toUsername: (targetUser as any).username || '',
        toName: targetUser.name || '',
        status: 'pending',
        createdAt: new Date()
      }
    });

    // Notify invited user instantly via socket
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${targetUserId}`).emit('battle-invite-received', {
        battleId: String(battle._id),
        fromUserId: userId,
        fromUsername: (invitingUser as any).username || '',
        fromName: invitingUser.name || userName,
        difficulty,
        entryFee,
        prize,
        createdAt: new Date().toISOString(),
        creatorAvatar: userAvatar || ''
      });

      await createNotification({
        userId: targetUserId,
        type: 'battle',
        title: 'Battle Invite Received',
        message: `${invitingUser.name || userName} invited you to a ${difficulty} battle`,
        data: { battleId: String(battle._id), fromUserId: userId },
      }, io);
    }

    // Send email notification to the invited user
    try {
      if (targetUser.email) {
        emailNotifications.notifyBattleWaiting(
          userName,
          difficulty,
          prize,
          [targetUser.email]
        );
      }
    } catch (emailError) {
      console.error('Failed to send invite email:', emailError);
    }

    res.status(201).json({ battleId: battle._id, battle });
  } catch (error: any) {
    console.error('Error creating invite battle:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get pending battle invites for the current user
router.get('/my-invites', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const invites = await Battle.find({
      'invite.toUserId': userId,
      'invite.status': 'pending',
      status: 'waiting'
    }).sort({ createdAt: -1 }).limit(20);

    res.json({
      invites: invites.map(b => ({
        battleId: b._id.toString(),
        fromUserId: b.invite!.fromUserId,
        fromUsername: b.invite!.fromUsername,
        fromName: b.invite!.fromName,
        difficulty: b.difficulty,
        entryFee: b.entryFee,
        prize: b.prize,
        createdAt: b.invite!.createdAt,
        creatorAvatar: b.participants[0]?.userAvatar || ''
      }))
    });
  } catch (error: any) {
    console.error('Error fetching invites:', error);
    res.status(500).json({ error: error.message });
  }
});

// Accept a battle invite
router.post('/:battleId/accept-invite', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userName, userAvatar, rating } = req.body;
    const userId = req.user!.id;
    const battle = await Battle.findById(req.params.battleId);

    if (!battle) {
      res.status(404).json({ error: 'Battle not found' });
      return;
    }

    if (!battle.invite || battle.invite.toUserId !== userId) {
      res.status(403).json({ error: 'This invite is not for you' });
      return;
    }

    if (battle.invite.status !== 'pending' || battle.status !== 'waiting') {
      res.status(400).json({ error: 'Invite is no longer available' });
      return;
    }

    // Check if user has enough coins
    const Wallet = require('../models/Wallet').default;
    const mongoose = require('mongoose');
    const wallet = await Wallet.findOne({ userId: new mongoose.Types.ObjectId(userId) });

    if (!wallet || wallet.coins < battle.entryFee) {
      res.status(400).json({ error: 'Insufficient coins to accept invite' });
      return;
    }

    // Deduct entry fee
    await Wallet.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      {
        $inc: { coins: -battle.entryFee },
        $push: {
          transactions: {
            type: 'debit',
            amount: battle.entryFee,
            reason: `Accepted battle invite (${battle.difficulty})`,
            createdAt: new Date()
          }
        }
      }
    );

    battle.participants.push({
      userId,
      userName: userName || 'User',
      userAvatar: userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
      rating: rating || 1000,
      hasSubmitted: false
    });

    battle.invite.status = 'accepted';
    battle.status = 'countdown';
    await battle.save();

    // Notify invite creator instantly via socket
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${battle.createdBy}`).emit('battle-matched', { battleId: battle._id });
      io.to(`user:${userId}`).emit('battle-matched', { battleId: battle._id });

      // Create notifications for both users
      await createNotification({
        userId: battle.createdBy,
        type: 'battle',
        title: 'Battle Matched!',
        message: `${userName} accepted your battle invite`,
        data: { battleId: String(battle._id) },
      }, io);

      await createNotification({
        userId: userId,
        type: 'battle',
        title: 'Battle Starting!',
        message: `Your battle is about to begin`,
        data: { battleId: String(battle._id) },
      }, io);
    }

    res.json({ battle });
  } catch (error: any) {
    console.error('Error accepting invite:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reject a battle invite
router.post('/:battleId/reject-invite', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const battle = await Battle.findById(req.params.battleId);

    if (!battle) {
      res.status(404).json({ error: 'Battle not found' });
      return;
    }

    if (!battle.invite || battle.invite.toUserId !== userId) {
      res.status(403).json({ error: 'This invite is not for you' });
      return;
    }

    if (battle.invite.status !== 'pending') {
      res.status(400).json({ error: 'Invite already handled' });
      return;
    }

    // Refund the creator
    const Wallet = require('../models/Wallet').default;
    const mongoose = require('mongoose');
    await Wallet.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(battle.createdBy) },
      {
        $inc: { coins: battle.entryFee },
        $push: {
          transactions: {
            type: 'credit',
            amount: battle.entryFee,
            reason: `Invite rejected by @${battle.invite.toUsername}`,
            createdAt: new Date()
          }
        }
      }
    );

    battle.invite.status = 'rejected';
    battle.status = 'rejected';
    await battle.save();

    // Notify invite creator that invite was rejected
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${battle.createdBy}`).emit('battle-invite-rejected', { battleId: String(battle._id) });
    }

    res.json({ message: 'Invite rejected', battle });
  } catch (error: any) {
    console.error('Error rejecting invite:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new battle
router.post('/create', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { difficulty, entryFee, userName, userAvatar, rating } = req.body;
    const userId = req.user!.id;

    // Check if user has enough coins
    const Wallet = require('../models/Wallet').default;
    const mongoose = require('mongoose');
    const wallet = await Wallet.findOne({ userId: new mongoose.Types.ObjectId(userId) });

    if (!wallet || wallet.coins < entryFee) {
      res.status(400).json({ error: 'Insufficient coins to create battle' });
      return;
    }

    // Cancel any existing waiting battles from this user (prevent duplicates)
    await Battle.deleteMany({
      'participants.userId': userId,
      status: 'waiting'
    });

    // Also clean up stale battles (older than 15 minutes and still waiting)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    await Battle.deleteMany({
      status: 'waiting',
      createdAt: { $lt: fifteenMinutesAgo }
    });

    // Deduct entry fee from creator
    await Wallet.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      {
        $inc: { coins: -entryFee },
        $push: {
          transactions: {
            type: 'debit',
            amount: entryFee,
            reason: `Battle entry fee (${difficulty})`,
            createdAt: new Date()
          }
        }
      }
    );
    console.log(`Entry fee of ${entryFee} coins deducted from player ${userId} (creating)`);

    // Get random question (you'll need to load questions.json)
    const fs = await import('fs/promises');
    const path = await import('path');

    // Try multiple possible paths
    const possiblePaths = [
      path.join(__dirname, '../../../public/questions.json'),
      path.join(__dirname, '../../public/questions.json'),
      path.join(process.cwd(), 'public/questions.json'),
      path.join(process.cwd(), 'backend/public/questions.json')
    ];

    let questionsData: string | null = null;
    for (const questionsPath of possiblePaths) {
      try {
        questionsData = await fs.readFile(questionsPath, 'utf-8');
        console.log('Loaded questions from:', questionsPath);
        break;
      } catch (pathErr) {
        // Try next path
      }
    }

    if (!questionsData) {
      res.status(500).json({ error: 'Could not load questions database' });
      return;
    }

    const questionsJson = JSON.parse(questionsData);

    // Handle both array format and object with problems/questions property
    let questions: any[] = [];
    if (Array.isArray(questionsJson)) {
      questions = questionsJson;
    } else if (questionsJson.problems) {
      questions = questionsJson.problems;
    } else if (questionsJson.questions) {
      questions = questionsJson.questions;
    }

    const difficultyQuestions = questions.filter((q: any) =>
      q.difficulty && q.difficulty.toLowerCase() === difficulty.toLowerCase()
    );
    if (difficultyQuestions.length === 0) {
      res.status(400).json({ error: `No ${difficulty} questions available` });
      return;
    }

    const randomQuestion = difficultyQuestions[Math.floor(Math.random() * difficultyQuestions.length)];

    console.log('Selected question:', randomQuestion.id, randomQuestion.title);
    console.log('Question testCases:', randomQuestion.testCases?.length || 0);
    console.log('Question test_cases:', randomQuestion.test_cases?.length || 0);

    const prize = Math.floor(entryFee * 2 * 0.9);
    const timeLimit = difficulty === 'easy' ? 900 : difficulty === 'medium' ? 1200 : 1800;

    // Ensure testCases are properly included in the challenge object
    const challengeData = {
      id: randomQuestion.id,
      title: randomQuestion.title,
      difficulty: randomQuestion.difficulty,
      category: randomQuestion.category || randomQuestion.tags?.[0] || 'general',
      coinReward: randomQuestion.coins || randomQuestion.coinReward || 10,
      description: randomQuestion.description,
      testCases: randomQuestion.testCases || randomQuestion.test_cases || [],
      test_cases: randomQuestion.test_cases || randomQuestion.testCases || []
    };

    console.log('Challenge testCases being saved:', challengeData.testCases.length);

    const battle = await Battle.create({
      status: 'waiting',
      difficulty,
      entryFee,
      prize,
      timeLimit,
      maxParticipants: 2,
      participants: [{
        userId,
        userName,
        userAvatar: userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
        rating: rating || 1000,
        hasSubmitted: false
      }],
      challenge: challengeData,
      createdBy: userId,
      version: 'v2.0-custom'
    });

    // Broadcast new waiting battle to lobby via socket
    const io = req.app.get('io');
    if (io) {
      const creator = battle.participants[0];
      io.to('battle-lobby').emit('battle-created', {
        id: battle._id,
        creatorId: creator?.userId || battle.createdBy,
        creatorName: creator?.userName,
        creatorProfilePic: creator?.userAvatar,
        creatorRating: creator?.rating || 1000,
        difficulty: battle.difficulty,
        entryFee: battle.entryFee,
        prize: battle.prize,
        timeLimit: battle.timeLimit,
        status: battle.status,
        createdAt: battle.createdAt
      });
    }

    // Send email notification to all other users that someone is waiting for a battle (async, don't wait)
    try {
      const users = await User.find({ _id: { $ne: userId } }).select('email');
      const userEmails = users.map(u => u.email).filter(Boolean);
      if (userEmails.length > 0) {
        emailNotifications.notifyBattleWaiting(userName, difficulty, prize, userEmails);
      }
    } catch (emailError) {
      console.error('Failed to send battle waiting email notifications:', emailError);
    }

    res.status(201).json({ battleId: battle._id, battle });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Find available battle
router.get('/find', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { difficulty, entryFee } = req.query;

    // Only find battles created within the last 15 minutes (not stale)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    const battle = await Battle.findOne({
      status: 'waiting',
      difficulty,
      entryFee: Number(entryFee),
      'participants.userId': { $ne: req.user!.id },
      'invite.status': { $exists: false }, // Exclude invite battles from random matchmaking
      createdAt: { $gte: fifteenMinutesAgo } // Only fresh battles
    }).sort({ createdAt: 1 }); // Oldest first (FIFO)

    res.json({ battle });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Join battle
router.post('/:battleId/join', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userName, userAvatar, rating } = req.body;
    const userId = req.user!.id;

    const battle = await Battle.findById(req.params.battleId);
    if (!battle) {
      res.status(404).json({ error: 'Battle not found' });
      return;
    }

    if (battle.status !== 'waiting') {
      res.status(400).json({ error: 'Battle is not available' });
      return;
    }

    if (battle.participants.length >= battle.maxParticipants) {
      res.status(400).json({ error: 'Battle is full' });
      return;
    }

    // Block non-invited users from joining invite-only battles
    if (battle.invite && battle.invite.toUserId && battle.invite.toUserId !== userId) {
      res.status(403).json({ error: 'This battle is invite-only' });
      return;
    }

    // Check if user has enough coins and deduct entry fee
    const Wallet = require('../models/Wallet').default;
    const mongoose = require('mongoose');
    const wallet = await Wallet.findOne({ userId: new mongoose.Types.ObjectId(userId) });

    if (!wallet || wallet.coins < battle.entryFee) {
      res.status(400).json({ error: 'Insufficient coins to join battle' });
      return;
    }

    // Deduct entry fee from joining player
    await Wallet.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      {
        $inc: { coins: -battle.entryFee },
        $push: {
          transactions: {
            type: 'debit',
            amount: battle.entryFee,
            reason: `Battle entry fee (${battle.difficulty})`,
            createdAt: new Date()
          }
        }
      }
    );
    console.log(`Entry fee of ${battle.entryFee} coins deducted from player ${userId} (joining)`);

    battle.participants.push({
      userId,
      userName,
      userAvatar: userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
      rating: rating || 1000,
      hasSubmitted: false
    });

    // Set to countdown first, then frontend will trigger start after countdown
    battle.status = 'countdown';
    await battle.save();

    // Notify both players instantly via socket
    const io = req.app.get('io');
    if (io) {
      // Tell the creator their battle was matched
      io.to(`user:${battle.createdBy}`).emit('battle-matched', { battleId: battle._id });
      // Tell the joiner as well (redundant since they get the response, but keeps it symmetric)
      io.to(`user:${userId}`).emit('battle-matched', { battleId: battle._id });
      // Remove from lobby
      io.to('battle-lobby').emit('battle-removed', { battleId: String(battle._id) });
    }

    res.json({ battle });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Start battle (after countdown)
router.post('/:battleId/start', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const battle = await Battle.findById(req.params.battleId);
    if (!battle) {
      res.status(404).json({ error: 'Battle not found' });
      return;
    }

    // Only start if currently in countdown status
    if (battle.status === 'countdown') {
      battle.status = 'active';
      battle.startedAt = new Date();
      await battle.save();
    }

    res.json({ battle, success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get rematch requests for a user - MUST be before /:battleId route
router.get('/rematch-requests', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.query;

    if (!userId) {
      res.json({ battles: [] });
      return;
    }

    // Find battles where a rematch was requested involving this user
    const battles = await Battle.find({
      'rematchRequest.to': userId,
      'rematchRequest.status': 'pending'
    });

    res.json({ battles: battles || [] });
  } catch (error: any) {
    console.error('Error fetching rematch requests:', error);
    res.json({ battles: [] });
  }
});

// Submit code
router.post('/:battleId/submit', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { code, language } = req.body;
    const userId = req.user!.id;

    const battle = await Battle.findById(req.params.battleId);
    if (!battle) {
      res.status(404).json({ error: 'Battle not found' });
      return;
    }

    const participant = battle.participants.find(p => p.userId === userId);
    if (!participant) {
      res.status(403).json({ error: 'Not a participant' });
      return;
    }

    // Check if already submitted
    if (participant.hasSubmitted) {
      res.status(400).json({ error: 'Already submitted', alreadySubmitted: true });
      return;
    }

    // Get test cases from either field (testCases is used in questions.json)
    const challengeData = battle.challenge as any;
    let testCases = challengeData.testCases || challengeData.test_cases || [];

    console.log('=== SUBMIT ENDPOINT DEBUG ===');
    console.log('Battle ID:', req.params.battleId);
    console.log('Challenge ID:', challengeData.id);
    console.log('Challenge Title:', challengeData.title);
    console.log('testCases array length:', challengeData.testCases?.length || 0);
    console.log('test_cases array length:', challengeData.test_cases?.length || 0);
    console.log('Final test cases count:', testCases.length);
    console.log('Test cases data:', JSON.stringify(testCases, null, 2));

    // If no test cases in battle, try to load from questions.json
    if (testCases.length === 0 && challengeData.id) {
      console.log('No test cases in battle, loading from questions.json...');
      try {
        const fs = await import('fs/promises');
        const path = await import('path');

        // Try multiple possible paths
        const possiblePaths = [
          path.join(__dirname, '../../../public/questions.json'),
          path.join(__dirname, '../../public/questions.json'),
          path.join(process.cwd(), 'public/questions.json'),
          path.join(process.cwd(), 'backend/public/questions.json')
        ];

        let questionsData: string | null = null;
        for (const questionsPath of possiblePaths) {
          try {
            console.log('Trying path:', questionsPath);
            questionsData = await fs.readFile(questionsPath, 'utf-8');
            console.log('Successfully loaded from:', questionsPath);
            break;
          } catch (pathErr) {
            // Try next path
          }
        }

        if (!questionsData) {
          console.error('Could not find questions.json in any expected location');
        } else {
          const questionsJson = JSON.parse(questionsData);

          let questions: any[] = [];
          if (Array.isArray(questionsJson)) {
            questions = questionsJson;
          } else if (questionsJson.problems) {
            questions = questionsJson.problems;
          } else if (questionsJson.questions) {
            questions = questionsJson.questions;
          }

          const foundQuestion = questions.find((q: any) => q.id === challengeData.id);
          if (foundQuestion) {
            testCases = foundQuestion.testCases || foundQuestion.test_cases || [];
            console.log('Loaded test cases from questions.json:', testCases.length);
          }
        }
      } catch (err) {
        console.error('Error loading questions.json for test cases:', err);
      }
    }

    if (testCases.length === 0) {
      res.status(400).json({ error: 'No test cases available', challenge: challengeData });
      return;
    }

    // Execute code against test cases
    const testResults = await executeCode(code, language, testCases);
    const score = calculateScore(testResults);

    // Calculate passed count and total time
    const passedCount = testResults.filter((r: any) => r.passed).length;
    const totalCount = testResults.length;
    const totalTime = testResults.reduce((sum: number, r: any) => {
      const timeValue = typeof r.time === 'number' ? r.time : parseFloat(r.time) || 0;
      return sum + (isNaN(timeValue) ? 0 : timeValue);
    }, 0);

    console.log(`[Battle] User ${userId}: ${passedCount}/${totalCount} passed, time: ${totalTime}ms`);

    participant.hasSubmitted = true;
    participant.code = code;
    participant.score = score;
    participant.submissionTime = new Date();
    participant.passedCount = passedCount;
    participant.totalCount = totalCount;
    participant.totalTime = Math.round(totalTime);

    // Mark participants as modified to ensure Mongoose saves subdocument changes
    battle.markModified('participants');

    // Check if battle is complete
    if (battle.participants.every(p => p.hasSubmitted)) {
      // If this is a bot battle, use the bot completion logic
      if ((battle as any).isBot) {
        const humanP = battle.participants.find(p => !p.userId.startsWith('bot_'));
        const botP = battle.participants.find(p => p.userId.startsWith('bot_'));
        if (humanP && botP) {
          await completeBotBattle(battle, humanP, botP);
        }
      } else {
      battle.status = 'completed';
      battle.completedAt = new Date();

      // Determine winner - higher score wins, tie goes to faster submission
      const winner = battle.participants.reduce((prev, current) => {
        const prevScore = prev.score || 0;
        const currentScore = current.score || 0;

        // Higher score wins
        if (currentScore > prevScore) return current;
        if (currentScore < prevScore) return prev;

        // Same score - faster submission wins
        const prevTime = prev.submissionTime ? new Date(prev.submissionTime).getTime() : Infinity;
        const currentTime = current.submissionTime ? new Date(current.submissionTime).getTime() : Infinity;
        return currentTime < prevTime ? current : prev;
      });

      // Check for true tie (same score, same time - very unlikely)
      const isTie = battle.participants.length === 2 &&
        battle.participants[0].score === battle.participants[1].score;

      battle.winner = winner.userId;
      (battle as any).winReason = isTie ? 'Faster submission' : 'Higher score';

      // Find the loser
      const loser = battle.participants.find(p => p.userId !== winner.userId);

      // Award prize to winner - only if not already awarded (prevent double awarding)
      if (!(battle as any).prizeAwarded) {
        try {
          const Wallet = require('../models/Wallet').default;
          const mongoose = require('mongoose');
          await Wallet.findOneAndUpdate(
            { userId: new mongoose.Types.ObjectId(winner.userId) },
            {
              $inc: { coins: battle.prize },
              $push: {
                transactions: {
                  type: 'credit',
                  amount: battle.prize,
                  reason: isTie ? 'Battle won (faster submission)!' : 'Battle won!',
                  createdAt: new Date()
                }
              }
            },
            { upsert: true }
          );
          (battle as any).prizeAwarded = true;
          console.log(`Prize of ${battle.prize} coins awarded to winner ${winner.userId}`);

          // Update ELO ratings for both players
          if (loser) {
            const winnerRating = winner.rating || 1000;
            const loserRating = loser.rating || 1000;
            const ratingResult = await updateBattleRatings(winner.userId, loser.userId, winnerRating, loserRating);

            // Store rating changes in battle for display
            (battle as any).ratingChanges = {
              winner: { oldRating: winnerRating, newRating: ratingResult.winnerNewRating },
              loser: { oldRating: loserRating, newRating: ratingResult.loserNewRating }
            };

            // Send email notifications to both players about battle result (async, don't wait)
            try {
              // Notify winner
              const winnerUser = await User.findById(winner.userId).select('email');
              if (winnerUser?.email) {
                emailNotifications.notifyBattleResult(loser.userName || 'Opponent', 'won', battle.prize, winnerUser.email);
              }

              // Notify loser
              const loserUser = await User.findById(loser.userId).select('email');
              if (loserUser?.email) {
                emailNotifications.notifyBattleResult(winner.userName || 'Opponent', 'lost', 0, loserUser.email);
              }
            } catch (emailError) {
              console.error('Failed to send battle result email notifications:', emailError);
            }
          }
        } catch (walletError) {
          console.error('Error awarding prize:', walletError);
        }
      }
      } // end else (non-bot battle)
    }

    await battle.save();

    res.json({
      passed: passedCount === totalCount,
      passedCount,
      totalCount,
      totalTime,
      score,
      testResults
    });
  } catch (error: any) {
    console.error('Submit error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get battle by ID
router.get('/:battleId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { battleId } = req.params;

    // Validate battleId format before querying
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(battleId)) {
      console.log(`Invalid battle ID format: ${battleId}`);
      res.status(400).json({ error: 'Invalid battle ID format' });
      return;
    }

    const battle = await Battle.findById(battleId);
    if (!battle) {
      res.status(404).json({ error: 'Battle not found' });
      return;
    }

    // Transform participants to frontend expected format
    const transformedBattle = {
      id: battle._id,
      status: battle.status,
      difficulty: battle.difficulty,
      entryFee: battle.entryFee,
      prize: battle.prize,
      timeLimit: battle.timeLimit,
      challenge: battle.challenge,
      startTime: battle.startedAt, // Frontend expects startTime
      startedAt: battle.startedAt,
      createdAt: battle.createdAt,
      winnerId: battle.winner,
      winner: battle.winner,
      forfeitedBy: (battle as any).forfeitedBy,
      rematchRequest: battle.rematchRequest, // Include rematch info for polling
      participants: battle.participants.map((p: any) => ({
        odId: p.userId,
        odName: p.userName,
        odProfilePic: p.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.userId}`,
        rating: p.rating || 1000,
        hasSubmitted: p.hasSubmitted || false,
        score: p.score || 0,
        // Build submissionResult from stored participant fields
        submissionResult: p.hasSubmitted ? {
          passedCount: p.passedCount || 0,
          totalCount: p.totalCount || 0,
          totalTime: p.totalTime || 0,
          passed: (p.passedCount || 0) === (p.totalCount || 0) && (p.totalCount || 0) > 0
        } : null
      }))
    };

    res.json(transformedBattle);
  } catch (error: any) {
    console.error(`Error fetching battle ${req.params.battleId}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Cancel/Delete a waiting battle (for when user leaves)
router.delete('/:battleId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const battle = await Battle.findById(req.params.battleId);
    if (!battle) {
      res.status(404).json({ error: 'Battle not found' });
      return;
    }

    // Only allow deletion if user is the creator and battle is still waiting
    if (battle.createdBy !== req.user!.id) {
      res.status(403).json({ error: 'Not authorized to delete this battle' });
      return;
    }

    if (battle.status !== 'waiting') {
      res.status(400).json({ error: 'Cannot delete battle that has already started' });
      return;
    }

    // Refund entry fee to creator when cancelling
    try {
      const Wallet = require('../models/Wallet').default;
      const mongoose = require('mongoose');
      await Wallet.findOneAndUpdate(
        { userId: new mongoose.Types.ObjectId(req.user!.id) },
        {
          $inc: { coins: battle.entryFee },
          $push: {
            transactions: {
              type: 'credit',
              amount: battle.entryFee,
              reason: 'Battle cancelled - refund',
              createdAt: new Date()
            }
          }
        }
      );
      console.log(`Refunded ${battle.entryFee} coins to ${req.user!.id} for cancelled battle`);
    } catch (walletError) {
      console.error('Error refunding entry fee:', walletError);
    }

    await Battle.findByIdAndDelete(req.params.battleId);

    // Remove from lobby via socket
    const io = req.app.get('io');
    if (io) {
      io.to('battle-lobby').emit('battle-removed', { battleId: req.params.battleId });
    }

    res.json({ success: true, message: 'Battle cancelled' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel battle via beacon (for page unload) - accepts POST with token in body
router.post('/:battleId/cancel', async (req, res): Promise<void> => {
  try {
    const { token } = req.body;
    if (!token) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    // Verify token manually
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key');
    const userId = decoded.id;

    const battle = await Battle.findById(req.params.battleId);
    if (!battle || battle.createdBy !== userId || battle.status !== 'waiting') {
      res.status(400).json({ error: 'Cannot cancel' });
      return;
    }

    // Refund entry fee to creator when cancelling via beacon
    try {
      const Wallet = require('../models/Wallet').default;
      const mongoose = require('mongoose');
      await Wallet.findOneAndUpdate(
        { userId: new mongoose.Types.ObjectId(userId) },
        {
          $inc: { coins: battle.entryFee },
          $push: {
            transactions: {
              type: 'credit',
              amount: battle.entryFee,
              reason: 'Battle cancelled - refund',
              createdAt: new Date()
            }
          }
        }
      );
      console.log(`Refunded ${battle.entryFee} coins to ${userId} for cancelled battle (beacon)`);
    } catch (walletError) {
      console.error('Error refunding entry fee:', walletError);
    }

    await Battle.findByIdAndDelete(req.params.battleId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Forfeit a battle - user leaves during active battle
router.post('/:battleId/forfeit', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const battle = await Battle.findById(req.params.battleId);
    if (!battle) {
      res.status(404).json({ error: 'Battle not found' });
      return;
    }

    if (battle.status !== 'active' && battle.status !== 'countdown') {
      res.status(400).json({ error: 'Battle is not active' });
      return;
    }

    const userId = req.user!.id;

    // Find the opponent (winner)
    const opponent = battle.participants.find((p: any) => p.userId !== userId);
    if (!opponent) {
      res.status(400).json({ error: 'No opponent found' });
      return;
    }

    // Check if this is a bot battle
    const isBotBattle = (battle as any).isBot || opponent.userId.startsWith('bot_');

    // Update battle status
    battle.status = 'forfeited';
    battle.winner = opponent.userId;
    battle.forfeitedBy = userId;
    battle.completedAt = new Date();

    if (isBotBattle) {
      // Bot battle: user forfeits, no refund, no prize to bot
      (battle as any).winReason = 'You left the bot battle';
      (battle as any).prizeAwarded = true;
      console.log(`User ${userId} forfeited bot battle ${battle._id} - no refund`);
    } else {
      // Real battle: award prize to opponent
      (battle as any).winReason = 'Opponent left the battle or switched tabs';
      if (!(battle as any).prizeAwarded) {
        const Wallet = require('../models/Wallet').default;
        await Wallet.findOneAndUpdate(
          { userId: opponent.userId },
          {
            $inc: { coins: battle.prize || 0 },
            $push: {
              transactions: {
                amount: battle.prize || 0,
                type: 'credit',
                reason: 'Battle win (opponent forfeited)',
                createdAt: new Date()
              }
            }
          },
          { upsert: true }
        );
        (battle as any).prizeAwarded = true;
        console.log(`Prize of ${battle.prize} coins awarded to winner ${opponent.userId} (forfeit)`);
      }
    }

    await battle.save();

    res.json({
      success: true,
      message: 'Battle forfeited',
      winner: opponent.userId
    });
  } catch (error: any) {
    console.error('Error forfeiting battle:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user battles
router.get('/user/my-battles', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const battles = await Battle.find({
      'participants.userId': req.user!.id
    }).sort({ createdAt: -1 });

    // Transform battles for frontend
    const transformedBattles = battles.map(battle => ({
      id: battle._id,
      status: battle.status,
      difficulty: battle.difficulty,
      entryFee: battle.entryFee,
      prize: battle.prize,
      timeLimit: battle.timeLimit,
      challenge: battle.challenge,
      startTime: battle.startedAt,
      startedAt: battle.startedAt,
      createdAt: battle.createdAt,
      completedAt: battle.completedAt,
      winnerId: battle.winner,
      winner: battle.winner,
      forfeitedBy: (battle as any).forfeitedBy,
      participants: battle.participants.map((p: any) => ({
        odId: p.userId,
        odName: p.userName,
        odProfilePic: p.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.userId}`,
        rating: p.rating || 1000,
        hasSubmitted: p.hasSubmitted || false,
        score: p.score || 0
      }))
    }));

    res.json({ battles: transformedBattles });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get battles for a specific user
router.get('/user/:userId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!userId || userId === 'undefined') {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }

    const battles = await Battle.find({
      'participants.userId': userId
    }).sort({ createdAt: -1 });

    // Transform battles for frontend
    const transformedBattles = battles.map(battle => ({
      id: battle._id,
      status: battle.status,
      difficulty: battle.difficulty,
      entryFee: battle.entryFee,
      prize: battle.prize,
      timeLimit: battle.timeLimit,
      challenge: battle.challenge,
      startTime: battle.startedAt,
      startedAt: battle.startedAt,
      createdAt: battle.createdAt,
      completedAt: battle.completedAt,
      winnerId: battle.winner,
      winner: battle.winner,
      forfeitedBy: (battle as any).forfeitedBy,
      participants: battle.participants.map((p: any) => ({
        odId: p.userId,
        odName: p.userName,
        odProfilePic: p.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.userId}`,
        rating: p.rating || 1000,
        hasSubmitted: p.hasSubmitted || false,
        score: p.score || 0
      }))
    }));

    res.json({ battles: transformedBattles });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Judge0 API - Free code execution service
const JUDGE0_API_URL = 'https://ce.judge0.com/submissions';

// Language ID mappings for Judge0 API
const JUDGE0_LANG_MAP: Record<string, number> = {
  'python': 71,      // Python 3.8.1
  'python3': 71,
  'javascript': 63,  // Node.js 12.14.0
  'java': 62,        // Java OpenJDK 13.0.1
  'cpp': 54,         // C++ GCC 9.2.0
  'c++': 54,
  'c': 50,           // C GCC 9.2.0
};

/**
 * Normalize expected output from test case - handles all possible field names
 */
function normalizeExpectedOutput(testCase: any): string {
  // questions.json uses "output" field with real newlines (char code 10)
  const raw = testCase.expectedOutput || testCase.expected_output || testCase.expected || testCase.output || '';
  // Convert escaped newlines to actual newlines (same as practice mode)
  return String(raw).replace(/\\n/g, '\n').trim();
}

/**
 * Normalize output for comparison - handles whitespace variations consistently
 * This is critical for comparing Judge0 output with expected output
 */
function normalizeOutputForComparison(output: string): string {
  if (!output) return '';

  return output
    // Normalize line endings
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Split into lines
    .split('\n')
    // Trim each line and collapse multiple spaces
    .map(line => line.trim().replace(/\s+/g, ' '))
    // Remove empty lines
    .filter(line => line.length > 0)
    // Join back
    .join('\n')
    .trim();
}

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to execute code with retry logic for Judge0
async function executeJudge0WithRetry(
  code: string,
  languageId: number,
  stdin: string,
  maxRetries: number = 3
): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.post(
        `${JUDGE0_API_URL}?base64_encoded=false&wait=true`,
        {
          source_code: code,
          language_id: languageId,
          stdin: stdin,
          cpu_time_limit: 5,
          memory_limit: 128000
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000 // Judge0 needs more time since it waits for result
        }
      );
      return response;
    } catch (error: any) {
      const status = error.response?.status;
      console.log(`[Judge0] Attempt ${attempt}/${maxRetries} failed. Status: ${status}`);

      // If rate limited (429) or server error (5xx), retry with backoff
      if ((status === 429 || status >= 500) && attempt < maxRetries) {
        const backoffTime = Math.pow(2, attempt) * 500; // 1s, 2s, 4s
        console.log(`[Judge0] Rate limited or server error. Waiting ${backoffTime}ms before retry...`);
        await delay(backoffTime);
        continue;
      }
      throw error;
    }
  }
}

// Helper function to execute code using Judge0 API
async function executeCode(code: string, language: string, testCases: any[]): Promise<any[]> {
  const results: any[] = [];
  const languageId = JUDGE0_LANG_MAP[language.toLowerCase()] || 71; // Default to Python

  console.log('=== BATTLE JUDGE0 EXECUTION START ===');
  console.log(`Language: ${language} -> Language ID: ${languageId}`);
  console.log(`Test cases count: ${testCases.length}`);
  console.log('Code length:', code.length);
  console.log('Code preview:', code.substring(0, 200));

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n--- Battle Test Case ${i + 1}/${testCases.length} ---`);
    console.log('Raw test case:', JSON.stringify(testCase));

    try {
      // Convert escaped newlines to actual newlines (same as practice mode)
      const stdin = (testCase.input || '').replace(/\\n/g, '\n');
      // Use normalized expected output
      const expectedRaw = normalizeExpectedOutput(testCase);

      console.log('Input (stdin):', JSON.stringify(stdin));
      console.log('Expected output:', JSON.stringify(expectedRaw));

      // Add small delay between test cases to avoid rate limiting (except first one)
      if (i > 0) {
        console.log('[Judge0] Waiting 500ms before next test case...');
        await delay(500);
      }

      // Measure execution time ourselves
      const startTime = Date.now();

      // Use Judge0 API for code execution with retry logic
      const response = await executeJudge0WithRetry(code, languageId, stdin);

      const executionTime = Date.now() - startTime;

      const result = response.data;

      console.log('[Battle] Judge0 result:', JSON.stringify(result));
      console.log('[Battle] Execution time:', executionTime, 'ms');

      // Judge0 status codes: 3 = Accepted (ran successfully), others = error
      const statusId = result.status?.id;
      let output = (result.stdout || '').trim();
      const stderr = result.stderr || '';
      const compileOutput = result.compile_output || '';
      const expected = expectedRaw.trim();

      // Check for CRITICAL errors (compilation errors, runtime errors, etc.)
      // Status 3 = Accepted (ran without error), Status 4 = Wrong Answer, etc.
      const hasCriticalError = statusId !== 3 && statusId !== 4 && (compileOutput || stderr || !output);

      // Normalize output for comparison using helper function
      const normalizedOutput = normalizeOutputForComparison(output);
      const normalizedExpected = normalizeOutputForComparison(expected);

      // Check if passed: output matches expected (even if there's non-critical stderr)
      const passed = !hasCriticalError && normalizedOutput === normalizedExpected;

      console.log(`Test result: normalized_expected="${normalizedExpected}" normalized_got="${normalizedOutput}" passed=${passed}`);
      console.log(`Raw: expected="${expected}" got="${output}"`);
      console.log(`Status: ${result.status?.description} (ID: ${statusId})`);
      if (stderr) console.log(`Stderr: ${stderr}`);
      if (compileOutput) console.log(`Compile output: ${compileOutput}`);

      results.push({
        passed,
        input: testCase.input,
        expected,
        output: output || compileOutput || stderr || 'No output',
        time: result.time ? parseFloat(result.time) * 1000 : executionTime,
        error: hasCriticalError ? (compileOutput || stderr || result.status?.description) : undefined
      });
    } catch (error: any) {
      console.error(`[Battle] Test case ${i + 1} execution error:`, error.response?.data || error.message);
      results.push({
        passed: false,
        input: testCase.input,
        expected: testCase.expectedOutput || testCase.expected_output || testCase.expected || testCase.output || '',
        output: '',
        error: error.response?.data?.message || error.message || 'Execution error (rate limit or timeout)',
        time: 0
      });
    }
  }

  console.log(`=== BATTLE EXECUTION COMPLETE: ${results.filter(r => r.passed).length}/${results.length} passed ===`);
  return results;
}

function getFileExtension(language: string): string {
  const extensions: any = {
    python: 'py',
    javascript: 'js',
    java: 'java',
    cpp: 'cpp',
    c: 'c'
  };
  return extensions[language.toLowerCase()] || 'txt';
}

function calculateScore(results: any[]): number {
  if (!results || results.length === 0) return 0;
  const passed = results.filter(r => r.passed).length;
  const score = Math.round((passed / results.length) * 100);
  return isNaN(score) ? 0 : score;
}

/**
 * Calculate ELO rating change
 * K-factor determines how much ratings change (higher = more volatile)
 * Standard chess uses K=32 for beginners, K=16 for established players
 */
function calculateEloChange(winnerRating: number, loserRating: number, kFactor: number = 32): { winnerGain: number; loserLoss: number } {
  // Expected score for winner (probability of winning based on ratings)
  const expectedWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
  const expectedLoser = 1 - expectedWinner;

  // Actual result: winner = 1, loser = 0
  const winnerGain = Math.round(kFactor * (1 - expectedWinner));
  const loserLoss = Math.round(kFactor * (0 - expectedLoser));

  return { winnerGain, loserLoss: Math.abs(loserLoss) };
}

/**
 * Update user ratings after battle completion
 */
async function updateBattleRatings(winnerId: string, loserId: string, winnerOldRating: number, loserOldRating: number): Promise<{ winnerNewRating: number; loserNewRating: number }> {
  const User = require('../models/User').default;
  const mongoose = require('mongoose');

  const { winnerGain, loserLoss } = calculateEloChange(winnerOldRating, loserOldRating);

  const winnerNewRating = winnerOldRating + winnerGain;
  const loserNewRating = Math.max(100, loserOldRating - loserLoss); // Minimum rating of 100

  console.log(`ELO Update: Winner ${winnerId} ${winnerOldRating} -> ${winnerNewRating} (+${winnerGain})`);
  console.log(`ELO Update: Loser ${loserId} ${loserOldRating} -> ${loserNewRating} (-${loserLoss})`);

  try {
    // Update winner's rating (skip if bot)
    if (!winnerId.startsWith('bot_')) {
      await User.findByIdAndUpdate(
        new mongoose.Types.ObjectId(winnerId),
        {
          $set: { battleRating: winnerNewRating },
          $inc: { battlesWon: 1 }
        }
      );
    }

    // Update loser's rating (skip if bot)
    if (!loserId.startsWith('bot_')) {
      await User.findByIdAndUpdate(
        new mongoose.Types.ObjectId(loserId),
        {
          $set: { battleRating: loserNewRating },
          $inc: { battlesLost: 1 }
        }
      );
    }

    return { winnerNewRating, loserNewRating };
  } catch (error) {
    console.error('Error updating battle ratings:', error);
    return { winnerNewRating: winnerOldRating, loserNewRating: loserOldRating };
  }
}

// Request rematch - creates a new battle with rematch request
router.post('/:battleId/rematch', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { battleId } = req.params;
    const { to, toName, fromName, difficulty, entryFee, userName, userAvatar, rating } = req.body;
    const from = req.user!.id;

    const originalBattle = await Battle.findById(battleId);
    if (!originalBattle) {
      res.status(404).json({ error: 'Battle not found' });
      return;
    }

    // Check if requester has enough coins
    const Wallet = require('../models/Wallet').default;
    const wallet = await Wallet.findOne({ userId: from });
    const actualEntryFee = entryFee || originalBattle.entryFee;

    if (!wallet || wallet.coins < actualEntryFee) {
      res.status(400).json({ error: 'Insufficient coins for rematch' });
      return;
    }

    // Get a new random question for the rematch
    const fs = await import('fs/promises');
    const path = await import('path');

    // Try multiple possible paths
    const possiblePaths = [
      path.join(__dirname, '../../../public/questions.json'),
      path.join(__dirname, '../../public/questions.json'),
      path.join(process.cwd(), 'public/questions.json'),
      path.join(process.cwd(), 'backend/public/questions.json')
    ];

    let questionsData: string | null = null;
    for (const questionsPath of possiblePaths) {
      try {
        questionsData = await fs.readFile(questionsPath, 'utf-8');
        break;
      } catch (pathErr) {
        // Try next path
      }
    }

    if (!questionsData) {
      res.status(500).json({ error: 'Could not load questions database' });
      return;
    }

    const questionsJson = JSON.parse(questionsData);

    let questions: any[] = [];
    if (Array.isArray(questionsJson)) {
      questions = questionsJson;
    } else if (questionsJson.problems) {
      questions = questionsJson.problems;
    } else if (questionsJson.questions) {
      questions = questionsJson.questions;
    }

    const actualDifficulty = difficulty || originalBattle.difficulty;
    const difficultyQuestions = questions.filter((q: any) =>
      q.difficulty && q.difficulty.toLowerCase() === actualDifficulty.toLowerCase()
    );

    if (difficultyQuestions.length === 0) {
      res.status(400).json({ error: `No ${actualDifficulty} questions available` });
      return;
    }

    const randomQuestion = difficultyQuestions[Math.floor(Math.random() * difficultyQuestions.length)];
    const prize = Math.floor(actualEntryFee * 2 * 0.9);
    const timeLimit = actualDifficulty === 'easy' ? 900 : actualDifficulty === 'medium' ? 1200 : 1800;

    // Deduct entry fee from requester NOW (consistent with regular battle creation)
    await Wallet.findOneAndUpdate(
      { userId: from },
      {
        $inc: { coins: -actualEntryFee },
        $push: {
          transactions: {
            type: 'debit',
            amount: actualEntryFee,
            reason: `Battle entry fee (Rematch request)`,
            createdAt: new Date()
          }
        }
      }
    );
    console.log(`Entry fee of ${actualEntryFee} coins deducted from player ${from} (rematch request)`);

    // Create new battle with rematch request
    const rematchBattle = await Battle.create({
      status: 'waiting',
      difficulty: actualDifficulty,
      entryFee: actualEntryFee,
      prize,
      timeLimit,
      maxParticipants: 2,
      participants: [{
        userId: from,
        userName: userName || fromName || 'Player',
        userAvatar: userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${from}`,
        rating: rating || 1000,
        hasSubmitted: false
      }],
      challenge: {
        id: randomQuestion.id,
        title: randomQuestion.title,
        difficulty: randomQuestion.difficulty,
        category: randomQuestion.category || randomQuestion.tags?.[0] || 'general',
        coinReward: randomQuestion.coins || randomQuestion.coinReward || 10,
        description: randomQuestion.description,
        testCases: randomQuestion.testCases || randomQuestion.test_cases || [],
        test_cases: randomQuestion.test_cases || randomQuestion.testCases || []
      },
      rematchRequest: {
        from,
        fromName: userName || fromName || 'Player',
        to,
        toName: toName || 'Opponent',
        status: 'pending',
        createdAt: new Date()
      },
      createdBy: from,
      version: 'v2.0-rematch'
    });

    // Emit socket event to notify opponent instantly
    try {
      const io = req.app.get('io');
      if (io && to) {
        io.to(`user:${to}`).emit('rematch-requested', {
          battleId: rematchBattle._id,
          from,
          fromName: userName || fromName || 'Player',
          to,
          toName: toName || 'Opponent',
          message: 'Rematch requested',
          createdAt: rematchBattle.rematchRequest?.createdAt || new Date()
        });
        console.log(`[Socket] Rematch notification sent to user:${to}`);

        await createNotification({
          userId: to,
          type: 'battle',
          title: 'Rematch Request',
          message: `${userName || fromName || 'Player'} wants a rematch!`,
          data: { battleId: String(rematchBattle._id), from },
        }, io);
      }
    } catch (err) {
      console.error('Socket rematch notification error:', err);
    }

    res.json({
      message: 'Rematch requested',
      battleId: rematchBattle._id,
      battle: rematchBattle
    });
  } catch (error: any) {
    console.error('Error creating rematch:', error);
    res.status(500).json({ error: error.message });
  }
});

// Accept rematch request
router.post('/:battleId/accept-rematch', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { battleId } = req.params;
    const { userId, userName, userProfilePic, rating } = req.body;

    const battle = await Battle.findById(battleId);
    if (!battle) {
      res.status(404).json({ error: 'Battle not found' });
      return;
    }

    if (battle.status !== 'waiting') {
      res.status(400).json({ error: 'Battle is no longer available' });
      return;
    }

    // Check if this user is the target of the rematch request
    const rematchRequest = battle.rematchRequest;
    if (!rematchRequest || rematchRequest.to !== userId) {
      res.status(403).json({ error: 'You are not the target of this rematch request' });
      return;
    }

    // Check if user has enough coins
    const Wallet = require('../models/Wallet').default;
    const wallet = await Wallet.findOne({ userId });

    if (!wallet || wallet.coins < battle.entryFee) {
      res.status(400).json({ error: 'Insufficient coins to accept rematch' });
      return;
    }

    // Deduct entry fee from both players
    await Wallet.findOneAndUpdate(
      { userId },
      {
        $inc: { coins: -battle.entryFee },
        $push: {
          transactions: {
            type: 'debit',
            amount: battle.entryFee,
            reason: `Battle entry fee (Rematch)`,
            createdAt: new Date()
          }
        }
      }
    );

    await Wallet.findOneAndUpdate(
      { userId: rematchRequest.from },
      {
        $inc: { coins: -battle.entryFee },
        $push: {
          transactions: {
            type: 'debit',
            amount: battle.entryFee,
            reason: `Battle entry fee (Rematch)`,
            createdAt: new Date()
          }
        }
      }
    );

    // Add second participant and update status
    battle.participants.push({
      userId,
      userName: userName || 'Player',
      userAvatar: userProfilePic || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
      rating: rating || 1000,
      hasSubmitted: false
    });

    battle.rematchRequest!.status = 'accepted';
    battle.status = 'countdown';
    await battle.save();

    res.json({
      success: true,
      message: 'Rematch accepted',
      battle
    });
  } catch (error: any) {
    console.error('Error accepting rematch:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user battle stats (optimized for fast loading)
router.get('/user-stats/:userId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    // Use aggregation pipeline for fast stats calculation
    const stats = await Battle.aggregate([
      // Match battles where user is a participant
      { $match: { 'participants.userId': userId } },
      // Group and calculate stats
      {
        $group: {
          _id: null,
          totalBattles: { $sum: 1 },
          battlesWon: {
            $sum: { $cond: [{ $eq: ['$winner', userId] }, 1, 0] }
          },
          completedBattles: {
            $sum: { $cond: [{ $in: ['$status', ['completed', 'forfeited']] }, 1, 0] }
          }
        }
      }
    ]);

    const result = stats[0] || { totalBattles: 0, battlesWon: 0, completedBattles: 0 };

    // Calculate win streak from recent battles
    const recentBattles = await Battle.find({
      'participants.userId': userId,
      status: { $in: ['completed', 'forfeited'] }
    })
    .sort({ createdAt: -1 })
    .limit(20)
    .select('winner createdAt');

    let currentStreak = 0;
    for (const battle of recentBattles) {
      if (battle.winner === userId) {
        currentStreak++;
      } else if (battle.winner) {
        break;
      }
    }

    res.json({
      battlesWon: result.battlesWon,
      totalBattles: result.totalBattles,
      completedBattles: result.completedBattles,
      currentStreak
    });
  } catch (error: any) {
    console.error('Error fetching user battle stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reject rematch request
router.post('/:battleId/reject-rematch', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { battleId } = req.params;
    const { rejectedBy } = req.body;

    const battle = await Battle.findById(battleId);
    if (!battle) {
      res.status(404).json({ error: 'Battle not found' });
      return;
    }

    if (battle.rematchRequest) {
      battle.rematchRequest.status = 'rejected';
    }
    battle.status = 'rejected';
    await battle.save();

    res.json({
      success: true,
      message: 'Rematch rejected',
      rejectedBy
    });
  } catch (error: any) {
    console.error('Error rejecting rematch:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// BOT BATTLE ROUTES
// =====================================================

// Create a battle with a bot opponent
router.post('/create-bot-battle', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { difficulty, entryFee, userName, userAvatar, rating } = req.body;
    const userId = req.user!.id;

    // Check if user has enough coins
    const Wallet = require('../models/Wallet').default;
    const mongoose = require('mongoose');
    const wallet = await Wallet.findOne({ userId: new mongoose.Types.ObjectId(userId) });

    if (!wallet || wallet.coins < entryFee) {
      res.status(400).json({ error: 'Insufficient coins to create battle' });
      return;
    }

    // Cancel any existing waiting battles from this user
    await Battle.deleteMany({
      'participants.userId': userId,
      status: 'waiting'
    });

    // Deduct entry fee from creator
    await Wallet.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      {
        $inc: { coins: -entryFee },
        $push: {
          transactions: {
            type: 'debit',
            amount: entryFee,
            reason: `Battle entry fee (${difficulty})`,
            createdAt: new Date()
          }
        }
      }
    );
    console.log(`[Bot Battle] Entry fee of ${entryFee} coins deducted from player ${userId}`);

    // Get random question
    const fs = await import('fs/promises');
    const path = await import('path');

    const possiblePaths = [
      path.join(__dirname, '../../../public/questions.json'),
      path.join(__dirname, '../../public/questions.json'),
      path.join(process.cwd(), 'public/questions.json'),
      path.join(process.cwd(), 'backend/public/questions.json')
    ];

    let questionsData: string | null = null;
    for (const questionsPath of possiblePaths) {
      try {
        questionsData = await fs.readFile(questionsPath, 'utf-8');
        break;
      } catch (pathErr) { /* Try next */ }
    }

    if (!questionsData) {
      res.status(500).json({ error: 'Could not load questions database' });
      return;
    }

    const questionsJson = JSON.parse(questionsData);
    let questions: any[] = [];
    if (Array.isArray(questionsJson)) {
      questions = questionsJson;
    } else if (questionsJson.problems) {
      questions = questionsJson.problems;
    } else if (questionsJson.questions) {
      questions = questionsJson.questions;
    }

    const difficultyQuestions = questions.filter((q: any) =>
      q.difficulty && q.difficulty.toLowerCase() === difficulty.toLowerCase()
    );
    if (difficultyQuestions.length === 0) {
      res.status(400).json({ error: `No ${difficulty} questions available` });
      return;
    }

    const randomQuestion = difficultyQuestions[Math.floor(Math.random() * difficultyQuestions.length)];
    const prize = Math.floor(entryFee * 2 * 0.9);
    const timeLimit = difficulty === 'easy' ? 900 : difficulty === 'medium' ? 1200 : 1800;

    // Select a bot profile based on user's rating
    const botProfile = selectBotProfile(rating || 1000, difficulty);
    // Disguise the bot with a human-like name and avatar
    const disguised = disguiseBotProfile(botProfile);

    const challengeData = {
      id: randomQuestion.id,
      title: randomQuestion.title,
      difficulty: randomQuestion.difficulty,
      category: randomQuestion.category || randomQuestion.tags?.[0] || 'general',
      coinReward: randomQuestion.coins || randomQuestion.coinReward || 10,
      description: randomQuestion.description,
      testCases: randomQuestion.testCases || randomQuestion.test_cases || [],
      test_cases: randomQuestion.test_cases || randomQuestion.testCases || []
    };

    // Calculate when the bot will submit
    const botDelay = calculateBotDelay(botProfile, difficulty);
    const botSubmitAt = new Date(Date.now() + botDelay);

    console.log(`[Bot Battle] Bot disguised as "${disguised.displayName}" will submit in ${Math.round(botDelay / 1000)}s`);

    const battle = await Battle.create({
      status: 'countdown',
      difficulty,
      entryFee,
      prize,
      timeLimit,
      maxParticipants: 2,
      participants: [
        {
          userId,
          userName,
          userAvatar: userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
          rating: rating || 1000,
          hasSubmitted: false
        },
        {
          userId: botProfile.id,
          userName: disguised.displayName,
          userAvatar: disguised.displayAvatar,
          rating: disguised.rating,
          hasSubmitted: false
        }
      ],
      challenge: challengeData,
      createdBy: userId,
      isBot: true,
      botProfile: {
        id: botProfile.id,
        name: disguised.displayName,
        avatar: disguised.displayAvatar,
        rating: disguised.rating,
        skillLevel: botProfile.skillLevel,
      },
      botSubmitAt,
      botSubmitted: false,
      version: 'v2.0-bot'
    });

    // Schedule bot submission in background
    scheduleBotSubmission(battle._id.toString(), botProfile, challengeData, botDelay);

    res.status(201).json({
      battleId: battle._id,
      battle,
      botProfile: {
        name: disguised.displayName,
        avatar: disguised.displayAvatar,
        rating: disguised.rating,
        skillLevel: botProfile.skillLevel,
      }
    });
  } catch (error: any) {
    console.error('[Bot Battle] Error creating bot battle:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get bot progress (simulated typing/solving progress)
router.get('/:battleId/bot-progress', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const battle = await Battle.findById(req.params.battleId);
    if (!battle || !battle.isBot) {
      res.json({ progress: 0, isBot: false });
      return;
    }

    const botParticipant = battle.participants.find(p => p.userId.startsWith('bot_'));
    if (!botParticipant) {
      res.json({ progress: 0, isBot: true });
      return;
    }

    if (botParticipant.hasSubmitted) {
      res.json({ progress: 100, isBot: true, submitted: true });
      return;
    }

    // Calculate progress based on time elapsed since battle started
    const startTime = battle.startedAt || battle.createdAt;
    const botSubmitTime = (battle as any).botSubmitAt;

    if (!botSubmitTime) {
      res.json({ progress: 50, isBot: true });
      return;
    }

    const elapsed = Date.now() - new Date(startTime).getTime();
    const totalDelay = new Date(botSubmitTime).getTime() - new Date(startTime).getTime();
    const progress = getBotProgress(elapsed, totalDelay);

    res.json({
      progress,
      isBot: true,
      submitted: false,
      botName: (battle as any).botProfile?.name || 'Bot',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Background function to handle bot submission
async function scheduleBotSubmission(
  battleId: string,
  botProfile: typeof BOT_PROFILES[0],
  challengeData: any,
  delayMs: number
) {
  console.log(`[Bot] Scheduling submission for battle ${battleId} in ${Math.round(delayMs / 1000)}s`);

  setTimeout(async () => {
    try {
      const battle = await Battle.findById(battleId);
      if (!battle) {
        console.log(`[Bot] Battle ${battleId} not found, skipping`);
        return;
      }

      // Don't submit if battle is no longer active
      if (battle.status !== 'active' && battle.status !== 'countdown') {
        console.log(`[Bot] Battle ${battleId} status is ${battle.status}, skipping bot submission`);
        return;
      }

      // Don't submit if bot already submitted
      if ((battle as any).botSubmitted) {
        console.log(`[Bot] Bot already submitted for battle ${battleId}`);
        return;
      }

      const botParticipant = battle.participants.find(p => p.userId === botProfile.id);
      if (!botParticipant || botParticipant.hasSubmitted) {
        console.log(`[Bot] Bot participant not found or already submitted`);
        return;
      }

      // Generate the bot's code using HuggingFace
      const botCode = await generateBotCode(
        {
          title: challengeData.title,
          description: challengeData.description || '',
          difficulty: challengeData.difficulty,
          testCases: challengeData.testCases || challengeData.test_cases || [],
        },
        'python',
        botProfile
      );

      console.log(`[Bot] Generated code (${botCode.length} chars) for battle ${battleId}`);

      // Get test cases
      let testCases = challengeData.testCases || challengeData.test_cases || [];

      // If no test cases in challenge data, try to load from questions.json
      if (testCases.length === 0 && challengeData.id) {
        try {
          const fs = await import('fs/promises');
          const path = await import('path');
          const possiblePaths = [
            path.join(__dirname, '../../../public/questions.json'),
            path.join(__dirname, '../../public/questions.json'),
            path.join(process.cwd(), 'public/questions.json'),
            path.join(process.cwd(), 'backend/public/questions.json')
          ];

          for (const questionsPath of possiblePaths) {
            try {
              const data = await fs.readFile(questionsPath, 'utf-8');
              const json = JSON.parse(data);
              const questions = Array.isArray(json) ? json : json.problems || json.questions || [];
              const found = questions.find((q: any) => q.id === challengeData.id);
              if (found) {
                testCases = found.testCases || found.test_cases || [];
                break;
              }
            } catch { /* try next */ }
          }
        } catch (err) {
          console.error('[Bot] Error loading questions for test cases:', err);
        }
      }

      // Execute bot's code against test cases
      let botScore = 0;
      let botPassedCount = 0;
      let botTotalCount = testCases.length;
      let botTotalTime = 0;

      if (testCases.length > 0) {
        try {
          const testResults = await executeCode(botCode, 'python', testCases);
          botScore = calculateScore(testResults);
          botPassedCount = testResults.filter((r: any) => r.passed).length;
          botTotalTime = testResults.reduce((sum: number, r: any) => {
            const timeValue = typeof r.time === 'number' ? r.time : parseFloat(r.time) || 0;
            return sum + (isNaN(timeValue) ? 0 : timeValue);
          }, 0);
          console.log(`[Bot] Score: ${botScore}, Passed: ${botPassedCount}/${botTotalCount}`);
        } catch (execError) {
          console.error('[Bot] Code execution error:', execError);
          // If execution fails, decide based on solveChance
          const shouldSolve = Math.random() < botProfile.solveChance;
          botPassedCount = shouldSolve ? Math.ceil(botTotalCount * 0.8) : Math.floor(botTotalCount * 0.3);
          botScore = Math.round((botPassedCount / Math.max(botTotalCount, 1)) * 100);
          botTotalTime = Math.round(delayMs * 0.8);
        }
      } else {
        // No test cases - simulate a result
        const shouldSolve = Math.random() < botProfile.solveChance;
        botPassedCount = shouldSolve ? 5 : 2;
        botTotalCount = 5;
        botScore = Math.round((botPassedCount / botTotalCount) * 100);
        botTotalTime = Math.round(delayMs * 0.8);
      }

      // Update bot's submission in the battle
      botParticipant.hasSubmitted = true;
      botParticipant.code = botCode;
      botParticipant.score = botScore;
      botParticipant.submissionTime = new Date();
      botParticipant.passedCount = botPassedCount;
      botParticipant.totalCount = botTotalCount;
      botParticipant.totalTime = Math.round(botTotalTime);
      (battle as any).botSubmitted = true;

      battle.markModified('participants');

      // Check if both participants have submitted
      const humanParticipant = battle.participants.find(p => !p.userId.startsWith('bot_'));
      if (humanParticipant?.hasSubmitted) {
        // Both submitted - determine winner
        await completeBotBattle(battle, humanParticipant, botParticipant);
      }

      await battle.save();
      console.log(`[Bot] Submission saved for battle ${battleId}`);
    } catch (error) {
      console.error(`[Bot] Error in scheduled submission for battle ${battleId}:`, error);
    }
  }, delayMs);
}

// Complete a bot battle and determine winner
async function completeBotBattle(
  battle: any,
  humanParticipant: any,
  botParticipant: any
) {
  battle.status = 'completed';
  battle.completedAt = new Date();

  const humanScore = humanParticipant.score || 0;
  const botScore = botParticipant.score || 0;

  // Higher score wins, tie goes to faster submission
  let winner: any;
  let loser: any;

  if (humanScore > botScore) {
    winner = humanParticipant;
    loser = botParticipant;
  } else if (botScore > humanScore) {
    winner = botParticipant;
    loser = humanParticipant;
  } else {
    // Tie - faster submission wins
    const humanTime = humanParticipant.submissionTime ? new Date(humanParticipant.submissionTime).getTime() : Infinity;
    const botTime = botParticipant.submissionTime ? new Date(botParticipant.submissionTime).getTime() : Infinity;
    if (humanTime <= botTime) {
      winner = humanParticipant;
      loser = botParticipant;
    } else {
      winner = botParticipant;
      loser = humanParticipant;
    }
  }

  battle.winner = winner.userId;

  // Award prize only if human is the winner (bot doesn't need coins)
  if (winner.userId === humanParticipant.userId && !(battle as any).prizeAwarded) {
    try {
      const Wallet = require('../models/Wallet').default;
      const mongoose = require('mongoose');
      await Wallet.findOneAndUpdate(
        { userId: new mongoose.Types.ObjectId(winner.userId) },
        {
          $inc: { coins: battle.prize },
          $push: {
            transactions: {
              type: 'credit',
              amount: battle.prize,
              reason: 'Bot Battle won!',
              createdAt: new Date()
            }
          }
        },
        { upsert: true }
      );
      (battle as any).prizeAwarded = true;
      console.log(`[Bot Battle] Prize of ${battle.prize} coins awarded to winner ${winner.userId}`);

      // Update human player rating (bot rating doesn't matter)
      const winnerRating = winner.rating || 1000;
      const loserRating = loser.rating || 1000;
      const ratingResult = await updateBattleRatings(winner.userId, loser.userId, winnerRating, loserRating);

      (battle as any).ratingChanges = {
        winner: { oldRating: winnerRating, newRating: ratingResult.winnerNewRating },
        loser: { oldRating: loserRating, newRating: ratingResult.loserNewRating }
      };
    } catch (walletError) {
      console.error('[Bot Battle] Error awarding prize:', walletError);
    }
  } else if (winner.userId.startsWith('bot_')) {
    // Bot won - no prize awarded (coins are lost to the platform)
    (battle as any).prizeAwarded = true;
    console.log(`[Bot Battle] Bot ${winner.userId} won battle ${battle._id}. User loses entry fee.`);

    // Still update human rating (they lost)
    try {
      const humanRating = humanParticipant.rating || 1000;
      const botRating = botParticipant.rating || 1000;
      // When bot wins, loser = human
      const ratingResult = await updateBattleRatings(botParticipant.userId, humanParticipant.userId, botRating, humanRating);

      (battle as any).ratingChanges = {
        winner: { oldRating: botRating, newRating: ratingResult.winnerNewRating },
        loser: { oldRating: humanRating, newRating: ratingResult.loserNewRating }
      };
    } catch (ratingError) {
      console.error('[Bot Battle] Error updating ratings:', ratingError);
    }
  }
}

export default router;
