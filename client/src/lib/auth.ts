import { create } from 'zustand';
import { apiRequest } from './queryClient';

interface User {
  id: number;
  username: string;
  role: string;
}

interface Member {
  id: number;
  firstName: string;
  lastName: string;
  auxiliaryBody: string;
  chandaNumber?: string;
  email?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  member: Member | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  loadFromStorage: () => void;
}

// Simple localStorage functions
const saveAuthState = (token: string, user: User, member: Member | null) => {
  try {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    if (member) {
      localStorage.setItem('auth_member', JSON.stringify(member));
    }
    console.log('Saved auth state to localStorage');
  } catch (error) {
    console.error('Failed to save auth state:', error);
  }
};

const clearAuthState = () => {
  try {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_member');
    console.log('Cleared auth state from localStorage');
  } catch (error) {
    console.error('Failed to clear auth state:', error);
  }
};

const loadAuthState = () => {
  try {
    const token = localStorage.getItem('auth_token');
    const userStr = localStorage.getItem('auth_user');
    const memberStr = localStorage.getItem('auth_member');
    
    if (token && userStr) {
      const user = JSON.parse(userStr);
      const member = memberStr ? JSON.parse(memberStr) : null;
      console.log('Loaded auth state from localStorage:', { token: !!token, user, member });
      return { token, user, member, isAuthenticated: true };
    }
  } catch (error) {
    console.error('Failed to load auth state:', error);
  }
  return { token: null, user: null, member: null, isAuthenticated: false };
};

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  member: null,
  isAuthenticated: false,

  loadFromStorage: () => {
    const stored = loadAuthState();
    set(stored);
    console.log('Auth state loaded from storage:', stored);
  },

  login: async (username: string, password: string) => {
    try {
      const response = await apiRequest('POST', '/api/auth/login', {
        username,
        password,
      });
      
      const data = await response.json();
      
      console.log('Login successful:', data);
      
      const { token, user, member } = data;
      
      // Save to localStorage
      saveAuthState(token, user, member);
      
      // Update store state
      set({
        token,
        user,
        member,
        isAuthenticated: true,
      });
      
      console.log('Auth state updated after login');
      
    } catch (error) {
      console.error('Login error:', error);
      throw new Error('Login failed');
    }
  },

  logout: () => {
    clearAuthState();
    set({
      token: null,
      user: null,
      member: null,
      isAuthenticated: false,
    });
    console.log('Logged out successfully');
  },

  checkAuth: async () => {
    const { token } = get();
    console.log('checkAuth called with token:', !!token);
    
    if (!token) {
      console.log('No token found');
      set({ isAuthenticated: false });
      return;
    }

    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });

      console.log('Auth check response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Auth check successful');
        set({
          user: data.user,
          member: data.member,
          isAuthenticated: true,
        });
        // Update localStorage with fresh data
        saveAuthState(token, data.user, data.member);
      } else {
        console.log('Auth check failed, clearing state');
        clearAuthState();
        set({
          token: null,
          user: null,
          member: null,
          isAuthenticated: false,
        });
      }
    } catch (error) {
      console.error('Auth check error:', error);
      clearAuthState();
      set({
        token: null,
        user: null,
        member: null,
        isAuthenticated: false,
      });
    }
  },
}));

// Add token to API requests
export function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}