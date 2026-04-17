import type { MarketplaceProject } from "../types/marketplace";
import { apiRequest } from "./api";

// Get all marketplace listings
export const getMarketplaceListings = async (filters?: {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  page?: number;
  limit?: number;
}): Promise<any> => {
  try {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }

    const response = await apiRequest(`/marketplace?${params.toString()}`);
    return response;
  } catch (error) {
    console.error('Error getting marketplace listings:', error);
    throw error;
  }
};

// Get listing by ID
export const getListingById = async (listingId: string): Promise<any> => {
  try {
    const response = await apiRequest(`/marketplace/${listingId}`);
    const listing = response.listing;

    // Transform dates and ensure proper format
    if (listing) {
      return {
        ...listing,
        id: listing.id || listing._id,
        createdAt: new Date(listing.createdAt),
        updatedAt: new Date(listing.updatedAt),
      };
    }
    return listing;
  } catch (error) {
    console.error('Error getting listing:', error);
    throw error;
  }
};

// Create new listing
export const createListing = async (listingData: any): Promise<any> => {
  try {
    const response = await apiRequest('/marketplace', {
      method: 'POST',
      body: JSON.stringify(listingData)
    });
    return response.listing;
  } catch (error) {
    console.error('Error creating listing:', error);
    throw error;
  }
};

