// This file now uses the custom backend API instead of Firebase
// All Firebase code has been removed and replaced with API calls

export * from './marketplaceServiceNew';

// Re-export types for backward compatibility
export type {
  MarketplaceProject,
  CreateProjectData,
  MarketplacePurchase,
  MarketplaceReview,
  FilterOptions,
  SortOption
} from '../types/marketplace';
