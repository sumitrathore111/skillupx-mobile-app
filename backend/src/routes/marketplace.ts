import { Response, Router } from 'express';
import mongoose from 'mongoose';
import { authenticate, AuthRequest } from '../middleware/auth';
import MarketplaceChat from '../models/MarketplaceChat';
import MarketplaceListing from '../models/MarketplaceListing';
import MarketplaceMessage from '../models/MarketplaceMessage';
import MarketplacePurchase from '../models/MarketplacePurchase';
import MarketplaceReview from '../models/MarketplaceReview';
import User from '../models/User';
import Wallet from '../models/Wallet';
import emailNotifications from '../services/emailService';

const router = Router();

// Tiered Reward System Constants
const COINS_FOR_5_STARS = 20;      // 5 ⭐ rating
const COINS_FOR_4_STARS = 15;      // 4-4.9 ⭐ rating
const COINS_FOR_3_5_STARS = 10;    // 3.5-3.9 ⭐ rating
const COINS_PER_1000_VIEWS = 5;    // Coins for every 1000 views

// Helper function to calculate coins based on rating tier
function getCoinsForRating(rating: number): number {
  if (rating === 5) return COINS_FOR_5_STARS;
  if (rating >= 4) return COINS_FOR_4_STARS;
  if (rating >= 3.5) return COINS_FOR_3_5_STARS;
  return 0;
}

// Achievement thresholds
const ACHIEVEMENT_THRESHOLDS = {
  TOP_SELLER: 10,        // 10+ sales
  HIGHLY_RATED: 4.5,     // Avg 4.5+ stars
  VIRAL_PROJECT: 10000,  // 10,000+ views
  COIN_MASTER: 500       // 500+ coins earned
};

// Helper function to reward seller coins
async function rewardSellerCoins(sellerId: string, amount: number, reason: string): Promise<boolean> {
  try {
    const sellerObjectId = new mongoose.Types.ObjectId(sellerId);

    let wallet = await Wallet.findOne({ userId: sellerObjectId });
    if (!wallet) {
      wallet = await Wallet.create({
        userId: sellerObjectId,
        coins: 100,
        transactions: [],
        achievements: { problemsSolved: 0, battlesWon: 0, currentStreak: 0 }
      });
    }

    wallet.coins += amount;
    wallet.transactions.push({
      type: 'credit',
      amount,
      reason,
      createdAt: new Date()
    });
    await wallet.save();

    console.log(`Rewarded ${amount} coins to seller ${sellerId}: ${reason}`);
    return true;
  } catch (error) {
    console.error('Error rewarding coins:', error);
    return false;
  }
}

