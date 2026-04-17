import express, { Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import Battle from '../models/Battle';
import User from '../models/User';
import Wallet from '../models/Wallet';

const router = express.Router();

// Get global leaderboard
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { period } = req.query;

    // Get all wallets with user info, sorted by coins
    let wallets = await Wallet.find()
      .sort({ coins: -1 })
      .limit(100)
      .lean();

    // For weekly/monthly, filter based on recent activity
    if (period === 'weekly' || period === 'monthly') {
      const now = new Date();
      const periodStart = period === 'weekly'
        ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
        : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

      // Filter wallets that have recent transactions
      wallets = wallets.filter(wallet => {
        if (!wallet.transactions || wallet.transactions.length === 0) return false;
        // Check if any transaction is within the period
        return wallet.transactions.some((tx: any) =>
          tx.createdAt && new Date(tx.createdAt) >= periodStart
        );
      });

      // Re-sort by coins earned in this period (calculate from transactions)
      wallets = wallets.map(wallet => {
        const periodCoins = (wallet.transactions || [])
          .filter((tx: any) => tx.createdAt && new Date(tx.createdAt) >= periodStart)
          .reduce((sum: number, tx: any) => {
            if (tx.type === 'credit') return sum + (tx.amount || 0);
            if (tx.type === 'debit') return sum - (tx.amount || 0);
            return sum;
          }, 0);
        return { ...wallet, periodCoins };
      }).sort((a, b) => b.periodCoins - a.periodCoins);
    }

    // Get battles won for all users in parallel (optimized query)
    const userIds = wallets.map(w => w.userId.toString());
    const battlesWonMap = new Map<string, number>();

    // Use aggregation to count wins for all users at once
    const battlesWonAgg = await Battle.aggregate([
      {
        $match: {
          winner: { $in: userIds },
          status: { $in: ['completed', 'forfeited'] }
        }
      },
      {
        $group: {
          _id: '$winner',
          count: { $sum: 1 }
        }
      }
    ]);

    battlesWonAgg.forEach((item: any) => {
      battlesWonMap.set(item._id, item.count);
    });

    // Get user details for each wallet
    const leaderboardData = await Promise.all(
      wallets.map(async (wallet, index) => {
        const user = await User.findById(wallet.userId).select('name email avatar challenges_solved').lean();

        // Skip users without a proper name
        if (!user?.name || user.name.trim() === '') {
          return null;
        }

        const userName = user.name;
        const problemsSolved = wallet.achievements?.problemsSolved || (user as any).challenges_solved || 0;
        // Get battles won from aggregation
        const battlesWon = battlesWonMap.get(wallet.userId.toString()) || 0;

        // Calculate level based on problems solved and battles won
        const level = Math.floor((problemsSolved + battlesWon * 2) / 5) + 1;

        // Calculate rating - scale from coins and achievements
        // Higher coins = higher rating, battles won adds bonus
        const baseRating = Math.min(2500, 800 + Math.floor(wallet.coins / 10) + (battlesWon * 25) + (problemsSolved * 10));

        return {
          odId: wallet.userId.toString(),
          odName: userName,
          name: userName,
          email: (user as any).email || '',
          avatar: (user as any).avatar || userName.charAt(0).toUpperCase(),
          coins: (wallet as any).periodCoins !== undefined ? (wallet as any).periodCoins : wallet.coins,
          totalCoins: wallet.coins,
          problemsSolved,
          battlesWon,
          currentStreak: wallet.achievements?.currentStreak || 0,
          level,
          rating: baseRating
        };
      })
    );

    // Filter out null entries (users without proper names), sort by coins, and add ranks
    const leaderboard = leaderboardData
      .filter(entry => entry !== null)
      .sort((a, b) => (b?.coins || 0) - (a?.coins || 0))
      .map((entry, index) => ({
        ...entry,
        rank: index + 1
      }));

    res.json({ leaderboard });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Get user rank
router.get('/rank/:userId', authenticate, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Get user's wallet
    const userWallet = await Wallet.findOne({ userId }).lean();

    if (!userWallet) {
      return res.json({ rank: null });
    }

    // Count how many users have more coins
    const higherRanked = await Wallet.countDocuments({
      coins: { $gt: userWallet.coins }
    });

    res.json({ rank: higherRanked + 1 });
  } catch (error) {
    console.error('Error fetching rank:', error);
    res.status(500).json({ error: 'Failed to fetch rank' });
  }
});

export default router;
