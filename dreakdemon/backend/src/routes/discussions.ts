/**
 * Discussion Routes
 * API endpoints for discussion posts on coding challenges
 */

import express from 'express';
import mongoose, { SortOrder } from 'mongoose';
import { authenticate, AuthRequest } from '../middleware/auth';
import Discussion from '../models/Discussion';
import User from '../models/User';

const router = express.Router();

/**
 * GET /api/discussions/:challengeId
 * Get all discussions for a challenge
 */
router.get('/:challengeId', async (req, res) => {
  try {
    const { challengeId } = req.params;
    const { sort = 'votes' } = req.query;

    const sortOption: { [key: string]: SortOrder } = sort === 'recent'
      ? { createdAt: 'desc' as SortOrder }
      : { votes: 'desc' as SortOrder, createdAt: 'desc' as SortOrder };

    const discussions = await Discussion.find({ challengeId })
      .sort(sortOption)
      .limit(50)
      .lean();

    // Format response
    const formattedPosts = discussions.map(post => ({
      id: post._id,
      author: post.authorUsername,
      title: post.title,
      content: post.content,
      votes: post.votes,
      replies: post.replies?.length || 0,
      time: getTimeAgo(post.createdAt),
      voted: false // Will be updated if user is authenticated
    }));

    res.json(formattedPosts);
  } catch (error) {
    console.error('Get discussions error:', error);
    res.status(500).json({ message: 'Failed to fetch discussions' });
  }
});

/**
 * GET /api/discussions/:challengeId/user
 * Get discussions with user vote status
 */
router.get('/:challengeId/user', authenticate, async (req, res) => {
  try {
    const { challengeId } = req.params;
    const userId = (req as AuthRequest).user?._id || '';
    const { sort = 'votes' } = req.query;

    const sortOption: { [key: string]: SortOrder } = sort === 'recent'
      ? { createdAt: 'desc' as SortOrder }
      : { votes: 'desc' as SortOrder, createdAt: 'desc' as SortOrder };

    const discussions = await Discussion.find({ challengeId })
      .sort(sortOption)
      .limit(50)
      .lean();

    // Format response with user vote status
    const formattedPosts = discussions.map(post => ({
      id: post._id,
      author: post.authorUsername,
      title: post.title,
      content: post.content,
      votes: post.votes,
      replies: post.replies?.length || 0,
      time: getTimeAgo(post.createdAt),
      voted: userId ? post.votedBy?.some(id => id.toString() === userId.toString()) : false
    }));

    res.json(formattedPosts);
  } catch (error) {
    console.error('Get discussions error:', error);
    res.status(500).json({ message: 'Failed to fetch discussions' });
  }
});

/**
 * POST /api/discussions/:challengeId
 * Create a new discussion post
 */
router.post('/:challengeId', authenticate, async (req, res) => {
  try {
    const { challengeId } = req.params;
    const { title, content } = req.body;
    const user = (req as any).user;

    if (!title?.trim() || !content?.trim()) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    // Fetch username from DB
    const dbUser = await User.findById(user._id).select('username name');
    const displayName = dbUser?.username || user.name;

    const discussion = new Discussion({
      challengeId,
      author: user._id,
      authorUsername: displayName,
      title: title.trim(),
      content: content.trim(),
      votes: 0,
      votedBy: [],
      replies: []
    });

    await discussion.save();

    res.status(201).json({
      id: discussion._id,
      author: discussion.authorUsername,
      title: discussion.title,
      content: discussion.content,
      votes: 0,
      replies: 0,
      time: 'Just now',
      voted: false
    });
  } catch (error) {
    console.error('Create discussion error:', error);
    res.status(500).json({ message: 'Failed to create discussion' });
  }
});

/**
 * POST /api/discussions/:id/vote
 * Toggle vote on a discussion
 */
router.post('/:id/vote', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid discussion ID' });
    }

    const discussion = await Discussion.findById(id);
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    const hasVoted = discussion.votedBy.some(v => v.toString() === userId.toString());

    if (hasVoted) {
      // Remove vote
      discussion.votedBy = discussion.votedBy.filter(v => v.toString() !== userId.toString());
      discussion.votes = Math.max(0, discussion.votes - 1);
    } else {
      // Add vote
      discussion.votedBy.push(userId);
      discussion.votes += 1;
    }

    await discussion.save();

    res.json({
      id: discussion._id,
      votes: discussion.votes,
      voted: !hasVoted
    });
  } catch (error) {
    console.error('Vote discussion error:', error);
    res.status(500).json({ message: 'Failed to vote' });
  }
});

/**
 * POST /api/discussions/:id/reply
 * Add a reply to a discussion
 */
router.post('/:id/reply', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const user = (req as any).user;

    if (!content?.trim()) {
      return res.status(400).json({ message: 'Reply content is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid discussion ID' });
    }

    const discussion = await Discussion.findById(id);
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    // Fetch username from DB
    const dbUser = await User.findById(user._id).select('username name');
    const displayName = dbUser?.username || user.name;

    discussion.replies.push({
      author: user._id,
      authorUsername: displayName,
      content: content.trim(),
      createdAt: new Date()
    });

    await discussion.save();

    res.status(201).json({
      message: 'Reply added',
      replies: discussion.replies.length
    });
  } catch (error) {
    console.error('Add reply error:', error);
    res.status(500).json({ message: 'Failed to add reply' });
  }
});

/**
 * GET /api/discussions/post/:id
 * Get a single discussion with all replies
 */
router.get('/post/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid discussion ID' });
    }

    const discussion = await Discussion.findById(id).lean();
    if (!discussion) {
      return res.status(404).json({ message: 'Discussion not found' });
    }

    res.json({
      id: discussion._id,
      author: discussion.authorUsername,
      title: discussion.title,
      content: discussion.content,
      votes: discussion.votes,
      time: getTimeAgo(discussion.createdAt),
      replies: discussion.replies?.map(r => ({
        author: r.authorUsername,
        content: r.content,
        time: getTimeAgo(r.createdAt)
      })) || []
    });
  } catch (error) {
    console.error('Get discussion error:', error);
    res.status(500).json({ message: 'Failed to fetch discussion' });
  }
});

// Helper function to format time ago
function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;
  return `${Math.floor(seconds / 2592000)}mo ago`;
}

export default router;
