import type { User } from '@/types/index';
import { fetchCurrentUser, getStoredToken, getStoredUser, loginWithEmail, logout, registerUser } from '@services/authService';
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
        set({ token, user, isAuthenticated: true });
        // Re-fetch fresh user data in background
        try {
          const freshUser = await fetchCurrentUser();
          set({ user: freshUser });
        } catch {
          // Token might be expired — stay logged in with cached data
        }
        // Connect socket
        await initializeSocket();
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
    disconnectSocket();
    await logout();
    set({ user: null, token: null, isAuthenticated: false, error: null });
  },

  clearError: () => set({ error: null }),

  updateUser: (updates: Partial<User>) => {
    const current = get().user;
    if (current) {
      set({ user: { ...current, ...updates } });
    }
  },
}));
