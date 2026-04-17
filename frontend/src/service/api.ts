// API Configuration - Use shared config for consistency
import { API_BASE_URL } from './apiConfig';

// Migrate old token key to new one (one-time migration)
const migrateTokenKey = (): void => {
  const oldToken = localStorage.getItem('token');
  const newToken = localStorage.getItem('authToken');

  // If old token exists but new one doesn't, migrate it
  if (oldToken && !newToken) {
    localStorage.setItem('authToken', oldToken);
    localStorage.removeItem('token');
  }
};

// Run migration on module load
migrateTokenKey();

// Helper function to get auth token
const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

// Helper function to make authenticated requests
export const apiRequest = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  const token = getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',

    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Ensure endpoint starts with /api (backend routes are prefixed with /api)
  const apiEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;

  const response = await fetch(`${API_BASE_URL}${apiEndpoint}`, {
    ...options,
    headers,
    cache: 'no-store', // Prevent caching for real-time data
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
};

// Save token to localStorage
export const saveAuthToken = (token: string): void => {
  localStorage.setItem('authToken', token);
  // Also remove old key if it exists
  localStorage.removeItem('token');
};

// Remove token from localStorage
export const clearAuthToken = (): void => {
  localStorage.removeItem('authToken');
  // Also clear old key for complete cleanup
  localStorage.removeItem('token');
};

export { API_BASE_URL };

