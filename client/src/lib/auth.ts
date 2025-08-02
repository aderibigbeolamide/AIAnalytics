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
  initializeSessionManagement: () => void;
  lastActivity: number;
}

// Enhanced localStorage functions with timestamp tracking
const saveAuthState = (token: string, user: User, member: Member | null) => {
  try {
    const timestamp = Date.now();
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem('auth_timestamp', timestamp.toString());
    localStorage.setItem('auth_last_activity', timestamp.toString());
    if (member) {
      localStorage.setItem('auth_member', JSON.stringify(member));
    }
    console.log('Saved auth state to localStorage with timestamp:', timestamp);
  } catch (error) {
    console.error('Failed to save auth state:', error);
  }
};

const clearAuthState = () => {
  try {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_member');
    localStorage.removeItem('auth_timestamp');
    localStorage.removeItem('auth_last_activity');
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
    const timestamp = localStorage.getItem('auth_timestamp');
    const lastActivity = localStorage.getItem('auth_last_activity');
    
    if (token && userStr) {
      const user = JSON.parse(userStr);
      const member = memberStr ? JSON.parse(memberStr) : null;
      const authTimestamp = timestamp ? parseInt(timestamp) : Date.now();
      const lastActivityTime = lastActivity ? parseInt(lastActivity) : Date.now();
      
      // Check if token contains malformed organizationId (stringified MongoDB document)
      if (user?.organizationId && typeof user.organizationId === 'string' && 
          user.organizationId.includes('_id: new ObjectId(')) {
        console.log('Detected malformed organizationId in token, clearing auth state to force re-login');
        clearAuthState();
        return { token: null, user: null, member: null, isAuthenticated: false, lastActivity: Date.now() };
      }
      
      // Check if token is too old (more than 6 days, giving 1 day buffer for 7-day expiry)
      const sixDaysInMs = 6 * 24 * 60 * 60 * 1000;
      const isTokenExpired = Date.now() - authTimestamp > sixDaysInMs;
      
      if (isTokenExpired) {
        console.log('Token appears to be expired, clearing auth state');
        clearAuthState();
        return { token: null, user: null, member: null, isAuthenticated: false, lastActivity: Date.now() };
      }
      
      console.log('Loaded auth state from localStorage:', { 
        token: !!token, 
        userRole: user?.role,
        authAge: Date.now() - authTimestamp,
        lastActivity: lastActivityTime 
      });
      return { token, user, member, isAuthenticated: true, lastActivity: lastActivityTime };
    }
  } catch (error) {
    console.error('Failed to load auth state:', error);
  }
  return { token: null, user: null, member: null, isAuthenticated: false, lastActivity: Date.now() };
};

// Activity tracking and session management
const updateLastActivity = () => {
  try {
    const timestamp = Date.now().toString();
    localStorage.setItem('auth_last_activity', timestamp);
  } catch (error) {
    console.error('Failed to update last activity:', error);
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  member: null,
  isAuthenticated: false,
  lastActivity: Date.now(),

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
      
      console.log('Login successful');
      
      const { token, user, member } = data;
      
      // Save to localStorage
      saveAuthState(token, user, member);
      
      // Update store state
      set({
        token,
        user,
        member,
        isAuthenticated: true,
        lastActivity: Date.now(),
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
      lastActivity: Date.now(),
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
          lastActivity: Date.now(),
        });
        // Update localStorage with fresh data
        saveAuthState(token, data.user, data.member);
        updateLastActivity();
      } else {
        console.log('Auth check failed, clearing state');
        clearAuthState();
        set({
          token: null,
          user: null,
          member: null,
          isAuthenticated: false,
          lastActivity: Date.now(),
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
        lastActivity: Date.now(),
      });
    }
  },

  initializeSessionManagement: () => {
    // Handle page visibility changes (mobile app switching)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Page became visible again
        console.log('Page became visible, checking auth state...');
        const { token, isAuthenticated } = get();
        if (token && isAuthenticated) {
          // Validate token when page becomes visible again
          get().checkAuth();
        } else if (token && !isAuthenticated) {
          // Have token but not authenticated, try to restore
          get().loadFromStorage();
        }
        updateLastActivity();
      }
    };

    // Handle page focus (when user returns to tab)
    const handleFocus = () => {
      console.log('Window focused, refreshing auth state...');
      const { token, isAuthenticated } = get();
      if (token && isAuthenticated) {
        get().checkAuth();
      }
      updateLastActivity();
    };

    // Handle before page unload (save last activity)
    const handleBeforeUnload = () => {
      updateLastActivity();
    };

    // Track user activity for session management
    const handleUserActivity = () => {
      const { isAuthenticated } = get();
      if (isAuthenticated) {
        updateLastActivity();
        set({ lastActivity: Date.now() });
      }
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Track user activity
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach(event => {
      document.addEventListener(event, handleUserActivity, true);
    });

    // Periodic auth validation (every 5 minutes)
    const authCheckInterval = setInterval(() => {
      const { token, isAuthenticated, lastActivity } = get();
      const fiveMinutes = 5 * 60 * 1000;
      const isRecentActivity = Date.now() - lastActivity < fiveMinutes;
      
      if (token && isAuthenticated && isRecentActivity) {
        console.log('Periodic auth check...');
        get().checkAuth();
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    // Store interval ID for cleanup
    (window as any).__authCheckInterval = authCheckInterval;

    console.log('Session management initialized');
  },
}));

// Add token to API requests
export function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}