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
          
          set({
            token: data.token,
            user: data.user,
            member: data.member,
            isAuthenticated: true,
          });
          
          console.log('Auth state after login:', get());
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
        if (!token) {
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

          if (response.ok) {
            const data = await response.json();
            set({
              user: data.user,
              member: data.member,
              isAuthenticated: true,
            });
          } else {
            set({
              token: null,
              user: null,
              member: null,
              isAuthenticated: false,
            });
          }
        } catch (error) {
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
      partialize: (state) => ({ token: state.token }),
    }
  )
);

// Add token to API requests
export function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
