import { create } from 'zustand';

interface AuthState {
  user: { id: string; email: string; name?: string; role: 'citizen' | 'authority' } | null;
  token: string | null;
  setAuth: (user: AuthState['user'], token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  let initialToken = null;
  let initialUser = null;
  try {
    initialToken = localStorage.getItem('token');
    const userStr = localStorage.getItem('auth_user');
    if (userStr) {
      initialUser = JSON.parse(userStr);
    }
  } catch (e) {
    console.error("Failed to read auth from localStorage", e);
  }

  return {
    user: initialUser,
    token: initialToken,
    setAuth: (user, token) => {
      try {
        localStorage.setItem('token', token);
        localStorage.setItem('auth_user', JSON.stringify(user));
      } catch (e) {
        console.error("Failed to save auth to localStorage", e);
      }
      set({ user, token });
    },
    logout: () => {
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('auth_user');
      } catch (e) {
        console.error("Failed to remove auth from localStorage", e);
      }
      set({ user: null, token: null });
    },
  };
});
