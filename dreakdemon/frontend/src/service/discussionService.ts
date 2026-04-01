/**
 * Discussion Service
 * Provides API calls for discussion posts on coding challenges
 */

import { apiRequest } from './api';

export interface DiscussionPost {
  id: string;
  author: string;
  title: string;
  content?: string;
  votes: number;
  repliesCount: number;
  time: string;
  voted: boolean;
}

export interface DiscussionReply {
  author: string;
  content: string;
  time: string;
}

export interface DiscussionDetail extends Omit<DiscussionPost, 'repliesCount'> {
  replies: DiscussionReply[];
}

/**
 * Get discussions for a challenge (without user vote status)
 */
export const getDiscussions = async (challengeId: string, sort: 'votes' | 'recent' = 'votes'): Promise<DiscussionPost[]> => {
  try {
    const response = await apiRequest(`/discussions/${encodeURIComponent(challengeId)}?sort=${sort}`);
    return response;
  } catch (error) {
    console.error('Get discussions error:', error);
    return [];
  }
};

/**
 * Get discussions for a challenge with user vote status
 */
export const getDiscussionsWithVoteStatus = async (challengeId: string, sort: 'votes' | 'recent' = 'votes'): Promise<DiscussionPost[]> => {
  try {
    const response = await apiRequest(`/discussions/${encodeURIComponent(challengeId)}/user?sort=${sort}`);
    return response;
  } catch (error) {
    // Fallback to public endpoint if user is not authenticated
    console.error('Get discussions with auth error, falling back:', error);
    return getDiscussions(challengeId, sort);
  }
};

/**
 * Create a new discussion post
 */
export const createDiscussion = async (challengeId: string, title: string, content: string): Promise<DiscussionPost | null> => {
  try {
    const response = await apiRequest(`/discussions/${encodeURIComponent(challengeId)}`, {
      method: 'POST',
      body: JSON.stringify({ title, content })
    });
    return response;
  } catch (error) {
    console.error('Create discussion error:', error);
    throw error;
  }
};

/**
 * Vote on a discussion post
 */
export const voteDiscussion = async (discussionId: string): Promise<{ votes: number; voted: boolean } | null> => {
  try {
    const response = await apiRequest(`/discussions/${discussionId}/vote`, {
      method: 'POST'
    });
    return response;
  } catch (error) {
    console.error('Vote discussion error:', error);
    throw error;
  }
};

/**
 * Add a reply to a discussion
 */
export const addReply = async (discussionId: string, content: string): Promise<{ replies: number } | null> => {
  try {
    const response = await apiRequest(`/discussions/${discussionId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });
    return response;
  } catch (error) {
    console.error('Add reply error:', error);
    throw error;
  }
};

/**
 * Get a single discussion with all replies
 */
export const getDiscussionDetail = async (discussionId: string): Promise<DiscussionDetail | null> => {
  try {
    const response = await apiRequest(`/discussions/post/${discussionId}`);
    return response;
  } catch (error) {
    console.error('Get discussion detail error:', error);
    return null;
  }
};

export default {
  getDiscussions,
  getDiscussionsWithVoteStatus,
  createDiscussion,
  voteDiscussion,
  addReply,
  getDiscussionDetail
};