// Update listing
export const updateListing = async (listingId: string, updates: any): Promise<any> => {
  try {
    const response = await apiRequest(`/marketplace/${listingId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    return response.listing;
  } catch (error) {
    console.error('Error updating listing:', error);
    throw error;
  }
};

// Delete listing
export const deleteListing = async (listingId: string): Promise<void> => {
  try {
    await apiRequest(`/marketplace/${listingId}`, {
      method: 'DELETE'
    });
  } catch (error) {
    console.error('Error deleting listing:', error);
    throw error;
  }
};

// Like/Unlike listing
export const toggleListingLike = async (listingId: string): Promise<any> => {
  try {
    const response = await apiRequest(`/marketplace/${listingId}/like`, {
      method: 'POST'
    });
    return response.listing;
  } catch (error) {
    console.error('Error toggling like:', error);
    throw error;
  }
};

// Get user's listings
export const getMyListings = async (): Promise<any[]> => {
  try {
    const response = await apiRequest('/marketplace/user/my-listings');
    return response.listings || [];
  } catch (error) {
    console.error('Error getting my listings:', error);
    return [];
  }
};

// Admin functions - using /marketplace/all endpoint (like /ideas - just requires auth, not admin role)
export const getAllMarketplaceProjectsForAdmin = async (): Promise<any[]> => {
  try {
    console.log('Fetching all marketplace projects...');
    const response = await apiRequest('/marketplace/all');
    console.log('Marketplace all response:', response);
    const projects = response.projects || [];

    // Transform each project to ensure proper format
    return projects.map((project: any) => ({
      ...project,
      id: project.id || project._id,
      createdAt: new Date(project.createdAt),
      updatedAt: new Date(project.updatedAt),
    }));
  } catch (error) {
    console.error('Error getting marketplace projects:', error);
    return [];
  }
};

export const approveMarketplaceProject = async (projectId: string): Promise<void> => {
  try {
    await apiRequest(`/marketplace/approve/${projectId}`, {
      method: 'POST'
    });
  } catch (error) {
    console.error('Error approving marketplace project:', error);
    throw error;
  }
};

export const rejectMarketplaceProject = async (projectId: string, reason: string): Promise<void> => {
  try {
    await apiRequest(`/marketplace/reject/${projectId}`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  } catch (error) {
    console.error('Error rejecting marketplace project:', error);
    throw error;
  }
};

// Marketplace project functions (aliases for compatibility)
export const getProjectById = getListingById;
export const updateProject = updateListing;
export const deleteProject = deleteListing;
export const getAllProjects = async (): Promise<MarketplaceProject[]> => {
  const response = await getMarketplaceListings();
  const listings = response.listings || [];

  // Transform each listing to ensure proper format
  return listings.map((listing: any) => ({
    ...listing,
    id: listing.id || listing._id,
    createdAt: new Date(listing.createdAt),
    updatedAt: new Date(listing.updatedAt),
  }));
};

// Seller functions
export const getSellerProjects = async (sellerId: string): Promise<any[]> => {
  try {
    const response = await apiRequest(`/marketplace/seller/${sellerId}/projects`);
    const listings = response.listings || response.projects || [];

    return listings.map((listing: any) => ({
      ...listing,
      id: listing.id || listing._id,
      createdAt: new Date(listing.createdAt),
      updatedAt: new Date(listing.updatedAt),
    }));
  } catch (error) {
    console.error('Error getting seller projects:', error);
    return [];
  }
};

export const getSellerSales = async (sellerId: string): Promise<any[]> => {
  try {
    const response = await apiRequest(`/marketplace/seller/${sellerId}/sales`);
    const sales = response.sales || [];

    return sales.map((sale: any) => ({
      ...sale,
      id: sale.id || sale._id,
      purchasedAt: new Date(sale.purchasedAt),
    }));
  } catch (error) {
    console.error('Error getting seller sales:', error);
    return [];
  }
};

// Purchase functions
export const getUserPurchases = async (userId: string): Promise<any[]> => {
  try {
    const response = await apiRequest(`/marketplace/user/${userId}/purchases`);
    const purchases = response.purchases || [];

    return purchases.map((purchase: any) => ({
      ...purchase,
      id: purchase.id || purchase._id,
      purchasedAt: new Date(purchase.purchasedAt),
    }));
  } catch (error) {
    console.error('Error getting user purchases:', error);
    return [];
  }
};

// Check if user has purchased a project - MATCHES COMPONENT CALL: checkUserPurchased(userId, projectId)
export const checkUserPurchased = async (userId: string, projectId: string): Promise<boolean> => {
  try {
    const response = await apiRequest(`/marketplace/projects/${projectId}/purchased?userId=${userId}`);
    return response.purchased || false;
  } catch (error) {
    console.error('Error checking purchase status:', error);
    return false;
  }
};

// Create a purchase - MATCHES COMPONENT CALL: createPurchase(projectId, project, userId, userName)
export const createPurchase = async (
  projectId: string,
  _project: MarketplaceProject,
  userId: string,
  userName: string
): Promise<any> => {
  try {
    const response = await apiRequest(`/marketplace/projects/${projectId}/purchase`, {
      method: 'POST',
      body: JSON.stringify({
        buyerId: userId,
        buyerName: userName
      })
    });
    return response.purchase;
  } catch (error) {
    console.error('Error creating purchase:', error);
    throw error;
  }
};

// Review functions - MATCHES COMPONENT CALL: createReview(projectId, userId, userName, avatar, rating, comment)
export const createReview = async (
  projectId: string,
  userId: string,
  userName: string,
  userAvatar: string,
  rating: number,
  comment: string
): Promise<any> => {
  try {
    const response = await apiRequest(`/marketplace/projects/${projectId}/reviews`, {
      method: 'POST',
      body: JSON.stringify({
        buyerId: userId,
        buyerName: userName,
        buyerAvatar: userAvatar,
        rating,
        comment
      })
    });
    return response.review;
  } catch (error) {
    console.error('Error creating review:', error);
    throw error;
  }
};

export const getProjectReviews = async (projectId: string): Promise<any[]> => {
  try {
    const response = await apiRequest(`/marketplace/projects/${projectId}/reviews`);
    const reviews = response.reviews || [];

    return reviews.map((review: any) => ({
      ...review,
      id: review.id || review._id,
      createdAt: new Date(review.createdAt),
    }));
  } catch (error) {
    console.error('Error getting reviews:', error);
    return [];
  }
};

export const incrementProjectViews = async (projectId: string): Promise<void> => {
  try {
    await apiRequest(`/marketplace/projects/${projectId}/views`, {
      method: 'POST'
    });
  } catch (error) {
    console.error('Error incrementing views:', error);
    // Don't throw, views increment is not critical
  }
};

// Mark video as watched (for verified watcher badge)
export const markVideoAsWatched = async (
  projectId: string,
  videoType: 'demo' | 'explanation',
  buyerId: string
): Promise<{ success: boolean; videoWatched: { demo: boolean; explanation: boolean }; canReview: boolean; message: string }> => {
  try {
    const response = await apiRequest(`/marketplace/projects/${projectId}/watch-video`, {
      method: 'POST',
      body: JSON.stringify({ videoType, buyerId })
    });
    return response;
  } catch (error) {
    console.error('Error marking video as watched:', error);
    throw error;
  }
};

// Get seller achievements and badges
export const getSellerAchievements = async (sellerId: string): Promise<{
  sellerId: string;
  stats: {
    totalSales: number;
    totalViews: number;
    totalCoinsEarned: number;
    avgRating: number;
    totalProjects: number;
  };
  badges: { id: string; name: string; emoji: string; description: string }[];
  progress: {
    topSeller: { current: number; required: number };
    highlyRated: { current: number; required: number };
    viralProject: { current: number; required: number };
    coinMaster: { current: number; required: number };
  };
}> => {
  try {
    const response = await apiRequest(`/marketplace/seller/${sellerId}/achievements`);
    return response;
  } catch (error) {
    console.error('Error getting seller achievements:', error);
    throw error;
  }
};

// Get purchase video watch status
export const getPurchaseVideoStatus = async (projectId: string, buyerId: string): Promise<{
  videoWatched: { demo: boolean; explanation: boolean };
  canReview: boolean;
} | null> => {
  try {
    const response = await apiRequest(`/marketplace/projects/${projectId}/purchase-status?buyerId=${buyerId}`);
    return response;
  } catch (error) {
    console.error('Error getting purchase video status:', error);
    return null;
  }
};
