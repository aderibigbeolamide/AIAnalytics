import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      member: null,
      isAuthenticated: false,

      login: async (username: string, password: string) => {
        try {
          const response = await apiRequest('POST', '/api/auth/login', {
            username,
            password,
          });
          
          const data = await response.json();
          
          console.log('Login successful, setting auth state:', data);
          
          // Force a synchronous update to ensure persistence
          const newState = {
            token: data.token,
            user: data.user,
            member: data.member,
            isAuthenticated: true,
          };
          
          set(newState);
          
          // Verify the state was set correctly
          const currentState = get();
          console.log('Auth state after login:', currentState);
          
          // Manually save to localStorage to ensure persistence
          try {
            localStorage.setItem('auth-storage', JSON.stringify({
              state: newState,
              version: 0
            }));
            console.log('Manually saved to localStorage');
          } catch (e) {
            console.error('Failed to save to localStorage:', e);
          }
          
        } catch (error) {
          console.error('Login error:', error);
          throw new Error('Login failed');
        }
      },

      logout: () => {
        set({
          token: null,
          user: null,
          member: null,
          isAuthenticated: false,
        });
      },

      checkAuth: async () => {
        const { token } = get();
        console.log('checkAuth called with token:', !!token);
        
        if (!token) {
          console.log('No token found, setting authenticated to false');
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
            console.log('Auth check successful, updating state');
            set({
              user: data.user,
              member: data.member,
              isAuthenticated: true,
            });
          } else {
            console.log('Auth check failed, clearing state');
            set({
              token: null,
              user: null,
              member: null,
              isAuthenticated: false,
            });
          }
        } catch (error) {
          console.error('Auth check error:', error);
          set({
            token: null,
            user: null,
            member: null,
            isAuthenticated: false,
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        token: state.token,
        user: state.user,
        member: state.member,
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);

// Add token to API requests
export function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
