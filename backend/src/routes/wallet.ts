import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import { authenticate } from '../middleware/auth';
import User from '../models/User';
import Wallet from '../models/Wallet';

const router = express.Router();

// Get wallet by user ID
router.get('/:userId', authenticate, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Validate userId
    if (!userId || userId === 'undefined' || userId === 'null') {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Validate that userId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    let wallet = await Wallet.findOne({ userId: new mongoose.Types.ObjectId(userId) });

    // If wallet doesn't exist, create one with default values
    if (!wallet) {
      wallet = new Wallet({
        userId: new mongoose.Types.ObjectId(userId),
        coins: 100,
        transactions: [{
          type: 'credit',
          amount: 100,
          reason: 'Welcome bonus',
          createdAt: new Date()
        }],
        achievements: {
          problemsSolved: 0,
          battlesWon: 0,
          currentStreak: 0
        }
      });
      await wallet.save();
    }

    // Also fetch user's battle rating
    const user = await User.findById(userId).select('battleRating battlesWon battlesLost');
    const battleRating = user?.battleRating || 1000;
    const battlesWon = user?.battlesWon || 0;
    const battlesLost = user?.battlesLost || 0;

    // Calculate totalEarned and totalSpent from transactions
    const transactions = wallet.transactions || [];
    const totalEarned = transactions
      .filter((tx: any) => tx.type === 'credit')
      .reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0);
    const totalSpent = transactions
      .filter((tx: any) => tx.type === 'debit')
      .reduce((sum: number, tx: any) => sum + Math.abs(tx.amount || 0), 0);

    res.json({
      wallet: {
        ...wallet.toObject(),
        rating: battleRating,
        battleRating,
        battlesWon,
        battlesLost,
        totalEarned,
        totalSpent
      }
    });
  } catch (error) {
    console.error('Error fetching wallet:', error);
    res.status(500).json({ error: 'Failed to fetch wallet' });
  }
});

// Initialize/Create wallet for user
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    // Validate userId
    if (!userId || userId === 'undefined' || userId === 'null') {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Validate that userId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }

    // Check if wallet already exists
    let wallet = await Wallet.findOne({ userId: new mongoose.Types.ObjectId(userId) });

    if (wallet) {
      return res.json({ wallet, message: 'Wallet already exists' });
    }

    // Create new wallet
    wallet = new Wallet({
      userId: new mongoose.Types.ObjectId(userId),
      coins: 100,
      transactions: [{
        type: 'credit',
        amount: 100,
        reason: 'Welcome bonus',
        createdAt: new Date()
      }],
      achievements: {
        problemsSolved: 0,
        battlesWon: 0,
        currentStreak: 0
      }
    });

    await wallet.save();
    res.status(201).json({ wallet });
  } catch (error) {
    console.error('Error creating wallet:', error);
    res.status(500).json({ error: 'Failed to create wallet' });
  }
});

// Add coins to wallet (credit)
const addCoinsHandler = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { amount, reason, description } = req.body;
    const transactionReason = reason || description || 'Transaction';

    // Validate userId
    if (!userId || userId === 'undefined' || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const wallet = await Wallet.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      {
        $inc: { coins: amount },
        $push: {
          transactions: {
            type: 'credit',
            amount,
            reason: transactionReason,
            createdAt: new Date()
          }
        }
      },
      { new: true, upsert: true }
    );

    res.json({ wallet });
  } catch (error) {
    console.error('Error adding coins:', error);
    res.status(500).json({ error: 'Failed to add coins' });
  }
};

router.post('/:userId/credit', authenticate, addCoinsHandler);
router.post('/:userId/add', authenticate, addCoinsHandler);

// Deduct coins from wallet (debit)
const deductCoinsHandler = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { amount, reason, description } = req.body;
    const transactionReason = reason || description || 'Transaction';

    // Validate userId
    if (!userId || userId === 'undefined' || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const wallet = await Wallet.findOne({ userId: new mongoose.Types.ObjectId(userId) });

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    if (wallet.coins < amount) {
      return res.status(400).json({ error: 'Insufficient coins' });
    }

    // Use atomic update to avoid validation issues with existing data
    const updatedWallet = await Wallet.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      {
        $inc: { coins: -amount },
        $push: {
          transactions: {
            type: 'debit',
            amount,
            reason: transactionReason,
            createdAt: new Date()
          }
        }
      },
      { new: true }
    );

    res.json({ wallet: updatedWallet });
  } catch (error) {
    console.error('Error deducting coins:', error);
    res.status(500).json({ error: 'Failed to deduct coins' });
  }
};

router.post('/:userId/debit', authenticate, deductCoinsHandler);
router.post('/:userId/deduct', authenticate, deductCoinsHandler);

// Update achievements
router.put('/:userId/achievements', authenticate, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { achievements } = req.body;

    const wallet = await Wallet.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      { $set: { achievements } },
      { new: true }
    );

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    res.json({ wallet });
  } catch (error) {
    console.error('Error updating achievements:', error);
    res.status(500).json({ error: 'Failed to update achievements' });
  }
});

export default router;
