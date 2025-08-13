import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  organizationId?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  organization?: {
    id: string;
    name: string;
    isVerified: boolean;
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  member: any | null;
  isAuthenticated: boolean;
  lastActivity: number;
}

interface AuthActions {
  login: (user: User, token: string, member?: any) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  setMember: (member: any) => void;
  loadFromStorage: () => void;
  checkAuth: () => Promise<void>;
  initializeSessionManagement: () => void;
  updateActivity: () => void;
}

type AuthStore = AuthState & AuthActions;

// Session timeout (7 days in milliseconds)
const SESSION_TIMEOUT = 7 * 24 * 60 * 60 * 1000;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      member: null,
      isAuthenticated: false,
      lastActivity: Date.now(),

      // Actions
      login: (user: User, token: string, member?: any) => {
        localStorage.setItem('auth_token', token);
        set({
          user,
          token,
          member: member || null,
          isAuthenticated: true,
          lastActivity: Date.now(),
        });
      },

      logout: () => {
        localStorage.removeItem('auth_token');
        set({
          user: null,
          token: null,
          member: null,
          isAuthenticated: false,
          lastActivity: Date.now(),
        });
      },

      updateUser: (userUpdate: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: { ...currentUser, ...userUpdate },
            lastActivity: Date.now(),
          });
        }
      },

      setMember: (member: any) => {
        set({
          member,
          lastActivity: Date.now(),
        });
      },

      loadFromStorage: () => {
        const storedToken = localStorage.getItem('auth_token');
        const state = get();
        
        // Check if session is still valid
        const timeSinceLastActivity = Date.now() - state.lastActivity;
        const isSessionExpired = timeSinceLastActivity > SESSION_TIMEOUT;
        
        if (storedToken && !isSessionExpired && state.user) {
          set({
            token: storedToken,
            isAuthenticated: true,
            lastActivity: Date.now(),
          });
        } else if (isSessionExpired) {
          // Session expired, logout
          get().logout();
        }
      },

      checkAuth: async () => {
        const { token } = get();
        
        if (!token) {
          console.log('No token found');
          return;
        }

        try {
          const response = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.user) {
              set({
                user: data.user,
                isAuthenticated: true,
                lastActivity: Date.now(),
              });
            } else {
              get().logout();
            }
          } else {
            // Token is invalid
            get().logout();
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          get().logout();
        }
      },

      initializeSessionManagement: () => {
        // Update activity on user interactions
        const updateActivity = () => {
          const state = get();
          if (state.isAuthenticated) {
            set({ lastActivity: Date.now() });
          }
        };

        // Listen for user activity
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        events.forEach(event => {
          document.addEventListener(event, updateActivity, { passive: true });
        });

        // Check session validity periodically
        const checkSessionValidity = () => {
          const state = get();
          if (state.isAuthenticated) {
            const timeSinceLastActivity = Date.now() - state.lastActivity;
            if (timeSinceLastActivity > SESSION_TIMEOUT) {
              console.log('Session expired due to inactivity');
              get().logout();
            }
          }
        };

        // Check every 5 minutes
        setInterval(checkSessionValidity, 5 * 60 * 1000);

        console.log('Session management initialized');
      },

      updateActivity: () => {
        const state = get();
        if (state.isAuthenticated) {
          set({ lastActivity: Date.now() });
        }
      },
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        member: state.member,
        isAuthenticated: state.isAuthenticated,
        lastActivity: state.lastActivity,
      }),
    }
  )
);