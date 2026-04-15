// Centralized API URL configuration
// This ensures consistent URL handling across all components

const getBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  const defaultUrl = 'http://localhost:5000'; // Default to local backend if not set

  if (!envUrl) return defaultUrl;

  // Remove trailing slash and /api if present to normalize
  let url = envUrl.trim();
  if (url.endsWith('/')) url = url.slice(0, -1);
  if (url.endsWith('/api')) url = url.slice(0, -4);

  return url;
};

// Base URL without /api (for socket connections)
export const API_BASE_URL = getBaseUrl();

// Full API URL with /api suffix (for REST API calls)
export const API_URL = `${API_BASE_URL}/api`;
