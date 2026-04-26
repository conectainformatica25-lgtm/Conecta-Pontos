import { create } from 'zustand';
import { User, Role } from '../domain/entities/User';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  login: (user: User) => {
    set({ isAuthenticated: true, user });
  },
  logout: () => set({ user: null, isAuthenticated: false }),
}));
