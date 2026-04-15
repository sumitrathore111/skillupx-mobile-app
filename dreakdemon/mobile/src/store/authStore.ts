import type { User } from '@/types/index';
import { fetchCurrentUser, getStoredToken, getStoredUser, loginWithEmail, loginWithGoogle as loginWithGoogleService, logout, registerUser } from '@services/authService';
import { removePushTokenFromServer } from '@services/pushService';
import { disconnectSocket, initializeSocket } from '@services/socketService';
import { create } from 'zustand';

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (googleData: { googleId: string; email: string; name: string; avatar?: string }) => Promise<void>;
  register: (name: string, email: string, password: string, username: string) => Promise<void>;
  logoutUser: () => Promise<void>;
  clearError: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  // Called on app startup — restore session from SecureStore
  initialize: async () => {
    try {
      set({ isLoading: true });
      const [token, user] = await Promise.all([getStoredToken(), getStoredUser()]);

      if (token && user) {
        set({ token, user, isAuthenticated: true, isLoading: false });
        // Re-fetch fresh user data in background (non-blocking)
        fetchCurrentUser()
          .then((freshUser) => set({ user: freshUser }))
          .catch(() => { /* Token might be expired — stay logged in with cached data */ });
        // Connect socket in background (non-blocking)
        initializeSocket().catch(() => {});
        return;
      }
    } catch (error) {
      set({ user: null, token: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });
      const { user, token } = await loginWithEmail(email, password);
      set({ user, token, isAuthenticated: true });
      try { await initializeSocket(); } catch { /* socket failure shouldn't block login */ }
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.response?.data?.message || 'Login failed. Check your credentials.';
      set({ error: message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  loginWithGoogle: async (googleData: { googleId: string; email: string; name: string; avatar?: string }) => {
    try {
      set({ isLoading: true, error: null });
      const { user, token } = await loginWithGoogleService(googleData);
      set({ user, token, isAuthenticated: true });
      try { await initializeSocket(); } catch { /* socket failure shouldn't block login */ }
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.response?.data?.message || 'Google sign-in failed. Try again.';
      set({ error: message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (name: string, email: string, password: string, username: string) => {
    try {
      set({ isLoading: true, error: null });
      const { user, token } = await registerUser(name, email, password, username);
      set({ user, token, isAuthenticated: true });
      try { await initializeSocket(); } catch { /* socket failure shouldn't block registration */ }
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.response?.data?.message || 'Registration failed. Try again.';
      set({ error: message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  logoutUser: async () => {
    try { await removePushTokenFromServer(); } catch { /* ignore */ }
    // Clear state immediately so navigation switches to login
    set({ user: null, token: null, isAuthenticated: false, error: null });
    // Clean up in background
    try { disconnectSocket(); } catch (e) { console.warn('Socket disconnect error:', e); }
    try { await logout(); } catch (e) { console.warn('Logout cleanup error:', e); }
  },

  clearError: () => set({ error: null }),

  updateUser: (updates: Partial<User>) => {
    const current = get().user;
    if (current) {
      set({ user: { ...current, ...updates } });
    }
  },
}));