// Get all listings (published only for public, all statuses for authenticated users)
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { category, search, minPrice, maxPrice, sort = '-createdAt', page = 1, limit = 20 } = req.query;

    // Only show published listings
    let query: any = { status: 'published' };

    if (category && category !== 'all') query.category = category;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { techStack: { $in: [new RegExp(search as string, 'i')] } }
      ];
    }
    if (minPrice) query.price = { ...query.price, $gte: Number(minPrice) };
    if (maxPrice) query.price = { ...query.price, $lte: Number(maxPrice) };

    const listings = await MarketplaceListing.find(query)
      .sort(sort as string)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await MarketplaceListing.countDocuments(query);

    res.json({ listings, total, page: Number(page), limit: Number(limit) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create listing
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const listingData = {
      ...req.body,
      sellerId: req.body.sellerId || req.user!.id,
      sellerName: req.body.sellerName || req.user!.name || 'Anonymous',
      sellerAvatar: req.body.sellerAvatar || '',
      status: 'pending_verification', // Always start as pending
      isFree: req.body.price === 0 || req.body.isFree === true,
      views: 0,
      purchases: 0,
      rating: 0,
      reviewCount: 0,
      likes: []
    };

    const listing = await MarketplaceListing.create(listingData);

    // Send email notification to all users about new listing when it's published (async, don't wait)
    // Note: Listing starts as pending, so we notify admins instead
    try {
      const admins = await User.find({ role: 'admin' }).select('email');
      const adminEmails = admins.map(a => a.email).filter(Boolean);
      if (adminEmails.length > 0) {
        emailNotifications.notifyNewListing(
          listingData.title || 'New Listing',
          listingData.sellerName,
          listingData.price || 0,
          adminEmails
        );
      }
    } catch (emailError) {
      console.error('Failed to send new listing email notifications:', emailError);
    }

    res.status(201).json({ listing });
  } catch (error: any) {
    console.error('Error creating listing:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get ALL listings for admin panel (like /ideas endpoint - just requires auth, not admin role)
router.get('/all', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.query;

    let query: any = {};
    if (status && status !== 'all') query.status = status;

    const listings = await MarketplaceListing.find(query)
      .sort({ createdAt: -1 });

    // Transform to ensure proper format
    const projects = listings.map((listing: any) => {
      const obj = listing.toObject();
      return {
        ...obj,
        id: obj._id?.toString() || obj.id
      };
    });

    res.json({ projects, total: projects.length });
  } catch (error: any) {
    console.error('Error getting all marketplace listings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Approve marketplace listing (like ideas approval - auth only, no admin role check)
router.post('/approve/:listingId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const listing = await MarketplaceListing.findByIdAndUpdate(
      req.params.listingId,
      {
        $set: {
          status: 'published',
          rejectionReason: ''
        }
      },
      { new: true }
    );

    if (!listing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }

    res.json({
      message: 'Project approved successfully',
      listing
    });
  } catch (error: any) {
    console.error('Error approving listing:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reject marketplace listing (like ideas rejection - auth only, no admin role check)
router.post('/reject/:listingId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { reason } = req.body;

    const listing = await MarketplaceListing.findByIdAndUpdate(
      req.params.listingId,
      {
        $set: {
          status: 'rejected',
          rejectionReason: reason || 'No reason provided'
        }
      },
      { new: true }
    );

    if (!listing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }

    res.json({
      message: 'Project rejected',
      listing
    });
  } catch (error: any) {
    console.error('Error rejecting listing:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's own listings (MUST be before /:id route)
router.get('/user/my-listings', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const listings = await MarketplaceListing.find({ sellerId: req.user!.id }).sort({ createdAt: -1 });
    res.json({ listings });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get seller projects (public)
router.get('/seller/:sellerId/projects', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const listings = await MarketplaceListing.find({
      sellerId: req.params.sellerId,
      status: 'published'
    }).sort({ createdAt: -1 });
    res.json({ listings });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get seller sales
router.get('/seller/:sellerId/sales', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sales = await MarketplacePurchase.find({ sellerId: req.params.sellerId }).sort({ purchasedAt: -1 });
    res.json({ sales });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get user purchases
router.get('/user/:userId/purchases', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const purchases = await MarketplacePurchase.find({ buyerId: req.params.userId }).sort({ purchasedAt: -1 });
    res.json({ purchases });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Check if user purchased a project
router.get('/projects/:projectId/purchased', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.query.userId as string || req.user!.id;
    const purchase = await MarketplacePurchase.findOne({
      projectId: req.params.projectId,
      buyerId: userId
    });
    res.json({ purchased: !!purchase });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get purchase status with video watching info
router.get('/projects/:projectId/purchase-status', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const buyerId = req.query.buyerId as string || req.user!.id;
    const purchase = await MarketplacePurchase.findOne({
      projectId: req.params.projectId,
      buyerId
    });

    if (!purchase) {
      res.status(404).json({ error: 'Purchase not found' });
      return;
    }

    const videoWatched = purchase.videoWatched || { demo: false, explanation: false };
    const canReview = videoWatched.demo && videoWatched.explanation;

    res.json({
      videoWatched,
      canReview,
      purchasedAt: purchase.purchasedAt
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create a purchase
router.post('/projects/:projectId/purchase', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const listing = await MarketplaceListing.findById(req.params.projectId);
    if (!listing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }

    // Check if already purchased
    const existingPurchase = await MarketplacePurchase.findOne({
      projectId: req.params.projectId,
      buyerId: req.body.buyerId || req.user!.id
    });

    if (existingPurchase) {
      res.status(400).json({ error: 'Already purchased' });
      return;
    }

    // Create purchase record
    const purchase = await MarketplacePurchase.create({
      projectId: listing._id.toString(),
      projectTitle: listing.title,
      projectImages: listing.images,
      buyerId: req.body.buyerId || req.user!.id,
      buyerName: req.body.buyerName || req.user!.name || 'User',
      sellerId: listing.sellerId,
      sellerName: listing.sellerName,
      price: listing.price,
      purchasedAt: new Date(),
      status: 'completed',
      accessLinks: listing.links
    });

    // Increment purchase count
    listing.purchases += 1;
    await listing.save();

    // Send email notifications for the purchase (async, don't wait)
    try {
      // Notify seller about new sale
      const seller = await User.findById(listing.sellerId).select('email');
      if (seller?.email) {
        emailNotifications.notifyNewPurchase(
          listing.title,
          req.body.buyerName || req.user!.name || 'A user',
          listing.price,
          seller.email
        );
      }

      // Notify buyer about purchase confirmation
      const buyer = await User.findById(req.body.buyerId || req.user!.id).select('email');
      if (buyer?.email) {
        emailNotifications.notifyPurchaseConfirmation(
          listing.title,
          listing.sellerName,
          listing.price,
          buyer.email
        );
      }
    } catch (emailError) {
      console.error('Failed to send purchase email notifications:', emailError);
    }

    res.json({ purchase });
  } catch (error: any) {
    console.error('Error creating purchase:', error);
    res.status(500).json({ error: error.message });
  }
});

// Increment project views with reward for every 1000 views
router.post('/projects/:projectId/views', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const listing = await MarketplaceListing.findById(req.params.projectId);
    if (listing) {
      listing.views += 1;

      // Check if we've hit a new 1000 views milestone
      const currentMilestone = Math.floor(listing.views / 1000);
      const lastMilestone = listing.lastViewMilestone || 0;

      if (currentMilestone > lastMilestone) {
        // Reward coins for reaching new milestone
        const milestonesReached = currentMilestone - lastMilestone;
        const coinsToReward = milestonesReached * COINS_PER_1000_VIEWS;

        await rewardSellerCoins(
          listing.sellerId,
          coinsToReward,
          `🎉 Marketplace: ${listing.title} reached ${currentMilestone * 1000} views!`
        );

        listing.lastViewMilestone = currentMilestone;
        listing.totalCoinsRewarded = (listing.totalCoinsRewarded || 0) + coinsToReward;
      }

      await listing.save();
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get project reviews
router.get('/projects/:projectId/reviews', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const reviews = await MarketplaceReview.find({ projectId: req.params.projectId }).sort({ createdAt: -1 });
    res.json({ reviews });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create a review with tiered reward system
router.post('/projects/:projectId/reviews', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { rating, comment, buyerId, buyerName, buyerAvatar } = req.body;
    const finalBuyerId = buyerId || req.user!.id;

    // Get the listing to reward the seller
    const listing = await MarketplaceListing.findById(req.params.projectId);
    if (!listing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }

    // Check if user has purchased and watched videos
    const purchase = await MarketplacePurchase.findOne({
      projectId: req.params.projectId,
      buyerId: finalBuyerId
    });

    if (!purchase) {
      res.status(403).json({ error: 'You must purchase this project before reviewing' });
      return;
    }

    // Check if both videos were watched
    const videosWatched = purchase.videoWatched?.demo && purchase.videoWatched?.explanation;
    const isVerifiedWatcher = videosWatched === true;

    // Create review with verified watcher badge
    const review = await MarketplaceReview.create({
      projectId: req.params.projectId,
      buyerId: finalBuyerId,
      buyerName: buyerName || req.user!.name || 'User',
      buyerAvatar: buyerAvatar || '',
      rating,
      comment,
      isVerifiedWatcher
    });

    // Update listing rating
    const reviews = await MarketplaceReview.find({ projectId: req.params.projectId });
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    await MarketplaceListing.findByIdAndUpdate(req.params.projectId, {
      rating: Math.round(avgRating * 10) / 10,
      reviewCount: reviews.length
    });

    // Calculate tiered reward based on rating
    const coinsToReward = getCoinsForRating(rating);

    if (coinsToReward > 0) {
      const tierEmoji = rating === 5 ? '🌟' : rating >= 4 ? '⭐' : '✨';
      await rewardSellerCoins(
        listing.sellerId,
        coinsToReward,
        `${tierEmoji} Marketplace: ${buyerName || 'A user'} gave ${rating} stars on "${listing.title}" (+${coinsToReward} coins)`
      );

      // Update total coins rewarded on listing
      listing.totalCoinsRewarded = (listing.totalCoinsRewarded || 0) + coinsToReward;
      await listing.save();
    }

    // Send email notification to seller about new review (async, don't wait)
    try {
      const seller = await User.findById(listing.sellerId).select('email');
      if (seller?.email) {
        emailNotifications.notifyNewReview(
          listing.title,
          buyerName || req.user!.name || 'A user',
          rating,
          seller.email
        );
      }
    } catch (emailError) {
      console.error('Failed to send new review email notification:', emailError);
    }

    res.json({
      review,
      coinsRewarded: coinsToReward,
      isVerifiedWatcher,
      rewardTier: rating === 5 ? '5-star' : rating >= 4 ? '4-star' : rating >= 3.5 ? '3.5-star' : 'none'
    });
  } catch (error: any) {
    console.error('Error creating review:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark video as watched
router.post('/projects/:projectId/watch-video', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { videoType, buyerId } = req.body; // videoType: 'demo' | 'explanation'
    const finalBuyerId = buyerId || req.user!.id;

    if (!['demo', 'explanation'].includes(videoType)) {
      res.status(400).json({ error: 'Invalid video type. Must be "demo" or "explanation"' });
      return;
    }

    const purchase = await MarketplacePurchase.findOne({
      projectId: req.params.projectId,
      buyerId: finalBuyerId
    });

    if (!purchase) {
      res.status(404).json({ error: 'Purchase not found' });
      return;
    }

    // Update video watched status
    if (!purchase.videoWatched) {
      purchase.videoWatched = { demo: false, explanation: false };
    }
    purchase.videoWatched[videoType as 'demo' | 'explanation'] = true;
    await purchase.save();

    const bothWatched = purchase.videoWatched.demo && purchase.videoWatched.explanation;

    res.json({
      success: true,
      videoWatched: purchase.videoWatched,
      canReview: bothWatched,
      message: bothWatched ? 'You can now leave a review!' : `Watch the ${videoType === 'demo' ? 'explanation' : 'demo'} video to unlock reviews`
    });
  } catch (error: any) {
    console.error('Error marking video as watched:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get seller achievements/badges
router.get('/seller/:sellerId/achievements', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { sellerId } = req.params;

    // Get all seller's listings
    const listings = await MarketplaceListing.find({ sellerId, status: 'published' });

    // Calculate stats
    const totalSales = listings.reduce((sum, l) => sum + l.purchases, 0);
    const totalViews = listings.reduce((sum, l) => sum + l.views, 0);
    const totalCoinsEarned = listings.reduce((sum, l) => sum + (l.totalCoinsRewarded || 0), 0);
    const avgRating = listings.length > 0
      ? listings.reduce((sum, l) => sum + l.rating, 0) / listings.filter(l => l.rating > 0).length
      : 0;

    // Determine badges
    const badges: { id: string; name: string; emoji: string; description: string }[] = [];

    if (totalSales >= ACHIEVEMENT_THRESHOLDS.TOP_SELLER) {
      badges.push({ id: 'top_seller', name: 'Top Seller', emoji: '🥇', description: '10+ sales' });
    }
    if (avgRating >= ACHIEVEMENT_THRESHOLDS.HIGHLY_RATED && listings.some(l => l.reviewCount > 0)) {
      badges.push({ id: 'highly_rated', name: 'Highly Rated', emoji: '⭐', description: 'Avg 4.5+ stars' });
    }
    if (totalViews >= ACHIEVEMENT_THRESHOLDS.VIRAL_PROJECT) {
      badges.push({ id: 'viral_project', name: 'Viral Creator', emoji: '👁️', description: '10,000+ views' });
    }
    if (totalCoinsEarned >= ACHIEVEMENT_THRESHOLDS.COIN_MASTER) {
      badges.push({ id: 'coin_master', name: 'Coin Master', emoji: '💎', description: '500+ coins earned' });
    }

    res.json({
      sellerId,
      stats: {
        totalSales,
        totalViews,
        totalCoinsEarned,
        avgRating: Math.round(avgRating * 10) / 10,
        totalProjects: listings.length
      },
      badges,
      progress: {
        topSeller: { current: totalSales, required: ACHIEVEMENT_THRESHOLDS.TOP_SELLER },
        highlyRated: { current: avgRating, required: ACHIEVEMENT_THRESHOLDS.HIGHLY_RATED },
        viralProject: { current: totalViews, required: ACHIEVEMENT_THRESHOLDS.VIRAL_PROJECT },
        coinMaster: { current: totalCoinsEarned, required: ACHIEVEMENT_THRESHOLDS.COIN_MASTER }
      }
    });
  } catch (error: any) {
    console.error('Error getting seller achievements:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== CHAT ENDPOINTS ====================

// Get pending chat requests for a seller
router.get('/chats/pending', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.query.userId as string || req.user!.id;
    console.log('Fetching pending requests for seller:', userId);

    const requests = await MarketplaceChat.find({
      sellerId: userId,
      status: 'pending'
    }).sort({ createdAt: -1 });

    console.log('Found pending requests:', requests.length);

    // Convert to JSON to ensure Maps are converted to objects
    const requestsJson = requests.map(r => r.toJSON());
    res.json({ requests: requestsJson });
  } catch (error: any) {
    console.error('Error fetching pending requests:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get seller chats (all chats where user is the seller)
router.get('/chats/seller/:sellerId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const chats = await MarketplaceChat.find({
      sellerId: req.params.sellerId
    }).sort({ lastMessageTime: -1 });

    // Convert to JSON to ensure Maps are converted to objects
    const chatsJson = chats.map(c => c.toJSON());
    res.json({ chats: chatsJson });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get user chats (accepted only)
router.get('/chats', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.query.userId as string || req.user!.id;
    const chats = await MarketplaceChat.find({
      participants: userId,
      status: 'accepted'
    }).sort({ lastMessageTime: -1 });

    // Convert to JSON to ensure Maps are converted to objects
    const chatsJson = chats.map(c => c.toJSON());
    res.json({ chats: chatsJson });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create or get chat
router.post('/chats', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      requesterId, requesterName, requesterAvatar,
      sellerId, sellerName, sellerAvatar,
      projectId, projectTitle
    } = req.body;

    // Check if chat already exists
    let chat = await MarketplaceChat.findOne({
      projectId,
      requesterId,
      sellerId
    });

    if (chat) {
      res.json({
        chatId: chat._id.toString(),
        status: chat.status,
        isNew: false
      });
      return;
    }

    // Create new chat request
    chat = await MarketplaceChat.create({
      participants: [requesterId, sellerId],
      participantNames: { [requesterId]: requesterName, [sellerId]: sellerName },
      participantAvatars: { [requesterId]: requesterAvatar || '', [sellerId]: sellerAvatar || '' },
      projectId,
      projectTitle,
      lastMessage: '',
      lastMessageTime: new Date(),
      unreadCount: { [requesterId]: 0, [sellerId]: 0 },
      status: 'pending',
      requesterId,
      sellerId
    });

    res.json({
      chatId: chat._id.toString(),
      status: 'pending',
      isNew: true
    });
  } catch (error: any) {
    console.error('Error creating chat:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint (MUST be before /chats/:chatId)
router.get('/chats/debug', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.query.userId as string || req.user!.id;

    // Get all chats for this user for debugging
    const allChats = await MarketplaceChat.find({
      $or: [
        { sellerId: userId },
        { requesterId: userId },
        { participants: userId }
      ]
    });

    const pendingAseller = await MarketplaceChat.find({ sellerId: userId, status: 'pending' });
    const acceptedChats = await MarketplaceChat.find({ participants: userId, status: 'accepted' });

    res.json({
      message: 'Marketplace chats debug endpoint',
      userId,
      allChatsCount: allChats.length,
      pendingAsSeller: pendingAseller.length,
      acceptedChats: acceptedChats.length,
      allChats,
      timestamp: new Date()
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get chat by ID
router.get('/chats/:chatId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const chat = await MarketplaceChat.findById(req.params.chatId);
    if (!chat) {
      res.status(404).json({ error: 'Chat not found' });
      return;
    }
    res.json({ chat: chat.toJSON() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Accept chat request
router.post('/chats/:chatId/accept', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const chat = await MarketplaceChat.findByIdAndUpdate(
      req.params.chatId,
      { status: 'accepted' },
      { new: true }
    );
    if (!chat) {
      res.status(404).json({ error: 'Chat not found' });
      return;
    }
    res.json({ chat });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Reject chat request
router.post('/chats/:chatId/reject', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const chat = await MarketplaceChat.findByIdAndUpdate(
      req.params.chatId,
      { status: 'rejected' },
      { new: true }
    );
    if (!chat) {
      res.status(404).json({ error: 'Chat not found' });
      return;
    }
    res.json({ chat });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get messages for a chat
router.get('/chats/:chatId/messages', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const messages = await MarketplaceMessage.find({ chatId: req.params.chatId }).sort({ timestamp: 1 });
    res.json({ messages });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Send message
router.post('/chats/:chatId/messages', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { senderId, senderName, content, recipientId } = req.body;

    const message = await MarketplaceMessage.create({
      chatId: req.params.chatId,
      senderId: senderId || req.user!.id,
      senderName: senderName || req.user!.name || 'User',
      message: content,
      timestamp: new Date(),
      read: false
    });

    // Update chat's last message
    await MarketplaceChat.findByIdAndUpdate(req.params.chatId, {
      lastMessage: content,
      lastMessageTime: new Date(),
      $inc: { [`unreadCount.${recipientId}`]: 1 }
    });

    // Send email notification to recipient (async, don't wait)
    if (recipientId) {
      try {
        const recipient = await User.findById(recipientId).select('email');
        if (recipient?.email) {
          emailNotifications.notifyMarketplaceMessage(
            senderName || req.user?.name || 'Someone',
            content,
            recipient.email
          );
        }
      } catch (emailError) {
        console.error('Failed to send marketplace chat email notification:', emailError);
      }
    }

    res.json({ message });
  } catch (error: any) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: error.message });
  }
});

// Edit marketplace message
router.patch('/chats/:chatId/messages/:messageId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      res.status(400).json({ error: 'Message content is required' });
      return;
    }

    const message = await MarketplaceMessage.findById(req.params.messageId);

    if (!message) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    // Only sender can edit their message
    if (message.senderId !== req.user?.id) {
      res.status(403).json({ error: 'You can only edit your own messages' });
      return;
    }

    message.message = content.trim();
    await message.save();

    res.json({ message });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete marketplace message
router.delete('/chats/:chatId/messages/:messageId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const message = await MarketplaceMessage.findById(req.params.messageId);

    if (!message) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    // Only sender can delete their message
    if (message.senderId !== req.user?.id) {
      res.status(403).json({ error: 'You can only delete your own messages' });
      return;
    }

    await message.deleteOne();

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Mark messages as read
router.post('/chats/:chatId/read', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.body.userId || req.user!.id;

    await MarketplaceMessage.updateMany(
      { chatId: req.params.chatId, senderId: { $ne: userId }, read: false },
      { read: true }
    );

    await MarketplaceChat.findByIdAndUpdate(req.params.chatId, {
      [`unreadCount.${userId}`]: 0
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete/archive chat
router.delete('/chats/:chatId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await MarketplaceChat.findByIdAndDelete(req.params.chatId);
    await MarketplaceMessage.deleteMany({ chatId: req.params.chatId });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== LISTING CRUD ====================

// Get listing by ID
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const listing = await MarketplaceListing.findById(req.params.id);
    if (!listing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }

    res.json({ listing });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update listing
router.put('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const listing = await MarketplaceListing.findById(req.params.id);
    if (!listing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }

    if (listing.sellerId !== req.user!.id && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    // Update isFree based on price
    if (req.body.price !== undefined) {
      req.body.isFree = req.body.price === 0;
    }

    Object.assign(listing, req.body);
    await listing.save();

    res.json({ listing });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete listing
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const listing = await MarketplaceListing.findById(req.params.id);
    if (!listing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }

    if (listing.sellerId !== req.user!.id && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    await listing.deleteOne();
    res.json({ message: 'Listing deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Like/Unlike listing
router.post('/:id/like', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const listing = await MarketplaceListing.findById(req.params.id);
    if (!listing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }

    const userId = req.user!.id;
    const likeIndex = listing.likes.indexOf(userId);

    if (likeIndex > -1) {
      listing.likes.splice(likeIndex, 1);
    } else {
      listing.likes.push(userId);
    }

    await listing.save();
    res.json({ listing });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
