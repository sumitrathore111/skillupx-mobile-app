import type { User } from '@/types/index';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { apiRequest } from './api';

// SecureStore doesn't work on web — fall back to localStorage
async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

interface LoginResponse {
  token: string;
  user: User;
  message: string;
}

interface RegisterResponse {
  token: string;
  user: User;
  message: string;
}

// Login with email + password → your /api/auth/login
export async function loginWithEmail(email: string, password: string): Promise<LoginResponse> {
  const data = await apiRequest<LoginResponse>('POST', '/auth/login', { email, password });
  // Save token and user securely on device
  await setItem('auth_token', data.token);
  await setItem('auth_user', JSON.stringify(data.user));
  return data;
}

// Register new account → your /api/auth/register
export async function registerUser(
  name: string,
  email: string,
  password: string,
  username: string
): Promise<RegisterResponse> {
  const data = await apiRequest<RegisterResponse>('POST', '/auth/register', {
    name,
    email,
    password,
    username,
  });
  await setItem('auth_token', data.token);
  await setItem('auth_user', JSON.stringify(data.user));
  return data;
}

// Get stored token
export async function getStoredToken(): Promise<string | null> {
  try {
    return await getItem('auth_token');
  } catch {
    return null;
  }
}

// Get stored user
export async function getStoredUser(): Promise<User | null> {
  try {
    const raw = await getItem('auth_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Logout — clear everything
export async function logout(): Promise<void> {
  await deleteItem('auth_token');
  await deleteItem('auth_user');
}

// Refresh current user profile from backend
export async function fetchCurrentUser(): Promise<User> {
  const res = await apiRequest<{ user: User }>('GET', '/auth/me');
  return res.user;
}

// Update user profile
export async function updateProfile(data: Partial<User>): Promise<User> {
  const updated = await apiRequest<User>('PUT', '/users/profile', data);
  await setItem('auth_user', JSON.stringify(updated));
  return updated;
}

// Google Sign-In → your /api/auth/google
interface GoogleAuthResponse {
  token: string;
  user: User;
  isNewUser: boolean;
}

export async function loginWithGoogle(googleData: {
  googleId: string;
  email: string;
  name: string;
  avatar?: string;
}): Promise<GoogleAuthResponse> {
  const data = await apiRequest<GoogleAuthResponse>('POST', '/auth/google', googleData);
  await setItem('auth_token', data.token);
  await setItem('auth_user', JSON.stringify(data.user));
  return data;
}
