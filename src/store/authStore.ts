import { create } from 'zustand';
import { User } from 'firebase/auth';
import { UserRole } from '@/domain/user';

interface AuthState {
  user: User | null;
  propertyId: string | null;
  role: UserRole | null;
  isInitialized: boolean;
  setUser: (user: User | null) => void;
  setPropertyId: (propertyId: string | null) => void;
  setRole: (role: UserRole | null) => void;
  setInitialized: (val: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  propertyId: null, // Populated from the ID token's custom claims once auth resolves
  role: null,
  isInitialized: false,
  setUser: (user) => set({ user }),
  setPropertyId: (propertyId) => set({ propertyId }),
  setRole: (role) => set({ role }),
  setInitialized: (val) => set({ isInitialized: val }),
}));
