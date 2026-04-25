import { create } from 'zustand';
import { User, Role } from '../domain/entities/User';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  companyUsers: User[]; // Mock database de usuários da empresa
  login: (username: string) => boolean;
  logout: () => void;
  createUser: (name: string, role: Role) => void;
  registerCompanyAndAdmin: (companyName: string, adminName: string) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  companyUsers: [
    { id: '1', name: 'admin', role: 'ADMIN', companyId: 'company-123' },
    { id: '2', name: 'joao', role: 'EMPLOYEE', companyId: 'company-123' }
  ],
  login: (username: string) => {
    // Procura o usuário real no banco de dados Mockado!
    const foundUser = get().companyUsers.find(u => u.name.toLowerCase() === username.toLowerCase().trim());
    
    if (foundUser) {
      set({
        isAuthenticated: true,
        user: foundUser
      });
      return true;
    }
    return false; // Usuário não existe
  },
  logout: () => set({ user: null, isAuthenticated: false }),
  createUser: (name: string, role: Role) => {
    set((state) => ({
      companyUsers: [
        ...state.companyUsers, 
        { 
          id: Math.random().toString(36).substring(7), 
          name, 
          role, 
          companyId: state.user?.companyId || 'company-123' 
        }
      ]
    }));
  },
  registerCompanyAndAdmin: (companyName: string, adminName: string) => {
    const newCompanyId = Math.random().toString(36).substring(7);
    const newAdmin: User = {
      id: Math.random().toString(36).substring(7),
      name: adminName,
      role: 'ADMIN',
      companyId: newCompanyId
    };

    set((state) => ({
      companyUsers: [...state.companyUsers, newAdmin],
      user: newAdmin,
      isAuthenticated: true
    }));
  }
}));
