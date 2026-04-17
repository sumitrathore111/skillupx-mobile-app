import { Response, Router } from 'express';
import { adminOnly, authenticate, AuthRequest } from '../middleware/auth';
import Battle from '../models/Battle';
import Challenge from '../models/Challenge';
import Idea from '../models/Idea';
import MarketplaceListing from '../models/MarketplaceListing';
import Project from '../models/Project';
import User from '../models/User';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate, adminOnly);

// Get platform statistics
router.get('/stats', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [
      totalUsers,
      totalProjects,
      totalIdeas,
      totalChallenges,
      totalBattles,
      totalListings
    ] = await Promise.all([
      User.countDocuments(),
      Project.countDocuments(),
      Idea.countDocuments(),
      Challenge.countDocuments(),
      Battle.countDocuments(),
      MarketplaceListing.countDocuments()
    ]);

    const pendingIdeas = await Idea.countDocuments({ status: 'pending' });
    const activeProjects = await Project.countDocuments({ status: 'active' });
    const pendingListings = await MarketplaceListing.countDocuments({ status: 'pending_verification' });

    // Get recent users (last 7 days)
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const newUsersThisWeek = await User.countDocuments({ createdAt: { $gte: lastWeek } });

    res.json({
      stats: {
        users: {
          total: totalUsers,
          newThisWeek: newUsersThisWeek
        },
        projects: {
          total: totalProjects,
          active: activeProjects
        },
        ideas: {
          total: totalIdeas,
          pending: pendingIdeas
        },
        challenges: {
          total: totalChallenges
        },
        battles: {
          total: totalBattles
        },
        marketplace: {
          total: totalListings,
          pending: pendingListings
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users with full details
router.get('/users', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, role, limit = 50, page = 1 } = req.query;
    
    let query: any = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) query.role = role;
    
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));
    
    const total = await User.countDocuments(query);
    
    res.json({ 
      users, 
      total, 
      page: Number(page), 
      limit: Number(limit) 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update user role
router.put('/users/:userId/role', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role } = req.body;
    
    if (!['student', 'admin'].includes(role)) {
      res.status(400).json({ error: 'Invalid role' });
      return;
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { $set: { role } },
      { new: true }
    ).select('-password');
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    res.json({ 
      message: 'User role updated successfully',
      user 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete user
router.delete('/users/:userId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findByIdAndDelete(req.params.userId);
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all pending ideas for review
router.get('/ideas/pending', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const ideas = await Idea.find({ status: 'pending' })
      .sort({ createdAt: -1 })
      .populate('submittedBy', 'name email');
    
    res.json({ ideas });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Approve/reject idea
router.put('/ideas/:ideaId/review', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, feedback } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
      res.status(400).json({ error: 'Status must be approved or rejected' });
      return;
    }
    
    const idea = await Idea.findByIdAndUpdate(
      req.params.ideaId,
      { 
        $set: { 
          status, 
          feedback, 
          reviewedBy: req.user?.id,
          reviewedAt: new Date()
        } 
      },
      { new: true }
    );
    
    if (!idea) {
      res.status(404).json({ error: 'Idea not found' });
      return;
    }
    
    res.json({ 
      message: `Idea ${status} successfully`,
      idea 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all marketplace listings for admin review
router.get('/marketplace', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.query;
    
    let query: any = {};
    if (status) query.status = status;
    
    const listings = await MarketplaceListing.find(query)
      .sort({ createdAt: -1 })
      .populate('sellerId', 'name email');
    
    res.json({ listings });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Approve/reject marketplace listing
router.put('/marketplace/:listingId/review', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, feedback } = req.body;
    
    if (!['published', 'rejected', 'pending_verification'].includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }
    
    const listing = await MarketplaceListing.findByIdAndUpdate(
      req.params.listingId,
      { 
        $set: { 
          status, 
          rejectionReason: status === 'rejected' ? feedback : ''
        } 
      },
      { new: true }
    );
    
    if (!listing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }
    
    res.json({ 
      message: `Listing ${status} successfully`,
      listing 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add/deduct coins from user
router.post('/users/:userId/coins', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { amount, reason, action } = req.body;
    
    if (!amount || !reason || !action) {
      res.status(400).json({ error: 'Amount, reason, and action are required' });
      return;
    }
    
    if (!['add', 'deduct'].includes(action)) {
      res.status(400).json({ error: 'Action must be add or deduct' });
      return;
    }
    
    const updateValue = action === 'add' ? amount : -amount;
    
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { $inc: { coins: updateValue } },
      { new: true }
    ).select('-password');
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    res.json({ 
      message: `${amount} coins ${action === 'add' ? 'added to' : 'deducted from'} user`,
      user 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Alias for marketplace/projects (frontend compatibility)
router.get('/marketplace/projects', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.query;
    
    let query: any = {};
    if (status && status !== 'all') query.status = status;
    
    console.log('Admin marketplace query:', query);
    const projects = await MarketplaceListing.find(query)
      .sort({ createdAt: -1 })
      .lean(); // Use lean for faster queries
    
    // Transform _id to id for lean documents
    const transformedProjects = projects.map((p: any) => {
      const { _id, __v, ...rest } = p;
      return {
        ...rest,
        id: _id.toString()
      };
    });
    
    console.log('Found marketplace projects:', transformedProjects.length);
    res.json({ projects: transformedProjects });
  } catch (error: any) {
    console.error('Error in admin/marketplace/projects:', error);
    res.status(500).json({ error: error.message });
  }
});

// Approve marketplace project
router.post('/marketplace/projects/:projectId/approve', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const listing = await MarketplaceListing.findByIdAndUpdate(
      req.params.projectId,
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
    res.status(500).json({ error: error.message });
  }
});

// Reject marketplace project
router.post('/marketplace/projects/:projectId/reject', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { reason } = req.body;
    
    const listing = await MarketplaceListing.findByIdAndUpdate(
      req.params.projectId,
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
    res.status(500).json({ error: error.message });
  }
});

export default router;
