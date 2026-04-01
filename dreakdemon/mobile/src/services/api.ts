import { API_BASE_URL } from '@constants/config';
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';

// Web-safe storage helpers (SecureStore doesn't work on web)
async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem('auth_token');
  }
  const SecureStore = await import('expo-secure-store');
  return SecureStore.getItemAsync('auth_token');
}

async function clearAuth(): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  } else {
    const SecureStore = await import('expo-secure-store');
    await SecureStore.deleteItemAsync('auth_token');
    await SecureStore.deleteItemAsync('auth_user');
  }
}

// Create axios instance pointing to your existing backend
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — automatically attach JWT token to every request
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      // Storage unavailable, skip token
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle token expiry
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired — clear storage
      try {
        await clearAuth();
      } catch {}
      // The auth store will pick this up via the listener
    }
    return Promise.reject(error);
  }
);

// Generic request helper (matches your existing web frontend pattern)
export async function apiRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  endpoint: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await api.request<T>({
    method,
    url: endpoint,
    data,
    ...config,
  });
  return response.data;
}

export default api;
